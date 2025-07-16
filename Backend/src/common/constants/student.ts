export const STUDENT_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const STUDENT_LANGUAGE = {
  ENGLISH: 'en',
  VIETNAMESE: 'vi',
} as const;

export type StudentLevel = (typeof STUDENT_LEVEL)[keyof typeof STUDENT_LEVEL];
export type StudentLanguage =
  (typeof STUDENT_LANGUAGE)[keyof typeof STUDENT_LANGUAGE];
