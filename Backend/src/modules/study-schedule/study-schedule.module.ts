import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from 'src/modules/mail/mail.module';
import { StudyScheduleCronService } from 'src/modules/study-schedule/study-schedule-cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StudyScheduleController } from './study-schedule.controller';
import { StudyScheduleService } from './study-schedule.service';

@Module({
  imports: [PrismaModule, MailModule, ScheduleModule.forRoot()],
  controllers: [StudyScheduleController],
  providers: [StudyScheduleService, StudyScheduleCronService],
  exports: [StudyScheduleService],
})
export class StudyScheduleModule {}
