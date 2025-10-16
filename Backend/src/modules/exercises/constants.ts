export const QUESTION_TYPE = {
  // Listening types
  MULTIPLE_CHOICE: 'multiple_choice',
  DROPLIST: 'droplist',
  FILL_BLANK: 'fill_blank',

  // Reading types
  TRUE_FALSE: 'true_false',
  MATCHING: 'matching',

  // Writing types
  ESSAY: 'essay',
};

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];
