import type { Request, Response } from 'express';
import type { Blog } from '@prisma/client';
import {
  createBlog as createBlogService,
  getBlogById as getBlogByIdService,
  getBlogBySlug as getBlogBySlugService,
  listBlogs,
  listPublishedBlogs,
  updateBlog as updateBlogService,
  updateBlogPublished,
  deleteBlog as deleteBlogService,
} from '../services/blog.service';
import type {
  BlogDto,
  BlogListItemDto,
  CreateBlogRequestBody,
  UpdateBlogRequestBody,
  UpdateBlogPublishedRequestBody,
} from '../interfaces/blog.interface';

const toBlogDto = (blog: Blog): BlogDto => ({
  id: blog.id,
  title: blog.title,
  slug: blog.slug,
  content: blog.content,
  published: blog.published,
  deletion: blog.deletion,
  readTime: blog.readTime,
  excerpt: blog.excerpt,
  createdAt: blog.createdAt.toISOString(),
  updatedAt: blog.updatedAt.toISOString(),
});

const toBlogListItemDto = (blog: Blog): BlogListItemDto => ({
  id: blog.id,
  title: blog.title,
  slug: blog.slug,
  published: blog.published,
  readTime: blog.readTime,
  excerpt: blog.excerpt,
  createdAt: blog.createdAt.toISOString(),
  updatedAt: blog.updatedAt.toISOString(),
});

// ── Admin (protected) ──

export const createBlog = async (req: Request, res: Response): Promise<void> => {
  const { title, content, readTime, excerpt } = req.body as CreateBlogRequestBody;

  if (!title || typeof title !== 'string') {
    res.status(400).json({ message: 'title is required' });
    return;
  }

  const blog = await createBlogService({
    title: title.trim(),
    content,
    readTime,
    excerpt,
  });

  res.status(201).json(toBlogDto(blog));
};

export const getBlogs = async (_req: Request, res: Response): Promise<void> => {
  const blogs = await listBlogs();
  res.status(200).json(blogs.map(toBlogDto));
};

export const getBlog = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const blog = await getBlogByIdService(id);

  if (!blog) {
    res.status(404).json({ message: 'Blog not found' });
    return;
  }

  res.status(200).json(toBlogDto(blog));
};

export const updateBlogController = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const body = req.body as UpdateBlogRequestBody;

  try {
    const blog = await updateBlogService(id, body);
    res.status(200).json(toBlogDto(blog));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof Error && error.message === 'Blog not found') {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }
    res.status(500).json({ message: 'Failed to update blog' });
  }
};

export const updateBlogPublishedStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const { published } = req.body as UpdateBlogPublishedRequestBody;

  if (typeof published !== 'boolean') {
    res.status(400).json({ message: 'published must be a boolean' });
    return;
  }

  try {
    const blog = await updateBlogPublished(id, published);
    res.status(200).json(toBlogDto(blog));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof Error && error.message === 'Blog not found') {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }
    res.status(500).json({ message: 'Failed to update published status' });
  }
};

export const deleteBlogController = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  try {
    const blog = await deleteBlogService(id);
    res.status(200).json(toBlogDto(blog));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof Error && error.message === 'Blog not found') {
      res.status(404).json({ message: 'Blog not found' });
      return;
    }
    res.status(500).json({ message: 'Failed to delete blog' });
  }
};

// ── Public ──

export const getPublishedBlogs = async (_req: Request, res: Response): Promise<void> => {
  const blogs = await listPublishedBlogs();
  res.status(200).json(blogs.map(toBlogListItemDto));
};

export const getPublishedBlogBySlug = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  if (!slug) {
    res.status(400).json({ message: 'slug is required' });
    return;
  }

  const blog = await getBlogBySlugService(slug);

  if (!blog || !blog.published || blog.deletion) {
    res.status(404).json({ message: 'Blog not found' });
    return;
  }

  res.status(200).json(toBlogDto(blog));
};
