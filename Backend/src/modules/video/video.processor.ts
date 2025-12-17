import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { MinioService } from 'src/modules/files/minio.service';
import { VIDEO_QUEUE_NAME } from 'src/modules/video/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuid } from 'uuid';
import { DockerFFmpegConfigService } from './docker-ffmpeg-config.service';
import { ProcessingProgress, VideoJobData } from './interfaces';

@Processor(VIDEO_QUEUE_NAME)
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    private readonly minioService: MinioService,
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
    private readonly dockerFFmpegConfig: DockerFFmpegConfigService,
  ) {
    super();
  }

  async process(job: Job<VideoJobData>): Promise<void> {
    const { fileName, bucketName, originalObjectName, folder, mimetype } =
      job.data;

    const isAudio =
      mimetype?.startsWith('audio/') || /\.(mp3|wav|aac)$/i.test(fileName); // detect audio
    const baseTmpDir = path.resolve(process.cwd(), '../temp');
    const tempDir = path.join(
      baseTmpDir,
      `${isAudio ? 'audio' : 'video'}-${uuid()}`,
    );
    const tempFilePath = path.join(tempDir, fileName);
    const hlsDir = path.join(tempDir, 'hls');

    try {
      await this.updateProgress(
        fileName,
        {
          stage: 'converting',
          progress: 5,
          message: 'Downloading video from storage...',
        },
        isAudio,
      );

      // Tạo các thư mục tạm
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.mkdir(hlsDir, { recursive: true });

      // Tải video từ MinIO
      await this.downloadVideoFromMinIO(
        bucketName,
        originalObjectName,
        tempFilePath,
        fileName,
      );

      await this.updateProgress(
        fileName,
        {
          progress: 15,
          message: 'Starting video conversion to HLS...',
        },
        isAudio,
      );

      // Chuyển đổi sang HLS
      await this.convertToHLS(tempFilePath, hlsDir, fileName, isAudio);

      await this.updateProgress(
        fileName,
        {
          stage: 'uploading',
          progress: 70,
          message: 'Conversion completed, uploading HLS files...',
        },
        isAudio,
      );

      // Tải lên các tệp HLS
      const baseName = path.parse(fileName).name;
      const hlsObjectPrefix = `${folder}/hls/${baseName}`;
      await this.uploadHLSFiles(
        hlsDir,
        bucketName,
        hlsObjectPrefix,
        fileName,
        isAudio,
      );

      await this.updateProgress(
        fileName,
        {
          stage: 'completed',
          progress: 100,
          message: 'HLS processing completed successfully',
        },
        isAudio,
      );

      const cached = await this.redisService.getJSON<number>(
        `${isAudio ? 'audio' : 'video'}:${fileName}:duration`,
      );

      if (!isAudio) {
        const lesson = await this.prismaService.lessons.findFirst({
          where: { video_url: fileName },
        });

        // Cập nhật thời lượng bài học nếu giá trị cached tồn tại
        if (lesson && cached) {
          await this.prismaService.lessons.update({
            where: { id: lesson.id },
            data: {
              video_duration: cached,
              updated_at: new Date(),
            },
          });
          this.logger.log(
            `Updated lesson ${lesson.id} with video duration: ${cached}s`,
          );

          // Xóa cached duration sau khi cập nhật
          await this.redisService.del(`video:${fileName}:duration`);
        }
      }

      this.logger.log(`HLS processing completed for: ${fileName}`);
    } catch (error) {
      this.logger.error(`HLS processing failed for: ${fileName}`, error);
      await this.updateProgress(
        fileName,
        {
          stage: 'failed',
          progress: 0,
          message: 'HLS processing failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        isAudio,
      );
      throw error;
    } finally {
      await this.cleanupTempDir(tempDir);
    }
  }

  private async downloadVideoFromMinIO(
    bucketName: string,
    objectName: string,
    localPath: string,
    fileName: string,
  ): Promise<void> {
    try {
      const stream = await this.minioService.getObjectStream(
        bucketName,
        objectName,
      );
      const writeStream = fs.createWriteStream(localPath);

      return new Promise((resolve, reject) => {
        stream.pipe(writeStream);

        writeStream.on('finish', () => {
          this.logger.log(`Downloaded video to temp: ${localPath}`);
          resolve();
        });

        writeStream.on('error', (error) => {
          this.logger.error(`Download failed: ${error}`);
          reject(error);
        });

        stream.on('error', (error) => {
          this.logger.error(`Stream error: ${error}`);
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to download video ${fileName}:`, error);
      throw error;
    }
  }

  private async convertToHLS(
    inputPath: string,
    outputDir: string,
    fileName: string,
    isAudio: boolean = false,
  ): Promise<void> {
    const outputPlaylist = path.join(outputDir, 'playlist.m3u8');
    const segmentPattern = path.join(
      outputDir,
      isAudio ? 'segment_%04d.aac' : 'segment_%04d.ts',
    );

    // Xử lý thiết lập async TRƯỚC Promise constructor
    try {
      const ffmpegInstance = await this.dockerFFmpegConfig.getFFmpegInstance();

      // Chuyển đổi đường dẫn sang đường dẫn container
      const containerInputPath =
        this.dockerFFmpegConfig.convertToContainerPath(inputPath);
      const containerOutputPlaylist =
        this.dockerFFmpegConfig.convertToContainerPath(outputPlaylist);
      const containerSegmentPattern =
        this.dockerFFmpegConfig.convertToContainerPath(segmentPattern);

      // Bây giờ sử dụng Promise constructor đồng bộ
      return new Promise((resolve, reject) => {
        const ff = ffmpegInstance(containerInputPath);
        if (isAudio) {
          // Cấu hình HLS chỉ cho audio
          ff.outputOptions([
            '-vn', // Bỏ qua video stream (chỉ xử lý audio)
            '-acodec aac', // Codec âm thanh: AAC (tương thích rộng rãi)
            '-b:a 128k', // Bitrate âm thanh: 128 kbps (chất lượng chuẩn)
            '-ar 44100', // Sample rate: 44.1 kHz (chất lượng CD)
            '-ac 2', // Audio channels: 2 (stereo)
            '-hls_time 6', // Độ dài mỗi segment: 6 giây
            '-hls_playlist_type vod', // Loại playlist: VOD (Video On Demand - không phải live)
            '-hls_segment_filename', // Tên file cho các segment
            containerSegmentPattern,
            '-f hls', // Format đầu ra: HLS (HTTP Live Streaming)
          ]);
        } else {
          ff.outputOptions([
            '-c:v libx264', // Codec video: H.264 (tương thích rộng rãi)
            '-preset faster', // Tốc độ encoding: faster (cân bằng giữa tốc độ và chất lượng)
            '-profile:v main', // Profile H.264: main (tương thích hầu hết thiết bị)
            '-level 3.1', // Level H.264: 3.1 (hỗ trợ đến 1280x720@30fps)
            '-crf 26', // Constant Rate Factor: 26 (chất lượng tốt, file size hợp lý, 0-51 scale)
            '-c:a aac', // Codec âm thanh: AAC
            '-b:a 128k', // Bitrate âm thanh: 128 kbps
            '-ar 44100', // Sample rate: 44.1 kHz
            '-sc_threshold 0', // Tắt scene change detection (để keyframe đều đặn)
            '-g 60', // GOP size: 60 frames (khoảng cách giữa các keyframe)
            '-keyint_min 60', // Khoảng cách tối thiểu giữa các keyframe: 60 frames
            '-hls_time 6', // Độ dài mỗi segment: 6 giây
            '-hls_playlist_type vod', // Loại playlist: VOD
            '-hls_segment_filename', // Tên file cho các segment
            containerSegmentPattern,
            '-threads 0', // Số threads: tự động (sử dụng tất cả CPU cores)
            '-movflags +faststart', // Tối ưu cho streaming (metadata ở đầu file)
            '-tune film', // Tối ưu cho nội dung phim (giảm noise, tăng chất lượng)
            '-vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2', // Scale về 720p, giữ tỷ lệ, thêm padding đen nếu cần
            '-f hls', // Format đầu ra: HLS
          ]);
        }
        ff.output(containerOutputPlaylist)
          .on('start', () => {
            this.logger.log(
              `FFmpeg started for ${fileName} (${isAudio ? 'audio' : 'video'})`,
            );
            void this.updateProgress(
              fileName,
              {
                progress: 15,
                message: `${isAudio ? 'Audio' : 'Video'} conversion started...`,
              },
              isAudio,
            ).catch((error) =>
              this.logger.error('Failed to update progress on start:', error),
            );
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              const convertProgress = Math.min(
                Math.round(progress.percent),
                100,
              );
              const totalProgress =
                15 + Math.round((convertProgress / 100) * 50);
              void this.updateProgress(
                fileName,
                {
                  progress: totalProgress,
                  message: `Converting ${isAudio ? 'audio' : 'video'}: ${convertProgress}% (${progress.timemark || 'processing...'})`,
                },
                isAudio,
              ).catch((error) =>
                this.logger.error('Failed to update progress:', error),
              );
            }
          })
          .on('end', () => {
            this.logger.log(`HLS conversion completed for ${fileName}`);
            void this.updateProgress(
              fileName,
              {
                progress: 65,
                message: `${isAudio ? 'Audio' : 'Video'} conversion completed`,
              },
              isAudio,
            ).catch((error) =>
              this.logger.error('Failed to update progress on end:', error),
            );
            resolve();
          })
          .on('error', (error) => {
            this.logger.error(`FFmpeg error for ${fileName}:`, error);
            void this.updateProgress(
              fileName,
              {
                stage: 'failed',
                progress: 0,
                message: `${isAudio ? 'Audio' : 'Video'} conversion failed`,
                error: error.message,
              },
              isAudio,
            ).catch((updateError) =>
              this.logger.error(
                'Failed to update progress on error:',
                updateError,
              ),
            );
            reject(error);
          })
          .run();
      });
    } catch (error) {
      this.logger.error(`Failed to setup FFmpeg for ${fileName}:`, error);
      throw error;
    }
  }

  private async uploadHLSFiles(
    hlsDir: string,
    bucketName: string,
    objectPrefix: string,
    fileName: string,
    isAudio: boolean = false,
  ): Promise<void> {
    const files = await fs.promises.readdir(hlsDir);
    const totalFiles = files.length;
    let uploadedCount = 0;

    for (const file of files) {
      const filePath = path.join(hlsDir, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()) {
        const objectName = `${objectPrefix}/${file}`;

        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) {
          contentType = 'application/vnd.apple.mpegurl';
        } else if (file.endsWith('.ts')) {
          contentType = 'video/mp2t';
        } else if (file.endsWith('.aac')) {
          contentType = 'audio/aac';
        } else if (file.endsWith('.mp3')) {
          contentType = 'audio/mpeg';
        } else if (file.endsWith('.m4a')) {
          contentType = 'audio/mp4';
        }

        // const fileBuffer = await fs.promises.readFile(filePath);
        // await this.minioService.putObject(bucketName, objectName, fileBuffer, {
        //   'Content-Type': contentType,
        //   'Cache-Control': 'max-age=31536000',
        //   'Access-Control-Allow-Origin': '*',
        // });

        const readStream = fs.createReadStream(filePath);
        await this.minioService.putObjectStream(
          bucketName,
          objectName,
          readStream,
          {
            'Content-Type': contentType,
            'Cache-Control': 'max-age=31536000',
            'Access-Control-Allow-Origin': '*',
          },
        );

        uploadedCount++;
        const uploadProgress =
          70 + Math.round((uploadedCount / totalFiles) * 25);
        await this.updateProgress(
          fileName,
          {
            progress: uploadProgress,
            uploadedSegments: uploadedCount,
            totalSegments: totalFiles,
            message: `Uploaded ${uploadedCount}/${totalFiles} HLS files (${file})`,
          },
          isAudio,
        );

        this.logger.debug(
          `Uploaded HLS file ${uploadedCount}/${totalFiles}: ${file}`,
        );
      }
    }
  }

  private async updateProgress(
    fileName: string,
    updates: Partial<ProcessingProgress>,
    isAudio: boolean = false,
  ): Promise<void> {
    try {
      const current = await this.redisService.getJSON<ProcessingProgress>(
        `${isAudio ? 'audio' : 'video'}:${fileName}:progress`,
      );

      // Xử lý startTime đúng cách - chuyển đổi chuỗi thành Date nếu cần
      let startTime = new Date();
      if (current?.startTime) {
        startTime =
          current.startTime instanceof Date
            ? current.startTime
            : new Date(current.startTime);
      }

      const updated: ProcessingProgress = {
        fileName,
        stage: 'converting',
        progress: 0,
        message: '',
        startTime, // Sử dụng Date đã chuyển đổi đúng cách
        ...current,
        ...updates,
      };

      // Tính toán thời gian hoàn thành ước tính chỉ khi có tiến trình và startTime hợp lệ
      if (
        updated.progress > 0 &&
        updated.stage === 'converting' &&
        updated.startTime
      ) {
        try {
          const startTimeMs =
            updated.startTime instanceof Date
              ? updated.startTime.getTime()
              : new Date(updated.startTime).getTime();

          const elapsed = Date.now() - startTimeMs;
          const estimatedTotal = (elapsed / updated.progress) * 100;
          updated.estimatedCompletion = new Date(startTimeMs + estimatedTotal);
        } catch (dateError) {
          this.logger.warn(
            `Failed to calculate estimated completion: ${dateError}`,
          );
          // Không làm thất bại toàn bộ cập nhật cho việc này
        }
      }

      await this.redisService.setJSON(
        `${isAudio ? 'audio' : 'video'}:${fileName}:progress`,
        updated,
        2 * 60 * 60, // 2 hours TTL
      );

      this.logger.log(
        `[${fileName}] ${updated.stage}: ${updated.progress}% - ${updated.message}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update progress for ${fileName}:`, error);
      // Không throw lỗi - chỉ ghi log để tránh job bị crash
    }
  }

  private async cleanupTempDir(tempDir: string): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Thêm delay trước khi dọn dẹp để cho phép file handles được giải phóng
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Kiểm tra thư mục tồn tại
        const exists = await fs.promises
          .access(tempDir)
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          this.logger.log(`Temp directory already cleaned: ${tempDir}`);
          return;
        }

        // Thử xóa đệ quy tiêu chuẩn với các tùy chọn nâng cao
        await fs.promises.rm(tempDir, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 1000,
        });

        this.logger.log(`Cleaned up temp directory: ${tempDir}`);
        return;
      } catch (error) {
        this.logger.warn(
          `Cleanup attempt ${attempt}/${maxRetries} failed for ${tempDir}:`,
          error,
        );

        if (attempt < maxRetries) {
          // Chờ trước khi thử lại
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * attempt),
          );
        } else {
          // Giải pháp cuối cùng: Buộc dọn dẹp bằng lệnh hệ thống
          try {
            this.forceCleanupDirectory(tempDir);
            this.logger.log(`Force cleanup successful: ${tempDir}`);
            return;
          } catch (forceError) {
            this.logger.error(
              `All cleanup methods failed for ${tempDir}:`,
              forceError,
            );
            // Không throw lỗi - cho phép job hoàn thành
          }
        }
      }
    }
  }

  /**
   * Buộc dọn dẹp sử dụng lệnh hệ thống
   */
  private forceCleanupDirectory(dirPath: string) {
    try {
      if (process.platform === 'win32') {
        // Windows: Sử dụng rmdir với các cờ force
        execSync(`rmdir /s /q "${dirPath}"`, {
          stdio: 'ignore',
          timeout: 10000, // 10 second timeout
        });
      } else {
        // Unix/Linux: Sử dụng rm -rf
        execSync(`rm -rf "${dirPath}"`, {
          stdio: 'ignore',
          timeout: 10000,
        });
      }
    } catch (error) {
      const e = error as Error;
      throw new Error(`System command cleanup failed: ${e.message}`);
    }
  }
}
