import { PartialType } from '@nestjs/swagger';
import { CreateWritingMockTestExerciseDto } from './create-writing-mock-test.dto';

export class UpdateWritingMockTestExerciseDto extends PartialType(
  CreateWritingMockTestExerciseDto,
) {}
