import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioConfigService {
  constructor(private configService: ConfigService) {}

  createMinioClient(): Minio.Client {
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false');
    return new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get<string>('MINIO_PORT', '9000')),
      useSSL: useSSL === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'admin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'admin123'),
    });
  }

  getBucketConfig() {
    return {
      images: 'ielts-images',
      videos: 'ielts-videos',
      audio: 'ielts-audio',
      documents: 'ielts-documents',
    };
  }

  getFileTypeConfig() {
    return {
      images: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5MB
        folder: 'images',
      },
      videos: {
        allowedTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/webm'],
        maxSize: 2 * 1024 * 1024 * 1024, // 2GB cho videos 30-45 phút
        folder: 'videos',
      },
      audio: {
        allowedTypes: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
        maxSize: 20 * 1024 * 1024, // 20MB
        folder: 'audio',
      },
      documents: {
        allowedTypes: [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        maxSize: 10 * 1024 * 1024, // 10MB
        folder: 'documents',
      },
    };
  }
}
