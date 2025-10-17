import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileType } from 'src/common/constants/file';
import { MinioService, UploadResult } from './minio.service';

interface FileDeleteResult {
  success: boolean;
  deletedFiles: string[];
  notFoundFiles?: string[];
  errors?: string[];
}

@Injectable()
export class FilesService {
  constructor(private readonly minioService: MinioService) {}

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    fileType: FileType,
    mimetype?: string,
  ): Promise<UploadResult> {
    try {
      const mimeType = mimetype || this.getMimeTypeFromExtension(originalName);
      let result: UploadResult;

      switch (fileType) {
        case FileType.USER_AVATAR:
          result = await this.minioService.uploadAvatar(
            fileBuffer,
            originalName,
            mimeType,
          );
          break;
        case FileType.TEACHER_CERTIFICATE:
          // Handle both image and PDF certificates
          if (this.isPdfFile(originalName)) {
            result = await this.minioService.uploadDocument(
              fileBuffer,
              originalName,
              mimeType,
            );
          } else {
            result = await this.minioService.uploadAvatar(
              fileBuffer,
              originalName,
              mimeType,
            );
          }
          break;
        case FileType.BLOG_IMAGE:
          result = await this.minioService.uploadBlogImage(
            fileBuffer,
            originalName,
            mimeType,
          );
          break;
        case FileType.EXERCISE_IMAGE:
          result = await this.minioService.uploadExerciseImage(
            fileBuffer,
            originalName,
            mimeType,
          );
          break;
        case FileType.COURSE_THUMBNAIL:
          result = await this.minioService.uploadCourseImage(
            fileBuffer,
            originalName,
            mimeType,
          );
          break;
        case FileType.LESSON_MATERIAL:
          result = await this.minioService.uploadDocument(
            fileBuffer,
            originalName,
            mimeType,
          );
          break;
        case FileType.AUDIO:
          result = await this.minioService.uploadAudio(
            fileBuffer,
            originalName,
            mimeType,
          );
          break;
        default:
          throw new BadRequestException('Unsupported file type');
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `File upload failed: ${errorMessage}`,
      );
    }
  }

  async deleteFiles(
    urls: string | readonly string[] | null | undefined,
  ): Promise<FileDeleteResult> {
    try {
      // Normalize input: ensure urls is always an array
      const urlArray: readonly string[] = Array.isArray(urls)
        ? urls
        : urls
          ? [urls]
          : [];

      // Check empty array
      if (urlArray.length === 0) {
        return {
          success: true,
          deletedFiles: [],
          notFoundFiles: [],
        };
      }

      // Filter valid URLs
      const validUrls: string[] = urlArray.filter(
        (url): url is string =>
          url !== null &&
          url !== undefined &&
          typeof url === 'string' &&
          url.trim() !== '',
      );

      if (validUrls.length === 0) {
        throw new BadRequestException('No valid URLs provided for deletion');
      }

      const deletedFiles: string[] = [];
      const notFoundFiles: string[] = [];
      const errors: string[] = [];

      // Delete each file individually and collect results
      for (const url of validUrls) {
        try {
          const parsed = this.minioService.parseMinioUrl(url);
          if (!parsed) {
            errors.push(`Invalid URL format: ${url}`);
            continue;
          }

          await this.minioService.deleteFile(
            parsed.bucketName,
            parsed.objectName,
          );
          deletedFiles.push(url);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          if (
            errorMessage.includes('not found') ||
            errorMessage.includes('NoSuchKey')
          ) {
            notFoundFiles.push(url);
          } else {
            errors.push(`Failed to delete ${url}: ${errorMessage}`);
          }
        }
      }

      return {
        success: deletedFiles.length > 0,
        deletedFiles,
        notFoundFiles: notFoundFiles.length > 0 ? notFoundFiles : undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to delete files: ${errorMessage}`);
    }
  }

  async getFileUrl(bucketName: string, objectName: string): Promise<string> {
    try {
      return await this.minioService.getFileUrl(bucketName, objectName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get file URL: ${errorMessage}`);
    }
  }

  async getFileStream(bucketName: string, objectName: string) {
    try {
      return await this.minioService.getFileStream(bucketName, objectName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to get file stream: ${errorMessage}`,
      );
    }
  }

  private isPdfFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }

  private getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  private getMimeTypeFromExtension(fileName: string): string {
    const ext = this.getFileExtension(fileName);
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      webm: 'video/webm',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getMediaType(mediaUrl: string): 'audio' | 'image' | 'video' | 'unknown' {
    if (!mediaUrl) return 'unknown';

    const url = mediaUrl.toLowerCase();

    // Audio formats
    if (url.match(/\.(mp3|wav|ogg|aac|flac|m4a)(\?.*)?$/)) {
      return 'audio';
    }

    // Image formats
    if (url.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/)) {
      return 'image';
    }

    // Video formats
    if (url.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)(\?.*)?$/)) {
      return 'video';
    }

    return 'unknown';
  }
}
