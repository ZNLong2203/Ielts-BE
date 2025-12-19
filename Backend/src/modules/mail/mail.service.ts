import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    this.dashboardUrl =
      this.configService.get('FRONTEND_URL') + '/student/dashboard';
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
    scheduledTime: string;
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
          scheduledTime: data.scheduledTime,
          studyGoal: data.studyGoal,
          thumbnail: data.thumbnail,
          dashboardUrl: this.dashboardUrl,
        },
      });

      this.logger.log(`Email reminder sent to ${data.to}`);
    } catch (error) {
      const e = error as Error;
      this.logger.error(`Failed to send email to ${data.to}: ${e.message}`);
      throw error;
    }
  }

  async sendWritingGradingComplete(data: {
    to: string;
    userName: string;
    testTitle: string;
    bandScore: number;
    testResultId: string;
  }) {
    try {
      const resultUrl = `${this.dashboardUrl}/my-quizzes/${data.testResultId}`;

      await this.mailerService.sendMail({
        to: data.to,
        subject: `Your Writing Test Has Been Graded - Band Score: ${data.bandScore}`,
        template: 'writing-grading-complete',
        context: {
          userName: data.userName,
          testTitle: data.testTitle,
          bandScore: data.bandScore,
          resultUrl,
          dashboardUrl: this.dashboardUrl,
        },
      });

      this.logger.log(`Writing grading complete email sent to ${data.to}`);
    } catch (error) {
      const e = error as Error;
      this.logger.error(
        `Failed to send writing grading email to ${data.to}: ${e.message}`,
      );
      throw error;
    }
  }

  async sendPaymentSuccessEmail(data: {
    to: string;
    userName: string;
    orderCode: string;
    finalAmount: number;
    discountAmount?: number;
    currency: string;
    paymentMethod: string;
    paymentDate: string;
    combos: Array<{
      id: string;
      name: string;
      startLevel: number;
      endLevel: number;
    }>;
  }) {
    try {
      const formatPrice = (amount: number): string => {
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(amount);
      };

      await this.mailerService.sendMail({
        to: data.to,
        subject: `Payment Successful - Order ${data.orderCode}`,
        template: 'payment-success',
        context: {
          userName: data.userName,
          orderCode: data.orderCode,
          finalAmount: formatPrice(data.finalAmount),
          discountAmount: data.discountAmount
            ? formatPrice(data.discountAmount)
            : null,
          currency: data.currency,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate,
          combos: data.combos,
          dashboardUrl: this.dashboardUrl,
          formatPrice: formatPrice,
        },
      });

      this.logger.log(`Payment success email sent to ${data.to}`);
    } catch (error) {
      const e = error as Error;
      this.logger.error(
        `Failed to send payment success email to ${data.to}: ${e.message}`,
      );
      throw error;
    }
  }
}
