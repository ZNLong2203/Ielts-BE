import { Module } from '@nestjs/common';
import { StudyScheduleService } from './study-schedule.service';
import { StudyScheduleController } from './study-schedule.controller';

@Module({
  controllers: [StudyScheduleController],
  providers: [StudyScheduleService],
})
export class StudyScheduleModule {}
