// src/modules/reading/dto/create-reading-question.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUESTION_TYPE, QuestionType } from 'src/modules/exercises/constants';

export class CreateQuestionOptionDto {
  @ApiProperty({
    description: 'Option text',
    example: 'A) Swimmers often roll their bodies too much when breathing.',
  })
  @IsString()
  @Length(1, 1000)
  option_text: string;

  @ApiPropertyOptional({
    description: 'Whether this option is correct',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;

  @ApiPropertyOptional({
    description: 'Option ordering',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Points awarded for this option',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  point?: number;

  @ApiPropertyOptional({
    description: 'Explanation for this option',
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  explanation?: string;
}

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Exercise ID that this question belongs to',
    format: 'uuid',
  })
  @IsUUID(4)
  exercise_id: string;

  @ApiProperty({
    description: 'Question text',
    example: 'Which TWO of the following are mentioned as common mistakes?',
  })
  @IsString()
  @Length(5, 2000)
  question_text: string;

  @ApiProperty({
    description: 'Type of question',
    enum: QUESTION_TYPE,
    example: QUESTION_TYPE.MULTIPLE_CHOICE,
  })
  @IsEnum(QUESTION_TYPE)
  question_type: QuestionType;

  @ApiPropertyOptional({
    description: 'Question group identifier',
    example: 'questions_1_4',
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  question_group?: string;

  @ApiPropertyOptional({
    description: 'Number of correct answers required',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  correct_answer_count?: number;

  @ApiPropertyOptional({
    description: 'Points awarded for correct answer',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  points?: number;

  @ApiPropertyOptional({
    description: 'Question ordering',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Difficulty level (IELTS band)',
    example: 6.5,
    minimum: 1,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(9)
  difficulty_level?: number;

  @ApiPropertyOptional({
    description: 'Question explanation',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Question options',
    type: [CreateQuestionOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  @ArrayMinSize(0)
  options?: CreateQuestionOptionDto[];

  @ApiPropertyOptional({
    description: 'Correct answer for fill-in-the-blank or true/false questions',
    example: 'True',
  })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  correct_answer?: string;

  @ApiPropertyOptional({
    description: 'Alternative correct answers',
    example: ['correct', 'right', 'true'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternative_answers?: string[];

  @ApiPropertyOptional({
    description: 'Matching set ID for paragraph matching questions',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID(4)
  matching_set_id?: string;
}
