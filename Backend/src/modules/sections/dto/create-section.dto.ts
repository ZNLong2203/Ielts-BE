import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSectionDto {
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Section description',
    example:
      'This section covers the fundamental concepts of IELTS Speaking test.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Section ordering within course',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;
}

class SectionOrderDto {
  @ApiProperty({
    description: 'Section ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'New ordering position',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  ordering: number;
}

export class ReorderSectionsDto {
  @ApiProperty({
    description: 'Array of sections with their new ordering',
    type: [SectionOrderDto],
    example: [
      { id: '123e4567-e89b-12d3-a456-426614174000', ordering: 1 },
      { id: '123e4567-e89b-12d3-a456-426614174001', ordering: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderDto)
  sections: SectionOrderDto[];
}
