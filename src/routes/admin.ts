import express from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { requireAdminCookie } from '../middleware/cookieAuth';
import { validate, validationSchemas, sanitizeInput, validateContentType } from '../middleware/validation';
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
import { SecurityMonitor } from '../services/securityMonitor';
import * as migrationController from '../controllers/migrationController';

const router = express.Router();

// ==================== ADMIN STATISTICS ====================
router.get('/stats', requireAdminCookie, getAdminStats);

// ==================== SECURITY DASHBOARD ====================
router.get('/security-dashboard', requireAdminCookie, async (req, res) => {
  try {
    // Initialize SecurityMonitor instance
    const securityMonitor = new SecurityMonitor();
    
    // Get real security dashboard data from database
    const securityDashboard = await securityMonitor.getSecurityDashboard();
    
    if (!securityDashboard) {
      // Fallback to empty data if database query fails
      const fallbackData = {
        recentEvents: [],
        blockedIPs: [],
        suspiciousActivities: [],
        topEventTypes: [],
        summary: {
          totalEvents24h: 0,
          blockedIPsCount: 0,
          suspiciousIPsCount: 0
        }
      };
      
      res.json({
        success: true,
        data: fallbackData
      });
      return;
    }

    res.json({
      success: true,
      data: securityDashboard
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security dashboard data'
    });
  }
});

// ==================== MIGRATION MANAGEMENT ====================
router.get('/migrations/status', requireAdminCookie, migrationController.getMigrationStatus);
router.post('/migrations/run', requireAdminCookie, migrationController.runMigrations);
router.post('/migrations/rollback', requireAdminCookie, migrationController.rollbackMigration);
router.get('/migrations/validate', requireAdminCookie, migrationController.validateMigrations);
router.post('/migrations/create', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.createMigration),
  migrationController.createMigration
);

// ==================== CATEGORIES ADMIN ROUTES ====================
router.get('/categories', requireAdminCookie, getAllCategoriesAdmin);
router.post('/categories', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.createCategory),
  createCategory
);
router.put('/categories/:id', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.updateCategory),
  updateCategory
);
router.delete('/categories/:id', requireAdminCookie, deleteCategory);

// ==================== FIELDS ADMIN ROUTES ====================
router.get('/fields', requireAdminCookie, getAllFieldsAdmin);
router.post('/fields', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.createField),
  createField
);
router.put('/fields/:id', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.updateField),
  updateField
);
router.delete('/fields/:id', requireAdminCookie, deleteField);

// ==================== COURSES ADMIN ROUTES ====================
router.get('/courses', requireAdminCookie, getAllCoursesAdmin);
router.post('/courses', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.createCourse),
  createCourse
);
router.put('/courses/:id', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.updateCourse),
  updateCourse
);
router.delete('/courses/:id', requireAdminCookie, deleteCourse);

// ==================== COURSE MODULES ADMIN ROUTES ====================
router.get('/courses/:courseId/modules', requireAdminCookie, async (req, res) => {
  try {
    const { courseId } = req.params;
    // Mock implementation - replace with actual module fetching
    const modules: any[] = [];
    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course modules'
    });
  }
});

router.post('/courses/:courseId/modules', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const moduleData = req.body;
      // Mock implementation - replace with actual module creation
      res.json({
        success: true,
        data: { id: Date.now(), ...moduleData, courseId }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create module'
      });
    }
  }
);

router.put('/modules/:moduleId', 
  requireAdminCookie, 
  validateContentType(),
  sanitizeInput,
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const moduleData = req.body;
      // Mock implementation - replace with actual module update
      res.json({
        success: true,
        data: { id: moduleId, ...moduleData }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update module'
      });
    }
  }
);

router.delete('/modules/:moduleId', requireAdminCookie, async (req, res) => {
  try {
    const { moduleId } = req.params;
    // Mock implementation - replace with actual module deletion
    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete module'
    });
  }
});

// ==================== FILE UPLOAD ADMIN ROUTES ====================
router.post('/upload', requireAdminCookie, async (req, res) => {
  try {
    // Mock implementation - replace with actual file upload handling
    res.json({
      success: true,
      data: {
        url: '/uploads/mock-file.jpg',
        filename: 'mock-file.jpg',
        size: 1024
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

export default router;
