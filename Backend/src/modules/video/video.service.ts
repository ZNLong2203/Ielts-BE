import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { MinioService } from 'src/modules/files/minio.service';
import { VIDEO_QUEUE_NAME } from 'src/modules/video/constants';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuid } from 'uuid';
import { DockerFFmpegConfigService } from './docker-ffmpeg-config.service';
import {
  PresignedUploadResponse,
  ProcessingProgress,
  VideoJobData,
  VideoUploadRequest,
  VideoUploadResult,
  VideoUploadSession,
} from './interfaces';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly minioService: MinioService,
    private readonly redisService: RedisService,
    private readonly dockerFFmpegConfig: DockerFFmpegConfigService,
    @InjectQueue(VIDEO_QUEUE_NAME)
    private readonly videoQueue: Queue<VideoJobData>,
  ) {}

  // ----------------------------------------------------------------------
  // Video upload service
  // ----------------------------------------------------------------------

  /**
   * Generate presigned URL for FE to upload directly to MinIO
   */
  async generatePresignedUploadUrl(
    request: VideoUploadRequest,
  ): Promise<PresignedUploadResponse> {
    const { originalName, fileSize, mimetype } = request;

    // Validate using existing method
    this.validateMediaFile(Buffer.alloc(0), mimetype); // Use empty buffer for validation

    // Additional file size validation
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (fileSize > maxSize) {
      throw new BadRequestException('File too large. Maximum size: 2GB');
    }

    const isAudio = mimetype.startsWith('audio/');
    const bucketName = isAudio ? 'ielts-audio' : 'ielts-videos';
    const fileExtension = path.extname(originalName);
    const fileName = `${uuid()}${fileExtension}`;
    const folder = 'lessons';
    const originalObjectName = `${folder}/original/${fileName}`;

    try {
      // Generate presigned URL for upload (expires in 15 minutes)
      const presignedUrl = await this.minioService.generatePresignedPutUrl(
        bucketName,
        originalObjectName,
        60 * 60, // 1 hour
      );

      // Store upload session info in Redis (expires in 20 minutes)
      const uploadSession = {
        fileName,
        originalName,
        fileSize,
        mimetype,
        bucketName,
        originalObjectName,
        folder,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        instructions: {
          method: 'PUT',
          headers: {
            'Content-Type': 'mimetype',
            'Content-Length': 'fileSize.toString()',
          },
          note: 'Upload the file directly to presignedUrl using PUT method with specified headers',
        },
      };

      const sessionKey = `upload-session:${fileName}`;
      await this.redisService.setJSON(sessionKey, uploadSession, 60 * 60); // 1 hour

      this.logger.log(
        ` Generated presigned URL for: ${originalName} → ${fileName}`,
      );

      return {
        fileName,
        originalName,
        presignedUrl,
        uploadUrl: presignedUrl,
        fields: {},
        bucketName,
        objectName: originalObjectName,
        expiresAt: uploadSession.expiresAt,
        maxFileSize: fileSize,
      };
    } catch (error) {
      const e = error as Error;
      this.logger.error(
        ` Failed to generate presigned URL for ${originalName}:`,
        e,
      );
      throw new BadRequestException(
        `Failed to generate upload URL: ${e.message}`,
      );
    }
  }

  /**
   *  NEW: Confirm upload and start processing after FE completes upload
   */
  async confirmUpload(
    fileName: string,
  ): Promise<
    VideoUploadResult & { duration: number; durationFormatted: string }
  > {
    const sessionKey = `upload-session:${fileName}`;

    //  Track rollback context (reuse existing logic)
    const rollbackContext = {
      tempDir: null as string | null,
      minioObject: null as string | null,
      redisKeys: [] as string[],
      queueJob: null as Job | null,
    };

    try {
      // Get upload session
      const uploadSession =
        await this.redisService.getJSON<VideoUploadSession>(sessionKey);
      if (!uploadSession) {
        throw new BadRequestException('Upload session not found or expired');
      }

      if (uploadSession.status !== 'pending') {
        throw new BadRequestException(`Upload already ${uploadSession.status}`);
      }

      const {
        bucketName,
        originalObjectName,
        originalName,
        fileSize,
        mimetype,
        folder,
      } = uploadSession;
      rollbackContext.minioObject = originalObjectName; // Track for rollback

      const isAudio = mimetype.startsWith('audio/');

      // Verify file exists in MinIO
      const fileExists = await this.minioService.objectExists(
        bucketName,
        originalObjectName,
      );
      if (!fileExists) {
        throw new BadRequestException(
          'File not found in storage. Upload may have failed.',
        );
      }

      // Get file from MinIO for processing
      const fileBuffer = await this.minioService.getFileBuffer(
        bucketName,
        originalObjectName,
      );

      //  Extract duration using existing logic (create temp file)
      const baseTmpDir = path.resolve(process.cwd(), '../temp');
      const tempDir = path.join(baseTmpDir, `confirm-${uuid()}`);
      const tempVideoPath = path.join(tempDir, fileName);
      rollbackContext.tempDir = tempDir; // Track for rollback

      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(tempVideoPath, fileBuffer);

      // Extract duration using Docker FFmpeg (existing logic)
      const info: { format?: { duration?: number } } =
        (await this.dockerFFmpegConfig.getVideoInfo(tempVideoPath)) as {
          format?: { duration?: number };
        };
      const duration = info?.format?.duration
        ? Math.round(info.format.duration)
        : 0;
      this.logger.log(` Duration: ${duration}s for ${originalName}`);

      //  Cache duration (existing logic)
      if (duration > 0) {
        const durationKey = `${isAudio ? 'audio' : 'video'}:${fileName}:duration`;
        rollbackContext.redisKeys.push(durationKey);
        await this.redisService.setJSON(durationKey, duration, 24 * 60 * 60);
      }

      //  Set progress (existing logic)
      const progressKey = `${isAudio ? 'audio' : 'video'}:${fileName}:progress`;
      rollbackContext.redisKeys.push(progressKey);
      const progress: ProcessingProgress = {
        fileName,
        stage: 'converting',
        progress: 0,
        message: `Video uploaded (${this.formatDuration(duration)}), starting HLS processing...`,
        startTime: new Date(),
      };
      await this.redisService.setJSON(progressKey, progress, 2 * 60 * 60);

      //  Enqueue HLS processing job (existing logic)
      const jobData: VideoJobData = {
        fileName,
        bucketName,
        folder,
        originalObjectName,
        mimetype,
        fileSize,
        originalName,
      };

      const job = await this.videoQueue.add('process-hls', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 5,
        removeOnFail: 10,
      });
      rollbackContext.queueJob = job;

      // Update upload session status
      uploadSession.status = 'confirmed';
      uploadSession.confirmedAt = new Date();
      uploadSession.duration = duration;
      await this.redisService.setJSON(sessionKey, uploadSession, 24 * 60 * 60); // Keep for 24h

      // Get file URL
      const originalUrl = await this.minioService.getFileUrl(
        bucketName,
        originalObjectName,
      );

      //  Cleanup temp file (existing logic)
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      rollbackContext.tempDir = null; // Mark as cleaned

      const result = {
        fileName,
        originalName,
        size: fileSize,
        mimeType: mimetype,
        url: originalUrl,
        etag: '', // Will be populated by MinIO
        isProcessing: true,
        duration,
        durationFormatted: this.formatDuration(duration),
      };

      this.logger.log(
        ` Upload confirmed and processing started: ${fileName} (${this.formatDuration(duration)})`,
      );
      return result;
    } catch (error) {
      const e = error as Error;
      //  Use existing rollback logic
      this.logger.error(
        ` Upload confirmation failed for ${fileName}, initiating rollback:`,
        e,
      );
      await this.performCompleteRollback(rollbackContext);

      // Mark session as failed
      try {
        const uploadSession =
          await this.redisService.getJSON<VideoUploadSession>(sessionKey);
        if (uploadSession) {
          uploadSession.status = 'failed';
          uploadSession.error = e.message;
          uploadSession.failedAt = new Date();
          await this.redisService.setJSON(
            sessionKey,
            uploadSession,
            24 * 60 * 60,
          );
        }
      } catch (sessionError) {
        this.logger.error(`Failed to update session status:`, sessionError);
      }

      throw new BadRequestException(`Upload confirmation failed: ${e.message}`);
    }
  }

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
    const isAudio = mimetype.startsWith('audio/');
    const bucketName = isAudio ? 'ielts-audio' : 'ielts-videos';
    const fileExtension = path.extname(originalName);
    const fileName = `${isAudio ? 'audio' : 'video'}-${uuid()}${fileExtension}`;
    const folder = 'lessons';
    const originalObjectName = `${folder}/original/${fileName}`;
    const baseTmpDir = path.resolve(process.cwd(), '../temp');
    const tempDir = path.join(baseTmpDir, `upload-${uuid()}`);
    const tempVideoPath = path.join(tempDir, fileName);

    //  Track what needs rollback
    const rollbackContext = {
      tempDir: null as string | null,
      minioObject: null as string | null,
      redisKeys: [] as string[],
      queueJob: null as Job | null,
    };

    try {
      this.validateMediaFile(buffer, mimetype);

      // Step 1: Create temp file
      rollbackContext.tempDir = tempDir;
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.writeFile(tempVideoPath, buffer);

      // Step 2: Extract duration using Docker FFmpeg
      const info: { format?: { duration?: number } } =
        (await this.dockerFFmpegConfig.getVideoInfo(tempVideoPath)) as {
          format?: { duration?: number };
        };
      console.log('FFprobe info:', JSON.stringify(info, null, 2));

      // Handle case where format might be undefined
      const duration = info?.format?.duration
        ? Math.round(info.format.duration)
        : 0;
      this.logger.log(` Duration: ${duration}s for ${originalName}`);

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
        const durationKey = `${isAudio ? 'audio' : 'video'}:${fileName}:duration`;
        rollbackContext.redisKeys.push(durationKey);
        await this.redisService.setJSON(durationKey, duration, 24 * 60 * 60);
      }

      // Step 5: Set progress
      const progressKey = `${isAudio ? 'audio' : 'video'}:${fileName}:progress`;
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
        ` Video upload completed: ${fileName} (${this.formatDuration(duration)})`,
      );
      return result;
    } catch (error) {
      //  Comprehensive rollback
      this.logger.error(
        ` Upload failed for ${originalName}, initiating rollback:`,
        error,
      );
      await this.performCompleteRollback(rollbackContext);

      throw new BadRequestException(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  //  Comprehensive rollback method
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
        this.logger.log(` Rollback: Temp directory cleaned`);
      } catch (error) {
        this.logger.error(
          ` Rollback: Failed to cleanup temp directory:`,
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
          ` Rollback: MinIO object deleted: ${context.minioObject}`,
        );
      } catch (error) {
        this.logger.error(` Rollback: Failed to delete MinIO object:`, error);
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
          this.logger.log(` Rollback: HLS folder deleted: ${hlsFolder}`);
        } else {
          this.logger.log(` Rollback: HLS folder doesn't exist: ${hlsFolder}`);
        }

        rollbackResults.hlsFolder = true;
      } catch (error) {
        this.logger.error(` Rollback: Failed to cleanup HLS folder:`, error);
      }
    }

    // 3. Remove Redis keys
    if (context.redisKeys.length > 0) {
      try {
        for (const key of context.redisKeys) {
          await this.redisService.del(key);
        }
        // clear upload session if exists
        if (context.minioObject) {
          const fileName = path.basename(context.minioObject);
          const sessionKey = `upload-session:${fileName}`;
          await this.redisService.del(sessionKey);
        }
        rollbackResults.redisKeys = true;
        this.logger.log(
          ` Rollback: Redis keys cleaned: ${context.redisKeys.join(', ')}`,
        );
      } catch (error) {
        this.logger.error(` Rollback: Failed to cleanup Redis keys:`, error);
      }
    }

    // 4. Remove/cancel queue job
    if (context.queueJob) {
      try {
        await context.queueJob.remove();
        rollbackResults.queueJob = true;
        this.logger.log(` Rollback: Queue job removed: ${context.queueJob.id}`);
      } catch (error) {
        // Job might not exist yet or already processed
        this.logger.warn(` Rollback: Could not remove queue job:`, error);
      }
    }

    // Log rollback summary
    const successCount = Object.values(rollbackResults).filter(Boolean).length;
    const totalCount = Object.values(rollbackResults).length;

    if (successCount === totalCount) {
      this.logger.log(
        ` Complete rollback successful (${successCount}/${totalCount})`,
      );
    } else {
      this.logger.warn(
        ` Partial rollback completed (${successCount}/${totalCount})`,
      );
      this.logger.warn(`Rollback results:`, rollbackResults);
    }
  }

  async clearVideoData(fileName: string): Promise<void> {
    const isAudio = this.isAudioFile(fileName);
    const bucketName = isAudio ? 'ielts-audio' : 'ielts-videos';
    const originalObjectName = `lessons/original/${fileName}`;
    const baseName = path.parse(fileName).name;
    const hlsFolder = `lessons/hls/${baseName}/`;

    // Delete original video
    try {
      await this.minioService.deleteFile(bucketName, originalObjectName);
      this.logger.log(` Deleted original video: ${originalObjectName}`);
    } catch (error) {
      this.logger.error(
        ` Failed to delete original video ${originalObjectName}:`,
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
        this.logger.log(` Deleted HLS folder: ${hlsFolder}`);
      } else {
        this.logger.log(` HLS folder does not exist: ${hlsFolder}`);
      }
    } catch (error) {
      this.logger.error(` Failed to delete HLS folder ${hlsFolder}:`, error);
    }

    // Delete Redis keys
    const durationKey = `${isAudio ? 'audio' : 'video'}:${fileName}:duration`;
    const progressKey = `${isAudio ? 'audio' : 'video'}:${fileName}:progress`;

    try {
      await this.redisService.del(durationKey);
      await this.redisService.del(progressKey);
      this.logger.log(` Deleted Redis keys for video: ${fileName}`);
    } catch (error) {
      this.logger.error(` Failed to delete Redis keys for ${fileName}:`, error);
    }
  }

  async getProgress(fileName: string): Promise<ProcessingProgress | null> {
    try {
      const isAudio = this.isAudioFile(fileName);
      return await this.redisService.getJSON<ProcessingProgress>(
        `${isAudio ? 'audio' : 'video'}:${fileName}:progress`,
      );
    } catch (error) {
      this.logger.error(`Failed to get progress for ${fileName}:`, error);
      return null;
    }
  }

  async getVideoDuration(fileName: string): Promise<number> {
    try {
      const isAudio = this.isAudioFile(fileName);
      const cached = await this.redisService.getJSON<number>(
        `${isAudio ? 'audio' : 'video'}:${fileName}:duration`,
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

  private validateMediaFile(
    buffer: Buffer,
    mimetype: string,
    skipSizeCheck = false,
  ): void {
    const isVideo = mimetype.startsWith('video/');
    const isAudio = mimetype.startsWith('audio/');

    if (!isVideo && !isAudio) {
      throw new BadRequestException('Only video or audio files are allowed');
    }

    //  Only check buffer size if not skipping and buffer is provided
    if (!skipSizeCheck && buffer && buffer.length > 0) {
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (buffer.length > maxSize) {
        throw new BadRequestException('File too large. Maximum size: 2GB');
      }
    }

    //  Additional mimetype validation
    const supportedVideo = [
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska',
    ];
    const supportedAudio = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a',
      'audio/ogg',
    ];
    const supported = [...supportedVideo, ...supportedAudio];

    if (!supported.includes(mimetype.toLowerCase())) {
      this.logger.warn(`Unsupported video type: ${mimetype}, but allowing...`);
    }
  }

  // Get HLS URL, return null if not processed yet
  async getVideoHLSUrl(fileName: string): Promise<string | null> {
    try {
      const isAudio = this.isAudioFile(fileName);
      const bucketName = isAudio ? 'ielts-audio' : 'ielts-videos';
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
    const isAudio = this.isAudioFile(fileName);
    try {
      const bucketName = isAudio ? 'ielts-audio' : 'ielts-videos';
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
      this.logger.warn(
        `Original ${isAudio ? 'audio' : 'video'} not found for ${fileName}:`,
        error,
      );
      return null;
    }
  }

  private isAudioFile(fileName: string): boolean {
    // File: audio/video - uuid.extension
    return fileName.startsWith('audio-');
  }
}
