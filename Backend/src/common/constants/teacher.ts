export const TEACHER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export const TEACHER_SPECIALIZATION = {
  READING: 'reading',
  WRITING: 'writing',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
} as const;

export type TeacherStatus =
  (typeof TEACHER_STATUS)[keyof typeof TEACHER_STATUS];
export type TeacherSpecialization =
  (typeof TEACHER_SPECIALIZATION)[keyof typeof TEACHER_SPECIALIZATION];
