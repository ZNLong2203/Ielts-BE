import { Module } from '@nestjs/common';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';

@Module({
  controllers: [GradingController],
  providers: [GradingService],
})
export class GradingModule {}
