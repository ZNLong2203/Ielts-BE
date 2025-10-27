import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class WhisperService {
  private readonly groqApiKey: string;
  private readonly groqApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.groqApiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';

    if (!this.groqApiKey) {
      console.warn('GROQ_API_KEY is not configured');
    }
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    fileName: string,
  ): Promise<string> {
    try {
      if (!this.groqApiKey) {
        throw new Error('GROQ_API_KEY is not configured');
      }

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: fileName,
        contentType: this.getMimeTypeFromFileName(fileName),
      });
      formData.append('model', 'whisper-large-v3');

      const response = await axios.post(this.groqApiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.groqApiKey}`,
        },
        timeout: 120000,
      });

      if (!response.data || !response.data.text) {
        throw new Error('No transcription text received from Groq Whisper API');
      }

      return String(response.data.text).trim();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Error transcribing audio: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      webm: 'audio/webm',
      flac: 'audio/flac',
      mpeg: 'audio/mpeg',
    };
    return mimeTypes[ext || ''] || 'audio/mpeg';
  }
}
