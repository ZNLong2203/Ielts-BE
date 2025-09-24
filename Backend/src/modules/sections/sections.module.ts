import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UtilsModule } from 'src/utils/utils.module';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';

@Module({
  imports: [PrismaModule, UtilsModule],
  controllers: [SectionsController],
  providers: [SectionsService],
})
export class SectionsModule {}
