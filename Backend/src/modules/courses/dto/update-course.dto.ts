import { PartialType } from '@nestjs/swagger';
import { CreateCourseCategoryDto, CreateCourseDto } from './create-course.dto';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class UpdateCourseCategoryDto extends PartialType(
  CreateCourseCategoryDto,
) {}
