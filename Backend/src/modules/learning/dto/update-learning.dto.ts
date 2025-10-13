import { PartialType } from '@nestjs/swagger';
import { CreateLearningDto } from './create-learning.dto';

export class UpdateLearningDto extends PartialType(CreateLearningDto) {}
