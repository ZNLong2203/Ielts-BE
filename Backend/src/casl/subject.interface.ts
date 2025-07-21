export const All = 'all';

export class User {
  constructor(init?: Partial<User>) {
    Object.assign(this, init);
  }
  id: string;
  email: string;
  role: string;
  fullName?: string;
  avatar?: string;
  status: string;
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
  categoryId?: string;
  isPublished?: boolean;
  isFree?: boolean;
}

export class Blog {
  constructor(init?: Partial<Blog>) {
    Object.assign(this, init);
  }
  id: string;
  title: string;
  content: string;
  image?: string;
  tags: string[];
  authorId: string;
  categoryId: string;
  status: string;
  isFeatured?: boolean;
  likeCount?: number;
}

export class BlogCategory {
  constructor(init?: Partial<BlogCategory>) {
    Object.assign(this, init);
  }
  id: string;
  name: string;
  slug: string;
  description: string;
  ordering: number;
  isActive: boolean;
}

export class BlogComment {
  constructor(init?: Partial<BlogComment>) {
    Object.assign(this, init);
  }
  id: string;
  blogId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  isApproved?: boolean;
  likeCount?: number;
}

export class Student {
  constructor(init?: Partial<Student>) {
    Object.assign(this, init);
  }
  id: string;
  userId: string;
  currentLevel?: number;
  targetIeltsScore?: number;
}

export class Teacher {
  constructor(init?: Partial<Teacher>) {
    Object.assign(this, init);
  }
  id: string;
  userId: string;
  experienceYears?: number;
  ieltsScore?: number;
  status: string;
}

export class CourseCategory {
  constructor(init?: Partial<CourseCategory>) {
    Object.assign(this, init);
  }
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  ordering: number;
}

export type SubjectClasses =
  | typeof All
  | typeof User
  | typeof Profile
  | typeof Course
  | typeof CourseCategory
  | typeof Blog
  | typeof BlogCategory
  | typeof BlogComment
  | typeof Student
  | typeof Teacher;

export type SubjectInstances =
  | User
  | Profile
  | Course
  | CourseCategory
  | Blog
  | BlogCategory
  | BlogComment
  | Student
  | Teacher;
