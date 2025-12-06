import { Module } from '@nestjs/common';
import { VideoModule } from 'src/modules/video/video.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { CertificatesModule } from 'src/modules/certificates/certificates.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [PrismaModule, VideoModule, UtilsModule, CertificatesModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
