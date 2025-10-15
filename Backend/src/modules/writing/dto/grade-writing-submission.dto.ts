import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';

export enum GradingStatus {
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  NEEDS_REVIEW = 'needs_review',
}

export class GradeWritingSubmissionDto {
  @IsUUID()
  @IsNotEmpty()
  submissionId: string;

  @IsNumber()
  @IsNotEmpty()
  teacherScore: number;

  @IsString()
  @IsOptional()
  teacherFeedback?: string;

  @IsEnum(GradingStatus)
  @IsOptional()
  status?: GradingStatus;

  @IsString()
  @IsOptional()
  detailedFeedback?: string;

  @IsString()
  @IsOptional()
  suggestions?: string;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  weaknesses?: string;
}

export class WritingGradeResponse {
  id: string;
  submissionId: string;
  teacherScore: number;
  maxScore: number;
  teacherFeedback?: string;
  status: string;
  detailedFeedback?: string;
  suggestions?: string;
  strengths?: string;
  weaknesses?: string;
  gradedBy: string;
  gradedAt: Date;
}
