import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsUUID } from 'class-validator';

export class SubmitExerciseAnswerDto {
  @ApiProperty({
    description: 'Question ID',
    example: '140e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty()
  @IsUUID()
  questionId: string;

  @ApiProperty({
    description: 'User answer - can be string, string array, or null',
    example: 'option-id-123',
  })
  @IsOptional()
  answer: string | string[] | null;
}

export class SubmitExerciseDto {
  @ApiProperty({
    description: 'Exercise ID',
    example: '130e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty()
  @IsUUID()
  exerciseId: string;

  @ApiProperty({
    description: 'User answers for each question',
    type: Object,
    additionalProperties: true,
    example: {
      '140e8400-e29b-41d4-a716-446655440001': 'option-id-123',
      '140e8400-e29b-41d4-a716-446655440002': 'answer text',
    },
  })
  @IsNotEmpty()
  @IsObject()
  answers: Record<string, string | string[] | null>;

  @ApiProperty({
    description: 'Time taken in seconds',
    example: 300,
    required: false,
  })
  @IsOptional()
  timeTaken?: number;
}

export class ExerciseSubmissionResponseDto {
  @ApiProperty({
    description: 'Submission ID',
    example: '320e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Exercise ID',
    example: '130e8400-e29b-41d4-a716-446655440001',
  })
  exerciseId: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Score achieved',
    example: 8.5,
  })
  score: number;

  @ApiProperty({
    description: 'Maximum possible score',
    example: 10.0,
  })
  maxScore: number;

  @ApiProperty({
    description: 'Number of correct answers',
    example: 8,
  })
  correctAnswers: number;

  @ApiProperty({
    description: 'Total number of questions',
    example: 10,
  })
  totalQuestions: number;

  @ApiProperty({
    description: 'Question results with correctness',
    type: Object,
    additionalProperties: { type: 'boolean' },
    example: {
      '140e8400-e29b-41d4-a716-446655440001': true,
      '140e8400-e29b-41d4-a716-446655440002': false,
    },
  })
  questionResults: Record<string, boolean>;

  @ApiProperty({
    description: 'Submission status',
    example: 'graded',
  })
  status: string;

  @ApiProperty({
    description: 'Submission created at',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;
}
