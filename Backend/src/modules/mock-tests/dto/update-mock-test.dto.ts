import { PartialType } from '@nestjs/swagger';
import { CreateMockTestDto } from './create-mock-test.dto';

export class UpdateMockTestDto extends PartialType(CreateMockTestDto) {}
