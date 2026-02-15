// Blog HTTP-level interfaces

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CreateBlogRequestBody { title: string; content?: any; readTime?: string; excerpt?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UpdateBlogRequestBody { title?: string; content?: any; readTime?: string; excerpt?: string }

export interface UpdateBlogPublishedRequestBody { published: boolean }

export interface BlogDto {
  id: string;
  title: string;
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  published: boolean;
  deletion: boolean;
  readTime: string | null;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListItemDto {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  readTime: string | null;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string;
}
