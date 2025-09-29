import express from 'express';
import authRoutes from './auth';
import healthRoutes from './health';
import courseRoutes from './courses';
import adminRoutes from './admin';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/courses', courseRoutes);
router.use('/admin', adminRoutes);

export default router;
