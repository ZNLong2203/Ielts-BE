import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GeminiService } from '../../integrations/gemini/gemini.service';
import { WhisperService } from '../../integrations/whisper/whisper.service';
import { PronunciationAnalysisService } from './pronunciation-analysis.service';
import { FilesService } from '../files/files.service';
import { FileType } from 'src/common/constants/file';
import {
  GradeSpeakingDto,
  SpeakingGradeResponse,
  TranscribeAndGradeDto,
  TranscribeAndGradeResponse,
} from './dto/grade-speaking.dto';
import { UploadResult } from '../files/minio.service';
import * as ffprobe from 'node-ffprobe';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';

@Injectable()
export class SpeakingService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly whisperService: WhisperService,
    private readonly pronunciationAnalysisService: PronunciationAnalysisService,
    private readonly filesService: FilesService,
  ) {}

  async gradeSpeakingByGemini(
    gradeSpeakingDto: GradeSpeakingDto,
  ): Promise<SpeakingGradeResponse> {
    return await this.geminiService.gradeSpeaking(gradeSpeakingDto);
  }

  async uploadAndTranscribe(
    audioBuffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<{ uploadResult: UploadResult; transcription: string }> {
    try {
      // Upload audio to MinIO
      const uploadResult = await this.filesService.uploadFile(
        audioBuffer,
        originalName,
        FileType.AUDIO,
        mimetype,
      );

      // Transcribe using Whisper
      const transcription = await this.whisperService.transcribeAudio(
        audioBuffer,
        originalName,
      );

      return { uploadResult, transcription };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to upload and transcribe audio: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async transcribeAndGrade(
    dto: TranscribeAndGradeDto,
  ): Promise<TranscribeAndGradeResponse> {
    try {
      const { uploadResult, transcription } = await this.uploadAndTranscribe(
        dto.audioBuffer,
        dto.fileName,
        dto.mimetype,
      );

      // Get audio duration for pronunciation analysis
      let audioDuration: number | undefined;
      try {
        audioDuration = await this.getAudioDuration(
          dto.audioBuffer,
          dto.fileName,
        );
      } catch (error) {
        // If duration extraction fails, continue without it
        console.warn('Could not extract audio duration:', error);
      }

      // Analyze pronunciation and stress patterns
      const pronunciationAnalysis =
        this.pronunciationAnalysisService.analyzePronunciation(
          transcription,
          audioDuration,
        );

      // Grade the transcribed text with pronunciation analysis
      const gradeDto: GradeSpeakingDto = {
        studentAnswer: transcription,
        partType: dto.partType,
        questions: dto.questions,
        additionalInstructions: dto.additionalInstructions,
        targetDuration: dto.targetDuration,
        pronunciationAnalysis: {
          transcription: pronunciationAnalysis.transcription,
          metrics: pronunciationAnalysis.metrics,
          stressFeedback: pronunciationAnalysis.stressFeedback,
          pronunciationScore: pronunciationAnalysis.pronunciationScore,
          detailedFeedback: pronunciationAnalysis.detailedFeedback,
        },
      };

      const gradingResult = await this.geminiService.gradeSpeaking(gradeDto);

      return {
        audioUrl: uploadResult.url,
        transcription,
        grading: gradingResult,
        pronunciationAnalysis: {
          transcription: pronunciationAnalysis.transcription,
          words: pronunciationAnalysis.words,
          metrics: pronunciationAnalysis.metrics,
          stressFeedback: pronunciationAnalysis.stressFeedback,
          pronunciationScore: pronunciationAnalysis.pronunciationScore,
          detailedFeedback: pronunciationAnalysis.detailedFeedback,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to transcribe and grade: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(
    audioBuffer: Buffer,
    fileName: string,
  ): Promise<number | undefined> {
    try {
      // Write buffer to temporary file for ffprobe
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const tempFilePath = path.join(
        os.tmpdir(),
        `audio-${Date.now()}-${fileName}`,
      );
      fs.writeFileSync(tempFilePath, audioBuffer);

      const probeData = await ffprobe(tempFilePath, {
        path: ffprobeInstaller.path,
      });

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      if (probeData?.format?.duration) {
        return parseFloat(probeData.format.duration);
      }

      return undefined;
    } catch (error) {
      console.warn('Failed to get audio duration:', error);
      return undefined;
    }
  }
}
