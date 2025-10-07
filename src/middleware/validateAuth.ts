import { Request, Response, NextFunction } from 'express';

export const validateAuth = (req: Request, res: Response, next: NextFunction): void => {
  let username, password;
  
  // Handle both JSON and FormData requests
  if (req.headers['content-type']?.includes('application/json')) {
    ({ username, password } = req.body);
  } else {
    // Handle FormData (from admin frontend)
    const formData = req.body;
    username = formData.username;
    password = formData.password;
  }
  
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  next();
};
