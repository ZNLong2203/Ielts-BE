import { Module } from '@nestjs/common';
import { SpeakingService } from './speaking.service';
import { SpeakingController } from './speaking.controller';
import { GeminiModule } from '../../integrations/gemini/gemini.module';

@Module({
  controllers: [SpeakingController],
  providers: [SpeakingService],
  imports: [GeminiModule],
})
export class SpeakingModule {}
