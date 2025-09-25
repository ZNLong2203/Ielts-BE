import { PartialType } from '@nestjs/mapped-types';
import { CreateWritingDto } from './create-writing.dto';

export class UpdateWritingDto extends PartialType(CreateWritingDto) {}
