import express from 'express';
import { 
  getPublishedBlogs, 
  getBlogBySlug, 
  getBlogsByCategory, 
  getFeaturedBlogs 
} from '../controllers/blogController';
import { 
  getActiveBlogCategories, 
  getBlogCategoryBySlug 
} from '../controllers/blogCategoryController';

const router = express.Router();

// ==================== PUBLIC BLOG ROUTES ====================

// Blog Categories
router.get('/categories', getActiveBlogCategories);
router.get('/categories/:slug', getBlogCategoryBySlug);

// Blogs
router.get('/', getPublishedBlogs);
router.get('/featured', getFeaturedBlogs);
router.get('/category/:categorySlug', getBlogsByCategory);
router.get('/:slug', getBlogBySlug);

export default router;