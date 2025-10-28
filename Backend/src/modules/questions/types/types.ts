
export interface QuestionDetails {
  id: string;
  question_text: string;
  question_type: string;
  image_url?: string;
  audio_url?: string;
  reading_passage?: string;
  explanation?: string;
  points: number;
  correct_answer_count: number;
  ordering: number;
  difficulty_level?: number;
  question_group?: string;
  question_options: QuestionOptionDetails[];
  matching_sets?: MatchingSetDetails;
}

export interface QuestionOptionDetails {
  id: string;
  option_text: string;
  is_correct: boolean;
  ordering: number;
  point: number;
  explanation?: string;
}

export interface MatchingSetDetails {
  id: string;
  title: string;
  matching_options: MatchingOptionDetails[];
}

export interface MatchingOptionDetails {
  id: string;
  option_text: string;
  ordering: number;
}
