import type { Blog } from '@prisma/client';
import { prisma } from '../config/prisma';

// ── Slug generation ──

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.blog.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

// ── CRUD ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CreateBlogInput { title: string; content?: any; readTime?: string; excerpt?: string }

export const createBlog = async (input: CreateBlogInput): Promise<Blog> => {
  const { title, content, readTime, excerpt } = input;
  const slug = await generateUniqueSlug(title);

  return prisma.blog.create({
    data: {
      title,
      slug,
      content: content ?? null,
      readTime: readTime ?? null,
      excerpt: excerpt ?? null,
    },
  });
};

export const getBlogById = async (id: string): Promise<Blog | null> => {
  return prisma.blog.findUnique({ where: { id } });
};

export const getBlogBySlug = async (slug: string): Promise<Blog | null> => {
  return prisma.blog.findUnique({ where: { slug } });
};

export const listBlogs = async (): Promise<Blog[]> => {
  return prisma.blog.findMany({
    where: { deletion: false },
    orderBy: { createdAt: 'desc' },
  });
};

export const listPublishedBlogs = async (): Promise<Blog[]> => {
  return prisma.blog.findMany({
    where: { published: true, deletion: false },
    orderBy: { createdAt: 'desc' },
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UpdateBlogInput { title?: string; content?: any; readTime?: string; excerpt?: string }

export const updateBlog = async (id: string, input: UpdateBlogInput): Promise<Blog> => {
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) throw new Error('Blog not found');

  let slug = blog.slug;
  if (input.title && input.title !== blog.title) {
    slug = await generateUniqueSlug(input.title, id);
  }

  return prisma.blog.update({
    where: { id },
    data: {
      title: input.title ?? blog.title,
      slug,
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.readTime !== undefined ? { readTime: input.readTime } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
    },
  });
};

export const updateBlogPublished = async (id: string, published: boolean): Promise<Blog> => {
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) throw new Error('Blog not found');

  return prisma.blog.update({
    where: { id },
    data: { published },
  });
};

export const deleteBlog = async (id: string): Promise<Blog> => {
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) throw new Error('Blog not found');

  return prisma.blog.update({
    where: { id },
    data: { deletion: true, published: false },
  });
};
