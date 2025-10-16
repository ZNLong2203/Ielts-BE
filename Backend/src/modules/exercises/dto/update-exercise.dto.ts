// src/modules/lessons/dto/exercise/update-exercise.dto.ts
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { QUESTION_TYPE, QuestionType } from 'src/modules/exercises/constants';
import { CreateExerciseDto } from './create-exercise.dto';

export class UpdateExerciseDto extends PartialType(CreateExerciseDto) {}

// src/modules/lessons/dto/exercise/exercise-response.dto.ts
export class QuestionOptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  option_text: string;

  @ApiProperty()
  is_correct: boolean;

  @ApiProperty()
  ordering: number;

  @ApiProperty()
  explanation?: string;

  @ApiProperty()
  created_at: Date;
}

export class QuestionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  question_text: string;

  @ApiProperty({ enum: QUESTION_TYPE })
  question_type: QuestionType;

  @ApiProperty()
  media_url?: string;

  @ApiProperty()
  explanation?: string;

  @ApiProperty()
  points: number;

  @ApiProperty()
  ordering: number;

  @ApiProperty()
  difficulty_level: number;

  @ApiProperty()
  correct_answer?: string;

  @ApiProperty()
  alternative_answers?: string[];

  @ApiProperty()
  content?: string;

  @ApiProperty({ type: [QuestionOptionResponseDto] })
  options: QuestionOptionResponseDto[];

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class ExerciseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  lesson_id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  instruction?: string;

  @ApiProperty()
  content?: string;

  @ApiProperty()
  media_url?: string;

  @ApiProperty()
  time_limit?: number;

  @ApiProperty()
  max_attempts: number;

  @ApiProperty()
  passing_score?: number;

  @ApiProperty()
  ordering: number;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty({ type: [QuestionResponseDto] })
  questions: QuestionResponseDto[];

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
