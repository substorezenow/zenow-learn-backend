import express from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import {
  // Categories
  createCategory,
  getAllCategoriesAdmin,
  updateCategory,
  deleteCategory,
  
  // Fields
  createField,
  getAllFieldsAdmin,
  updateField,
  deleteField,
  
  // Courses
  getAllCoursesAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  
  // Statistics
  getAdminStats
} from '../controllers/adminController';

const router = express.Router();

// ==================== ADMIN STATISTICS ====================
router.get('/stats', requireAdmin, getAdminStats);

// ==================== CATEGORIES ADMIN ROUTES ====================
router.get('/categories', requireAdmin, getAllCategoriesAdmin);
router.post('/categories', requireAdmin, createCategory);
router.put('/categories/:id', requireAdmin, updateCategory);
router.delete('/categories/:id', requireAdmin, deleteCategory);

// ==================== FIELDS ADMIN ROUTES ====================
router.get('/fields', requireAdmin, getAllFieldsAdmin);
router.post('/fields', requireAdmin, createField);
router.put('/fields/:id', requireAdmin, updateField);
router.delete('/fields/:id', requireAdmin, deleteField);

// ==================== COURSES ADMIN ROUTES ====================
router.get('/courses', requireAdmin, getAllCoursesAdmin);
router.post('/courses', requireAdmin, createCourse);
router.put('/courses/:id', requireAdmin, updateCourse);
router.delete('/courses/:id', requireAdmin, deleteCourse);


export default router;
