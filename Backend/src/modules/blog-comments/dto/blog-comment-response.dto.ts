import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlogCommentResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the comment',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the blog that this comment belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  blog_id: string;

  @ApiProperty({
    description: 'ID of the user who created this comment',
    example: '123e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  user_id: string;

  @ApiPropertyOptional({
    description: 'ID of the parent comment (for nested replies)',
    example: '123e4567-e89b-12d3-a456-426614174003',
    format: 'uuid',
    nullable: true,
  })
  parent_comment_id?: string;

  @ApiProperty({
    description: 'Content of the comment',
    example: 'This is a great blog post! Very informative and well-written.',
  })
  content: string;

  @ApiProperty({
    description: 'Whether the comment is approved by moderators',
    example: true,
  })
  is_approved: boolean;

  @ApiProperty({
    description: 'Number of likes for this comment',
    example: 5,
    minimum: 0,
  })
  like_count: number;

  @ApiProperty({
    description: 'When the comment was created',
    example: '2024-07-21T10:30:00.000Z',
    format: 'date-time',
  })
  created_at: Date;

  @ApiProperty({
    description: 'When the comment was last updated',
    example: '2024-07-21T15:45:00.000Z',
    format: 'date-time',
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'User information who created the comment',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      avatar: { type: 'string', nullable: true },
    },
    example: {
      id: '123e4567-e89b-12d3-a456-426614174004',
      email: 'user@example.com',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
    },
  })
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };

  @ApiPropertyOptional({
    description: 'Nested replies to this comment',
    type: [BlogCommentResponseDto],
    isArray: true,
  })
  replies?: BlogCommentResponseDto[];
}

export class BlogCommentListResponseDto {
  @ApiProperty({
    description: 'List of blog comments',
    type: [BlogCommentResponseDto],
    isArray: true,
  })
  comments: BlogCommentResponseDto[];

  @ApiProperty({
    description: 'Total number of comments',
    example: 25,
    minimum: 0,
  })
  total: number;

  @ApiProperty({
    description: 'ID of the blog these comments belong to',
    example: '123e4567-e89b-12d3-a456-426614174005',
    format: 'uuid',
  })
  blog_id: string;
}

export class BlogCommentApiResponseDto<T = any> {
  @ApiProperty({
    description: 'Response status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Response message',
    example: 'Comment added successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
  })
  data: T;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-07-21T10:30:00.000Z',
    format: 'date-time',
  })
  timestamp: string;
}
