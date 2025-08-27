import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from 'src/decorator/customize';
import { VideoService } from './video.service';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @Public()
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Only video files are allowed');
    }

    try {
      const result = await this.videoService.uploadVideo(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

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

  @Get(':fileName/status')
  @Public()
  async getVideoStatus(@Param('fileName') fileName: string) {
    try {
      const hlsUrl = await this.videoService.getVideoHLSUrl(fileName);
      const isProcessed = hlsUrl !== null;
      const progress = await this.videoService.getProgress(fileName);
      const originalInfo =
        await this.videoService.getOriginalVideoInfo(fileName);

      // ✅ Helper function để safely get timestamp
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

      // ✅ Calculate elapsed and remaining time safely
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
                elapsedTime, // ✅ Safely calculated
                remainingTime, // ✅ Safely calculated
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

  @Get(':fileName/player')
  @Public()
  async getVideoPlayer(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    try {
      const hlsUrl = await this.videoService.getVideoHLSUrl(fileName);
      const progress = await this.videoService.getProgress(fileName);
      const originalInfo =
        await this.videoService.getOriginalVideoInfo(fileName);

      const playerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Video Player - ${fileName}</title>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f5f5f5;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          video { 
            width: 100%; 
            max-width: 800px; 
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .info { 
            margin: 20px 0; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 8px;
            border-left: 4px solid #007bff;
          }
          .status { 
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .status.ready { background: #d4edda; color: #155724; }
          .status.converting { background: #d1ecf1; color: #0c5460; }
          .status.uploading { background: #ffeaa7; color: #6c5500; }
          .status.processing { background: #fff3cd; color: #856404; }
          .status.error { background: #f8d7da; color: #721c24; }
          .status.failed { background: #f8d7da; color: #721c24; }
          .status.completed { background: #d4edda; color: #155724; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎬 Video Player</h1>
          
          <div class="info">
            <h3>📁 File Information</h3>
            <p><strong>File:</strong> ${fileName}</p>
            <p><strong>Current Time:</strong> ${new Date().toLocaleString()}</p>
            
            ${
              hlsUrl
                ? `
              <p><strong>HLS Status:</strong> <span class="status ready">✅ Ready</span></p>
              <p><strong>HLS URL:</strong> ${hlsUrl}</p>
            `
                : `
              <p><strong>HLS Status:</strong> <span class="status ${progress ? progress.stage : 'processing'}">⏳ ${progress ? progress.stage : 'Not Ready'}</span></p>
              ${progress ? `<p><strong>Progress:</strong> ${progress.progress}% - ${progress.message}</p>` : ''}
            `
            }
            
            ${
              originalInfo
                ? `
              <p><strong>Original URL:</strong> ${originalInfo.url}</p>
              <p><strong>Original Status:</strong> <span class="status ready">✅ Available</span></p>
            `
                : `
              <p><strong>Original URL:</strong> <span class="status error">❌ Not Found</span></p>
            `
            }
          </div>
          
          <div class="video-container">
            ${
              hlsUrl
                ? `
              <h3>🎥 HLS Video Player</h3>
              <video id="video" controls preload="metadata">
                <p>Your browser does not support the video tag.</p>
              </video>
              
              <script>
                const video = document.getElementById('video');
                const videoSrc = '${hlsUrl}';
                
                if (Hls.isSupported()) {
                  const hls = new Hls();
                  hls.loadSource(videoSrc);
                  hls.attachMedia(video);
                  hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    console.log('HLS manifest loaded, found ' + hls.levels.length + ' quality level(s)');
                  });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = videoSrc;
                } else {
                  console.error('HLS is not supported in this browser');
                }
              </script>
            `
                : `
              <div style="text-align: center; padding: 40px; background: #e9ecef; border-radius: 8px;">
                <h3>⏳ HLS Video Not Ready</h3>
                ${
                  progress
                    ? `
                  <p>${progress.message} (${progress.progress}%)</p>
                  ${progress.estimatedCompletion ? `<p>ETA: ${new Date(progress.estimatedCompletion).toLocaleTimeString()}</p>` : ''}
                `
                    : '<p>Processing status unknown</p>'
                }
                
                ${
                  originalInfo
                    ? `
                  <div style="margin: 20px 0;">
                    <h4>🎥 Original Video (Fallback)</h4>
                    <video controls style="width: 100%; max-width: 600px;">
                      <source src="${originalInfo.url}" type="video/mp4">
                      Your browser does not support the video tag.
                    </video>
                  </div>
                `
                    : ''
                }
                
                <button onclick="location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">🔄 Refresh</button>
              </div>
            `
            }
          </div>
        </div>
        
        ${
          !hlsUrl &&
          progress &&
          progress.stage !== 'completed' &&
          progress.stage !== 'failed'
            ? `
          <script>
            setTimeout(() => location.reload(), 5000);
          </script>
        `
            : ''
        }
      </body>
      </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(playerHtml);
    } catch (error) {
      res
        .status(500)
        .send(
          `Error loading player: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
