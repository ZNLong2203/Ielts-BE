import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogCommentDto {
  @ApiProperty({
    description: 'ID of the blog that this comment belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString()
  @IsOptional()
  blog_id?: string;

  @ApiProperty({
    description: 'ID of the user who created this comment',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'ID of the parent comment (for nested replies)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  parent_comment_id?: string;

  @ApiProperty({
    description: 'Content of the comment',
    example: 'This is a great blog post! Very informative.',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Whether the comment is approved by moderators',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_approved?: boolean;

  @ApiPropertyOptional({
    description: 'Number of likes for this comment',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  like_count?: number;
}
