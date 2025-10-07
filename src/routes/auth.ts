import express from 'express';
import { validateAuth } from '../middleware/validateAuth';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { authenticateCookie } from '../middleware/cookieAuth';
import { validate, validationSchemas, sanitizeInput, validateContentType } from '../middleware/validation';

const router = express.Router();

router.post('/register', 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.register),
  validateAuth, 
  authController.register
);
router.post('/login', 
  validateContentType(),
  sanitizeInput,
  validate(validationSchemas.login),
  validateAuth, 
  authController.login
);

// Secure login endpoint for frontend (accepts both JSON and FormData)
router.post('/secure-login', 
  sanitizeInput,
  validateAuth, 
  authController.secureLogin
);

// Session verification endpoint (accepts both JSON and FormData)
router.post('/session-verify', 
  sanitizeInput,
  authController.sessionVerify
);

// Logout endpoint
router.post('/logout', authController.logout);

router.post('/validate-token', authenticate, authController.tokenValidated);

export default router;
