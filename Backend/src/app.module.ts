import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from 'src/casl/guards/permission.guard';
import { AdminDashboardModule } from 'src/modules/admin-dashboard/admin-dashboard.module';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CouponsModule } from 'src/modules/coupons/coupons.module';
import { MockTestsModule } from 'src/modules/mock-tests/mock-tests.module';
import { OrdersModule } from 'src/modules/orders/orders.module';
import { PaymentsModule } from 'src/modules/payments/payments.module';
import { QuestionGroupsModule } from 'src/modules/question-groups/question-groups.module';
import { QuestionsModule } from 'src/modules/questions/questions.module';
import { SectionsModule } from 'src/modules/sections/sections.module';
import { StudyScheduleModule } from 'src/modules/study-schedule/study-schedule.module';
import { TeacherDashboardModule } from 'src/modules/teacher-dashboard/teacher-dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaslModule } from './casl/casl.module';
import { DatabaseController } from './database/database.controller';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { GeminiModule } from './integrations/gemini/gemini.module';
import { WhisperModule } from './integrations/whisper/whisper.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogCommentsModule } from './modules/blog-comments/blog-comments.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { FilesModule } from './modules/files/files.module';
import { GradingModule } from './modules/grading/grading.module';
import { LearningModule } from './modules/learning/learning.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { ListeningModule } from './modules/listening/listening.module';
import { MailModule } from './modules/mail/mail.module';
import { ReadingModule } from './modules/reading/reading.module';
import { SpeakingModule } from './modules/speaking/speaking.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { UsersModule } from './modules/users/users.module';
import { VideoModule } from './modules/video/video.module';
import { WritingModule } from './modules/writing/writing.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UtilsModule } from './utils/utils.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
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
    PaymentsModule,
    OrdersModule,
    LessonsModule,
    VideoModule,
    SectionsModule,
    CertificatesModule,
    GeminiModule,
    WhisperModule,
    WritingModule,
    SpeakingModule,
    ListeningModule,
    ReadingModule,
    ExercisesModule,
    LearningModule,
    MockTestsModule,
    QuestionsModule,
    QuestionGroupsModule,
    StudyScheduleModule,
    GradingModule,
    AdminDashboardModule,
    TeacherDashboardModule,
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
