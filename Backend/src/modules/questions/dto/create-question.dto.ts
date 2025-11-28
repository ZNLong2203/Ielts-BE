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
  Min,
  ValidateNested,
} from 'class-validator';
import { QUESTION_TYPE, QuestionType } from 'src/modules/exercises/constants';

export class QuestionOptionTestDto {
  @ApiProperty({
    description: 'Option text',
    example: 'Paris',
  })
  @IsString()
  @IsOptional()
  option_text?: string;

  @ApiProperty({
    description: 'Is this the correct answer',
    example: true,
  })
  @IsBoolean()
  is_correct: boolean;

  @ApiProperty({
    description: 'Matching option ID (for MATCHING question type)',
    example: 'match-option-uuid-1',
    required: false,
  })
  @IsString()
  @IsOptional()
  matching_option_id?: string;

  @ApiProperty({
    description: 'Explanation for this option',
    example: 'Paris is the capital of France.',
    required: false,
  })
  @IsString()
  @IsOptional()
  explanation?: string;

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
}

export class CreateQuestionTestDto {
  @ApiProperty({
    description:
      'Question Group ID (required for MATCHING type, optional for others)',
    example: 'group-uuid-124',
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
      'Question options (for MULTIPLE_CHOICE, TRUE_FALSE, SUMMARY_COMPLETION, MATCHING types)',
    type: [QuestionOptionTestDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionTestDto)
  options?: QuestionOptionTestDto[];

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
