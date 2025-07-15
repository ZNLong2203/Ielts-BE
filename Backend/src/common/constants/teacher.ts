export const TEACHER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export type TeacherStatus =
  (typeof TEACHER_STATUS)[keyof typeof TEACHER_STATUS];
