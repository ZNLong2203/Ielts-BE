import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';

@Module({
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
