import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';

export enum WritingTaskType {
  TASK_1 = 'task_1',
  TASK_2 = 'task_2',
}

export enum WritingQuestionType {
  ESSAY = 'essay',
  LETTER = 'letter',
  REPORT = 'report',
  DISCURSIVE = 'discursive',
}

export class CreateWritingDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsUUID()
  @IsNotEmpty()
  exerciseTypeId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  instruction?: string;

  @IsEnum(WritingTaskType)
  @IsNotEmpty()
  taskType: WritingTaskType;

  @IsEnum(WritingQuestionType)
  @IsNotEmpty()
  questionType: WritingQuestionType;

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsString()
  @IsOptional()
  questionImage?: string;

  @IsString()
  @IsOptional()
  questionChart?: string;

  @IsNumber()
  @IsOptional()
  wordLimit?: number;

  @IsNumber()
  @IsOptional()
  timeLimit?: number; // in minutes

  @IsNumber()
  @IsOptional()
  maxAttempts?: number;

  @IsNumber()
  @IsOptional()
  passingScore?: number;

  @IsNumber()
  @IsOptional()
  difficultyLevel?: number; // band score

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsArray()
  @IsOptional()
  sampleAnswers?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  ordering?: number;
}
