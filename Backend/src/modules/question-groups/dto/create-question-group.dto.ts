import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
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

export class MatchingOptionDto {
  @ApiProperty({
    description: 'Matching option text (e.g., "A", "B", "Paragraph 1")',
    example: 'A',
  })
  @IsString()
  @IsNotEmpty()
  option_text: string;

  @ApiProperty({
    description: 'Ordering of matching option',
    example: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  ordering?: number;
}

export class CreateQuestionGroupDto {
  @ApiProperty({
    description: 'Exercise ID',
    example: 'exercise-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  exercise_id: string;

  @ApiProperty({
    description: 'Group title (e.g., "Questions 1-4", "Questions 5-10")',
    example: 'Questions 1-4',
    required: false,
  })
  @IsString()
  @IsOptional()
  group_title?: string;

  @ApiProperty({
    description: 'Group instruction',
    example:
      'Which paragraph contains each of the following pieces of information?',
  })
  @IsString()
  @IsNotEmpty()
  group_instruction: string;

  @ApiProperty({
    description:
      'Passage reference (e.g., "The text has 5 paragraphs (A - E)")',
    example: 'The text has 5 paragraphs (A - E)',
    required: false,
  })
  @IsString()
  @IsOptional()
  passage_reference?: string;

  @ApiProperty({
    description: 'Question type for this group',
    enum: QUESTION_TYPE,
    example: QUESTION_TYPE.MATCHING,
  })
  @IsEnum(QUESTION_TYPE)
  @IsNotEmpty()
  question_type: QuestionType;

  @ApiProperty({
    description: 'Question range for display (e.g., "1-4", "5-10")',
    example: '1-4',
    required: false,
  })
  @IsString()
  @IsOptional()
  question_range?: string;

  @ApiProperty({
    description: 'Number of correct answers expected',
    example: 1,
    default: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  correct_answer_count?: number;

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
    description: 'Image URL for the question group',
    required: false,
  })
  @IsString()
  @IsOptional()
  image_url?: string;

  @ApiProperty({
    description: 'Matching options (for MATCHING type)',
    type: [MatchingOptionDto],
    example: [
      { option_text: 'A', ordering: 0 },
      { option_text: 'B', ordering: 1 },
      { option_text: 'C', ordering: 2 },
    ],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MatchingOptionDto)
  matching_options?: MatchingOptionDto[];
}
