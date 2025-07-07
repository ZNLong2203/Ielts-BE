import { BadRequestException, Injectable } from '@nestjs/common';
import { users } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import {
  RegisterStudentDto,
  RegisterTeacherDto,
} from 'src/users/dto/create-user.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}
  getHashPassword(password: string) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  isValidPassword(user: users, password: string) {
    return bcrypt.compareSync(password, user.password);
  }

  async registerStudent(dto: RegisterStudentDto) {
    try {
      // Kiểm tra email đã tồn tại chưa
      const existing = await this.prisma.users.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new BadRequestException('Email already exists');

      // Hash password
      const hashedPassword = this.getHashPassword(dto.password);

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

      const result = await this.prisma.$transaction(async (tx) => {
        // Thực hiện các thao tác database bên trong transaction
        // Tạo user
        const user = await tx.users.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            email_verification_token: token,
            email_verified: false,
            role: 'STUDENT',
          },
        });

        // Tạo profile
        const profile = await tx.profiles.create({
          data: {
            full_name: dto.full_name,
            user_id: user.id,
          },
        });

        return {
          user,
          profile,
          token,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Ném lại lỗi nếu là BadRequestException
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async registerTeacher(dto: RegisterTeacherDto) {
    try {
      // Kiểm tra email đã tồn tại chưa
      const existing = await this.prisma.users.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new BadRequestException('Email already exists');

      // Hash password
      const hashedPassword = this.getHashPassword(dto.password);

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

      const result = await this.prisma.$transaction(async (tx) => {
        // Thực hiện các thao tác database bên trong transaction
        // Tạo user
        const user = await tx.users.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            email_verification_token: token,
            email_verified: false,
            role: 'TEACHER',
          },
        });

        // Tạo profile
        const profile = await tx.profiles.create({
          data: {
            full_name: dto.full_name,
            user_id: user.id,
            phone: dto.phone,
            date_of_birth: dto.date_of_birth,
            gender: dto.gender,
            country: dto.country,
            city: dto.city,
          },
        });

        // Tạo teacher profile
        await tx.teachers.create({
          data: {
            user_id: user.id,
            qualification: dto.qualification,
            experience_years: dto.experience_years,
            ielts_band_score: dto.ielts_band_score,
            certificate_urls: dto.certificate_urls,
            specializations: dto.specializations,
          },
        });

        return {
          user,
          profile,
          token,
        };
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Ném lại lỗi nếu là BadRequestException
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async verifyEmail(token: string) {
    // Tìm user theo token
    const user = await this.prisma.users.findFirst({
      where: { email_verification_token: token },
    });

    if (!user) throw new BadRequestException('Invalid verification token');

    // Cập nhật trạng thái đã xác thực
    return await this.prisma.users.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verification_token: null, // Xoá token sau khi xác thực
      },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.users.findUnique({
      where: { email },
      include: {
        profiles: true,
      },
    });
  }

  async findByRefreshToken(refreshToken: string) {
    const userId = await this.redisService.get(`refresh_token:${refreshToken}`);
    if (userId) {
      return await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          profiles: true,
        },
      });
    }
    return null;
  }
}
