export interface QuestionOptionDetails {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  ordering: number;
  point: number;
  explanation?: string;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
}

export interface MatchingOptionDetails {
  id: string;
  set_id: string; // question_group_id
  option_text: string;
  ordering: number;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
}

export interface QuestionGroupDetails {
  id: string;
  exercise_id: string;
  image_url?: string;
  group_title?: string;
  group_instruction: string;
  passage_reference?: string;
  question_type: string;
  ordering: number;
  question_range?: string;
  correct_answer_count: number;
  matching_options?: MatchingOptionDetails[];
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
}

export interface QuestionDetails {
  id: string;
  exercise_id: string;
  question_group_id?: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  audio_url?: string;
  audio_duration?: number;
  reading_passage?: string;
  explanation?: string;
  points: number;
  ordering: number;
  difficulty_level?: number;
  question_group?: string;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  question_groups?: QuestionGroupDetails;
  question_options?: QuestionOptionDetails[];
  exercises?: any;
}

export interface QuestionWithDetails {
  id: string;
  exercise_id: string;
  question_group_id?: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  audio_url?: string;
  audio_duration?: number;
  reading_passage?: string;
  explanation?: string;
  points: number;
  ordering: number;
  difficulty_level?: number;
  question_group?: string;
  group?: QuestionGroupDetails;
  options: QuestionOptionDetails[];
  created_at: Date;
  updated_at: Date;
}
