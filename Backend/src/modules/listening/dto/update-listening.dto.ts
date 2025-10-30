import { PartialType } from '@nestjs/swagger';
import { CreateListeningExerciseDto } from './create-listening.dto';

export class UpdateListeningExerciseDto extends PartialType(
  CreateListeningExerciseDto,
) {}
