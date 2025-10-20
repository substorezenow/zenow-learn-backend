import express from 'express';
import authRoutes from './auth';
import courseRoutes from './courses';
import adminRoutes from './admin';
import studentAuthRoutes from './studentAuth';
import studentProfileRoutes from './studentProfile';
import { apiVersionMiddleware, getApiInfo, getChangelog } from '../middleware/apiVersioning';

const router = express.Router();

// Apply API versioning middleware
router.use(apiVersionMiddleware);

// API info endpoints
router.get('/info', getApiInfo);
router.get('/changelog', getChangelog);

// Versioned routes
router.use('/courses', courseRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/student-auth', studentAuthRoutes);
router.use('/student', studentProfileRoutes);

export default router;
