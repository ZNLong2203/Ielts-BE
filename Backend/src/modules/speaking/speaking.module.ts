import { Module } from '@nestjs/common';
import { SpeakingService } from './speaking.service';
import { SpeakingController } from './speaking.controller';
import { GeminiModule } from '../../integrations/gemini/gemini.module';
import { WhisperModule } from '../../integrations/whisper/whisper.module';
import { FilesModule } from '../files/files.module';

@Module({
  controllers: [SpeakingController],
  providers: [SpeakingService],
  imports: [GeminiModule, WhisperModule, FilesModule],
})
export class SpeakingModule {}
