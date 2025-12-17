import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as ffmpeg from 'fluent-ffmpeg';
import * as os from 'os';
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
    const projectRoot = path.resolve(process.cwd(), '..');
    const isWindows = os.platform() === 'win32';

    // Lấy đường dẫn
    const ffmpegPath = this.getWrapperPath(projectRoot, 'ffmpeg', isWindows);
    const ffprobePath = this.getWrapperPath(projectRoot, 'ffprobe', isWindows);

    // Thiết lập đường dẫn FFmpeg cho fluent-ffmpeg
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);

    this.logger.log(`FFmpeg paths configured:`);
    this.logger.log(`  Platform: ${os.platform()}`);
    this.logger.log(`  FFmpeg: ${ffmpegPath}`);
    this.logger.log(`  FFprobe: ${ffprobePath}`);
  }

  /**
   * Get FFmpeg / FFprobe path
   */
  private getWrapperPath(
    projectRoot: string,
    tool: string,
    isWindows: boolean,
  ): string {
    if (isWindows) {
      // Trên Windows: chỉ sử dụng tool từ PATH
      this.logger.debug(`Using ${tool} from PATH`);
      return tool; // fluent-ffmpeg sẽ tìm ffmpeg.exe/ffprobe.exe từ PATH
    } else {
      // Linux/macOS: sử dụng shell wrapper
      const shellPath = path.join(projectRoot, 'ffmpeg', `${tool}-docker`);
      this.logger.debug(`Using shell wrapper for ${tool}: ${shellPath}`);
      return shellPath;
    }
  }

  /**
   * Ensure FFmpeg container is running
   */
  async ensureContainerRunning(): Promise<void> {
    if (this.isContainerRunning) {
      return;
    }

    try {
      // Kiểm tra container đang chạy
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
   * Convert local path to container path
   */
  convertToContainerPath(localPath: string): string {
    if (!localPath) {
      throw new Error('Local path is required');
    }

    const normalizedPath = path.resolve(localPath);
    const isWindows = os.platform() === 'win32';

    if (isWindows) {
      // Windows: dùng path gốc, không convert
      this.logger.debug(
        `Windows detected, using local path: ${normalizedPath}`,
      );
      return normalizedPath;
    }

    // Sửa lỗi: Storage và tmp paths phải relative to vị trí docker-compose.yml
    const dockerComposeDir = path.resolve(process.cwd(), '..'); // Parent directory
    const storagePath = path.resolve(dockerComposeDir, 'storage');
    const tmpPath = path.resolve(dockerComposeDir, 'temp'); // Project temp directory

    this.logger.debug(` Converting path: ${normalizedPath}`);
    this.logger.debug(` Storage: ${storagePath}`);
    this.logger.debug(` Tmp: ${tmpPath}`);
    this.logger.debug(` Docker compose dir: ${dockerComposeDir}`);

    // Ánh xạ Storage
    if (normalizedPath.startsWith(storagePath)) {
      const relativePath = path.relative(storagePath, normalizedPath);
      const containerPath = `/data/${relativePath.replace(/\\/g, '/')}`;
      this.logger.debug(` Storage -> Container: ${containerPath}`);
      return containerPath;
    }

    // Ánh xạ Tmp
    if (normalizedPath.startsWith(tmpPath)) {
      const relativePath = path.relative(tmpPath, normalizedPath);
      const containerPath = `/tmp/${relativePath.replace(/\\/g, '/')}`;
      this.logger.debug(` Tmp -> Container: ${containerPath}`);
      return containerPath;
    }

    // Đã là đường dẫn container
    if (localPath.startsWith('/tmp/') || localPath.startsWith('/data/')) {
      this.logger.debug(` Already container path: ${localPath}`);
      return localPath;
    }

    // Dự phòng
    const fileName = path.basename(normalizedPath);
    const containerPath = `/tmp/${fileName}`;
    this.logger.warn(
      ` Unmapped path, using fallback: ${normalizedPath} -> ${containerPath}`,
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

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(containerInputPath, (err, data) => {
        if (err) {
          this.logger.error(`FFprobe failed for ${inputPath}:`, err);
          const errorMessage =
            err instanceof Error ? err.message : 'FFprobe failed';
          return reject(new Error(errorMessage));
        }
        resolve(data);
      });
    });
  }
}
