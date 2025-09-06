// filepath: d:\documents\code\git\Ielts-BE\Backend\src\modules\video\video.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import * as fs from 'fs';
import * as ffprobe from 'node-ffprobe';
import * as os from 'os';
import * as path from 'path';
import { MinioService } from 'src/modules/files/minio.service';
import { VIDEO_QUEUE_NAME } from 'src/modules/video/constants';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuid } from 'uuid';
import {
  ProcessingProgress,
  VideoJobData,
  VideoUploadResult,
} from './interfaces';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly minioService: MinioService,
    private readonly redisService: RedisService,
    @InjectQueue(VIDEO_QUEUE_NAME)
    private readonly videoQueue: Queue<VideoJobData>,
  ) {}

  /**
   * Upload video, save original to MinIO, enqueue HLS processing
   */
  async uploadVideo(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<
    VideoUploadResult & { duration: number; durationFormatted: string }
  > {
    const bucketName = 'ielts-videos';
    const fileExtension = path.extname(originalName);
    const fileName = `${uuid()}${fileExtension}`;
    const folder = 'lessons';
    const originalObjectName = `${folder}/original/${fileName}`;
    const tempDir = path.join(os.tmpdir(), `upload-${uuid()}`);
    const tempVideoPath = path.join(tempDir, fileName);

    // ✅ Track what needs rollback
    const rollbackContext = {
      tempDir: null as string | null,
      minioObject: null as string | null,
      redisKeys: [] as string[],
      queueJob: null as Job | null,
    };

    try {
      this.validateVideoFile(buffer, mimetype);

      // Step 1: Create temp file
      rollbackContext.tempDir = tempDir;
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(tempVideoPath, buffer);

      // Step 2: Extract duration
      const info = await ffprobe(tempVideoPath);
      const duration = Math.round(info.format.duration || 0);
      this.logger.log(`⏱️ Duration: ${duration}s for ${originalName}`);

      // Step 3: Upload to MinIO
      rollbackContext.minioObject = originalObjectName;
      const uploadInfo = await this.minioService.putObject(
        bucketName,
        originalObjectName,
        buffer,
        {
          'Content-Type': mimetype,
          'Cache-Control': 'max-age=31536000',
        },
      );

      // Step 4: Cache duration
      if (duration > 0) {
        const durationKey = `video:${fileName}:duration`;
        rollbackContext.redisKeys.push(durationKey);
        await this.redisService.setJSON(durationKey, duration, 24 * 60 * 60);
      }

      // Step 5: Set progress
      const progressKey = `video:${fileName}:progress`;
      rollbackContext.redisKeys.push(progressKey);
      const progress: ProcessingProgress = {
        fileName,
        stage: 'converting',
        progress: 0,
        message: 'Video uploaded, starting HLS processing...',
        startTime: new Date(),
      };
      await this.redisService.setJSON(progressKey, progress, 2 * 60 * 60);

      // Step 6: Enqueue job
      const jobData: VideoJobData = {
        fileName,
        bucketName,
        folder,
        originalObjectName,
        mimetype,
        fileSize: buffer.length,
        originalName,
      };

      const job = await this.videoQueue.add('process-hls', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 5,
        removeOnFail: 10,
      });
      rollbackContext.queueJob = job;

      // Step 7: Get URLs and cleanup temp
      const originalUrl = await this.minioService.getFileUrl(
        bucketName,
        originalObjectName,
      );

      await fs.promises.rm(tempDir, { recursive: true, force: true });
      rollbackContext.tempDir = null; // Mark as cleaned

      const result = {
        fileName,
        originalName,
        size: buffer.length,
        mimeType: mimetype,
        url: originalUrl,
        etag: uploadInfo.etag,
        isProcessing: true,
        duration,
        durationFormatted: this.formatDuration(duration),
      };

      this.logger.log(
        `✅ Video upload completed: ${fileName} (${this.formatDuration(duration)})`,
      );
      return result;
    } catch (error) {
      // ✅ Comprehensive rollback
      this.logger.error(
        `❌ Upload failed for ${originalName}, initiating rollback:`,
        error,
      );
      await this.performCompleteRollback(rollbackContext);

      throw new BadRequestException(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ✅ Comprehensive rollback method
  private async performCompleteRollback(context: {
    tempDir: string | null;
    minioObject: string | null;
    redisKeys: string[];
    queueJob: Job | null;
  }): Promise<void> {
    const rollbackResults = {
      tempDir: false,
      minioObject: false,
      hlsFolder: false,
      redisKeys: false,
      queueJob: false,
    };

    // 1. Cleanup temp directory
    if (context.tempDir) {
      try {
        await fs.promises.rm(context.tempDir, { recursive: true, force: true });
        rollbackResults.tempDir = true;
        this.logger.log(`✅ Rollback: Temp directory cleaned`);
      } catch (error) {
        this.logger.error(
          `❌ Rollback: Failed to cleanup temp directory:`,
          error,
        );
      }
    }

    // 2. Remove MinIO object
    if (context.minioObject) {
      try {
        await this.minioService.deleteFile('ielts-videos', context.minioObject);
        rollbackResults.minioObject = true;
        this.logger.log(
          `✅ Rollback: MinIO object deleted: ${context.minioObject}`,
        );
      } catch (error) {
        this.logger.error(`❌ Rollback: Failed to delete MinIO object:`, error);
      }

      try {
        // Extract fileName from object path: "lessons/original/uuid.mp4" → "uuid.mp4"
        const fileName = path.basename(context.minioObject);
        const baseName = path.parse(fileName).name; // "uuid"
        const hlsFolder = `lessons/hls/${baseName}/`;

        // Check if HLS folder exists before trying to delete
        const hlsExists = await this.minioService.objectExists(
          'ielts-videos',
          `${hlsFolder}playlist.m3u8`,
        );

        if (hlsExists) {
          await this.minioService.deleteFolderContents(
            'ielts-videos',
            hlsFolder,
          );
          this.logger.log(`✅ Rollback: HLS folder deleted: ${hlsFolder}`);
        } else {
          this.logger.log(
            `ℹ️ Rollback: HLS folder doesn't exist: ${hlsFolder}`,
          );
        }

        rollbackResults.hlsFolder = true;
      } catch (error) {
        this.logger.error(`❌ Rollback: Failed to cleanup HLS folder:`, error);
      }
    }

    // 3. Remove Redis keys
    if (context.redisKeys.length > 0) {
      try {
        for (const key of context.redisKeys) {
          await this.redisService.del(key);
        }
        rollbackResults.redisKeys = true;
        this.logger.log(
          `✅ Rollback: Redis keys cleaned: ${context.redisKeys.join(', ')}`,
        );
      } catch (error) {
        this.logger.error(`❌ Rollback: Failed to cleanup Redis keys:`, error);
      }
    }

    // 4. Remove/cancel queue job
    if (context.queueJob) {
      try {
        await context.queueJob.remove();
        rollbackResults.queueJob = true;
        this.logger.log(
          `✅ Rollback: Queue job removed: ${context.queueJob.id}`,
        );
      } catch (error) {
        // Job might not exist yet or already processed
        this.logger.warn(`⚠️ Rollback: Could not remove queue job:`, error);
      }
    }

    // Log rollback summary
    const successCount = Object.values(rollbackResults).filter(Boolean).length;
    const totalCount = Object.values(rollbackResults).length;

    if (successCount === totalCount) {
      this.logger.log(
        `✅ Complete rollback successful (${successCount}/${totalCount})`,
      );
    } else {
      this.logger.warn(
        `⚠️ Partial rollback completed (${successCount}/${totalCount})`,
      );
      this.logger.warn(`Rollback results:`, rollbackResults);
    }
  }

  async clearVideoData(fileName: string): Promise<void> {
    const bucketName = 'ielts-videos';
    const originalObjectName = `lessons/original/${fileName}`;
    const baseName = path.parse(fileName).name;
    const hlsFolder = `lessons/hls/${baseName}/`;

    // Delete original video
    try {
      await this.minioService.deleteFile(bucketName, originalObjectName);
      this.logger.log(`✅ Deleted original video: ${originalObjectName}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete original video ${originalObjectName}:`,
        error,
      );
    }

    // Delete HLS folder
    try {
      const hlsExists = await this.minioService.objectExists(
        bucketName,
        `${hlsFolder}playlist.m3u8`,
      );

      if (hlsExists) {
        await this.minioService.deleteFolderContents(bucketName, hlsFolder);
        this.logger.log(`✅ Deleted HLS folder: ${hlsFolder}`);
      } else {
        this.logger.log(`ℹ️ HLS folder does not exist: ${hlsFolder}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete HLS folder ${hlsFolder}:`, error);
    }

    // Delete Redis keys
    const durationKey = `video:${fileName}:duration`;
    const progressKey = `video:${fileName}:progress`;

    try {
      await this.redisService.del(durationKey);
      await this.redisService.del(progressKey);
      this.logger.log(`✅ Deleted Redis keys for video: ${fileName}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete Redis keys for ${fileName}:`,
        error,
      );
    }
  }

  async getProgress(fileName: string): Promise<ProcessingProgress | null> {
    try {
      return await this.redisService.getJSON<ProcessingProgress>(
        `video:${fileName}:progress`,
      );
    } catch (error) {
      this.logger.error(`Failed to get progress for ${fileName}:`, error);
      return null;
    }
  }

  async getVideoDuration(fileName: string): Promise<number> {
    try {
      const cached = await this.redisService.getJSON<number>(
        `video:${fileName}:duration`,
      );
      return cached || 0; // Should be available from upload
    } catch (error) {
      this.logger.error(`Failed to get duration for ${fileName}:`, error);
      return 0;
    }
  }

  private formatDuration(seconds: number): string {
    if (seconds === 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  private validateVideoFile(buffer: Buffer, mimetype: string): void {
    if (!mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files are allowed');
    }

    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (buffer.length > maxSize) {
      throw new BadRequestException('File too large. Maximum size: 2GB');
    }
  }

  // Get HLS URL, return null if not processed yet
  async getVideoHLSUrl(fileName: string): Promise<string | null> {
    try {
      const bucketName = 'ielts-videos';
      const baseName = path.parse(fileName).name;
      const hlsObjectName = `lessons/hls/${baseName}/playlist.m3u8`;

      const exists = await this.minioService.objectExists(
        bucketName,
        hlsObjectName,
      );
      if (!exists) {
        return null;
      }

      return await this.minioService.getFileUrl(bucketName, hlsObjectName);
    } catch (error) {
      this.logger.warn(`HLS not found for ${fileName}:`, error);
      return null;
    }
  }

  // Get original video info
  async getOriginalVideoInfo(
    fileName: string,
  ): Promise<{ url: string } | null> {
    try {
      const bucketName = 'ielts-videos';
      const originalObjectName = `lessons/original/${fileName}`;

      const exists = await this.minioService.objectExists(
        bucketName,
        originalObjectName,
      );
      if (!exists) {
        return null;
      }

      const url = await this.minioService.getFileUrl(
        bucketName,
        originalObjectName,
      );
      return { url };
    } catch (error) {
      this.logger.warn(`Original video not found for ${fileName}:`, error);
      return null;
    }
  }
}
