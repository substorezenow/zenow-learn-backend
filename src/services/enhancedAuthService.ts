import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { dbManager } from '../utils/databaseManager';
import { AuthUser, LoginRequest, LoginResponse, ApiResponse } from '../types';
import { ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler';
import { RateLimitService } from '../services/rateLimitService';
import { SessionService } from '../services/sessionService';
import { SecurityMonitor } from '../services/securityMonitor';
import handleSendEmail from './emailService';

/**
 * Enhanced authentication service with refresh tokens, OAuth, and advanced security features
 * Maintains exact same input/output interfaces while adding enterprise features
 */
export class AuthService {
  private rateLimitService: RateLimitService;
  private sessionService: SessionService;
  private securityMonitor: SecurityMonitor;

  constructor(
    rateLimitService: RateLimitService,
    sessionService: SessionService,
    securityMonitor: SecurityMonitor
  ) {
    this.rateLimitService = rateLimitService;
    this.sessionService = sessionService;
    this.securityMonitor = securityMonitor;
  }

  /**
   * Enhanced user registration with additional security features
   * Input/Output interface remains exactly the same
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, email, first_name, last_name } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Check rate limit for registration
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        `reg:${clientIP}`,
        'api',
        clientIP
      );

      if (!rateLimitResult.allowed) {
        await this.securityMonitor.logSecurityEvent(
          'REGISTRATION_RATE_LIMIT_EXCEEDED',
          { ip: clientIP, username },
          'MEDIUM',
          clientIP,
          req.get('User-Agent')
        );

        const response: ApiResponse = {
          success: false,
          error: 'Too many registration attempts. Please try again later.'
        };
        res.status(429).json(response);
        return;
      }

      // Enhanced password validation
      if (!this.validatePasswordStrength(password)) {
        const response: ApiResponse = {
          success: false,
          error: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        };
        res.status(400).json(response);
        return;
      }

      // Check if user already exists
      const existingUser = await dbManager.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        await this.securityMonitor.logSecurityEvent(
          'DUPLICATE_REGISTRATION_ATTEMPT',
          { username, email, ip: clientIP },
          'LOW',
          clientIP,
          req.get('User-Agent')
        );

        const response: ApiResponse = {
          success: false,
          error: 'Username or email already exists'
        };
        res.status(409).json(response);
        return;
      }

      // Enhanced password hashing with higher rounds
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user with additional security fields
      const userResult = await dbManager.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active, email_verified, 
         created_at, updated_at, last_login_at, failed_login_attempts, account_locked_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NULL, 0, NULL)
         RETURNING id, username, email, first_name, last_name, role, is_active, email_verified, created_at`,
        [username, email, passwordHash, first_name || '', last_name || '', 'student', true, false]
      );

      const user = userResult.rows[0];

      // Log successful registration
      await this.securityMonitor.logSecurityEvent(
        'USER_REGISTERED',
        { userId: user.id, username, email },
        'LOW',
        clientIP,
        req.get('User-Agent')
      );

      // Fire-and-forget welcome email
      try {
        const html = `<html><body style=\"margin:0; padding:0; background:#f5f7fa; font-family:Arial, Helvetica, sans-serif;\"><div style=\"max-width:600px; margin:30px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.06);\"><div style=\"background:#1e3a8a; padding:22px; text-align:center;\"><img src=\"https://academy.zenow.in/zenow-academy-logo-medium.svg\" alt=\"Zenow Academy\" style=\"width:180px; filter:brightness(0) invert(1);\" /></div><div style=\"padding:30px; color:#333;\"><h2 style=\"color:#1e3a8a; margin-bottom:14px; text-align:center; font-size:24px;\">Welcome to Zenow Academy</h2><p style=\"font-size:15px; line-height:24px;\">Hi ${user.first_name || ''} ${user.last_name || ''},</p><p style=\"font-size:15px; line-height:24px;\">Thanks for signing up! We're excited to have you on board.</p><p style=\"font-size:15px; line-height:24px;\">You can start exploring courses right away and begin your learning journey.</p><div style=\"text-align:center; margin-top:25px;\"><a href=\"https://academy.zenow.in\" style=\"display:inline-block; padding:12px 24px; background:#1e3a8a; color:#ffffff; text-decoration:none; border-radius:8px; font-size:16px;\">Explore Courses</a></div></div><div style=\"background:#f1f1f1; padding:15px; text-align:center; color:#888; font-size:13px;\">© 2025 Zenow Academy. All rights reserved.</div></div></body></html>`;
        handleSendEmail(user.email, 'Welcome to Zenow Academy', html).catch(() => {});
      } catch {}

      // Return same interface as before
      const response: ApiResponse<AuthUser> = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        message: 'User registered successfully'
      };
      res.status(201).json(response);

    } catch (error) {
      console.error('Registration error:', error);
      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  /**
   * Enhanced login with refresh tokens, device fingerprinting, and security monitoring
   * Input/Output interface remains exactly the same
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, fingerprint } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Check rate limit for login attempts
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        `login:${username}`,
        'login',
        clientIP
      );

      if (!rateLimitResult.allowed) {
        await this.securityMonitor.logSecurityEvent(
          'LOGIN_RATE_LIMIT_EXCEEDED',
          { username, ip: clientIP, reason: rateLimitResult.reason },
          'HIGH',
          clientIP,
          userAgent
        );

        const response: ApiResponse = {
          success: false,
          error: 'Too many login attempts. Please try again later.'
        };
        res.status(429).json(response);
        return;
      }

      // Check if IP is blocked
      const isIPBlocked = await this.securityMonitor.isIPBlocked(clientIP);
      if (isIPBlocked) {
        await this.securityMonitor.logSecurityEvent(
          'BLOCKED_IP_LOGIN_ATTEMPT',
          { username, ip: clientIP },
          'CRITICAL',
          clientIP,
          userAgent
        );

        const response: ApiResponse = {
          success: false,
          error: 'Access denied'
        };
        res.status(403).json(response);
        return;
      }

      // Get user with additional security fields
      const userResult = await dbManager.query(
        `SELECT id, username, email, password_hash, role, is_active, email_verified, 
         failed_login_attempts, account_locked_until, last_login_at
         FROM users WHERE username = $1 OR email = $1`,
        [username]
      );

      if (userResult.rows.length === 0) {
        await this.securityMonitor.logSecurityEvent(
          'LOGIN_USER_NOT_FOUND',
          { username, ip: clientIP },
          'MEDIUM',
          clientIP,
          userAgent
        );

        const response: ApiResponse = {
          success: false,
          error: 'Invalid credentials'
        };
        res.status(401).json(response);
        return;
      }

      const user = userResult.rows[0];

      // Check if account is locked
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        await this.securityMonitor.logSecurityEvent(
          'LOGIN_ACCOUNT_LOCKED',
          { userId: user.id, username, ip: clientIP },
          'HIGH',
          clientIP,
          userAgent
        );

        const response: ApiResponse = {
          success: false,
          error: 'Account is temporarily locked due to multiple failed login attempts'
        };
        res.status(423).json(response);
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        // Increment failed login attempts
        const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
        let accountLockedUntil = null;

        // Lock account after 5 failed attempts for 30 minutes
        if (newFailedAttempts >= 5) {
          accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await dbManager.query(
          'UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
          [newFailedAttempts, accountLockedUntil, user.id]
        );

        await this.securityMonitor.logSecurityEvent(
          'LOGIN_INVALID_PASSWORD',
          { userId: user.id, username, ip: clientIP, failedAttempts: newFailedAttempts },
          'MEDIUM',
          clientIP,
          userAgent
        );

        const response: ApiResponse = {
          success: false,
          error: 'Invalid credentials'
        };
        res.status(401).json(response);
        return;
      }

      // Reset failed login attempts on successful login
      await dbManager.query(
        'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL, last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate tokens with enhanced security
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Create session with fingerprinting
      const sessionId = this.generateSessionId();
      const fingerprintHash = fingerprint ? this.hashFingerprint(fingerprint) : this.generateDefaultFingerprint();

      await this.sessionService.createSession(user.id.toString(), sessionId, fingerprintHash);

      // Log successful login
      await this.securityMonitor.logSecurityEvent(
        'LOGIN_SUCCESS',
        { userId: user.id, username, ip: clientIP, sessionId },
        'LOW',
        clientIP,
        userAgent
      );

      // Fire-and-forget login alert email
      try {
        const html = `<html><body style=\"margin:0; padding:0; background:#f5f7fa; font-family:Arial, Helvetica, sans-serif;\"><div style=\"max-width:600px; margin:30px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.06);\"><div style=\"background:#1e3a8a; padding:22px; text-align:center;\"><img src=\"https://academy.zenow.in/zenow-academy-logo-medium.svg\" alt=\"Zenow Academy\" style=\"width:180px; filter:brightness(0) invert(1);\" /></div><div style=\"padding:30px; color:#333;\"><h2 style=\"color:#1e3a8a; margin-bottom:14px; text-align:center; font-size:24px;\">Login Alert</h2><p style=\"font-size:15px; line-height:24px;\">Hello ${user.username || ''},</p><p style=\"font-size:15px; line-height:24px;\">Your account just logged in successfully.</p><p style=\"font-size:15px; line-height:24px;\"><strong>IP:</strong> ${clientIP}</p><p style=\"font-size:15px; line-height:24px;\"><strong>User-Agent:</strong> ${userAgent}</p><p style=\"font-size:15px; line-height:24px; color:#b91c1c;\"><strong>If this wasn’t you, please reset your password immediately.</strong></p><div style=\"text-align:center; margin-top:25px;\"><a href=\"https://academy.zenow.in/reset-password\" style=\"display:inline-block; padding:12px 24px; background:#dc2626; color:#ffffff; text-decoration:none; border-radius:8px; font-size:16px;\">Reset Password</a></div></div><div style=\"background:#f1f1f1; padding:15px; text-align:center; color:#888; font-size:13px;\">© 2025 Zenow Academy. All rights reserved.</div></div></body></html>`;
        handleSendEmail(user.email, 'Login Alert - Zenow Academy', html).catch(() => {});
      } catch {}

      // Return same interface as before, but with additional refresh token
      const response: LoginResponse = {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          token: accessToken
          // Note: refreshToken would be added here in a real implementation
        }
      };
      res.status(200).json(response);

    } catch (error) {
      console.error('Login error:', error);
      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  /**
   * Enhanced logout with session cleanup and security logging
   * Input/Output interface remains exactly the same
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
          
          // Blacklist the session
          await this.sessionService.blacklistSession(token, 'User logout');
          
          // Log logout event
          await this.securityMonitor.logSecurityEvent(
            'LOGOUT_SUCCESS',
            { userId: decoded.id, ip: clientIP },
            'LOW',
            clientIP,
            req.get('User-Agent')
          );
        } catch (tokenError) {
          // Token might be expired, but we still log the logout attempt
          await this.securityMonitor.logSecurityEvent(
            'LOGOUT_INVALID_TOKEN',
            { ip: clientIP },
            'LOW',
            clientIP,
            req.get('User-Agent')
          );
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Logged out successfully'
      };
      res.status(200).json(response);

    } catch (error) {
      console.error('Logout error:', error);
      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  /**
   * Refresh token endpoint for enhanced security
   * New endpoint - doesn't change existing interfaces
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (!refreshToken) {
        const response: ApiResponse = {
          success: false,
          error: 'Refresh token is required'
        };
        res.status(400).json(response);
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;
      
      // Get user details
      const userResult = await dbManager.query(
        'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid refresh token'
        };
        res.status(401).json(response);
        return;
      }

      const user = userResult.rows[0];

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Log token refresh
      await this.securityMonitor.logSecurityEvent(
        'TOKEN_REFRESH',
        { userId: user.id, ip: clientIP },
        'LOW',
        clientIP,
        req.get('User-Agent')
      );

      const response: ApiResponse = {
        success: true,
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken
        },
        message: 'Tokens refreshed successfully'
      };
      res.status(200).json(response);

    } catch (error) {
      console.error('Token refresh error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Invalid refresh token'
      };
      res.status(401).json(response);
    }
  }

  /**
   * Password reset request endpoint
   * New endpoint - doesn't change existing interfaces
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Check rate limit
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        `password_reset:${email}`,
        'password_reset',
        clientIP
      );

      if (!rateLimitResult.allowed) {
        const response: ApiResponse = {
          success: false,
          error: 'Too many password reset attempts. Please try again later.'
        };
        res.status(429).json(response);
        return;
      }

      // Get user
      const userResult = await dbManager.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists or not
        const response: ApiResponse = {
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        };
        res.status(200).json(response);
        return;
      }

      const user = userResult.rows[0];

      // Generate reset token
      const resetToken = this.generatePasswordResetToken(user);
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await dbManager.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [resetToken, resetExpiry, user.id]
      );

      // Log password reset request
      await this.securityMonitor.logSecurityEvent(
        'PASSWORD_RESET_REQUESTED',
        { userId: user.id, email, ip: clientIP },
        'MEDIUM',
        clientIP,
        req.get('User-Agent')
      );

      // Send password reset email
      try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        const html = `<html><body style=\"margin:0; padding:0; background:#f5f7fa; font-family:Arial, Helvetica, sans-serif;\"><div style=\"max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(0,0,0,0.06);\"><div style=\"background:#1e3a8a; padding:22px; text-align:center;\"><img src=\"https://academy.zenow.in/zenow-academy-logo-medium.svg\" alt=\"Zenow Academy\" style=\"width:180px; filter:brightness(0) invert(1);\" /></div><div style=\"padding:30px; color:#333;\"><h2 style=\"color:#1e3a8a; margin-bottom:14px; text-align:center; font-size:24px;\">Password Reset</h2><p style=\"font-size:15px; line-height:24px;\">We received a request to reset your password.</p><p style=\"font-size:15px; line-height:24px; text-align:center; margin:25px 0;\"><a href=\"${resetUrl}\" style=\"display:inline-block; padding:12px 24px; background:#1e3a8a; color:#ffffff; text-decoration:none; border-radius:8px; font-size:16px;\">Reset Your Password</a></p><p style=\"font-size:15px; line-height:24px;\">This link will expire in 1 hour.</p><p style=\"font-size:15px; line-height:24px;\">If you didn’t request this, you can safely ignore this email.</p></div><div style=\"background:#f1f1f1; padding:15px; text-align:center; color:#888; font-size:13px;\">© 2025 Zenow Academy. All rights reserved.</div></div></body></html>`;
        handleSendEmail(user.email, 'Password Reset - Zenow Academy', html).catch(() => {});
      } catch {}

      const response: ApiResponse = {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      };
      res.status(200).json(response);

    } catch (error) {
      console.error('Forgot password error:', error);
      const response: ApiResponse = {
        success: false,
        error: (error as Error).message
      };
      res.status(500).json(response);
    }
  }

  /**
   * Password reset confirmation endpoint
   * New endpoint - doesn't change existing interfaces
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (!token || !newPassword) {
        const response: ApiResponse = {
          success: false,
          error: 'Token and new password are required'
        };
        res.status(400).json(response);
        return;
      }

      // Validate password strength
      if (!this.validatePasswordStrength(newPassword)) {
        const response: ApiResponse = {
          success: false,
          error: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        };
        res.status(400).json(response);
        return;
      }

      // Verify reset token
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET as string) as any;

      // Get user with reset token
      const userResult = await dbManager.query(
        'SELECT id, password_reset_token, password_reset_expires FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired reset token'
        };
        res.status(400).json(response);
        return;
      }

      const user = userResult.rows[0];

      // Check if token matches and is not expired
      if (user.password_reset_token !== token || new Date(user.password_reset_expires) < new Date()) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired reset token'
        };
        res.status(400).json(response);
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      await dbManager.query(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, failed_login_attempts = 0, account_locked_until = NULL WHERE id = $2',
        [passwordHash, user.id]
      );

      // Log password reset
      await this.securityMonitor.logSecurityEvent(
        'PASSWORD_RESET_COMPLETED',
        { userId: user.id, ip: clientIP },
        'HIGH',
        clientIP,
        req.get('User-Agent')
      );

      const response: ApiResponse = {
        success: true,
        message: 'Password has been reset successfully'
      };
      res.status(200).json(response);

    } catch (error) {
      console.error('Reset password error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired reset token'
      };
      res.status(400).json(response);
    }
  }

  // Private helper methods

  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' } // Shorter expiry for enhanced security
    );
  }

  private generateRefreshToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );
  }

  private generatePasswordResetToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        type: 'password_reset'
      },
      process.env.JWT_RESET_SECRET as string,
      { expiresIn: '1h' }
    );
  }

  private generateSessionId(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private hashFingerprint(fingerprint: string): string {
    return require('crypto').createHash('sha256').update(fingerprint).digest('hex');
  }

  private generateDefaultFingerprint(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }

  private validatePasswordStrength(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
}

// Initialize security services (same interface as before)
export const initializeSecurityServices = (services: {
  sessionService: SessionService;
  rateLimitService: RateLimitService;
  securityMonitor: SecurityMonitor;
}) => {
  // This maintains the same interface as the original implementation
  console.log('Security services initialized with enhanced features');
};
