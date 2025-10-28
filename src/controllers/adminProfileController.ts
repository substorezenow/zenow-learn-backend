import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbManager } from '../utils/databaseManager';
import { logger } from '../utils/logger';
import { SecurityMonitor } from '../services/securityMonitor';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Create SecurityMonitor instance
const securityMonitor = new SecurityMonitor();

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Configure multer for profile image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export const uploadProfileImageMiddleware = upload.single('profile_image');

/**
 * Get admin profile information
 */
export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const query = `
      SELECT 
        id,
        username,
        email,
        first_name,
        last_name,
        phone,
        bio,
        timezone,
        language,
        profile_image,
        role,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1 AND (role = 'admin' OR role = 'superuser')
    `;

    const result = await dbManager.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Admin profile not found'
      });
    }

    const profile = result.rows[0];

    // Remove sensitive information
    delete profile.password;

    logger.info(`Admin profile retrieved for user ${userId}`, {
      userId,
      username: profile.username
    });

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    logger.error('Error fetching admin profile:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

/**
 * Update admin profile information
 */
export const updateAdminProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      username,
      email,
      first_name,
      last_name,
      phone,
      bio,
      timezone,
      language
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate required fields
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required'
      });
    }

    // Check if username or email already exists (excluding current user)
    const existingUserQuery = `
      SELECT id FROM users 
      WHERE (username = $1 OR email = $2) AND id != $3
    `;
    const existingUser = await dbManager.query(existingUserQuery, [username, email, userId]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // Update profile
    const updateQuery = `
      UPDATE users 
      SET 
        username = $1,
        email = $2,
        first_name = $3,
        last_name = $4,
        phone = $5,
        bio = $6,
        timezone = $7,
        language = $8,
        updated_at = NOW()
      WHERE id = $9 AND (role = 'admin' OR role = 'superuser')
      RETURNING 
        id,
        username,
        email,
        first_name,
        last_name,
        phone,
        bio,
        timezone,
        language,
        profile_image,
        role,
        created_at,
        updated_at
    `;

    const result = await dbManager.query(updateQuery, [
      username,
      email,
      first_name || null,
      last_name || null,
      phone || null,
      bio || null,
      timezone || 'UTC',
      language || 'en',
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Admin profile not found'
      });
    }

    const updatedProfile = result.rows[0];

    logger.info(`Admin profile updated for user ${userId}`, {
      userId,
      username: updatedProfile.username,
      changes: { username, email, first_name, last_name, phone, timezone, language }
    });

    // Log security event
    await securityMonitor.logSecurityEvent(
      'profile_update',
      {
        userId: userId.toString(),
        username: updatedProfile.username,
        email: updatedProfile.email
      },
      'MEDIUM',
      req.ip,
      req.get('User-Agent') || 'Unknown'
    );

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error('Error updating admin profile:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

/**
 * Change admin password
 */
export const changeAdminPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { current_password, new_password, confirm_password } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validate input
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        error: 'All password fields are required'
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Get current user data
    const userQuery = `
      SELECT id, username, password 
      FROM users 
      WHERE id = $1 AND (role = 'admin' OR role = 'superuser')
    `;
    const userResult = await dbManager.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Admin user not found'
      });
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
    if (!isCurrentPasswordValid) {
      // Log failed password change attempt
      await securityMonitor.logSecurityEvent(
        'password_change_failed',
        {
          userId: userId.toString(),
          reason: 'invalid_current_password',
          username: user.username
        },
        'HIGH',
        req.ip,
        req.get('User-Agent') || 'Unknown'
      );

      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    const updateQuery = `
      UPDATE users 
      SET 
        password = $1,
        updated_at = NOW()
      WHERE id = $2
    `;

    await dbManager.query(updateQuery, [hashedNewPassword, userId]);

    logger.info(`Password changed for admin user ${userId}`, {
      userId,
      username: user.username
    });

    // Log successful password change
    await securityMonitor.logSecurityEvent(
      'password_changed',
      {
        userId: userId.toString(),
        username: user.username
      },
      'MEDIUM',
      req.ip,
      req.get('User-Agent') || 'Unknown'
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Error changing admin password:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};

/**
 * Upload admin profile image
 */
export const uploadAdminProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `admin_${userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);
    const relativeUrl = `/uploads/profiles/${fileName}`;

    // Save file to disk
    await writeFile(filePath, req.file.buffer);

    // Update user profile with image URL
    const updateQuery = `
      UPDATE users 
      SET 
        profile_image = $1,
        updated_at = NOW()
      WHERE id = $2 AND (role = 'admin' OR role = 'superuser')
      RETURNING 
        id,
        username,
        email,
        first_name,
        last_name,
        phone,
        bio,
        timezone,
        language,
        profile_image,
        role,
        created_at,
        updated_at
    `;

    const result = await dbManager.query(updateQuery, [relativeUrl, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Admin profile not found'
      });
    }

    const updatedProfile = result.rows[0];

    logger.info(`Profile image uploaded for admin user ${userId}`, {
      userId,
      username: updatedProfile.username,
      imageUrl: relativeUrl
    });

    // Log security event
    await securityMonitor.logSecurityEvent(
      'profile_image_upload',
      {
        userId: userId.toString(),
        username: updatedProfile.username,
        imageUrl: relativeUrl
      },
      'LOW',
      req.ip,
      req.get('User-Agent') || 'Unknown'
    );

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile image uploaded successfully'
    });

  } catch (error) {
    logger.error('Error uploading admin profile image:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile image'
    });
  }
};