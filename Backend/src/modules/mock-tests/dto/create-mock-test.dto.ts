import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  SECTION_TYPE,
  SectionType,
  TEST_TYPE,
  TestType,
} from 'src/modules/mock-tests/constants';

export class CreateTestSectionDto {
  @ApiPropertyOptional({
    description:
      'Test section ID (for updates, if new test section, leave empty)',
    example: 'section-uuid-1234',
  })
  @IsOptional()
  @IsString()
  section_id?: string;

  @ApiProperty({
    description: 'Section name',
    example: 'Reading Section',
  })
  @IsString()
  @Length(3, 100)
  section_name: string;

  @ApiProperty({
    description: 'Section type',
    enum: SECTION_TYPE,
    example: SECTION_TYPE.READING,
  })
  @IsEnum(SECTION_TYPE)
  section_type: SectionType;

  @ApiPropertyOptional({
    description: 'Time limit in minutes',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Section ordering',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordering?: number;

  @ApiPropertyOptional({
    description: 'Section instructions',
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}

export class CreateMockTestDto {
  @ApiProperty({
    description: 'Mock test title',
    example: 'IELTS Academic Full Test 1',
  })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({
    description: 'Test type',
    enum: TEST_TYPE,
    example: TEST_TYPE.FULL_TEST,
  })
  @IsEnum(TEST_TYPE)
  test_type: TestType;

  @ApiPropertyOptional({
    description: 'Test description',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Test instructions',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Total time limit in minutes',
    example: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Test difficulty level',
    example: 'intermediate',
    enum: ['beginner', 'intermediate', 'hard', 'advanced', 'master'],
  })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'hard', 'advanced', 'master'])
  difficulty_level?: string;

  @ApiPropertyOptional({
    description: 'Whether test is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Test sections to create',
    type: [CreateTestSectionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTestSectionDto)
  test_sections?: CreateTestSectionDto[];
}

@ValidatorConstraint({ name: 'onlyOneAnswerType' })
export class OnlyOneAnswerTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as UserAnswerSubmissionDto;
    const definedAnswers = [
      obj.fill_blank_answers,
      obj.multiple_choice_answers,
      obj.true_false_answers,
      obj.matching_answers,
      obj.essay_answers,
    ].filter((answer) => answer !== undefined);

    return definedAnswers.length <= 1;
  }

  defaultMessage() {
    return 'Exactly one answer type must be provided';
  }
}

export class UserAnswerSubmissionDto {
  @ApiProperty({
    description: 'Answer for fill in the blank questions',
    example: 'Photosynthesis is the process by which green plants...',
  })
  @IsOptional()
  @IsString()
  fill_blank_answers?: string;

  @ApiProperty({
    description: 'Answer for multiple choice questions',
    example: ['option-uuid-1', 'option-uuid-2'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  multiple_choice_answers?: string[];

  @ApiProperty({
    description: 'Answer for true/false/not given questions',
    example: 'true',
  })
  @IsOptional()
  @IsString()
  true_false_answers?: string;

  @ApiProperty({
    description: 'Answer for matching questions',
    example: 'matching-option-uuid-1',
  })
  @IsOptional()
  @IsString()
  matching_answers?: string;

  @ApiProperty({
    description: 'Answer for essay/writing questions',
    example: 'The chart shows the percentage of...',
  })
  @IsOptional()
  @IsString()
  essay_answers?: string;

  @ApiProperty({
    description: 'Audio file URL for speaking questions (after upload)',
    example: 'https://minio.example.com/audio/recording.webm',
  })
  @IsOptional()
  @IsString()
  speaking_audio_url?: string;

  @Validate(OnlyOneAnswerTypeConstraint)
  get answerTypeValidation() {
    return true;
  }
}

export class TestAnswerSubmissionDto {
  @ApiProperty({
    description: 'Test question ID',
    example: 'question-uuid-1234',
  })
  @IsString()
  question_id: string;

  @ApiProperty({
    description: 'User answer submission',
    type: UserAnswerSubmissionDto,
  })
  @ValidateNested()
  @Type(() => UserAnswerSubmissionDto)
  user_answer: UserAnswerSubmissionDto;
}

export class TestSectionSubmissionDto {
  @ApiProperty({
    description: 'Mock test result id',
    example: 'test-result-uuid-1234',
  })
  @IsString()
  test_result_id: string;

  @ApiProperty({
    description: 'Test section ID',
    example: 'section-uuid-1234',
  })
  @IsString()
  test_section_id: string;

  @ApiProperty({
    description: 'Time taken to complete the section in seconds',
    example: 1500,
  })
  @IsInt()
  @Min(1)
  time_taken: number;

  @ApiProperty({
    description: 'Answers for the section',
    type: [TestAnswerSubmissionDto],
    example: [
      {
        question_id: 'question-uuid-1234',
        user_answer: {
          fill_blank_answers: 'Photosynthesis is the process...',
          multiple_choice_answers: ['option-uuid-1', 'option-uuid-2'],
          true_false_answers: 'true',
          matching_answers: 'matching-option-uuid-1',
        },
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestAnswerSubmissionDto)
  answers: TestAnswerSubmissionDto[];

  @ApiPropertyOptional({
    description:
      'Audio data for speaking section (audio URLs and question texts)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        question_id: { type: 'string' },
        audio_url: { type: 'string' },
        question_text: { type: 'string' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakingAudioDataDto)
  speaking_audio_data?: SpeakingAudioDataDto[];

  @ApiPropertyOptional({
    description: 'Grading method for writing section (ai or teacher)',
    example: 'ai',
    enum: ['ai', 'teacher'],
  })
  @IsOptional()
  @IsEnum(['ai', 'teacher'])
  grading_method?: 'ai' | 'teacher';
}

export class SpeakingAudioDataDto {
  @ApiProperty({ description: 'Question ID', example: 'question-uuid-1234' })
  @IsString()
  question_id: string;

  @ApiProperty({
    description: 'Audio file URL',
    example: 'https://minio.example.com/audio/recording.webm',
  })
  @IsString()
  audio_url: string;

  @ApiProperty({
    description: 'Question text',
    example: 'What is your full name?',
  })
  @IsString()
  question_text: string;
}
