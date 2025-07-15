import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [UtilsModule, PrismaModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
