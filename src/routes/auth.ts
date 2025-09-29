import express from 'express';
import { validateAuth } from '../middleware/validateAuth';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', validateAuth, authController.register);
router.post('/login', validateAuth, authController.login);

router.post('/validate-token', authenticate, authController.tokenValidated);

export default router;
