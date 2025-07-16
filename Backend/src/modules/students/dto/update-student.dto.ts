import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { STUDENT_LEVEL, StudentLevel } from 'src/common/constants';
import { CreateStudentDto } from './create-student.dto';

// Extend PartialType(CreateStudentDto) but remove password field for updates
export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @ApiPropertyOptional({ description: 'Biography' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Target IELTS score',
    minimum: 0,
    maximum: 9,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(9)
  @IsOptional()
  @Type(() => Number)
  target_ielts_score?: number;

  @ApiPropertyOptional({
    enum: STUDENT_LEVEL,
    description: 'Current English proficiency level',
  })
  @IsEnum(STUDENT_LEVEL)
  @IsOptional()
  current_level?: StudentLevel;

  @ApiPropertyOptional({
    description: 'Learning goals',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  learning_goals?: string[];
}
