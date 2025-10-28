import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsArray,
} from 'class-validator';

export enum WritingTaskType {
  TASK_1 = 'task_1',
  TASK_2 = 'task_2',
}

export class SaveWritingAssessmentDto {
  @IsString()
  @IsOptional()
  exerciseId?: string;

  @IsEnum(WritingTaskType)
  @IsNotEmpty()
  taskType: WritingTaskType;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  studentAnswer: string;

  @IsString()
  @IsOptional()
  wordLimit?: string;

  @IsString()
  @IsOptional()
  additionalInstructions?: string;

  // Scores
  @IsNumber()
  @IsNotEmpty()
  overallScore: number;

  @IsNumber()
  @IsNotEmpty()
  taskAchievementScore: number;

  @IsNumber()
  @IsNotEmpty()
  coherenceCohesionScore: number;

  @IsNumber()
  @IsNotEmpty()
  lexicalResourceScore: number;

  @IsNumber()
  @IsNotEmpty()
  grammaticalRangeAccuracyScore: number;

  // Feedback
  @IsString()
  @IsNotEmpty()
  detailedFeedback: string;

  @IsArray()
  @IsOptional()
  suggestions?: string[];

  @IsArray()
  @IsOptional()
  strengths?: string[];

  @IsArray()
  @IsOptional()
  weaknesses?: string[];

  // Detailed metrics
  @IsObject()
  @IsOptional()
  detailedMetrics?: any;

  // Sample answers
  @IsString()
  @IsOptional()
  upgradedEssay?: string;

  @IsString()
  @IsOptional()
  sampleAnswer?: string;

  // Metadata
  @IsString()
  @IsOptional()
  aiModel?: string;
}

export class WritingAssessmentResponse {
  id: string;
  userId: string;
  exerciseId?: string;
  taskType: string;
  question: string;
  studentAnswer: string;
  wordLimit?: string;
  additionalInstructions?: string;
  overallScore: number;
  taskAchievementScore: number;
  coherenceCohesionScore: number;
  lexicalResourceScore: number;
  grammaticalRangeAccuracyScore: number;
  detailedFeedback: string;
  suggestions?: string[];
  strengths?: string[];
  weaknesses?: string[];
  detailedMetrics?: any;
  upgradedEssay?: string;
  sampleAnswer?: string;
  aiModel?: string;
  gradingMethod: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
