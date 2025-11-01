import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/decorator/customize';
import { VideoUploadRequest } from 'src/modules/video/interfaces';
import { VideoService } from './video.service';

@Controller('media')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload/presigned')
  @Public()
  async generatePresignedUrl(@Body() request: VideoUploadRequest) {
    return await this.videoService.generatePresignedUploadUrl(request);
  }

  @Post('upload/confirm/:fileName')
  @Public()
  async confirmUpload(@Param('fileName') fileName: string) {
    try {
      const result = await this.videoService.confirmUpload(fileName);

      return {
        success: true,
        message: 'Video uploaded successfully. HLS processing started.',
        data: {
          fileName: result.fileName,
          originalName: result.originalName,
          size: result.size,
          sizeFormatted: this.formatFileSize(result.size),
          mimeType: result.mimeType,
          originalUrl: result.url,
          isProcessing: result.isProcessing,
          estimatedProcessingTime: this.estimateProcessingTime(result.size),
          uploadedAt: new Date().toISOString(),
          statusUrl: `/api/v1/videos/${result.fileName}/status`,
          playerUrl: `/api/v1/videos/${result.fileName}/player`,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post('upload')
  @Public()
  @UseInterceptors(
    FileInterceptor('media', {
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    const isVideo = file.mimetype.startsWith('video/');
    const isAudio = file.mimetype.startsWith('audio/');

    if (!isVideo && !isAudio) {
      throw new BadRequestException('Only video or audio files are allowed');
    }

    try {
      const result = await this.videoService.uploadVideo(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      const typeLabel = isAudio ? 'Audio' : 'Video';

      return {
        success: true,
        message: `${typeLabel} uploaded successfully. HLS processing started.`,
        data: {
          fileName: result.fileName,
          originalName: result.originalName,
          size: result.size,
          sizeFormatted: this.formatFileSize(result.size),
          mimeType: result.mimeType,
          originalUrl: result.url,
          isProcessing: result.isProcessing,
          estimatedProcessingTime: this.estimateProcessingTime(result.size),
          uploadedAt: new Date().toISOString(),
          statusUrl: `/api/v1/media/${result.fileName}/status`,
          playerUrl: `/api/v1/media/${result.fileName}/player`,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get(':fileName/status')
  @Public()
  async getVideoStatus(@Param('fileName') fileName: string) {
    try {
      const hlsUrl = await this.videoService.getVideoHLSUrl(fileName);
      const isProcessed = hlsUrl !== null;
      const progress = await this.videoService.getProgress(fileName);
      const originalInfo =
        await this.videoService.getOriginalVideoInfo(fileName);

      //  Helper function để safely get timestamp
      const getTimestamp = (dateValue: any): number | null => {
        if (!dateValue) return null;

        if (dateValue instanceof Date) {
          return dateValue.getTime();
        }

        if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? null : date.getTime();
        }

        return null;
      };

      //  Calculate elapsed and remaining time safely
      let elapsedTime: number | null = null;
      let remainingTime: number | null = null;

      if (progress?.startTime) {
        const startTimestamp = getTimestamp(progress.startTime);
        if (startTimestamp) {
          elapsedTime = Math.round((Date.now() - startTimestamp) / 1000);
        }
      }

      if (progress?.estimatedCompletion) {
        const completionTimestamp = getTimestamp(progress.estimatedCompletion);
        if (completionTimestamp) {
          remainingTime = Math.max(
            0,
            Math.round((completionTimestamp - Date.now()) / 1000),
          );
        }
      }

      return {
        success: true,
        data: {
          fileName,
          isProcessed,
          hlsUrl,
          originalUrl: originalInfo?.url || null,
          status: isProcessed ? 'ready' : progress ? progress.stage : 'unknown',
          processing: progress
            ? {
                stage: progress.stage,
                progress: progress.progress,
                message: progress.message,
                startTime: progress.startTime,
                estimatedCompletion: progress.estimatedCompletion,
                currentSegment: progress.currentSegment,
                totalSegments: progress.totalSegments,
                uploadedSegments: progress.uploadedSegments,
                error: progress.error,
                elapsedTime, //  Safely calculated
                remainingTime, //  Safely calculated
              }
            : null,
          message: progress
            ? `${progress.message} (${progress.progress}%)`
            : isProcessed
              ? 'Video is ready for streaming'
              : 'Video processing status unknown',
          checkedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get(':fileName/stream-url')
  @Public()
  async getStreamUrl(@Param('fileName') fileName: string) {
    try {
      const hlsUrl = await this.videoService.getVideoHLSUrl(fileName);
      const originalInfo =
        await this.videoService.getOriginalVideoInfo(fileName);

      if (!hlsUrl && !originalInfo) {
        throw new BadRequestException('Video not found');
      }

      return {
        success: true,
        data: {
          fileName,
          hlsUrl,
          originalUrl: originalInfo?.url || null,
          preferredUrl: hlsUrl || originalInfo?.url,
          streamType: hlsUrl ? 'hls' : 'progressive',
          message: hlsUrl
            ? 'HLS stream available for adaptive playback'
            : 'Progressive download only (HLS processing may be in progress)',
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get stream URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get(':fileName/duration')
  @Public()
  async getVideoDuration(@Param('fileName') fileName: string) {
    try {
      const duration = await this.videoService.getVideoDuration(fileName);

      return {
        success: true,
        data: {
          fileName,
          duration,
          durationFormatted: this.formatDuration(duration),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get video duration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private estimateProcessingTime(fileSize: number): string {
    const minutes = Math.ceil(fileSize / (50 * 1024 * 1024));
    return `${minutes} minute(s)`;
  }
}
