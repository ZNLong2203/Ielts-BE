import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from 'src/modules/files/files.module';
import { VIDEO_QUEUE_NAME } from 'src/modules/video/constants';
import { VideoProcessor } from 'src/modules/video/video.processor';
import { RedisModule } from 'src/redis/redis.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    FilesModule,
    RedisModule,
    PrismaModule,
    BullModule.registerQueue({
      name: VIDEO_QUEUE_NAME,
    }),
  ],
  controllers: [VideoController],
  providers: [VideoService, VideoProcessor],
  exports: [VideoService],
})
export class VideoModule {}
