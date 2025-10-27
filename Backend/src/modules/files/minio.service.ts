import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import * as path from 'path';
import { MinioConfigService } from 'src/configs/minio.config';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';

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
        }

        // Set public read policy for images and videos
        if (
          bucketName === this.buckets.images ||
          bucketName === this.buckets.videos ||
          bucketName === this.buckets.audio
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
    } catch (error) {
      this.logger.error('Failed to initialize buckets:', error);
    }
  }

  // General upload method
  async uploadFromBuffer(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    fileType: 'images' | 'videos' | 'audio' | 'documents',
    folder?: string,
  ): Promise<UploadResult> {
    try {
      this.validateFileBuffer(buffer, mimetype, fileType);

      const bucketName = this.buckets[fileType];
      const fileExtension = path.extname(originalName);
      const fileName = `${uuid()}${fileExtension}`;
      const objectName = folder ? `${folder}/${fileName}` : fileName;

      const uploadInfo = await this.minioClient.putObject(
        bucketName,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': mimetype,
          'Cache-Control': 'max-age=31536000',
        },
      );

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

  async uploadBlogImage(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      buffer,
      originalName,
      mimetype,
      'images',
      'blogs',
    );
  }

  async uploadExerciseImage(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      buffer,
      originalName,
      mimetype,
      'images',
      'exercises',
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

  // Public methods for VideoService to use
  async putObject(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    metadata?: Record<string, string>,
  ) {
    return await this.minioClient.putObject(
      bucketName,
      objectName,
      buffer,
      buffer.length,
      metadata,
    );
  }

  async putObjectStream(
    bucketName: string,
    objectName: string,
    stream: Readable,
    metadata?: Record<string, string>,
  ) {
    return await this.minioClient.putObject(
      bucketName,
      objectName,
      stream,
      undefined,
      metadata,
    );
  }

  async getObjectStream(
    bucketName: string,
    objectName: string,
  ): Promise<Readable> {
    try {
      return await this.minioClient.getObject(bucketName, objectName);
    } catch (error) {
      this.logger.error(
        `Failed to get object stream: ${bucketName}/${objectName}`,
        error,
      );
      throw error;
    }
  }

  async objectExists(bucketName: string, objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async listObjectsWithPrefix(
    bucketName: string,
    prefix: string,
  ): Promise<string[]> {
    const objectsList = this.minioClient.listObjects(bucketName, prefix, true);
    const objectsToDelete: string[] = [];

    for await (const obj of objectsList) {
      const objectInfo = obj as { name?: string };
      if (objectInfo.name) {
        objectsToDelete.push(objectInfo.name);
      }
    }

    return objectsToDelete;
  }

  async removeObjects(
    bucketName: string,
    objectNames: string[],
  ): Promise<void> {
    await this.minioClient.removeObjects(bucketName, objectNames);
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
      if (
        bucketName === this.buckets.images ||
        bucketName === this.buckets.videos ||
        bucketName === this.buckets.audio
      ) {
        return `http://localhost:9000/${bucketName}/${objectName}`;
      }

      return await this.minioClient.presignedGetObject(
        bucketName,
        objectName,
        24 * 60 * 60,
      );
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

    const normalizedMimeType = mimetype.split(';')[0].trim();

    if (!config.allowedTypes.includes(normalizedMimeType)) {
      console.log(
        `MIME type mismatch: received "${mimetype}", normalized to "${normalizedMimeType}", allowed: ${config.allowedTypes.join(', ')}`,
      );
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

  async deleteFolderContents(
    bucketName: string,
    prefix: string,
  ): Promise<void> {
    try {
      const objects = this.minioClient.listObjects(bucketName, prefix, true);
      const objectsToDelete: string[] = [];

      for await (const obj of objects) {
        if (obj.name) {
          objectsToDelete.push(obj.name);
        }
      }

      if (objectsToDelete.length > 0) {
        await this.minioClient.removeObjects(bucketName, objectsToDelete);
      }
    } catch (error) {
      throw new Error(`Failed to delete folder contents: ${error.message}`);
    }
  }

  /**
   * ✅ Generate presigned PUT URL for direct upload
   */
  async generatePresignedPutUrl(
    bucketName: string,
    objectName: string,
    expiresIn: number = 60 * 60, // 1 hour
  ): Promise<string> {
    try {
      const presignedUrl = await this.minioClient.presignedPutObject(
        bucketName,
        objectName,
        expiresIn,
      );

      this.logger.log(`✅ Generated presigned PUT URL: ${objectName}`);
      return presignedUrl;
    } catch (error) {
      const e = error as Error;
      this.logger.error(
        `❌ Failed to generate presigned PUT URL: ${e.message}`,
      );
      throw new Error(`Failed to generate presigned URL: ${e.message}`);
    }
  }

  /**
   * ✅ Get file as buffer
   */
  async getFileBuffer(bucketName: string, objectName: string): Promise<Buffer> {
    try {
      const stream = await this.minioClient.getObject(bucketName, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      const e = error as Error;
      this.logger.error(`❌ Failed to get file buffer: ${e.message}`);
      throw new Error(`Failed to get file: ${e.message}`);
    }
  }
}
