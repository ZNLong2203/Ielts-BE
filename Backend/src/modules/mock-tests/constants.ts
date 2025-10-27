export const TEST_TYPE = {
  READING: 'reading',
  WRITING: 'writing',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  FULL_TEST: 'full_test',
};

export type TestType = (typeof TEST_TYPE)[keyof typeof TEST_TYPE];

export const SECTION_TYPE = {
  READING: 'reading',
  WRITING: 'writing',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
};

export type SectionType = (typeof SECTION_TYPE)[keyof typeof SECTION_TYPE];

export const TEST_LEVEL = {
  ACADEMIC: 'academic',
  GENERAL: 'general',
};

export type TestLevel = (typeof TEST_LEVEL)[keyof typeof TEST_LEVEL];
