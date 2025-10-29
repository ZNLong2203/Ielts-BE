import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SpeakingPart {
  PART_1 = 'part_1',
  PART_2 = 'part_2',
  PART_3 = 'part_3',
}

export class SpeakingQuestion {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsOptional()
  context?: string;
}

export class SpeakingResponse {
  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsString()
  @IsOptional()
  duration?: string; // Duration of speaking in seconds
}

export class GradeSpeakingDto {
  @IsString()
  @IsNotEmpty()
  studentAnswer: string;

  @IsEnum(SpeakingPart)
  @IsNotEmpty()
  partType: SpeakingPart;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakingQuestion)
  questions: SpeakingQuestion[];

  @IsString()
  @IsOptional()
  additionalInstructions?: string;

  @IsString()
  @IsOptional()
  targetDuration?: string; // Expected duration for the part (e.g., "4-5 minutes for Part 2")

  @IsOptional()
  pronunciationAnalysis?: {
    transcription: string;
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
}

export class SpeakingGradeResponse {
  overallScore: number;
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalRangeAccuracy: number;
  pronunciation: number;
  detailedFeedback: string;
  partResponse: SpeakingGradeResponse;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

export class PartGradeResponse {
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalRangeAccuracy: number;
  pronunciation: number;
  feedback: string;
}

export class TranscribeAndGradeDto {
  @IsString()
  @IsNotEmpty()
  audioBuffer: any; // Buffer - will be handled by FileInterceptor

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsEnum(SpeakingPart)
  @IsNotEmpty()
  partType: SpeakingPart;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakingQuestion)
  questions: SpeakingQuestion[];

  @IsString()
  @IsOptional()
  additionalInstructions?: string;

  @IsString()
  @IsOptional()
  targetDuration?: string;
}

export class TranscribeAndGradeResponse {
  audioUrl: string;
  transcription: string;
  grading: SpeakingGradeResponse;
  pronunciationAnalysis?: {
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
}
