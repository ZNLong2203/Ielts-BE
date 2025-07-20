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

export class Blog {
  constructor(init?: Partial<Blog>) {
    Object.assign(this, init);
  }
  id: string;
  title: string;
  content: string;
  authorId: string;
  categoryId: string;
  status: string;
  isPublished: boolean;
}

export class BlogCategory {
  constructor(init?: Partial<BlogCategory>) {
    Object.assign(this, init);
  }
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export type SubjectClasses =
  | typeof All
  | typeof User
  | typeof Profile
  | typeof Course
  | typeof Blog
  | typeof BlogCategory;

export type SubjectInstances = User | Profile | Course | Blog | BlogCategory;
