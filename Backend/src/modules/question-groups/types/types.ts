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
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  matching_options?: MatchingOptionDetails[];
  questions?: any[];
  exercises?: any;
}

export interface QuestionGroupWithDetails {
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
  matching_options: MatchingOptionDetails[];
  questions_count: number;
  created_at: Date;
  updated_at: Date;
}
