import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `http://localhost:3000/api/v1/auth/verify?token=${token}`;

    await this.mailerService.sendMail({
      to,
      subject: 'Verify your email address',
      template: 'verify-email', // templates/verify-email.hbs
      context: {
        verifyUrl,
      },
    });
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
