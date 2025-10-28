import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateQuestionGroupDto } from './create-question-group.dto';

export class UpdateQuestionGroupDto extends PartialType(
  OmitType(CreateQuestionGroupDto, ['exercise_id'] as const),
) {}

class QuestionGroupOrder {
  @ApiProperty({
    description: 'Question Group ID',
    example: 'group-uuid-123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'New ordering value',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  ordering: number;
}

export class ReorderQuestionGroupsDto {
  @ApiProperty({
    description: 'Array of question group IDs with their new ordering',
    type: [QuestionGroupOrder],
    example: [
      { id: 'group-uuid-1', ordering: 0 },
      { id: 'group-uuid-2', ordering: 1 },
      { id: 'group-uuid-3', ordering: 2 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionGroupOrder)
  groups: QuestionGroupOrder[];
}
