import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlogCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'IELTS Tips',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Tips and strategies for IELTS preparation',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order of the category',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
