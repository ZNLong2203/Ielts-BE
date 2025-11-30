import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MinioConfigService } from 'src/configs/minio.config';
import { RedisModule } from 'src/redis/redis.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { MinioService } from './minio.service';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 200 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/webm',
          'audio/mp3',
          'audio/mpeg',
          'audio/wav',
          'audio/x-wav',
          'audio/ogg',
          'audio/m4a',
          'audio/x-m4a',
          'audio/webm',
          'application/pdf',
          'text/plain',
        ];

        // Normalize mimetype (remove charset, etc.) for comparison
        const normalizedMimeType = file.mimetype
          .split(';')[0]
          .trim()
          .toLowerCase();

        if (allowedTypes.includes(normalizedMimeType)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, MinioService, MinioConfigService],
  exports: [FilesService, MinioService],
})
export class FilesModule {}
