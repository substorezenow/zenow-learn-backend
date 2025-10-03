import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getUserByUsername, createUser } from '../utils/userDb';

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
