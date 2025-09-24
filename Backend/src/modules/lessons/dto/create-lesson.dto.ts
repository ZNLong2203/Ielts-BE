import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiProperty({
    description: 'Section ID this lesson belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  sectionId: string;

  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to IELTS Speaking',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Lesson description',
    example:
      'This lesson covers the basics of IELTS Speaking test format and strategies.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Lesson type',
    enum: ['video', 'document', 'quiz', 'assignment'],
    example: 'video',
    default: 'video',
  })
  @IsOptional()
  @IsIn(['video', 'document', 'quiz', 'assignment'])
  lessonType?: string = 'video';

  @ApiPropertyOptional({
    description: 'Video URL',
    example: 'https://example.com/video.mp4',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Video duration in seconds',
    example: 1800,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  videoDuration?: number;

  @ApiPropertyOptional({
    description: 'Document URL',
    example: 'https://example.com/document.pdf',
  })
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional({
    description: 'Lesson ordering within section',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Whether this lesson is available for preview',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean = false;
}

class LessonOrderDto {
  @ApiProperty({
    description: 'Lesson ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'New ordering position',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  ordering: number;
}

export class ReorderLessonsDto {
  @ApiProperty({
    description: 'Array of lessons with their new ordering',
    type: [LessonOrderDto],
    example: [
      { id: '123e4567-e89b-12d3-a456-426614174000', ordering: 1 },
      { id: '123e4567-e89b-12d3-a456-426614174001', ordering: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderDto)
  lessons: LessonOrderDto[];
}
