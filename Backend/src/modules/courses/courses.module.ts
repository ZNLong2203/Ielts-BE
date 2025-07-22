import { Module } from '@nestjs/common';
import { CaslModule } from 'src/casl/casl.module';
import { FilesModule } from 'src/modules/files/files.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [PrismaModule, FilesModule, CaslModule, UtilsModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
