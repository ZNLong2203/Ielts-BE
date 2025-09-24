import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LessonResponseDto {
  @ApiProperty({
    description: 'Lesson ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to IELTS Speaking',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Lesson description',
    example:
      'This lesson covers the basics of IELTS Speaking test format and strategies.',
  })
  description?: string;

  @ApiProperty({
    description: 'Lesson type',
    enum: ['video', 'document', 'quiz', 'assignment'],
    example: 'video',
  })
  lessonType: string;

  @ApiPropertyOptional({
    description: 'Video URL',
    example: 'https://example.com/video.mp4',
  })
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Video duration in seconds',
    example: 1800,
  })
  videoDuration?: number;

  @ApiPropertyOptional({
    description: 'Document URL',
    example: 'https://example.com/document.pdf',
  })
  documentUrl?: string;

  @ApiProperty({
    description: 'Lesson ordering within section',
    example: 1,
  })
  ordering: number;

  @ApiProperty({
    description: 'Whether this lesson is available for preview',
    example: false,
  })
  isPreview: boolean;

  @ApiProperty({
    description: 'Section ID this lesson belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  sectionId: string;

  @ApiProperty({
    description: 'Created date',
    example: '2023-11-01T10:00:00Z',
    format: 'date-time',
  })
  created_at: string;

  @ApiProperty({
    description: 'Updated date',
    example: '2023-11-15T14:30:00Z',
    format: 'date-time',
  })
  updated_at: string;
}

export class VideoUploadStatusDto {
  @ApiProperty({
    description: 'Upload status',
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'processing',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 75,
  })
  progress?: number;

  @ApiPropertyOptional({
    description: 'Error message if upload failed',
    example: 'File format not supported',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'Video URL when upload is completed',
    example: 'https://example.com/uploaded-video.mp4',
  })
  videoUrl?: string;
}

export class ApiResponseDto<T> {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
  })
  data: T;
}
