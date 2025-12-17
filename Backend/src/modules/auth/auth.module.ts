import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as ms from 'ms';
import { StringValue } from 'ms';
import { GoogleStrategy } from 'src/modules/auth/strategies/google.strategy';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from 'src/modules/auth/strategies/local.strategy';
import { MailModule } from 'src/modules/mail/mail.module';
import { StudentsModule } from 'src/modules/students/students.module';
import { TeachersModule } from 'src/modules/teachers/teachers.module';
import { UsersModule } from 'src/modules/users/users.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    PassportModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        privateKey: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn:
            ms(
              configService.get<string>('JWT_ACCESS_EXPIRES_IN') as StringValue,
            ) / 1000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
