import { Module } from '@nestjs/common';
import { FilesModule } from 'src/modules/files/files.module';
import { VideoModule } from 'src/modules/video/video.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExerciseController } from './exercises.controller';
import { ExerciseService } from './exercises.service';

@Module({
  imports: [PrismaModule, FilesModule, VideoModule],
  controllers: [ExerciseController],
  providers: [ExerciseService],
  exports: [ExerciseService],
})
export class ExercisesModule {}
