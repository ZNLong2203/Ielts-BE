import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import * as ms from 'ms';
import { StringValue } from 'ms';
import { IJwtPayload } from 'src/interface/jwt-payload.interface';
import { IUser } from 'src/interface/users.interface';
import { MailService } from 'src/modules/mail/mail.service';
import { UpdateStudentDto } from 'src/modules/students/dto/update-student.dto';
import { StudentsService } from 'src/modules/students/students.service';
import { UpdateTeacherDto } from 'src/modules/teachers/dto/update-teacher.dto';
import { TeachersService } from 'src/modules/teachers/teachers.service';
import {
  RegisterStudentDto,
  RegisterTeacherDto,
} from 'src/modules/users/dto/create-user.dto';
import {
  UpdatePasswordDto,
  UpdateUserDto,
} from 'src/modules/users/dto/update-user.dto';
import { UsersService } from 'src/modules/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private studentsService: StudentsService,
    private teachersService: TeachersService,
  ) {}

  async registerStudent(dto: RegisterStudentDto) {
    const { token, user } = await this.usersService.registerStudent(dto);
    // Gửi email xác thực
    await this.mailService.sendVerificationEmail(user.email, token);

    return {
      createdAt: user.created_at,
    };
  }

  async registerTeacher(dto: RegisterTeacherDto) {
    const { token, user } = await this.usersService.registerTeacher(dto);
    // Gửi email xác thực
    await this.mailService.sendVerificationEmail(user.email, token);

    return {
      createdAt: user.created_at,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.verifyEmail(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    return {
      updatedAt: user.updated_at,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const match = this.usersService.isValidPassword(user, password);
    return match ? user : null;
  }

  async login(user: IUser, res: Response) {
    const payload = {
      sub: 'Token Login',
      iss: 'Server',
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };
    return this.createBothTokens(payload, payload, user, res, user.id);
  }

  async refresh(req: Request, res: Response) {
    const refresh_token = req.cookies['refresh_token'] as string | undefined;
    if (!refresh_token) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    let payload: IJwtPayload;

    try {
      payload = this.jwtService.verify(refresh_token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (e) {
      throw new BadRequestException('Invalid refresh token');
    }

    const user = await this.usersService.findByRefreshToken(refresh_token);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    payload = {
      sub: 'Token Refresh',
      iss: 'Server',
      id: user.id,
      full_name: user.full_name || '',
      email: user.email,
      role: user.role,
    };

    const resData = {
      id: user.id,
      full_name: user.full_name || '',
      email: user.email,
      role: user.role,
    };

    return this.createBothTokens(payload, payload, resData, res, user.id);
  }

  async logout(currentUser: IUser, res: Response) {
    await this.delRefreshToken(currentUser.id);
    res.clearCookie('refresh_token');
    return {
      logoutAt: new Date().toISOString(),
    };
  }

  async getProfile(user: IUser) {
    const userProfile = await this.usersService.findByEmail(user.id);
    if (!userProfile) {
      throw new BadRequestException('User not found');
    }
    const { password, id, ...userInfo } = userProfile;
    return userInfo;
  }

  // change password
  async changePassword(user: IUser, dto: UpdatePasswordDto, res: Response) {
    const userProfile = await this.usersService.findById(user.id);
    if (!userProfile) {
      throw new BadRequestException('User not found');
    }

    const isValid = this.usersService.isValidPassword(
      userProfile,
      dto.current_password,
    );
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.new_password !== dto.confirm_password) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    const hashedPassword = this.usersService.getHashPassword(dto.new_password);
    const updatedUser = await this.usersService.updateUser(user.id, {
      password: hashedPassword,
    });

    // logout user after password change
    await this.logout(user, res);

    return { updatedAt: updatedUser.updated_at };
  }

  async updateProfile(id: string, updateProfileDto: UpdateUserDto) {
    return this.usersService.updateProfile(id, updateProfileDto);
  }

  async updateStudentProfile(id: string, updateProfileDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateProfileDto);
  }

  async updateTeacherProfile(id: string, updateProfileDto: UpdateTeacherDto) {
    return this.teachersService.update(id, updateProfileDto);
  }

  // --------------------------------------------------------------------------
  // Helper methods
  // --------------------------------------------------------------------------
  private createAccessToken(payload: object | Buffer) {
    return this.jwtService.sign(payload);
  }

  private createRefreshToken(payload: object | Buffer) {
    const time =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: ms(time as StringValue) / 1000,
    });
  }

  private async createBothTokens(
    payloadAccessToken: IJwtPayload,
    payloadRefreshToken: IJwtPayload,
    resData: IUser,
    res: Response,
    userId: string,
  ) {
    const { id, full_name, email, role } = payloadAccessToken;
    const access_token = this.createAccessToken(payloadAccessToken);
    const refresh_token = this.createRefreshToken(payloadRefreshToken);

    res.clearCookie('refresh_token');

    const time =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    await this.saveRefreshToken(
      userId,
      refresh_token,
      ms(time as StringValue) / 1000,
    );

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      maxAge: ms(time as StringValue),
    });

    return {
      access_token,
      user: resData,
    };
  }

  private async saveRefreshToken(userId: string, token: string, ttl: number) {
    await this.delRefreshToken(userId);
    await this.redisService.set(`refresh:${userId}`, token, ttl);
    await this.redisService.set(`refresh_token:${token}`, userId, ttl);
  }

  private async delRefreshToken(userId: string) {
    const token = await this.redisService.get(`refresh:${userId}`);
    if (token) {
      await this.redisService.del(`refresh:${userId}`);
      await this.redisService.del(`refresh_token:${token}`);
    }
  }
}
