import { Router } from 'express';
import { getPublishedBlogs, getPublishedBlogBySlug, trackBlogButtonClick, trackBlogCountryView } from '../controllers/blog.controller';

const router = Router();

// List published blogs (for public blog listing page)
router.get('/', getPublishedBlogs);

// Get a published blog by slug (for /blog/:slug page)
router.get('/:slug', getPublishedBlogBySlug);

// Track button click on a blog (public, no auth)
router.post('/:slug/track-click', trackBlogButtonClick);

// Track country view on a blog (public, no auth)
router.post('/:slug/track-view', trackBlogCountryView);

export default router;
