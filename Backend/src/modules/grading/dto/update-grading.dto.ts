import { PartialType } from '@nestjs/swagger';
import { CreateGradingDto } from './create-grading.dto';

export class UpdateGradingDto extends PartialType(CreateGradingDto) {}
