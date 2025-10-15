import { Module } from '@nestjs/common';
import { WritingService } from './writing.service';
import { WritingController } from './writing.controller';
import { GeminiModule } from '../../integrations/gemini/gemini.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CaslModule } from '../../casl/casl.module';

@Module({
  imports: [PrismaModule, GeminiModule, CaslModule],
  controllers: [WritingController],
  providers: [WritingService],
  exports: [WritingService],
})
export class WritingModule {}
