import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseController } from './database/database.controller';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { UtilsModule } from './utils/utils.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    MailModule,
    UtilsModule,
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
