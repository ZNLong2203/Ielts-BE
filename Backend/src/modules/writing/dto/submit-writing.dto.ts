import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SubmitWritingDto {
  @IsUUID()
  @IsNotEmpty()
  exerciseId: string;

  @IsString()
  @IsNotEmpty()
  answerText: string;

  @IsNumber()
  @IsOptional()
  timeSpent?: number; // in seconds

  @IsString()
  @IsOptional()
  wordCount?: string;
}

export class WritingSubmissionResponse {
  id: string;
  exerciseId: string;
  answerText: string;
  score?: number;
  maxScore?: number;
  timeSpent?: number;
  status: string;
  feedback?: string;
  teacherFeedback?: string;
  teacherScore?: number;
  gradedBy?: string;
  gradedAt?: Date;
  createdAt: Date;
}
