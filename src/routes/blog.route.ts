import { Router } from 'express';
import {
  createBlog,
  getBlogs,
  getBlog,
  updateBlogController,
  updateBlogPublishedStatus,
  deleteBlogController,
} from '../controllers/blog.controller';

const router = Router();

// Create a new blog
router.post('/', createBlog);

// List all blogs (admin sees drafts + published)
router.get('/', getBlogs);

// Get a blog by id
router.get('/:id', getBlog);

// Update blog content/title
router.put('/:id', updateBlogController);

// Toggle published status
router.patch('/:id/published', updateBlogPublishedStatus);

// Soft delete
router.patch('/:id/deletion', deleteBlogController);

export default router;
