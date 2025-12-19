import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { RedisModule } from 'src/redis/redis.module';
import { UsersModule } from 'src/modules/users/users.module';
import { MailController } from './mail.controller';
import { MailCronService } from './mail-cron.service';
import { MailQueueService } from './mail-queue.service';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    ScheduleModule.forRoot(),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST'),
          secure: false,
          auth: {
            user: configService.get<string>('EMAIL_AUTH_USER'),
            pass: configService.get<string>('EMAIL_AUTH_PASSWORD'),
          },
        },
        defaults: {
          from: '"IELTS Platform" <no-reply@ielts.com>',
        },
        template: {
          dir: join(process.cwd(), 'src', 'modules', 'mail', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
        preview: configService.get<string>('EMAIL_PREVIEW') === 'true',
      }),
    }),
    UsersModule,
  ],
  controllers: [MailController],
  providers: [MailService, MailQueueService, MailCronService],
  exports: [MailService, MailQueueService],
})
export class MailModule {}
