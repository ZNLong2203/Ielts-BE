import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configureCloudinary } from 'src/configs/cloudinary.config';

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
})
export class FilesModule {}
