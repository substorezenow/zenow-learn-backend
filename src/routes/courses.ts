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
  getEnrollmentStatus,
  createCourse,
  updateCourse
} from '../controllers/courseController';

import { authenticateStudent } from '../middleware/studentAuth';

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

// User enrollment (requires student authentication)
router.post('/courses/:id/enroll', authenticateStudent, enrollInCourse);

// Check enrollment status (requires student authentication)
router.get('/courses/:id/enrollment-status', authenticateStudent, getEnrollmentStatus);

export default router;
