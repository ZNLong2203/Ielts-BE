import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { configureCloudinary } from 'src/configs/cloudinary.config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (
          !file.originalname.match(/\.(jpg|jpeg|png|svg|txt|pdf|doc|docx)$/i)
        ) {
          return cb(new Error('Invalid file type'), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: 'CLOUDINARY',
      useFactory: (configService: ConfigService) =>
        configureCloudinary(configService),
      inject: [ConfigService],
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
