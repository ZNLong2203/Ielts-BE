export const All = 'all';

export class User {
  constructor(init?: Partial<User>) {
    Object.assign(this, init);
  }
  id: string;
  email: string;
  role: string;
}

export class Profile {
  constructor(init?: Partial<Profile>) {
    Object.assign(this, init);
  }
  userId: string;
  fullName: string;
  avatar: string;
}

export class Course {
  constructor(init?: Partial<Course>) {
    Object.assign(this, init);
  }
  id: string;
  title: string;
  description: string;
  teacherId: string;
  isPublic: boolean;
}

export type SubjectClasses =
  | typeof All
  | typeof User
  | typeof Profile
  | typeof Course;

export type SubjectInstances = User | Profile | Course;
