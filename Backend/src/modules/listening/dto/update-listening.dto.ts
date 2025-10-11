import { PartialType } from '@nestjs/swagger';
import { CreateListeningDto } from './create-listening.dto';

export class UpdateListeningDto extends PartialType(CreateListeningDto) {}
