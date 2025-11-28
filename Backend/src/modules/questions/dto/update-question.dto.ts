import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateQuestionTestDto } from 'src/modules/questions/dto/create-question.dto';

export class UpdateQuestionTestDto extends PartialType(CreateQuestionTestDto) {}

class QuestionOrder {
  @ApiProperty({
    description: 'Question ID',
    example: 'question-uuid-123',
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

export class ReorderQuestionsDto {
  @ApiProperty({
    description: 'Array of question IDs with their new ordering',
    type: [QuestionOrder],
    example: [
      { id: 'question-uuid-1', ordering: 0 },
      { id: 'question-uuid-2', ordering: 1 },
      { id: 'question-uuid-3', ordering: 2 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionOrder)
  questions: QuestionOrder[];
}
