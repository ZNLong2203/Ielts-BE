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
