import { PartialType } from '@nestjs/swagger';
import { CreateReadingExerciseDto } from './create-reading.dto';

export class UpdateReadingExerciseDto extends PartialType(
  CreateReadingExerciseDto,
) {}
