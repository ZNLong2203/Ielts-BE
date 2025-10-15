import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';

export enum WritingSkillFocus {
  READING = 'reading',
  WRITING = 'writing',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  GENERAL = 'general',
}

export class QueryWritingDto {
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  exerciseTypeId?: string;

  @IsOptional()
  @IsEnum(WritingSkillFocus)
  skillFocus?: WritingSkillFocus;

  @IsOptional()
  @IsNumber()
  difficultyLevel?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
