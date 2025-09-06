import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSectionDto } from './create-section.dto';

export class UpdateSectionDto extends PartialType(
  OmitType(CreateSectionDto, ['courseId'] as const),
) {}
