import type { Blog, Prisma } from '@prisma/client';
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

// ── Tracking ──

export interface ButtonClickEntry { url: string; num_of_clicks: number }
export interface CountryViewEntry { country: string; num: number }

export const trackButtonClick = async (slug: string, url: string): Promise<void> => {
  const blog = await prisma.blog.findUnique({ where: { slug } });
  if (!blog || !blog.published || blog.deletion) throw new Error('Blog not found');

  const clicks: ButtonClickEntry[] = (blog.buttonClicks as ButtonClickEntry[] | null) ?? [];
  const existing = clicks.find((entry) => entry.url === url);
  if (existing) {
    existing.num_of_clicks += 1;
  } else {
    clicks.push({ url, num_of_clicks: 1 });
  }

  await prisma.blog.update({
    where: { slug },
    data: { buttonClicks: clicks as unknown as Prisma.InputJsonValue },
  });
};

export const trackCountryView = async (slug: string, country: string): Promise<void> => {
  const blog = await prisma.blog.findUnique({ where: { slug } });
  if (!blog || !blog.published || blog.deletion) throw new Error('Blog not found');

  const views: CountryViewEntry[] = (blog.countryViews as CountryViewEntry[] | null) ?? [];
  const existing = views.find((entry) => entry.country === country);
  if (existing) {
    existing.num += 1;
  } else {
    views.push({ country, num: 1 });
  }

  await prisma.blog.update({
    where: { slug },
    data: { countryViews: views as unknown as Prisma.InputJsonValue },
  });
};
