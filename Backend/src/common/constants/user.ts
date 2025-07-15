export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
