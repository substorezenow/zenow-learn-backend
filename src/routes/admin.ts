import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
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
router.get('/stats', getAdminStats); // Temporarily disabled auth for testing

// ==================== CATEGORIES ADMIN ROUTES ====================
router.get('/categories', getAllCategoriesAdmin); // Temporarily disabled auth for testing
router.post('/categories', createCategory); // Temporarily disabled auth for testing
router.put('/categories/:id', updateCategory); // Temporarily disabled auth for testing
router.delete('/categories/:id', deleteCategory); // Temporarily disabled auth for testing

// ==================== FIELDS ADMIN ROUTES ====================
router.get('/fields', getAllFieldsAdmin); // Temporarily disabled auth for testing
router.post('/fields', createField); // Temporarily disabled auth for testing
router.put('/fields/:id', updateField); // Temporarily disabled auth for testing
router.delete('/fields/:id', deleteField); // Temporarily disabled auth for testing

// ==================== COURSES ADMIN ROUTES ====================
router.get('/courses', getAllCoursesAdmin); // Temporarily disabled auth for testing
router.post('/courses', createCourse); // Temporarily disabled auth for testing
router.put('/courses/:id', updateCourse); // Temporarily disabled auth for testing
router.delete('/courses/:id', deleteCourse); // Temporarily disabled auth for testing

// Test route to verify admin routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Admin routes are working!',
    getAllCoursesAdmin: typeof getAllCoursesAdmin,
    createCourse: typeof createCourse
  });
});

export default router;
