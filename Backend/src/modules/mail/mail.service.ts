import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { USER_STATUS } from 'src/common/constants';
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
      await this.usersService.updateStatus(id, {
        status: USER_STATUS.INACTIVE,
      });
      throw new BadRequestException(e);
    }
  }

  // Ví dụ thêm nếu muốn mở rộng
  async sendWelcomeEmail(to: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Welcome to our service',
      html: `<p>Hello! Thank you for joining us.</p>`,
    });
  }
}
