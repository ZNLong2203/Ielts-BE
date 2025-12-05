import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { MockTestsController } from './mock-tests.controller';
import { MockTestsService } from './mock-tests.service';
import { GradingModule } from 'src/modules/grading/grading.module';
import { SpeakingModule } from 'src/modules/speaking/speaking.module';
import { FilesModule } from 'src/modules/files/files.module';
import { WritingModule } from 'src/modules/writing/writing.module';
import { MailModule } from 'src/modules/mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    UtilsModule,
    GradingModule,
    SpeakingModule,
    FilesModule,
    WritingModule,
    MailModule,
  ],
  controllers: [MockTestsController],
  providers: [MockTestsService],
  exports: [MockTestsService],
})
export class MockTestsModule {}
