import { Module } from '@nestjs/common';
import { SpeakingService } from './speaking.service';
import { SpeakingController } from './speaking.controller';
import { PronunciationAnalysisService } from './pronunciation-analysis.service';
import { GeminiModule } from '../../integrations/gemini/gemini.module';
import { WhisperModule } from '../../integrations/whisper/whisper.module';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  controllers: [SpeakingController],
  providers: [SpeakingService, PronunciationAnalysisService],
  imports: [GeminiModule, WhisperModule, FilesModule, PrismaModule],
  exports: [SpeakingService],
})
export class SpeakingModule {}
