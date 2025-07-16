// src/modules/teachers/dto/create-teacher.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDecimal,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  TEACHER_SPECIALIZATION,
  TeacherSpecialization,
} from 'src/common/constants';

export class CreateTeacherDto {
  @ApiProperty({
    description: 'Teacher qualifications and education background',
  })
  @IsString()
  qualification: string;

  @ApiProperty({ description: 'Years of teaching experience' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  experience_years: number;

  @ApiProperty({
    enum: TEACHER_SPECIALIZATION,
    isArray: true,
    example: [TEACHER_SPECIALIZATION.READING, TEACHER_SPECIALIZATION.SPEAKING],
    description: 'Teacher specializations',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(TEACHER_SPECIALIZATION, { each: true })
  specializations: TeacherSpecialization[];

  @ApiProperty({
    description: "Teacher's IELTS band score",
    type: 'number',
    minimum: 0,
    maximum: 9,
    example: 8.5,
  })
  @IsDecimal({ decimal_digits: '1', force_decimal: true })
  @Min(0)
  @Max(9)
  @Type(() => Number)
  ielts_band_score: number;

  @ApiPropertyOptional({ description: "Teacher's approach to teaching" })
  @IsString()
  @IsOptional()
  teaching_style?: string;

  @ApiProperty({
    description: 'Hourly rate for teaching',
    minimum: 0,
    example: 250000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hourly_rate: number;
}
