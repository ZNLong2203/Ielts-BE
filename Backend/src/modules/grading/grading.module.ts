import { Module } from '@nestjs/common';
import { BandCalculatorService } from 'src/modules/grading/band-calculator.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';

@Module({
  imports: [PrismaModule],
  controllers: [GradingController],
  providers: [GradingService, BandCalculatorService],
  exports: [GradingService, BandCalculatorService],
})
export class GradingModule {}
