import { QuestionType } from 'src/modules/exercises/constants';

// src/modules/reading/types/reading.types.ts
export interface ReadingPassage {
  title: string;
  content: string;
  paragraphs: ParagraphSection[];
  word_count: number;
  difficulty_level: number;
  estimated_reading_time: number;
}

export interface ParagraphSection {
  id: string; // A, B, C, D, E
  content: string;
}

export interface ExerciseMetadata {
  skill_type: SkillType;
  created_at: Date;
  updated_at?: Date;
  total_questions: number;
  question_types: string[];
}

export interface ReadingExerciseContent {
  reading_passage: ReadingPassage;
  exercise_metadata: ExerciseMetadata;
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

export interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  ordering: number;
  point: number;
  explanation?: string;
}

export interface MatchingOption {
  id: string;
  option_text: string;
  ordering: number;
}

export interface QuestionWithDetails {
  id: string;
  question_text: string;
  question_type: QuestionType;
  image_url?: string;
  audio_url?: string;
  reading_passage?: string;
  explanation?: string;
  points: number;
  correct_answer_count: number;
  ordering: number;
  difficulty_level?: number;
  question_group?: string;
  question_options: QuestionOption[];
  matching_sets?: {
    id: string;
    title: string;
    matching_options: MatchingOption[];
  };
}
