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
