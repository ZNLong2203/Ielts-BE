// src/modules/lessons/dto/exercise/create-exercise.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { QUESTION_TYPE, QuestionType } from 'src/modules/exercises/constants';

export class QuestionOptionDto {
  @ApiProperty({ description: 'Option text' })
  @IsString()
  @IsNotEmpty()
  option_text: string;

  @ApiProperty({ description: 'Is correct answer', default: false })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;

  @ApiProperty({ description: 'Option ordering', default: 0 })
  @IsOptional()
  @IsNumber()
  ordering?: number;

  @ApiProperty({ description: 'Option explanation', required: false })
  @IsOptional()
  @IsString()
  explanation?: string;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text/prompt' })
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @ApiProperty({
    enum: QUESTION_TYPE,
    description: 'Type of question',
    example: QUESTION_TYPE.MULTIPLE_CHOICE,
  })
  @IsEnum(QUESTION_TYPE)
  question_type: QuestionType;

  @ApiProperty({
    description: 'Media URL (audio/image/video)',
    required: false,
  })
  @IsOptional()
  @IsString()
  media_url?: string;

  @ApiProperty({ description: 'Question explanation/context', required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ description: 'Points for this question', default: 1 })
  @IsOptional()
  @IsNumber()
  points?: number;

  @ApiProperty({ description: 'Question ordering', default: 0 })
  @IsOptional()
  @IsNumber()
  ordering?: number;

  @ApiProperty({ description: 'Difficulty level (1-10)', default: 5 })
  @IsOptional()
  @IsNumber()
  difficulty_level?: number;

  @ApiProperty({
    type: [QuestionOptionDto],
    description: 'Answer options (for multiple choice, droplist, matching)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @ApiProperty({
    description: 'Correct answer text (for fill_blank, true_false)',
    required: false,
  })
  @IsOptional()
  @IsString()
  correct_answer?: string;

  @ApiProperty({
    description: 'Alternative correct answers (for fill_blank)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternative_answers?: string[];

  @ApiProperty({
    description: 'Additional content (passage for reading, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;
}

export class CreateExerciseDto {
  @ApiProperty({ description: 'Lesson ID' })
  @IsUUID()
  lesson_id: string;

  @ApiProperty({ description: 'Exercise title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Exercise description/instructions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Exercise instructions for students' })
  @IsOptional()
  @IsString()
  instruction?: string;

  @ApiProperty({
    description: 'Main content (passage, audio description, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Main media URL (audio, video, image)',
    required: false,
  })
  @IsOptional()
  @IsString()
  media_url?: string;

  @ApiProperty({ description: 'Time limit in minutes', default: 30 })
  @IsOptional()
  @IsNumber()
  time_limit?: number;

  @ApiProperty({ description: 'Maximum attempts allowed', default: 3 })
  @IsOptional()
  @IsNumber()
  max_attempts?: number;

  @ApiProperty({ description: 'Passing score percentage', default: 70 })
  @IsOptional()
  @IsNumber()
  passing_score?: number;

  @ApiProperty({ description: 'Exercise ordering in lesson', default: 0 })
  @IsOptional()
  @IsNumber()
  ordering?: number;

  @ApiProperty({ description: 'Is exercise active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    type: [CreateQuestionDto],
    description: 'Questions in this exercise',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
