import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogDto {
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
    example: 'IELTS Writing Task 2 Strategies',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Blog content in HTML or markdown format',
    example: 'Here are effective strategies for IELTS Writing Task 2...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Blog featured image URL',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
    format: 'url',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    description: 'Blog tags for categorization',
    example: ['IELTS', 'Writing', 'Strategies'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether this blog should be featured',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;
}
