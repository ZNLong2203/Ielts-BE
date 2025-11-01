import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format } from 'date-fns';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class MailService {
  private readonly dashboardUrl: string;
  private readonly logger = new Logger(MailService.name);
  constructor(
    private readonly mailerService: MailerService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.dashboardUrl = this.configService.get('FRONTEND_URL') + '/dashboard';
  }

  async sendVerificationEmail(id: string, to: string, token: string) {
    try {
      const verifyUrl = `http://localhost:3000/api/v1/auth/verify?token=${token}`;

      await this.mailerService.sendMail({
        to,
        subject: 'Verify your email address',
        template: 'verify-email', // templates/verify-email.hbs
        context: {
          verifyUrl,
        },
      });
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async sendResetTeacherPasswordEmail(
    id: string,
    to: string,
    token: string,
    fullName: string,
  ) {
    try {
      const resetUrl = `http://localhost:8000/auth/teacher/reset-password?token=${token}`;

      if (!fullName) {
        fullName = 'New Teacher';
      }
      await this.mailerService.sendMail({
        to,
        subject: 'Reset your password',
        template: 'reset-teacher-password', // templates/reset-password.hbs
        context: {
          fullName,
          resetUrl,
        },
      });
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async sendStudyReminder(data: {
    to: string;
    userName: string;
    course: string;
    scheduledTime: Date;
    studyGoal?: string;
    thumbnail?: string;
  }) {
    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Study Reminder: ${data.course}`,
        template: 'reminder-schedule',
        context: {
          userName: data.userName,
          course: data.course,
          scheduledTime: format(
            data.scheduledTime,
            'HH:mm, EEEE, MMMM dd, yyyy',
          ),
          studyGoal: data.studyGoal,
          thumbnail: data.thumbnail,
          dashboardUrl: this.dashboardUrl,
          unsubscribeUrl: `${this.dashboardUrl}/settings/notifications`,
        },
      });

      this.logger.log(`Email reminder sent to ${data.to}`);
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to send email to ${data.to}: ${e.message}`);
      throw error;
    }
  }
}
