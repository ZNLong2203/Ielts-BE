import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsEnum,
} from 'class-validator';
import { WritingTaskType, WritingQuestionType } from './create-writing.dto';

export class CreateWritingMockTestExerciseDto {
  @ApiProperty({
    description: 'Test section ID',
    example: 'test-section-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  test_section_id: string;

  @ApiProperty({
    description: 'Exercise title',
    example: 'Writing Task 1 - Academic',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Exercise instruction',
    example: 'Write at least 150 words describing the chart below.',
  })
  @IsString()
  @IsOptional()
  instruction?: string;

  @ApiProperty({
    description: 'Writing task type',
    enum: WritingTaskType,
    example: WritingTaskType.TASK_1,
  })
  @IsEnum(WritingTaskType)
  @IsNotEmpty()
  task_type: WritingTaskType;

  @ApiProperty({
    description: 'Question type',
    enum: WritingQuestionType,
    example: WritingQuestionType.ESSAY,
  })
  @IsEnum(WritingQuestionType)
  @IsNotEmpty()
  question_type: WritingQuestionType;

  @ApiProperty({
    description: 'Question text/prompt',
    example:
      'The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.',
  })
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @ApiPropertyOptional({
    description: 'Question image URL (for Task 1 charts/graphs)',
    example: 'https://example.com/chart.png',
  })
  @IsString()
  @IsOptional()
  question_image?: string;

  @ApiPropertyOptional({
    description: 'Question chart data (JSON string for charts)',
    example: '{"type": "bar", "data": {...}}',
  })
  @IsString()
  @IsOptional()
  question_chart?: string;

  @ApiPropertyOptional({
    description: 'Word limit',
    example: 150,
  })
  @IsNumber()
  @IsOptional()
  @Min(50)
  @Max(500)
  word_limit?: number;

  @ApiPropertyOptional({
    description: 'Time limit in minutes',
    example: 20,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  time_limit?: number;

  @ApiPropertyOptional({
    description: 'Passing score percentage',
    example: 70,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  passing_score?: number;

  @ApiPropertyOptional({
    description: 'Ordering within test section',
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Keywords for the question',
    type: [String],
    example: ['chart', 'percentage', 'households'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'Sample answers',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  sample_answers?: string[];
}
