import { Module } from '@nestjs/common';
import { ReadingModule } from 'src/modules/reading/reading.module';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
import { VideoModule } from 'src/modules/video/video.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ReadingModule, VideoModule, PrismaModule],
  controllers: [ListeningController],
  providers: [ListeningService],
  exports: [ListeningService],
})
export class ListeningModule {}
