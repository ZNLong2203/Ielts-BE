import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhisperService } from './whisper.service';

@Module({
  imports: [ConfigModule],
  providers: [WhisperService],
  exports: [WhisperService],
})
export class WhisperModule {}
