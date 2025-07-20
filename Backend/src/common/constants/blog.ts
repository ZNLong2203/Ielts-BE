export const BLOG_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const BLOG_CATEGORIES = {
  TECHNOLOGY: 'technology',
  HEALTH: 'health',
  LIFESTYLE: 'lifestyle',
  EDUCATION: 'education',
  TRAVEL: 'travel',
};

export type BlogStatus = (typeof BLOG_STATUS)[keyof typeof BLOG_STATUS];
export type BlogCategory =
  (typeof BLOG_CATEGORIES)[keyof typeof BLOG_CATEGORIES];
