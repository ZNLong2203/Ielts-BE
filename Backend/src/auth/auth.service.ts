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
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async register(dto: CreateUserDto) {
    const { token, user } = await this.usersService.register(dto);
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
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { profiles: true },
    });
    if (!user) return null;
    const match = this.usersService.isValidPassword(user, password);
    return match ? user : null;
  }

  async login(user: IUser, res: Response) {
    const payload = {
      sub: 'Token Login',
      iss: 'Server',
      id: user.id,
      full_name: user.profiles.full_name,
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
      full_name: user.profiles?.full_name || '',
      email: user.email,
      role: user.role,
    };

    const resData = {
      id: user.id,
      profiles: {
        full_name: user.profiles?.full_name || '',
      },
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

  createAccessToken(payload: object | Buffer) {
    return this.jwtService.sign(payload);
  }

  createRefreshToken(payload: object | Buffer) {
    const time =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: ms(time as StringValue) / 1000,
    });
  }

  async createBothTokens(
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

  async saveRefreshToken(userId: string, token: string, ttl: number) {
    await this.delRefreshToken(userId);
    await this.redisService.set(`refresh:${userId}`, token, ttl);
    await this.redisService.set(`refresh_token:${token}`, userId, ttl);
  }

  async delRefreshToken(userId: string) {
    const token = await this.redisService.get(`refresh:${userId}`);
    if (token) {
      await this.redisService.del(`refresh:${userId}`);
      await this.redisService.del(`refresh_token:${token}`);
    }
  }
}
