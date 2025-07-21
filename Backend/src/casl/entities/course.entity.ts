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
