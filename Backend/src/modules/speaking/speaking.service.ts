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
      console.log('Starting transcribeAndGrade for file:', dto.fileName);

      // Ensure audioBuffer is a Buffer
      const audioBuffer: Buffer = Buffer.isBuffer(dto.audioBuffer)
        ? dto.audioBuffer
        : Buffer.from(dto.audioBuffer as ArrayBuffer);

      console.log('Uploading and transcribing audio...');
      const { uploadResult, transcription } = await this.uploadAndTranscribe(
        audioBuffer,
        dto.fileName,
        dto.mimetype,
      );
      console.log('Transcription completed:', transcription.substring(0, 100));

      // Get audio duration for pronunciation analysis
      let audioDuration: number | undefined;
      try {
        audioDuration = await this.getAudioDuration(audioBuffer, dto.fileName);
      } catch (error) {
        // If duration extraction fails, continue without it
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn('Could not extract audio duration:', errorMessage);
      }

      // Analyze pronunciation and stress patterns from audio
      let pronunciationAnalysis: {
        transcription: string;
        words: Array<{
          word: string;
          expectedStress: number[];
          phonemes: string[];
          syllableCount: number;
        }>;
        metrics: {
          speechRate: number;
          pauseCount: number;
          averageWordLength: number;
          stressPatternMatch: number;
        };
        stressFeedback: string[];
        pronunciationScore: number;
        detailedFeedback: string;
      };
      try {
        pronunciationAnalysis =
          await this.pronunciationAnalysisService.analyzePronunciation(
            transcription,
            audioDuration,
            audioBuffer, // Pass audio buffer for real audio analysis
            dto.fileName, // Pass file name
          );
      } catch (pronunciationError) {
        // If pronunciation analysis fails, log and continue with basic analysis
        const errorMessage =
          pronunciationError instanceof Error
            ? pronunciationError.message
            : 'Unknown error';
        console.warn(
          `Pronunciation analysis failed, using fallback: ${errorMessage}`,
        );
        // Use fallback text-based analysis
        pronunciationAnalysis =
          await this.pronunciationAnalysisService.analyzePronunciation(
            transcription,
            audioDuration,
          );
      }

      // Grade the transcribed text with pronunciation analysis
      console.log('Preparing grading request...');
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

      console.log('Calling Gemini API for grading...');
      const gradingResult = await this.geminiService.gradeSpeaking(gradeDto);
      console.log('Grading completed successfully');

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
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('Error in transcribeAndGrade:', errorMessage);
      if (errorStack) {
        console.error('Error stack:', errorStack);
      }

      // Check for specific error types
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT')
      ) {
        throw new HttpException(
          `Network error: ${errorMessage}. Please check your connection and try again.`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('TIMEOUT')
      ) {
        throw new HttpException(
          `Request timeout: ${errorMessage}. The operation took too long. Please try again with a shorter audio file.`,
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        `Failed to transcribe and grade: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get audio duration using WAV decoder (ffprobe is unreliable and causes errors)
   */
  private async getAudioDuration(
    audioBuffer: Buffer,
    fileName: string,
  ): Promise<number | undefined> {
    // Only try WAV decoder for WAV files
    // Skip ffprobe entirely as it causes JSON parsing errors when not available
    if (fileName.toLowerCase().endsWith('.wav')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const WavDecoderModule = await import('wav-decoder');
        const decoder = WavDecoderModule as {
          decode: (buffer: Buffer) => Promise<{ duration: number }>;
        };
        const decoded = await decoder.decode(audioBuffer);
        if (decoded && typeof decoded.duration === 'number') {
          return decoded.duration;
        }
      } catch (error) {
        // If WAV decoding fails, return undefined
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn('Failed to decode WAV file:', errorMessage);
      }
    }

    // For non-WAV files, return undefined and let the system estimate duration
    // We skip ffprobe to avoid JSON parsing errors when it's not available
    return undefined;
  }
}
