import { Module } from '@nestjs/common';
import { VideoModule } from 'src/modules/video/video.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [PrismaModule, VideoModule, UtilsModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
