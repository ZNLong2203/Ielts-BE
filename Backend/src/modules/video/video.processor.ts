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
    const { fileName, bucketName, originalObjectName, folder } = job.data;
    const baseTmpDir = path.resolve(process.cwd(), '../temp');
    const tempDir = path.join(baseTmpDir, `video-${uuid()}`);
    const tempVideoPath = path.join(tempDir, fileName);
    const hlsDir = path.join(tempDir, 'hls');

    try {
      await this.updateProgress(fileName, {
        stage: 'converting',
        progress: 5,
        message: 'Downloading video from storage...',
      });

      // Create temp directories
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.mkdir(hlsDir, { recursive: true });

      // Download video from MinIO
      await this.downloadVideoFromMinIO(
        bucketName,
        originalObjectName,
        tempVideoPath,
        fileName,
      );

      await this.updateProgress(fileName, {
        progress: 15,
        message: 'Starting video conversion to HLS...',
      });

      // Convert to HLS
      await this.convertToHLS(tempVideoPath, hlsDir, fileName);

      await this.updateProgress(fileName, {
        stage: 'uploading',
        progress: 70,
        message: 'Conversion completed, uploading HLS files...',
      });

      // Upload HLS files
      const baseName = path.parse(fileName).name;
      const hlsObjectPrefix = `${folder}/hls/${baseName}`;
      await this.uploadHLSFiles(hlsDir, bucketName, hlsObjectPrefix, fileName);

      await this.updateProgress(fileName, {
        stage: 'completed',
        progress: 100,
        message: 'HLS processing completed successfully',
      });

      const cached = await this.redisService.getJSON<number>(
        `video:${fileName}:duration`,
      );

      const lesson = await this.prismaService.lessons.findFirst({
        where: { video_url: fileName },
      });

      // Update lesson duration if cached value exists
      if (lesson && cached) {
        await this.prismaService.lessons.update({
          where: { id: lesson.id },
          data: {
            video_duration: cached,
            updated_at: new Date(),
          },
        });
        this.logger.log(
          `✅ Updated lesson ${lesson.id} with video duration: ${cached}s`,
        );

        // Remove cached duration after updating
        await this.redisService.del(`video:${fileName}:duration`);
      }

      this.logger.log(`✅ HLS processing completed for: ${fileName}`);
    } catch (error) {
      this.logger.error(`❌ HLS processing failed for: ${fileName}`, error);
      await this.updateProgress(fileName, {
        stage: 'failed',
        progress: 0,
        message: 'HLS processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
          this.logger.log(`✅ Downloaded video to temp: ${localPath}`);
          resolve();
        });

        writeStream.on('error', (error) => {
          this.logger.error(`❌ Download failed: ${error}`);
          reject(error);
        });

        stream.on('error', (error) => {
          this.logger.error(`❌ Stream error: ${error}`);
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
  ): Promise<void> {
    const outputPlaylist = path.join(outputDir, 'playlist.m3u8');
    const segmentPattern = path.join(outputDir, 'segment_%04d.ts');

    // ✅ Handle async setup BEFORE Promise constructor
    try {
      const ffmpegInstance = await this.dockerFFmpegConfig.getFFmpegInstance();

      // Convert paths to container paths
      const containerInputPath =
        this.dockerFFmpegConfig.convertToContainerPath(inputPath);
      const containerOutputPlaylist =
        this.dockerFFmpegConfig.convertToContainerPath(outputPlaylist);
      const containerSegmentPattern =
        this.dockerFFmpegConfig.convertToContainerPath(segmentPattern);

      // ✅ Now use synchronous Promise constructor
      return new Promise((resolve, reject) => {
        ffmpegInstance(containerInputPath)
          .outputOptions([
            '-c:v libx264',
            '-preset faster',
            '-profile:v main',
            '-level 3.1',
            '-crf 26',
            '-c:a aac',
            '-b:a 128k',
            '-ar 44100',
            '-sc_threshold 0',
            '-g 60',
            '-keyint_min 60',
            '-hls_time 6',
            '-hls_playlist_type vod',
            '-hls_segment_filename',
            containerSegmentPattern,
            '-threads 0',
            '-movflags +faststart',
            '-tune film',
            '-vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
            '-f hls',
          ])
          .output(containerOutputPlaylist)
          .on('start', () => {
            this.logger.log(`🎬 FFmpeg started for ${fileName}`);
            void this.updateProgress(fileName, {
              progress: 15,
              message: 'Video conversion started...',
            }).catch((error) => {
              this.logger.error('Failed to update progress on start:', error);
            });
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              const convertProgress = Math.min(
                Math.round(progress.percent),
                100,
              );
              const totalProgress =
                15 + Math.round((convertProgress / 100) * 50);

              void this.updateProgress(fileName, {
                progress: totalProgress,
                message: `Converting video: ${convertProgress}% (${progress.timemark || 'processing...'})`,
              }).catch((error) => {
                this.logger.error('Failed to update progress:', error);
              });
            }
          })
          .on('end', () => {
            this.logger.log(`✅ HLS conversion completed for ${fileName}`);
            void this.updateProgress(fileName, {
              progress: 65,
              message: 'Video conversion completed',
            }).catch((error) => {
              this.logger.error('Failed to update progress on end:', error);
            });
            resolve();
          })
          .on('error', (error) => {
            this.logger.error(`❌ FFmpeg error for ${fileName}:`, error);
            void this.updateProgress(fileName, {
              stage: 'failed',
              progress: 0,
              message: 'Video conversion failed',
              error: error.message,
            }).catch((updateError) => {
              this.logger.error(
                'Failed to update progress on error:',
                updateError,
              );
            });
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
        await this.updateProgress(fileName, {
          progress: uploadProgress,
          uploadedSegments: uploadedCount,
          totalSegments: totalFiles,
          message: `Uploaded ${uploadedCount}/${totalFiles} HLS files (${file})`,
        });

        this.logger.debug(
          `📤 Uploaded HLS file ${uploadedCount}/${totalFiles}: ${file}`,
        );
      }
    }
  }

  private async updateProgress(
    fileName: string,
    updates: Partial<ProcessingProgress>,
  ): Promise<void> {
    try {
      const current = await this.redisService.getJSON<ProcessingProgress>(
        `video:${fileName}:progress`,
      );

      // ✅ Handle startTime properly - convert string to Date if needed
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
        startTime, // ✅ Use properly converted Date
        ...current,
        ...updates,
      };

      // ✅ Calculate estimated completion only if we have valid progress and startTime
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
          // Don't fail the whole update for this
        }
      }

      await this.redisService.setJSON(
        `video:${fileName}:progress`,
        updated,
        2 * 60 * 60, // 2 hours TTL
      );

      this.logger.log(
        `[${fileName}] ${updated.stage}: ${updated.progress}% - ${updated.message}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update progress for ${fileName}:`, error);
      // Don't throw error - just log it to avoid crashing the job
    }
  }

  private async cleanupTempDir(tempDir: string): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // ✅ Add delay before cleanup to allow file handles to release
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // ✅ Check if directory exists
        const exists = await fs.promises
          .access(tempDir)
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          this.logger.log(`✅ Temp directory already cleaned: ${tempDir}`);
          return;
        }

        // ✅ Try standard recursive deletion with enhanced options
        await fs.promises.rm(tempDir, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 1000,
        });

        this.logger.log(`✅ Cleaned up temp directory: ${tempDir}`);
        return;
      } catch (error) {
        this.logger.warn(
          `Cleanup attempt ${attempt}/${maxRetries} failed for ${tempDir}:`,
          error,
        );

        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * attempt),
          );
        } else {
          // ✅ Last resort: Force cleanup using system command
          try {
            this.forceCleanupDirectory(tempDir);
            this.logger.log(`✅ Force cleanup successful: ${tempDir}`);
            return;
          } catch (forceError) {
            this.logger.error(
              `❌ All cleanup methods failed for ${tempDir}:`,
              forceError,
            );
            // Don't throw - allow job to complete
          }
        }
      }
    }
  }

  /**
   * ✅ Force cleanup using system commands
   */
  private forceCleanupDirectory(dirPath: string) {
    try {
      if (process.platform === 'win32') {
        // Windows: Use rmdir with force flags
        execSync(`rmdir /s /q "${dirPath}"`, {
          stdio: 'ignore',
          timeout: 10000, // 10 second timeout
        });
      } else {
        // Unix/Linux: Use rm -rf
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
