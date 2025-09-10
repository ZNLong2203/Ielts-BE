import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffprobe from 'node-ffprobe';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class DockerFFmpegConfigService {
  private readonly logger = new Logger(DockerFFmpegConfigService.name);
  private readonly containerName = 'ffmpeg-service';
  private isContainerRunning = false;

  constructor() {
    this.setupFFmpegPaths();
  }

  /**
   * Setup FFmpeg paths to use Docker container
   */
  private setupFFmpegPaths(): void {
    // Get absolute paths to wrapper scripts
    // process.cwd() returns Backend directory, so we need to go up one level
    const projectRoot = path.resolve(process.cwd(), '..');
    const ffmpegWrapper = path.join(projectRoot, 'ffmpeg', 'ffmpeg-docker');
    const ffprobeWrapper = path.join(projectRoot, 'ffmpeg', 'ffprobe-docker');

    // Set FFmpeg binary path to use wrapper scripts
    ffmpeg.setFfmpegPath(ffmpegWrapper);
    ffmpeg.setFfprobePath(ffprobeWrapper);

    this.logger.log(`FFmpeg paths configured to use Docker wrapper scripts:`);
    this.logger.log(`  FFmpeg: ${ffmpegWrapper}`);
    this.logger.log(`  FFprobe: ${ffprobeWrapper}`);
  }

  /**
   * Ensure FFmpeg container is running
   */
  async ensureContainerRunning(): Promise<void> {
    if (this.isContainerRunning) {
      return;
    }

    try {
      // Check if container is running
      const { stdout } = await execAsync(
        `docker ps --filter "name=${this.containerName}" --format "{{.Names}}"`,
      );

      if (stdout.trim() !== this.containerName) {
        this.logger.log('Starting FFmpeg container...');
        await execAsync(`docker-compose -f docker-compose.yml up -d ffmpeg`);
        this.logger.log('FFmpeg container started successfully');
      }

      this.isContainerRunning = true;
    } catch (error) {
      this.logger.error('Failed to start FFmpeg container:', error);
      throw new Error('FFmpeg container is not available');
    }
  }

  /**
   * Get FFmpeg instance configured for Docker
   */
  async getFFmpegInstance(): Promise<typeof ffmpeg> {
    await this.ensureContainerRunning();
    return ffmpeg;
  }

  /**
   * Get ffprobe instance configured for Docker
   */
  async getFFprobeInstance(): Promise<typeof ffprobe> {
    await this.ensureContainerRunning();
    return ffprobe;
  }

  /**
   * Convert local path to container path
   */
  convertToContainerPath(localPath: string): string {
    // Convert absolute path to container path
    const storagePath = path.resolve(process.cwd(), 'storage');
    const tmpPath = '/tmp';

    if (localPath.startsWith(storagePath)) {
      const relativePath = path.relative(storagePath, localPath);
      return `/data/${relativePath}`;
    } else if (localPath.startsWith('/tmp')) {
      return localPath; // Already in container format
    } else {
      // For other paths, assume they're in tmp
      return `/tmp/${path.basename(localPath)}`;
    }
  }

  /**
   * Create FFmpeg command with Docker wrapper
   */
  createFFmpegCommand(inputPath: string): any {
    const containerInputPath = this.convertToContainerPath(inputPath);

    return ffmpeg()
      .input(containerInputPath)
      .on('error', (error) => {
        this.logger.error('FFmpeg error:', error);
      });
  }

  /**
   * Get video info using ffprobe in Docker container
   */
  async getVideoInfo(inputPath: string): Promise<any> {
    await this.ensureContainerRunning();
    const containerInputPath = this.convertToContainerPath(inputPath);

    try {
      return await ffprobe(containerInputPath);
    } catch (error) {
      this.logger.error(`FFprobe failed for ${inputPath}:`, error);
      throw error;
    }
  }
}
