import { Module } from '@nestjs/common';
import { VideoModule } from 'src/modules/video/video.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [PrismaModule, VideoModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
