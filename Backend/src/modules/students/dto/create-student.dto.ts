import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  STUDENT_LANGUAGE,
  STUDENT_LEVEL,
  StudentLanguage,
  StudentLevel,
} from 'src/common/constants';

export class CreateStudentDto {
  @ApiPropertyOptional({ description: 'Biography' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({
    description: 'Target IELTS score',
    minimum: 0,
    maximum: 9,
    example: 7.5,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(9)
  @Type(() => Number)
  target_ielts_score: number;

  @ApiProperty({
    enum: STUDENT_LEVEL,
    description: 'Current English proficiency level',
  })
  @IsEnum(STUDENT_LEVEL, {
    message: 'Level must be beginner, intermediate, or advanced',
  })
  @IsNotEmpty()
  current_level: StudentLevel;

  @ApiPropertyOptional({
    description: 'Learning goals',
    type: [String],
    example: ['Improve speaking', 'Academic writing'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  learning_goals?: string[];

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    enum: STUDENT_LANGUAGE,
    description: 'Preferred language for communication',
    default: STUDENT_LANGUAGE.VIETNAMESE,
  })
  @IsEnum(STUDENT_LANGUAGE)
  @IsOptional()
  language_preference?: StudentLanguage = STUDENT_LANGUAGE.VIETNAMESE;
}
