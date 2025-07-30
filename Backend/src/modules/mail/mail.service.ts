import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly usersService: UsersService,
  ) {}

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
      const resetUrl = `http://localhost:3000/api/v1/auth/reset-teacher-password?token=${token}`;

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
}
