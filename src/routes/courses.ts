import express from 'express';
import {
  // Categories
  getAllCategories,
  getCategoryById,
  getFieldsByCategory,
  
  // Fields
  getAllFields,
  getFieldById,
  getCoursesByField,
  
  // Courses
  getAllCourses,
  getCourseById,
  getCourseBySlug,
  enrollInCourse,
  createCourse,
  updateCourse
} from '../controllers/courseController';

import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// ==================== PUBLIC ROUTES (No Authentication Required) ====================

// Categories Routes - Only show active categories
router.get('/categories', getAllCategories);
router.get('/categories/:id', getCategoryById);
router.get('/categories/:id/fields', getFieldsByCategory);

// Fields Routes - Only show active fields
router.get('/fields', getAllFields);
router.get('/fields/:id', getFieldById);
router.get('/fields/:id/courses', getCoursesByField);

// Courses Routes - Only show published courses
router.get('/courses', getAllCourses);
router.get('/courses/:id', getCourseById);
router.get('/courses/slug/:slug', getCourseBySlug);

// ==================== PROTECTED ROUTES (Require Authentication) ====================

// User enrollment (requires user authentication)
router.post('/courses/:id/enroll', authenticateToken, enrollInCourse);

export default router;
