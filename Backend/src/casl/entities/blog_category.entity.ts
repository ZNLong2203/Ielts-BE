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
