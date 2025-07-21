export class Student {
  constructor(init?: Partial<Student>) {
    Object.assign(this, init);
  }
  id: string;
  userId: string;
  currentLevel: string;
  targetIeltsScore?: number;
}
