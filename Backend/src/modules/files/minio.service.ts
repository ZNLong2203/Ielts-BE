import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { MinioConfigService } from 'src/configs/minio.config';
import { v4 as uuid } from 'uuid';
import * as path from 'path';

export interface UploadResult {
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  etag: string;
}

interface FileTypeConfig {
  allowedTypes: string[];
  maxSize: number;
  folder: string;
}

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private readonly minioClient: Minio.Client;
  private readonly buckets: Record<string, string>;
  private readonly fileConfig: Record<string, FileTypeConfig>;

  constructor(private readonly minioConfigService: MinioConfigService) {
    this.minioClient = this.minioConfigService.createMinioClient();
    this.buckets = this.minioConfigService.getBucketConfig();
    this.fileConfig = this.minioConfigService.getFileTypeConfig();
    void this.initializeBuckets();
  }

  private async initializeBuckets() {
    try {
      for (const bucketName of Object.values(this.buckets)) {
        const exists = await this.minioClient.bucketExists(bucketName);
        if (!exists) {
          await this.minioClient.makeBucket(bucketName, 'us-east-1');
          this.logger.log(`Created bucket: ${bucketName}`);

          // Set public read policy for images and videos
          if (
            bucketName === this.buckets.images ||
            bucketName === this.buckets.videos
          ) {
            const policy = {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: '*',
                  Action: ['s3:GetObject'],
                  Resource: [`arn:aws:s3:::${bucketName}/*`],
                },
              ],
            };
            await this.minioClient.setBucketPolicy(
              bucketName,
              JSON.stringify(policy),
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize buckets:', error);
    }
  }

  async uploadFromBuffer(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    fileType: 'images' | 'videos' | 'audio' | 'documents',
    folder?: string,
  ): Promise<UploadResult> {
    try {
      // Validate file type and size
      this.validateFileBuffer(buffer, mimetype, fileType);

      const bucketName = this.buckets[fileType];
      const fileExtension = path.extname(originalName);
      const fileName = `${uuid()}${fileExtension}`;
      const objectName = folder ? `${folder}/${fileName}` : fileName;

      // Upload file
      const uploadInfo = await this.minioClient.putObject(
        bucketName,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': mimetype,
          'Cache-Control': 'max-age=31536000', // 1 year
        },
      );

      // Generate public URL
      const url = await this.getFileUrl(bucketName, objectName);

      return {
        fileName,
        originalName,
        size: buffer.length,
        mimeType: mimetype,
        url,
        etag: uploadInfo.etag,
      };
    } catch (error) {
      this.logger.error('Upload from buffer failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Upload failed: ${errorMessage}`);
    }
  }

  // Specific upload methods
  async uploadAvatar(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      buffer,
      originalName,
      mimetype,
      'images',
      'avatars',
    );
  }

  async uploadCourseImage(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      buffer,
      originalName,
      mimetype,
      'images',
      'courses',
    );
  }

  async uploadVideo(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      buffer,
      originalName,
      mimetype,
      'videos',
      'lessons',
    );
  }

  async uploadAudio(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      buffer,
      originalName,
      mimetype,
      'audio',
      'exercises',
    );
  }

  async uploadDocument(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      buffer,
      originalName,
      mimetype,
      'documents',
      'materials',
    );
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(bucketName, objectName);
      this.logger.log(`Deleted file: ${bucketName}/${objectName}`);
    } catch (error) {
      this.logger.error('Delete failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Delete failed: ${errorMessage}`);
    }
  }

  async getFileUrl(bucketName: string, objectName: string): Promise<string> {
    try {
      // For public buckets, return direct URL
      if (
        bucketName === this.buckets.images ||
        bucketName === this.buckets.videos
      ) {
        return `http://localhost:9000/${bucketName}/${objectName}`;
      }

      return await this.minioClient.presignedGetObject(
        bucketName,
        objectName,
        24 * 60 * 60,
      ); // 24 hours
    } catch (error) {
      this.logger.error('Get URL failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Get URL failed: ${errorMessage}`);
    }
  }

  async getFileStream(
    bucketName: string,
    objectName: string,
  ): Promise<NodeJS.ReadableStream> {
    try {
      return await this.minioClient.getObject(bucketName, objectName);
    } catch (error) {
      this.logger.error('Get stream failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Get stream failed: ${errorMessage}`);
    }
  }

  private validateFileBuffer(
    buffer: Buffer,
    mimetype: string,
    fileType: string,
  ): void {
    const config = this.fileConfig[fileType];

    if (!config) {
      throw new BadRequestException('Invalid file type');
    }

    if (!config.allowedTypes.includes(mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`,
      );
    }

    if (buffer.length > config.maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${config.maxSize / (1024 * 1024)}MB`,
      );
    }
  }

  parseMinioUrl(
    url: string,
  ): { bucketName: string; objectName: string } | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter((part) => part);

      if (pathParts.length < 2) return null;

      return {
        bucketName: pathParts[0],
        objectName: pathParts.slice(1).join('/'),
      };
    } catch {
      return null;
    }
  }
}
