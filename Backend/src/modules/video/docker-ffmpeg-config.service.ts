import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffprobe from 'node-ffprobe';
import * as path from 'path';
import { promisify } from 'util';

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
  // src/modules/video/docker-ffmpeg-config.service.ts

  convertToContainerPath(localPath: string): string {
    if (!localPath) {
      throw new Error('Local path is required');
    }

    const normalizedPath = path.resolve(localPath);

    // ✅ Fix: Storage và tmp paths phải relative to docker-compose.yml location
    const dockerComposeDir = path.resolve(process.cwd(), '..'); // Parent directory
    const storagePath = path.resolve(dockerComposeDir, 'storage');
    const tmpPath = path.resolve(dockerComposeDir, 'tmp/');

    this.logger.debug(`🔄 Converting path: ${normalizedPath}`);
    this.logger.debug(`📁 Storage: ${storagePath}`);
    this.logger.debug(`📂 Tmp: ${tmpPath}`);
    this.logger.debug(`🐳 Docker compose dir: ${dockerComposeDir}`);

    // Storage mapping
    if (normalizedPath.startsWith(storagePath)) {
      const relativePath = path.relative(storagePath, normalizedPath);
      const containerPath = `/data/${relativePath.replace(/\\/g, '/')}`;
      this.logger.debug(`📦 Storage -> Container: ${containerPath}`);
      return containerPath;
    }

    // ✅ Tmp mapping (fixed to match docker volume)
    else if (normalizedPath.startsWith(tmpPath)) {
      const relativePath = path.relative(tmpPath, normalizedPath);
      const containerPath = `/tmp/${relativePath.replace(/\\/g, '/')}`;
      this.logger.debug(`🗂️ Tmp -> Container: ${containerPath}`);
      return containerPath;
    }

    // Already container path
    if (localPath.startsWith('/tmp/') || localPath.startsWith('/data/')) {
      this.logger.debug(`📄 Already container path: ${localPath}`);
      return localPath;
    }

    // Fallback
    const fileName = path.basename(normalizedPath);
    const containerPath = `/tmp/${fileName}`;
    this.logger.warn(
      `⚠️ Unmapped path, using fallback: ${normalizedPath} -> ${containerPath}`,
    );
    return containerPath;
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
    console.log('Input path:', inputPath);
    const containerInputPath = this.convertToContainerPath(inputPath);
    console.log('Getting video info for:', containerInputPath);
    try {
      return await ffprobe(containerInputPath);
    } catch (error) {
      this.logger.error(`FFprobe failed for ${inputPath}:`, error);
      throw error;
    }
  }
}
