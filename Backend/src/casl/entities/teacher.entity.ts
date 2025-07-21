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
