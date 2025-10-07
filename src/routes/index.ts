import express from 'express';
import authRoutes from './auth';
import courseRoutes from './courses';
import adminRoutes from './admin';
import { apiVersionMiddleware, getApiInfo, getChangelog } from '../middleware/apiVersioning';

const router = express.Router();

// Apply API versioning middleware
router.use(apiVersionMiddleware);

// API info endpoints
router.get('/info', getApiInfo);
router.get('/changelog', getChangelog);

// Versioned routes
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/admin', adminRoutes);

export default router;
