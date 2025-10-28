import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateReadingExerciseDto } from './create-reading.dto';

export class UpdateReadingExerciseDto extends PartialType(
  OmitType(CreateReadingExerciseDto, ['test_section_id'] as const),
) {}
