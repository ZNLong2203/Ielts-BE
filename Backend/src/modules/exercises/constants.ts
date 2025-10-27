// multiple_choice, essay, speaking, true_false, fill_blank, matching, summary_completion
export const QUESTION_TYPE = {
  MULTIPLE_CHOICE: 'multiple_choice',
  DROPLIST: 'droplist',
  FILL_BLANK: 'fill_blank',
  TRUE_FALSE: 'true_false',
  MATCHING: 'matching',

  // Speaking types
  SPEAKING: 'speaking',

  // Writing types
  ESSAY: 'essay',
};

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];
