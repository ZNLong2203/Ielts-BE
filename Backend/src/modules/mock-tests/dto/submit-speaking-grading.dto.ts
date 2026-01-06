import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitSpeakingGradingDto {
  @ApiProperty({
    description: 'Overall band score (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsNumber()
  @Min(0)
  @Max(9)
  overall_score: number;

  @ApiPropertyOptional({
    description: 'Fluency and Coherence score (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  fluency_coherence?: number;

  @ApiPropertyOptional({
    description: 'Lexical Resource score (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  lexical_resource?: number;

  @ApiPropertyOptional({
    description: 'Grammatical Range and Accuracy score (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  grammatical_range_accuracy?: number;

  @ApiPropertyOptional({
    description: 'Pronunciation score (0-9)',
    example: 7.0,
    minimum: 0,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  pronunciation?: number;

  @ApiPropertyOptional({
    description: 'Detailed feedback for the speaking test',
    example: 'Your speaking demonstrates good fluency and pronunciation...',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
