import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { FilesModule } from 'src/modules/files/files.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [FilesModule, PrismaModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
