import { Module } from '@nestjs/common';
import { FilesModule } from 'src/modules/files/files.module';
import { VideoModule } from 'src/modules/video/video.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';

@Module({
  imports: [PrismaModule, FilesModule, VideoModule],
  controllers: [ReadingController],
  providers: [ReadingService],
  exports: [ReadingService],
})
export class ReadingModule {}
