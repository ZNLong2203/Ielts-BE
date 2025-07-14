export enum Action {
  Manage = 'manage', // wildcard for any action
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

export const Role = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUEST: 'GUEST',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];
