// src/modules/lessons/dto/exercise/create-exercise.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUESTION_TYPE, QuestionType } from 'src/modules/exercises/constants';

export class QuestionOptionDto {
  @ApiProperty({
    description: 'Option text',
    example: 'Paris',
  })
  @IsString()
  @IsNotEmpty()
  option_text: string;

  @ApiProperty({
    description: 'Is this the correct answer',
    example: true,
  })
  @IsBoolean()
  is_correct: boolean;

  @ApiProperty({
    description: 'Ordering of option',
    example: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  ordering?: number;

  @ApiProperty({
    description: 'Points for this option',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  point?: number;

  @ApiProperty({
    description: 'Explanation for this option',
    required: false,
  })
  @IsString()
  @IsOptional()
  explanation?: string;
}

export class CreateQuestionDto {
  // @ApiProperty({
  //   description: 'Exercise ID',
  //   example: 'exercise-uuid-123',
  // })
  // @IsString()
  // @IsNotEmpty()
  // exercise_id: string;

  @ApiProperty({
    description:
      'Question Group ID (required for MATCHING type, optional for others)',
    example: 'group-uuid-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  question_group_id?: string;

  @ApiProperty({
    description: 'Question type',
    enum: QUESTION_TYPE,
    example: QUESTION_TYPE.MULTIPLE_CHOICE,
  })
  @IsEnum(QUESTION_TYPE)
  @IsNotEmpty()
  question_type: QuestionType;

  @ApiProperty({
    description: 'Question text',
    example: 'What is the capital of France?',
  })
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @ApiProperty({
    description: 'Reading passage (for reading questions)',
    required: false,
  })
  @IsString()
  @IsOptional()
  reading_passage?: string;

  @ApiProperty({
    description:
      'Question options (for MULTIPLE_CHOICE, TRUE_FALSE, SUMMARY_COMPLETION)',
    type: [QuestionOptionDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @ApiProperty({
    description: 'Correct answer text (for FILL_BLANK)',
    example: 'Paris',
    required: false,
  })
  @IsString()
  @IsOptional()
  correct_answer?: string;

  @ApiProperty({
    description: 'Alternative correct answers (for FILL_BLANK)',
    example: ['paris', 'PARIS'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  alternative_answers?: string[];

  @ApiProperty({
    description: 'Points for this question',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  points?: number;

  @ApiProperty({
    description: 'Ordering within exercise',
    example: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  ordering?: number;

  @ApiProperty({
    description: 'Additional content (passage for reading, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Question group name (e.g., "Passage 1", "Task 1")',
    example: 'Passage 1',
    required: false,
  })
  @IsString()
  @IsOptional()
  question_group?: string;

  @ApiProperty({
    description: 'Explanation for the answer',
    required: false,
  })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({
    description: 'Image URL for the question',
    required: false,
  })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiProperty({
    description: 'Audio URL for the question',
    required: false,
  })
  @IsString()
  @IsOptional()
  audio_url?: string;

  @ApiProperty({
    description: 'Audio duration in seconds',
    example: 180,
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  audio_duration?: number;
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
}
