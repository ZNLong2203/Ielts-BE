import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GeminiService } from '../../integrations/gemini/gemini.service';
import { WhisperService } from '../../integrations/whisper/whisper.service';
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

      // Grade the transcribed text
      const gradeDto: GradeSpeakingDto = {
        studentAnswer: transcription,
        partType: dto.partType,
        questions: dto.questions,
        additionalInstructions: dto.additionalInstructions,
        targetDuration: dto.targetDuration,
      };

      const gradingResult = await this.geminiService.gradeSpeaking(gradeDto);

      return {
        audioUrl: uploadResult.url,
        transcription,
        grading: gradingResult,
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
}
