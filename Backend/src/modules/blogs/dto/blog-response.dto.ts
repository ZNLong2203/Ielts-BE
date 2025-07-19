import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlogResponseDto {
  @ApiProperty({
    description: 'Blog ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Blog title',
    example: 'IELTS Writing Task 2 Strategies',
  })
  title: string;

  @ApiProperty({
    description: 'Blog content',
    example: 'Here are effective strategies for IELTS Writing Task 2...',
  })
  content: string;

  @ApiProperty({
    description: 'Blog status',
    enum: ['draft', 'published', 'archived'],
    example: 'published',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Blog featured image URL',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
  })
  image?: string;

  @ApiPropertyOptional({
    description: 'Blog tags',
    example: ['IELTS', 'Writing', 'Strategies'],
    type: [String],
  })
  tags?: string[];

  @ApiProperty({
    description: 'Whether this blog is featured',
    example: false,
  })
  is_featured: boolean;

  @ApiProperty({
    description: 'Number of likes',
    example: 42,
  })
  like_count: number;

  @ApiProperty({
    description: 'Author ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  author_id: string;

  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  category_id: string;

  @ApiPropertyOptional({
    description: 'Published date',
    example: '2023-12-01T10:00:00Z',
    format: 'date-time',
  })
  published_at?: string;

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

export class BlogCategoryResponseDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'IELTS Tips',
  })
  name: string;

  @ApiProperty({
    description: 'Category slug',
    example: 'ielts-tips',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Tips and strategies for IELTS preparation',
  })
  description?: string;

  @ApiProperty({
    description: 'Display order',
    example: 1,
  })
  ordering: number;

  @ApiProperty({
    description: 'Whether the category is active',
    example: true,
  })
  is_active: boolean;
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
