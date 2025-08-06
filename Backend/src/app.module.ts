import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from 'src/casl/guards/permission.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CouponsModule } from 'src/modules/coupons/coupons.module';
import { PaymentsModule } from 'src/modules/payments/payments.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaslModule } from './casl/casl.module';
import { DatabaseController } from './database/database.controller';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { AuthModule } from './modules/auth/auth.module';
import { BlogCommentsModule } from './modules/blog-comments/blog-comments.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { CartsModule } from './modules/carts/carts.module';
import { CoursesModule } from './modules/courses/courses.module';
import { FilesModule } from './modules/files/files.module';
import { MailModule } from './modules/mail/mail.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
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
    RedisModule,
    CaslModule,
    BlogsModule,
    StudentsModule,
    TeachersModule,
    FilesModule,
    BlogCommentsModule,
    CoursesModule,
    CouponsModule,
    CartsModule,
    PaymentsModule,
  ],
  controllers: [AppController, DatabaseController],
  providers: [
    AppService,
    DatabaseService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
