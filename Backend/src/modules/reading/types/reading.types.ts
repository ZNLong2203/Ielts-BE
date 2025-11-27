import { Decimal } from '@prisma/client/runtime/library';
export interface ParagraphSection {
  id: string; // A, B, C, D, E
  label: string; // A, B, C, D, E
  content: string;
}

export const EXERCISE_TYPE = {
  LESSON: 'lesson',
  MOCK_TEST: 'mock_test',
  PRACTICE: 'practice',
};

export const SKILL_TYPE = {
  READING: 'reading',
  WRITING: 'writing',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  GENERAL: 'general',
};

export type ExerciseType = (typeof EXERCISE_TYPE)[keyof typeof EXERCISE_TYPE];
export type SkillType = (typeof SKILL_TYPE)[keyof typeof SKILL_TYPE];

export interface QuestionOptionDetails {
  id: string;
  option_text: string;
  is_correct: boolean;
  ordering: number;
  point: number;
  explanation?: string;
}

export interface MatchingOptionDetails {
  id: string;
  option_text: string;
  ordering: number | null;
}

export interface QuestionGroupDetails {
  id: string;
  image_url?: string;
  group_title?: string;
  group_instruction: string;
  passage_reference?: string;
  question_type: string;
  question_range?: string;
  correct_answer_count: number | null;
  ordering: number | null;
  matching_options: MatchingOptionDetails[];
}

export interface QuestionWithDetails {
  id: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  audio_url?: string;
  audio_duration?: number;
  reading_passage?: string;
  explanation?: string;
  points: number;
  ordering: number;
  question_group?: string;
  question_group_id?: string;
  group?: QuestionGroupDetails;
  question_options: QuestionOptionDetails[];
}

export interface ReadingPassage {
  title: string;
  content: string;
  paragraphs?: ParagraphSection[];
  word_count: number;
  difficulty_level: number;
  estimated_reading_time: number;
}

export interface ReadingExerciseContent {
  reading_passage: ReadingPassage;
  exercise_metadata: {
    skill_type: SkillType;
    created_at: Date;
    updated_at?: Date;
    total_questions: number;
    question_types: string[];
  };
}

export interface ReadingExerciseWithDetails {
  id: string;
  title: string;
  instruction: string | null;
  exercise_type: string | null;
  skill_type: string | null;
  time_limit: number | null;
  audio_url?: string | null;
  passing_score?: number | Decimal;
  ordering: number | null;
  reading_passage: ReadingPassage;
  question_groups: QuestionGroupDetails[];
  ungrouped_questions: QuestionWithDetails[];
  total_questions: number;
  total_points: number;
}
