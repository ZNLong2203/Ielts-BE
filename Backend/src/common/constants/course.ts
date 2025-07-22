export const COURSE_SKILL_FOCUS = {
  READING: 'reading',
  WRITING: 'writing',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  GENERAL: 'general',
} as const;

export const COURSE_DIFFICULTY_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type CourseSkillFocus =
  (typeof COURSE_SKILL_FOCUS)[keyof typeof COURSE_SKILL_FOCUS];
export type CourseDifficultyLevel =
  (typeof COURSE_DIFFICULTY_LEVEL)[keyof typeof COURSE_DIFFICULTY_LEVEL];
