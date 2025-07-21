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
