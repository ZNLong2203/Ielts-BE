import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExerciseController } from './exercises.controller';
import { ExerciseService } from './exercises.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExerciseController],
  providers: [ExerciseService],
  exports: [ExerciseService],
})
export class ExercisesModule {}
