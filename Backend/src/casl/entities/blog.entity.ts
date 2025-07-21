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
