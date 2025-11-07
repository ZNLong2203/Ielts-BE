// Backend/src/modules/grading/types/grading.types.ts

export interface QuestionOption {
  id: string;
  matching_option_id?: string;
  option_text: string;
  is_correct: boolean;
  point: number;
}

export interface Question {
  id: string;
  question_type: string;
  question_text: string;
  question_options: QuestionOption[];
  points?: number;
}

// User answer can be: string, string[], or Record<string, string>
// Multiple choice: string (option id) or string[] (for multiple answers)
// Fill in the blank: Record<string, string> (mapping blank ids to user inputs)
// True/False: string ('true' or 'false' or 'not given')
// Matching: Record<string, string> (mapping left item ids to right item ids)
export type UserAnswer = string | string[] | null | undefined;

export interface GradingResult {
  question_id: string;
  is_correct: boolean;
  user_answer: UserAnswer;
  correct_answer: string | string[];
  points_earned: number;
  max_points: number;
}

export interface SectionResult {
  correct_count: number;
  total_count: number;
  score: number;
  band_score: number;
  results: GradingResult[];
}

export interface TestResult {
  reading_result?: SectionResult;
  listening_result?: SectionResult;
  overall_correct: number;
  overall_total: number;
  overall_band: number;
}

export interface Grader {
  grade(question: Question, userAnswer: UserAnswer): GradingResult;
}

type ReadingPart =
  | { readingQuestions: Question[]; readingAnswers: Record<string, UserAnswer> }
  | { readingQuestions: null; readingAnswers: null };

type ListeningPart =
  | {
      listeningQuestions: Question[];
      listeningAnswers: Record<string, UserAnswer>;
    }
  | { listeningQuestions: null; listeningAnswers: null };

export type GradeTestParams = ReadingPart & ListeningPart;
