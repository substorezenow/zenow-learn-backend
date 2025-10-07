import { Request, Response } from 'express';
import authService from '../services/authService';
import crypto from 'crypto';

const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
};

const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('request is comming for login. ');

    const token = await authService.login(req.body);
    res.status(200).json({ token });
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
};

// Secure login endpoint that returns token in httpOnly cookie
const secureLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    let username, password, fingerprint;
    
    // Handle both JSON and FormData requests
    if (req.headers['content-type']?.includes('application/json')) {
      ({ username, password, fingerprint } = req.body);
    } else {
      // Handle FormData (from admin frontend)
      const formData = req.body;
      username = formData.username;
      password = formData.password;
      fingerprint = formData.fingerprint;
    }
    
    // Validate required fields
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    
    // Get client IP and user agent
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Call auth service with fingerprint
    const token = await authService.login({
      username,
      password,
      fingerprint,
      ip,
      userAgent
    });
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 60 * 60 * 1000 // 4 hours
    });
    
    res.status(200).json({ 
      success: true,
      message: 'Login successful. Token secured with browser fingerprint validation.'
    });
  } catch (err) {
    console.error('Secure login error:', err);
    res.status(401).json({ error: (err as Error).message });
  }
};

// Session verification endpoint
const sessionVerify = async (req: Request, res: Response): Promise<void> => {
  try {
    let sessionData;
    
    // Handle both JSON and FormData requests
    if (req.headers['content-type']?.includes('application/json')) {
      ({ sessionData } = req.body);
    } else {
      // Handle FormData (from admin frontend)
      const formData = req.body;
      sessionData = formData.sessionData;
    }
    
    // Get token from httpOnly cookie
    const token = req.cookies?.token;
    
    if (!token) {
      res.status(401).json({ 
        valid: false, 
        error: 'Session expired' 
      });
      return;
    }
    
    // Decode JWT to get stored session hash
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.fingerprintHash) {
      res.status(401).json({ 
        valid: false, 
        error: 'Invalid session' 
      });
      return;
    }
    
    // Generate current session hash
    const currentSessionHash = crypto.createHash('sha256').update(sessionData).digest('hex');
    
    // Compare with stored hash
    if (currentSessionHash !== decoded.fingerprintHash) {
      res.status(401).json({ 
        valid: false, 
        error: 'Session mismatch' 
      });
      return;
    }
    
    res.status(200).json({ 
      valid: true, 
      message: 'Session verified' 
    });
    
  } catch (error) {
    res.status(500).json({ 
      valid: false, 
      error: 'Session verification failed' 
    });
  }
};

// Logout endpoint
const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear the httpOnly cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    res.status(200).json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

const tokenValidated = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ valid: true, user: req.user });
};

export const authController = { register, login, secureLogin, sessionVerify, logout, tokenValidated };
