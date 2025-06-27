import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async register(dto: CreateUserDto) {
    // Kiểm tra email đã tồn tại chưa
    const existing = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email already exists');

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // generate email verification token unique, if exists, generate again
    let token = uuidv4();
    let existingToken = await this.prisma.users.findFirst({
      where: { email_verification_token: token },
    });
    while (existingToken) {
      token = uuidv4();
      existingToken = await this.prisma.users.findFirst({
        where: { email_verification_token: token },
      });
    }

    // Tạo user
    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        email_verification_token: token,
        email_verified: false,
        role: dto.role || 'STUDENT',
      },
    });

    // Gửi email xác thực
    await this.mailService.sendVerificationEmail(user.email, token);

    return {
      message:
        'Register successfully. Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string) {
    // Tìm user theo token
    console.log('Verifying email with token:', token);
    const user = await this.prisma.users.findFirst({
      where: { email_verification_token: token },
    });

    if (!user) throw new BadRequestException('Invalid verification token');

    // Cập nhật trạng thái đã xác thực
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verification_token: null, // Xoá token sau khi xác thực
      },
    });

    return {
      message: 'Email verified successfully. Please log in to your account.',
    };
  }
}
