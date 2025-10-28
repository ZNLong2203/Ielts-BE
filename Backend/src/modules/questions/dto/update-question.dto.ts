import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  IsEnum,
  IsInt,
  Min,
  IsNumber,
  Max,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { QUESTION_TYPE, QuestionType } from 'src/modules/exercises/constants';
import { CreateQuestionOptionDto } from 'src/modules/questions/dto/create-question.dto';

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(5, 2000)
  question_text?: string;

  @ApiPropertyOptional({ enum: QUESTION_TYPE })
  @IsOptional()
  @IsEnum(QUESTION_TYPE)
  question_type?: QuestionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 50)
  question_group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  correct_answer_count?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(9)
  difficulty_level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  explanation?: string;

  @ApiPropertyOptional({ type: [CreateQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options?: CreateQuestionOptionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  correct_answer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternative_answers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID(4)
  matching_set_id?: string;
}
