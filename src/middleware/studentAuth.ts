import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbManager } from '../utils/databaseManager';
import config from '../config';

export const authenticateStudent = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    const jwtSecret = config.jwtSecret;
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (decoded.type !== 'student') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    // Set user info for the request
    req.user = {
      id: decoded.studentId,
      email: decoded.email,
      role: 'student'
    };
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
