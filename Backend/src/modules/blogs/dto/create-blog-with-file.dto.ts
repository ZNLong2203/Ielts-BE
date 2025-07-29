import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBlogWithFileDto {
  @ApiProperty({
    description: 'Blog category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  category_id: string;

  @ApiProperty({
    description: 'Blog title',
    example: 'How to improve IELTS Writing Skills',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Blog content in HTML or markdown format',
    example:
      'This is a comprehensive guide to improving your IELTS writing skills...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Blog tags for categorization',
    example: ['IELTS', 'Writing', 'Tips'],
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

  @ApiProperty({
    description: 'Blog thumbnail image file (JPEG, PNG, JPG, WEBP - max 3MB)',
    type: 'string',
    format: 'binary',
  })
  file: any;
}
