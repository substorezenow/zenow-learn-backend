import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getUserByUsername, createUser } from '../utils/userDb';
import handleSendEmail from './emailService';

interface LoginRequest {
  username: string;
  password: string;
}

// Enhanced security services (will be initialized in main app)
let sessionService: any = null;
let rateLimitService: any = null;
let securityMonitor: any = null;

export const initializeSecurityServices = (services: {
  sessionService: any;
  rateLimitService: any;
  securityMonitor: any;
}) => {
  sessionService = services.sessionService;
  rateLimitService = services.rateLimitService;
  securityMonitor = services.securityMonitor;
};

export const register = async ({ username, password }: LoginRequest): Promise<any> => {
  if (!username || !password) throw new Error('Username and password required');
  const existing = await getUserByUsername(username);
  if (existing) throw new Error('User already exists');
  const hash = await bcrypt.hash(password, 10);
  return createUser({ username, password: hash });
};

export const login = async ({ 
  username, 
  password, 
  fingerprint, 
  ip, 
  userAgent 
}: LoginRequest & { 
  fingerprint?: string; 
  ip?: string; 
  userAgent?: string; 
}): Promise<string> => {
  try {
    // Check rate limit if service is available
    if (rateLimitService && ip) {
      const rateLimitCheck = await rateLimitService.checkRateLimit(
        ip, 
        'login', 
        ip
      );

      if (!rateLimitCheck.allowed) {
        if (securityMonitor) {
          await securityMonitor.logSecurityEvent(
            'LOGIN_RATE_LIMIT_EXCEEDED',
            { username, ip, reason: rateLimitCheck.reason },
            'HIGH',
            ip,
            userAgent
          );
        }
        throw new Error('Too many login attempts. Please try again later.');
      }
    }

    // Check if IP is blocked if service is available
    if (securityMonitor && ip && await securityMonitor.isIPBlocked(ip)) {
      await securityMonitor.logSecurityEvent(
        'BLOCKED_IP_LOGIN_ATTEMPT',
        { username, ip },
        'CRITICAL',
        ip,
        userAgent
      );
      throw new Error('Access denied');
    }

    const user = await getUserByUsername(username);
    if (!user) {
      if (securityMonitor) {
        await securityMonitor.logSecurityEvent(
          'INVALID_LOGIN_USERNAME',
          { username, ip },
          'MEDIUM',
          ip,
          userAgent
        );
      }
      throw new Error('Invalid credentials');
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      if (securityMonitor) {
        await securityMonitor.logSecurityEvent(
          'INVALID_LOGIN_PASSWORD',
          { username, ip },
          'MEDIUM',
          ip,
          userAgent
        );
      }
      throw new Error('Invalid credentials');
    }
    
    // Generate secure session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Create fingerprint hash for validation
    const fingerprintHash = fingerprint ? 
      crypto.createHash('sha256').update(fingerprint).digest('hex') : 
      null;
    
    // Create session if service is available
    if (sessionService) {
      const sessionCreated = await sessionService.createSession(
        user.id, 
        sessionId, 
        fingerprintHash || ''
      );

      if (!sessionCreated) {
        throw new Error('Session creation failed');
      }
    }

    // Generate JWT token
    const token = jwt.sign({ 
      id: user.id, 
      username: user.username, 
      role: user.role,
      sessionId: sessionId,
      fingerprintHash: fingerprintHash,
      iat: Math.floor(Date.now() / 1000)
    }, process.env.JWT_SECRET as string, { 
      expiresIn: '4h',
      issuer: 'zenow-academy',
      audience: 'zenow-admin'
    });

    // Log successful login
    if (securityMonitor) {
      await securityMonitor.logSecurityEvent(
        'LOGIN_SUCCESS',
        { username, userId: user.id, ip },
        'LOW',
        ip,
        userAgent
      );
    }

    // Fire-and-forget login notification email if email is available
    try {
      if (user.email) {
        const html = `<html><body style=\"margin:0; padding:0; background:#f5f7fa; font-family:Arial, Helvetica, sans-serif;\"><div style=\"max-width:600px; margin:30px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.06);\"><div style=\"background:#1e3a8a; padding:22px; text-align:center;\"><img src=\"https://academy.zenow.in/zenow-academy-logo-medium.svg\" alt=\"Zenow Academy\" style=\"width:180px; filter:brightness(0) invert(1);\" /></div><div style=\"padding:30px; color:#333;\"><h2 style=\"color:#1e3a8a; margin-bottom:12px; text-align:center; font-size:24px;\">Login Alert</h2><p style=\"font-size:15px; line-height:24px;\">Hello ${user.username},</p><p style=\"font-size:15px; line-height:24px;\">Your Zenow Academy account was just accessed successfully.</p><div style=\"background:#eef4ff; border-left:5px solid #1e3a8a; padding:15px; margin:20px 0; border-radius:8px; font-size:15px;\"><p style=\"margin:0;\"><strong>IP:</strong> ${ip || 'unknown'}<br><strong>User-Agent:</strong> ${userAgent || 'unknown'}</p></div><p style=\"font-size:15px; line-height:24px;\">If this wasn’t you, please <strong>reset your password immediately</strong> to protect your account.</p><div style=\"text-align:center; margin-top:25px;\"><a href=\"https://academy.zenow.in\" style=\"display:inline-block; padding:12px 24px; background:#1e3a8a; color:white; text-decoration:none; border-radius:8px; font-size:16px;\">Go to Zenow Academy</a></div></div><div style=\"background:#f1f1f1; padding:15px; text-align:center; color:#888; font-size:13px;\">© 2025 Zenow Academy. All rights reserved.</div></div></body></html>`;
        // Do not await to avoid delaying response
        handleSendEmail(user.email, 'Login Alert - Zenow Academy', html).catch(() => {});
      }
    } catch {}

    return token;
  } catch (error) {
    // Log failed login attempt
    if (securityMonitor) {
      await securityMonitor.logSecurityEvent(
        'LOGIN_FAILED',
        { username, ip, error: error instanceof Error ? error.message : 'Unknown error' },
        'MEDIUM',
        ip,
        userAgent
      );
    }
    throw error;
  }
};

export const logout = async (sessionId: string, ip?: string, userAgent?: string): Promise<void> => {
  try {
    if (sessionService) {
      await sessionService.blacklistSession(sessionId, 'User logout');
    }
    
    if (securityMonitor) {
      await securityMonitor.logSecurityEvent(
        'LOGOUT_SUCCESS',
        { sessionId, ip },
        'LOW',
        ip,
        userAgent
      );
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export default { register, login, logout, initializeSecurityServices };
