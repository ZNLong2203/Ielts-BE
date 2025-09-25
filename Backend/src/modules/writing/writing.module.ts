import { Module } from '@nestjs/common';
import { WritingService } from './writing.service';
import { WritingController } from './writing.controller';
import { GeminiModule } from '../../integrations/gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [WritingController],
  providers: [WritingService],
})
export class WritingModule {}
