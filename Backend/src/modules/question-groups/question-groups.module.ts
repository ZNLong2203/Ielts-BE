import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FilesModule } from '../files/files.module';
import { QuestionGroupsController } from './question-groups.controller';
import { QuestionGroupsService } from './question-groups.service';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [QuestionGroupsController],
  providers: [QuestionGroupsService],
  exports: [QuestionGroupsService],
})
export class QuestionGroupsModule {}
