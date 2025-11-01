import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CaslModule } from 'src/casl/casl.module';
import { MailModule } from 'src/modules/mail/mail.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { StudyScheduleCronService } from 'src/modules/study-schedule/study-schedule-cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StudyScheduleController } from './study-schedule.controller';
import { StudyScheduleService } from './study-schedule.service';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    MailModule,
    NotificationModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [StudyScheduleController],
  providers: [StudyScheduleService, StudyScheduleCronService],
  exports: [StudyScheduleService],
})
export class StudyScheduleModule {}
