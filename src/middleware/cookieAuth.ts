import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types';

// Cookie-based authentication middleware
export const authenticateCookie = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from httpOnly cookie
    const token = req.cookies?.token;
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin-only cookie authentication
export const requireAdminCookie = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from httpOnly cookie
    const token = req.cookies?.token;
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    
    // Check if user has admin or superuser role
    if (decoded.role !== 'admin' && decoded.role !== 'superuser') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
