import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CertificateResponseDto {
  @ApiProperty({
    description: 'Certificate ID (combo enrollment ID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Certificate title (combo course name)',
    example: 'IELTS Band 5.0 - 6.5 Complete Course',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Certificate description (combo course description)',
    example:
      'Complete IELTS preparation course covering all four skills from band 5.0 to 6.5',
  })
  description?: string;

  @ApiProperty({
    description: 'Certificate URL (SVG file)',
    example:
      'https://minio.example.com/certificates/certificate-123-1234567890.svg',
  })
  certificate_url!: string;

  @ApiProperty({
    description: 'Certificate issue date',
    example: '2023-12-01T10:00:00Z',
    format: 'date-time',
  })
  issued_at!: Date;

  @ApiProperty({
    description: 'Progress percentage',
    example: 100,
  })
  progress!: number;

  @ApiPropertyOptional({
    description: 'Course thumbnail image URL',
    example: 'https://minio.example.com/courses/thumbnail/ielts-course.jpg',
  })
  thumbnail?: string;
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
