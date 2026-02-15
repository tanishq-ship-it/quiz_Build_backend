import { Router } from 'express';
import { getPublishedBlogs, getPublishedBlogBySlug } from '../controllers/blog.controller';

const router = Router();

// List published blogs (for public blog listing page)
router.get('/', getPublishedBlogs);

// Get a published blog by slug (for /blog/:slug page)
router.get('/:slug', getPublishedBlogBySlug);

export default router;
