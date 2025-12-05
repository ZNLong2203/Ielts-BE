import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitWritingGradingDto {
  @ApiProperty({
    description: 'Overall band score for Task 1 (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsNumber()
  @Min(0)
  @Max(9)
  task1_score: number;

  @ApiPropertyOptional({
    description: 'Task Achievement score for Task 1 (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task1_task_achievement?: number;

  @ApiPropertyOptional({
    description: 'Coherence and Cohesion score for Task 1 (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task1_coherence_cohesion?: number;

  @ApiPropertyOptional({
    description: 'Lexical Resource score for Task 1 (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task1_lexical_resource?: number;

  @ApiPropertyOptional({
    description: 'Grammatical Range and Accuracy score for Task 1 (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task1_grammatical_range_accuracy?: number;

  @ApiPropertyOptional({
    description: 'Detailed feedback for Task 1',
    example: 'Your Task 1 response demonstrates good understanding of the data...',
  })
  @IsOptional()
  @IsString()
  task1_feedback?: string;

  @ApiProperty({
    description: 'Overall band score for Task 2 (0-9)',
    example: 7.5,
    minimum: 0,
    maximum: 9,
  })
  @IsNumber()
  @Min(0)
  @Max(9)
  task2_score: number;

  @ApiPropertyOptional({
    description: 'Task Achievement score for Task 2 (0-9)',
    example: 7.5,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task2_task_achievement?: number;

  @ApiPropertyOptional({
    description: 'Coherence and Cohesion score for Task 2 (0-9)',
    example: 7.5,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task2_coherence_cohesion?: number;

  @ApiPropertyOptional({
    description: 'Lexical Resource score for Task 2 (0-9)',
    example: 7.5,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task2_lexical_resource?: number;

  @ApiPropertyOptional({
    description: 'Grammatical Range and Accuracy score for Task 2 (0-9)',
    example: 7.5,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  task2_grammatical_range_accuracy?: number;

  @ApiPropertyOptional({
    description: 'Detailed feedback for Task 2',
    example: 'Your Task 2 essay shows strong argumentation skills...',
  })
  @IsOptional()
  @IsString()
  task2_feedback?: string;

  @ApiPropertyOptional({
    description: 'General feedback for the entire writing test',
    example: 'Overall, your writing demonstrates good command of English...',
  })
  @IsOptional()
  @IsString()
  general_feedback?: string;
}

