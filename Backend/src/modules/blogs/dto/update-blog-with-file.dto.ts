import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateBlogWithFileDto {
  @ApiPropertyOptional({
    description: 'Blog category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Blog title',
    example: 'Updated: How to improve IELTS Writing Skills',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Blog content in HTML or markdown format',
    example: 'This is an updated comprehensive guide...',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Blog tags for categorization',
    example: ['IELTS', 'Writing', 'Tips', 'Updated'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return Array.isArray(value) ? value.map(String) : [];
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Blog thumbnail image file (JPEG, PNG, JPG, WEBP - max 3MB)',
    type: 'string',
    format: 'binary',
  })
  file?: any;
}
