import { PartialType } from '@nestjs/swagger';
import { CreateReadingDto } from './create-reading.dto';

export class UpdateReadingDto extends PartialType(CreateReadingDto) {}
