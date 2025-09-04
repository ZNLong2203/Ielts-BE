import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  COURSE_DIFFICULTY_LEVEL,
  COURSE_SKILL_FOCUS,
  CourseSkillFocus,
} from 'src/common/constants';

export class CreateCourseCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'IELTS Reading' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon URL or class name',
    example: 'book-open',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Display order',
    example: 1,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title', example: 'Master IELTS Reading' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Teacher ID' })
  @IsUUID()
  @IsOptional()
  teacher_id?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsUUID()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Skill focus',
    enum: COURSE_SKILL_FOCUS,
    example: 'reading',
  })
  @IsEnum(COURSE_SKILL_FOCUS)
  @IsOptional()
  skill_focus?: CourseSkillFocus;

  @ApiPropertyOptional({
    description: 'Difficulty level',
    enum: COURSE_DIFFICULTY_LEVEL,
    example: 'intermediate',
  })
  @IsEnum(COURSE_DIFFICULTY_LEVEL)
  @IsOptional()
  difficulty_level?: CourseSkillFocus;

  @ApiPropertyOptional({
    description: 'Estimated duration in hours',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimated_duration?: number;

  @ApiPropertyOptional({
    description: 'Course price',
    example: 499000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Discounted price',
    example: 399000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount_price?: number;

  @ApiPropertyOptional({
    description: 'Is course featured',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;

  @ApiPropertyOptional({
    description: 'Course requirements',
    example: ['Basic English knowledge', 'IELTS 5.0 or equivalent'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @ApiPropertyOptional({
    description: 'What students will learn',
    example: [
      'Read faster',
      'Identify key information',
      'Answer all question types',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  what_you_learn?: string[];

  @ApiPropertyOptional({
    description: 'Course outline structure',
    example: {
      sections: [
        {
          title: 'Introduction',
          lessons: ['Course overview', 'IELTS Reading basics'],
        },
      ],
    },
  })
  @IsObject()
  @IsOptional()
  course_outline?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Course tags',
    example: ['IELTS', 'Reading', 'Academic'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class FeatureCourseDto {
  @ApiProperty({
    description: 'Course featured status',
    example: true,
  })
  @IsBoolean()
  is_featured!: boolean;
}

export class CreateComboCourseDto {
  @ApiProperty({
    description: 'Combo course title (band score range)',
    example: '3.5 - 5.0',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Combo course description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'List of course IDs included in the combo',
    type: [String],
    example: ['course-id-1', 'course-id-2'],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  course_ids: string[];

  @ApiPropertyOptional({
    description: 'Combo course price',
    example: 999000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  original_price?: number;

  @ApiPropertyOptional({
    description: 'Discounted combo course price',
    example: 799000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  combo_price?: number;

  @ApiPropertyOptional({
    description: 'Discount percentage for the combo course',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount_percentage?: number;

  @ApiPropertyOptional({
    description: 'Combo course tags',
    example: ['IELTS', 'Reading', 'Academic'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
