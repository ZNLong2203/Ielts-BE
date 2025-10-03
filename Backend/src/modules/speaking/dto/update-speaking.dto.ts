import { PartialType } from '@nestjs/swagger';
import { CreateSpeakingDto } from './create-speaking.dto';

export class UpdateSpeakingDto extends PartialType(CreateSpeakingDto) {}
