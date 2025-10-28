import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class ParagraphDto {
  @ApiProperty({
    description: 'Paragraph ID',
    example: 'para-1',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Paragraph label (A, B, C, etc.)',
    example: 'A',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    description: 'Paragraph content',
    example: 'This is the first paragraph...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

class ReadingPassageDto {
  @ApiProperty({
    description: 'Passage title',
    example: 'The History of Coffee',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Full passage content',
    example: 'Coffee is one of the most popular beverages...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Paragraphs (optional - for paragraph matching questions)',
    type: [ParagraphDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ParagraphDto)
  paragraphs?: ParagraphDto[];

  @ApiProperty({
    description: 'Word count (auto-calculated if not provided)',
    example: 450,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  word_count?: number;

  @ApiProperty({
    description: 'Difficulty level (IELTS band: 0.0 - 9.0)',
    example: 6.5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(9)
  difficulty_level?: number;
}

export class CreateReadingExerciseDto {
  @ApiProperty({
    description: 'Test section ID',
    example: 'test-section-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  test_section_id: string;

  @ApiProperty({
    description: 'Exercise title',
    example: 'Reading Passage 1 - The History of Coffee',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Exercise instruction',
    example: 'Read the passage and answer the questions below.',
    required: false,
  })
  @IsString()
  @IsOptional()
  instruction?: string;

  @ApiProperty({
    description: 'Reading passage content',
    type: ReadingPassageDto,
  })
  @ValidateNested()
  @Type(() => ReadingPassageDto)
  passage: ReadingPassageDto;

  @ApiProperty({
    description: 'Time limit in minutes',
    example: 20,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  time_limit?: number;

  @ApiProperty({
    description: 'Passing score percentage',
    example: 70,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  passing_score?: number;

  @ApiProperty({
    description: 'Ordering within test section',
    example: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  ordering?: number;
}
