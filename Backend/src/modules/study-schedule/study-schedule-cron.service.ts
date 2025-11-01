import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addMinutes, format, isBefore } from 'date-fns';
import { NotificationGateway } from 'src/modules/notification/notification-gateway.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { REMINDER_STATUS, SCHEDULE_STATUS } from './types/types';

@Injectable()
export class StudyScheduleCronService {
  private readonly logger = new Logger(StudyScheduleCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly mailService: MailService,
  ) {}

  /**
   * Gửi reminders mỗi 5 phút
   * - Nếu user online: gửi real-time + save DB
   * - Nếu user offline: save DB + gửi email
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendPendingReminders() {
    try {
      const now = new Date();
      const fiveMinutesFromNow = addMinutes(now, 5);

      // Tìm các reminders cần gửi trong 5 phút tới
      const pendingReminders = await this.prisma.study_reminders.findMany({
        where: {
          status: REMINDER_STATUS.PENDING,
          scheduled_time: {
            gte: now,
            lte: fiveMinutesFromNow,
          },
          deleted: false,
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
          study_schedules: {
            include: {
              courses: {
                select: {
                  title: true,
                  thumbnail: true,
                },
              },
            },
          },
        },
      });

      if (pendingReminders.length === 0) {
        this.logger.debug('No pending reminders to send');
        return;
      }

      this.logger.log(
        `Processing ${pendingReminders.length} pending reminder(s)...`,
      );

      for (const reminder of pendingReminders) {
        try {
          const user = reminder.users;
          const schedule = reminder.study_schedules;
          const course = schedule?.courses;
          if (!user || !schedule) {
            return;
          }

          // 1. Tạo notification trong DB
          const notification =
            await this.notificationService.createNotification({
              userId: user.id,
              type: 'study_reminder',
              title: reminder.title,
              message: reminder.message,
              data: {
                scheduleId: schedule.id,
                course: course?.title,
                thumbnail: course?.thumbnail,
                scheduledTime: reminder.scheduled_time,
              },
            });

          // 2. Check user online và gửi real-time
          const isOnline = this.notificationGateway.sendNotificationToUser(
            user.id,
            {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              created_at: notification.created_at,
            },
          );

          // 3. Nếu user offline, gửi email
          if (!isOnline) {
            await this.mailService.sendStudyReminder({
              to: user.email,
              userName: user.full_name || 'Learner',
              course: course?.title || 'Study Session',
              scheduledTime: reminder.scheduled_time,
              studyGoal: schedule.study_goal || undefined,
              thumbnail: course?.thumbnail || undefined,
            });
          }

          // 4. Đánh dấu reminder đã gửi
          await this.prisma.study_reminders.update({
            where: { id: reminder.id },
            data: {
              status: REMINDER_STATUS.SENT,
              sent_at: new Date(),
            },
          });

          // 5. Update schedule
          await this.prisma.study_schedules.update({
            where: { id: schedule.id },
            data: {
              reminder_sent: true,
            },
          });

          this.logger.log(
            `Reminder sent to ${user.email} - ${isOnline ? 'Real-time' : 'Email'}`,
          );
        } catch (error) {
          const e = error as Error;
          this.logger.error(
            `Failed to send reminder ${reminder.id}: ${e.message}`,
          );

          // Đánh dấu failed
          await this.prisma.study_reminders.update({
            where: { id: reminder.id },
            data: {
              status: REMINDER_STATUS.FAILED,
            },
          });
        }
      }

      this.logger.log(`Processed ${pendingReminders.length} reminder(s)`);
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Error in sendPendingReminders: ${e.message}`);
    }
  }

  /**
   * Đánh dấu missed sessions mỗi giờ
   */
  @Cron(CronExpression.EVERY_HOUR)
  async markMissedSessions() {
    try {
      const now = new Date();

      // Lấy tất cả sessions đang scheduled
      const scheduledSessions = await this.prisma.study_schedules.findMany({
        where: {
          status: SCHEDULE_STATUS.SCHEDULED,
          deleted: false,
        },
        select: {
          id: true,
          scheduled_date: true,
          end_time: true,
        },
      });

      if (scheduledSessions.length === 0) {
        return;
      }

      const missedSessionIds: string[] = [];

      // Check từng session xem đã qua giờ chưa
      for (const session of scheduledSessions) {
        const endTimeStr =
          typeof session.end_time === 'string'
            ? session.end_time
            : format(session.end_time, 'HH:mm');

        const sessionEndTime = new Date(
          `${format(new Date(session.scheduled_date), 'yyyy-MM-dd')}T${endTimeStr}`,
        );

        if (isBefore(sessionEndTime, now)) {
          missedSessionIds.push(session.id);
        }
      }

      if (missedSessionIds.length === 0) {
        return;
      }

      // Update status thành missed
      const result = await this.prisma.study_schedules.updateMany({
        where: {
          id: { in: missedSessionIds },
        },
        data: {
          status: SCHEDULE_STATUS.MISSED,
          updated_at: now,
        },
      });

      this.logger.log(`Marked ${result.count} session(s) as missed`);
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Error in markMissedSessions: ${e.message}`);
    }
  }

  /**
   * Dọn dẹp reminders cũ mỗi ngày lúc nửa đêm
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldReminders() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Soft delete reminders đã gửi hoặc failed hơn 30 ngày
      const result = await this.prisma.study_reminders.updateMany({
        where: {
          status: { in: [REMINDER_STATUS.SENT, REMINDER_STATUS.FAILED] },
          sent_at: {
            lt: thirtyDaysAgo,
          },
          deleted: false,
        },
        data: {
          deleted: true,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old reminder(s)`);
      }
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Error in cleanupOldReminders: ${e.message}`);
    }
  }
}
