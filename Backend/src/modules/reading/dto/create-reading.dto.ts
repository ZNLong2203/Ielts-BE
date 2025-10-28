// src/modules/reading/dto/create-reading-exercise.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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

export class ParagraphDto {
  @ApiProperty({
    description: 'Paragraph identifier (A, B, C, D, E)',
    example: 'A',
  })
  @IsString()
  @Length(1, 1)
  id: string;

  @ApiProperty({
    description: 'Paragraph content',
    example: 'The ping of a text message has never sounded so sweet...',
  })
  @IsString()
  @Length(10, 5000)
  content: string;
}

export class CreateReadingPassageDto {
  @ApiProperty({
    description: 'Reading passage title',
    example: 'Money Transfers by Mobile',
  })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Full reading passage content',
    example: 'A. The ping of a text message has never sounded so sweet...',
  })
  @IsString()
  @Length(100, 10000)
  content: string;

  @ApiPropertyOptional({
    description: 'Paragraph sections',
    type: [ParagraphDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParagraphDto)
  @ArrayMinSize(0)
  paragraphs?: ParagraphDto[];

  @ApiPropertyOptional({
    description: 'Word count of the passage',
    example: 450,
    minimum: 100,
    maximum: 2000,
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(2000)
  word_count?: number;

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
}

export class CreateReadingExerciseDto {
  @ApiProperty({
    description: 'Test section ID that this exercise belongs to',
    format: 'uuid',
  })
  @IsUUID(4)
  test_section_id: string;

  @ApiProperty({
    description: 'Exercise title',
    example: 'Reading Passage 1',
  })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiPropertyOptional({
    description: 'Exercise instructions',
    example: 'Read the passage and answer the questions below.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  instruction?: string;

  @ApiProperty({
    description: 'Reading passage content',
    type: CreateReadingPassageDto,
  })
  @ValidateNested()
  @Type(() => CreateReadingPassageDto)
  passage: CreateReadingPassageDto;

  @ApiPropertyOptional({
    description: 'Time limit in minutes',
    example: 20,
    minimum: 1,
    maximum: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  time_limit?: number;

  @ApiPropertyOptional({
    description: 'Passing score percentage',
    example: 70,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  passing_score?: number;

  @ApiPropertyOptional({
    description: 'Exercise ordering',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}
