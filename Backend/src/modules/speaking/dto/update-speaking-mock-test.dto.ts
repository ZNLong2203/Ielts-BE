import { PartialType } from '@nestjs/swagger';
import { CreateSpeakingMockTestExerciseDto } from './create-speaking-mock-test.dto';

export class UpdateSpeakingMockTestExerciseDto extends PartialType(
  CreateSpeakingMockTestExerciseDto,
) {}
