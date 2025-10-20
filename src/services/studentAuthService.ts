import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { dbManager } from '../utils/databaseManager';

export class StudentAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly JWT_EXPIRES_IN = '24h';
  private readonly JWT_REFRESH_EXPIRES_IN = '7d';

  constructor() {
    // Initialize without external services for now
  }

  /**
   * Register a new student
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { 
        email, 
        password, 
        first_name, 
        last_name, 
        phone,
        date_of_birth,
        gender,
        country,
        city
      } = req.body;
      
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      // Check if student already exists
      const existingStudent = await dbManager.query(
        'SELECT id FROM students WHERE email = $1',
        [email]
      );

      if (existingStudent.rows.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Student with this email already exists'
        });
        return;
      }

      // Generate unique student ID
      const studentId = await this.generateStudentId();

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create student
      const studentResult = await dbManager.query(
        `INSERT INTO students (
          student_id, email, password_hash, first_name, last_name, 
          phone, date_of_birth, gender, country, city, 
          is_active, email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id, student_id, email, first_name, last_name, is_active, email_verified, created_at`,
        [
          studentId, email, passwordHash, first_name, last_name,
          phone || null, date_of_birth || null, gender || null, 
          country || null, city || null, true, false
        ]
      );

      const student = studentResult.rows[0];

      // Generate tokens
      const accessToken = this.generateAccessToken(student);
      const refreshToken = this.generateRefreshToken(student);

      // Store refresh token in database
      await this.storeRefreshToken(student.id, refreshToken);

      res.status(201).json({
        success: true,
        message: 'Student registered successfully',
        data: {
          student: {
            id: student.id,
            student_id: student.student_id,
            email: student.email,
            first_name: student.first_name,
            last_name: student.last_name,
            is_active: student.is_active,
            email_verified: student.email_verified
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Student registration error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  /**
   * Login student
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fingerprint } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Find student
      const studentResult = await dbManager.query(
        `SELECT id, student_id, email, password_hash, first_name, last_name, 
         is_active, email_verified, failed_login_attempts, account_locked_until, last_login_at
         FROM students WHERE email = $1`,
        [email]
      );

      if (studentResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      const student = studentResult.rows[0];

      // Check if account is locked
      if (student.account_locked_until && new Date() < new Date(student.account_locked_until)) {
        res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts'
        });
        return;
      }

      // Check if student is active
      if (!student.is_active) {
        res.status(403).json({
          success: false,
          message: 'Account is inactive'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, student.password_hash);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        const newFailedAttempts = student.failed_login_attempts + 1;
        let lockUntil = null;
        
        if (newFailedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        }

        await dbManager.query(
          'UPDATE students SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
          [newFailedAttempts, lockUntil, student.id]
        );

        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Reset failed login attempts on successful login
      await dbManager.query(
        'UPDATE students SET failed_login_attempts = 0, account_locked_until = NULL, last_login_at = NOW() WHERE id = $1',
        [student.id]
      );

      // Generate tokens
      const accessToken = this.generateAccessToken(student);
      const refreshToken = this.generateRefreshToken(student);

      // Store refresh token
      await this.storeRefreshToken(student.id, refreshToken);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          student: {
            id: student.id,
            student_id: student.student_id,
            email: student.email,
            first_name: student.first_name,
            last_name: student.last_name,
            is_active: student.is_active,
            email_verified: student.email_verified
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Student login error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
      
      // Check if refresh token exists in database
      const tokenResult = await dbManager.query(
        'SELECT student_id FROM student_refresh_tokens WHERE token = $1 AND expires_at > NOW()',
        [refreshToken]
      );

      if (tokenResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
        return;
      }

      // Get student data
      const studentResult = await dbManager.query(
        'SELECT id, student_id, email, first_name, last_name, is_active, email_verified FROM students WHERE id = $1',
        [decoded.studentId]
      );

      if (studentResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Student not found'
        });
        return;
      }

      const student = studentResult.rows[0];

      if (!student.is_active) {
        res.status(403).json({
          success: false,
          message: 'Account is inactive'
        });
        return;
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(student);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  /**
   * Logout student
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Remove refresh token from database
        await dbManager.query(
          'DELETE FROM student_refresh_tokens WHERE token = $1',
          [refreshToken]
        );
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      });
    }
  }

  /**
   * Generate access token
   */
  private generateAccessToken(student: any): string {
    return jwt.sign(
      {
        studentId: student.id,
        student_id: student.student_id,
        email: student.email,
        type: 'student'
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(student: any): string {
    return jwt.sign(
      {
        studentId: student.id,
        type: 'student_refresh'
      },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN }
    );
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(studentId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await dbManager.query(
      'INSERT INTO student_refresh_tokens (student_id, token, expires_at) VALUES ($1, $2, $3)',
      [studentId, refreshToken, expiresAt]
    );
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      // Check if student exists
      const studentResult = await dbManager.query(
        'SELECT id, email, first_name FROM students WHERE email = $1 AND is_active = true',
        [email]
      );

      if (studentResult.rows.length === 0) {
        // Don't reveal if email exists or not for security
        res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent'
        });
        return;
      }

      const student = studentResult.rows[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token in database
      await dbManager.query(
        'UPDATE students SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
        [resetToken, resetExpires, student.id]
      );

      // In a real application, you would send an email here
      // For now, we'll return the reset token in the response (for development)
      res.json({
        success: true,
        message: 'Password reset link sent to your email',
        // Remove this in production - only for development
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        resetUrl: process.env.NODE_ENV === 'development' ? 
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}` : undefined
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({
          success: false,
          message: 'Token and password are required'
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
        return;
      }

      // Find student with valid reset token
      const studentResult = await dbManager.query(
        'SELECT id FROM students WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
        [token]
      );

      if (studentResult.rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
        return;
      }

      const student = studentResult.rows[0];

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update password and clear reset token
      await dbManager.query(
        'UPDATE students SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
        [hashedPassword, student.id]
      );

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify student session
   */
  async verifySession(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'No token provided'
        });
        return;
      }

      const token = authHeader.substring(7);
      
      // Verify access token
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'student') {
        res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
        return;
      }

      // Get student data
      const studentResult = await dbManager.query(
        'SELECT id, student_id, email, first_name, last_name, is_active, email_verified FROM students WHERE id = $1',
        [decoded.studentId]
      );

      if (studentResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Student not found'
        });
        return;
      }

      const student = studentResult.rows[0];

      if (!student.is_active) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Session verified successfully',
        data: {
          user: {
            id: student.id,
            student_id: student.student_id,
            email: student.email,
            first_name: student.first_name,
            last_name: student.last_name,
            is_active: student.is_active,
            email_verified: student.email_verified
          }
        }
      });

    } catch (error) {
      console.error('Session verification error:', error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during session verification'
      });
    }
  }

  /**
   * Generate unique student ID
   */
  private async generateStudentId(): Promise<string> {
    let studentId: string;
    let exists = true;
    
    while (exists) {
      const randomNum = Math.floor(Math.random() * 9999) + 1;
      studentId = `STU${randomNum.toString().padStart(4, '0')}`;
      
      const result = await dbManager.query(
        'SELECT id FROM students WHERE student_id = $1',
        [studentId]
      );
      
      exists = result.rows.length > 0;
    }
    
    return studentId!;
  }
}

export const studentAuthService = new StudentAuthService();