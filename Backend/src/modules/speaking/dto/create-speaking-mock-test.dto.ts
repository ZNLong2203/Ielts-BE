import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SpeakingPartType {
  PART_1 = 'part_1',
  PART_2 = 'part_2',
  PART_3 = 'part_3',
}

class SpeakingQuestionDto {
  @ApiProperty({
    description: 'Question text',
    example: 'What is your favorite hobby?',
  })
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @ApiPropertyOptional({
    description: 'Expected duration in seconds',
    example: 30,
  })
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(300)
  expected_duration?: number;

  @ApiPropertyOptional({
    description: 'Additional instructions for this question',
    example: 'Speak for at least 1 minute',
  })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Audio URL for this question (optional audio prompt)',
    example: 'https://example.com/audio/question1.mp3',
  })
  @IsString()
  @IsOptional()
  audio_url?: string;
}

export class CreateSpeakingMockTestExerciseDto {
  @ApiProperty({
    description: 'Test section ID',
    example: 'test-section-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  test_section_id: string;

  @ApiProperty({
    description: 'Exercise title',
    example: 'Speaking Part 1 - Introduction',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Exercise instruction',
    example: 'Answer the following questions about yourself.',
  })
  @IsString()
  @IsOptional()
  instruction?: string;

  @ApiProperty({
    description: 'Speaking part type',
    enum: SpeakingPartType,
    example: SpeakingPartType.PART_1,
  })
  @IsEnum(SpeakingPartType)
  @IsNotEmpty()
  part_type: SpeakingPartType;

  @ApiProperty({
    description: 'Questions for this speaking exercise',
    type: [SpeakingQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakingQuestionDto)
  questions: SpeakingQuestionDto[];

  @ApiPropertyOptional({
    description: 'Time limit in minutes',
    example: 5,
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
    description: 'Additional instructions for the entire exercise',
    example: 'Speak clearly and naturally. Use appropriate vocabulary.',
  })
  @IsString()
  @IsOptional()
  additional_instructions?: string;
}
