import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum WritingTaskType {
  TASK_1 = 'task_1',
  TASK_2 = 'task_2',
}

export class GradeWritingDto {
  @IsString()
  @IsNotEmpty()
  studentAnswer: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsEnum(WritingTaskType)
  @IsNotEmpty()
  taskType: WritingTaskType;

  @IsString()
  @IsOptional()
  wordLimit?: string;

  @IsString()
  @IsOptional()
  additionalInstructions?: string;
}

export class WritingGradeResponse {
  overallScore: number;
  taskAchievement: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRangeAccuracy: number;
  detailedFeedback: string;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}
