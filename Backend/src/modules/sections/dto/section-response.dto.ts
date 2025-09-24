import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SectionResponseDto {
  @ApiProperty({
    description: 'Section ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Section title',
    example: 'IELTS Speaking Fundamentals',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Section description',
    example:
      'This section covers the fundamental concepts of IELTS Speaking test.',
  })
  description?: string;

  @ApiProperty({
    description: 'Section ordering within course',
    example: 1,
  })
  ordering: number;

  @ApiProperty({
    description: 'Course ID this section belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  courseId: string;

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
