import { Request, Response } from 'express';
import { dbManager } from '../utils/databaseManager';
import { asyncHandler, sendSuccessResponse, NotFoundError, DatabaseError, handleDatabaseError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

// ==================== STUDENT PROFILE MANAGEMENT ====================

/**
 * Get current student's profile
 */
export const getStudentProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const studentId = req.user?.id;

  if (!studentId) {
    res.status(401).json({
      success: false,
      error: 'Student not authenticated'
    });
    return;
  }

  const profileQuery = `
    SELECT 
      s.id,
      s.student_id,
      s.email,
      s.first_name,
      s.last_name,
      s.phone,
      s.date_of_birth,
      s.gender,
      s.address,
      s.city,
      s.state,
      s.country,
      s.postal_code,
      s.emergency_contact_name,
      s.emergency_contact_phone,
      s.emergency_contact_relation,
      s.profile_image,
      s.bio,
      s.interests,
      s.learning_goals,
      s.preferred_language,
      s.timezone,
      s.is_active,
      s.email_verified,
      s.phone_verified,
      s.profile_completed,
      s.created_at,
      s.updated_at,
      s.last_login_at,
      COUNT(e.id) as enrolled_courses,
      COUNT(CASE WHEN e.is_completed = true THEN 1 END) as completed_courses
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.user_id
    WHERE s.id = $1
    GROUP BY s.id, s.student_id, s.email, s.first_name, s.last_name, 
             s.phone, s.date_of_birth, s.gender, s.address, s.city, s.state, 
             s.country, s.postal_code, s.emergency_contact_name, s.emergency_contact_phone,
             s.emergency_contact_relation, s.profile_image, s.bio, s.interests,
             s.learning_goals, s.preferred_language, s.timezone, s.is_active,
             s.email_verified, s.phone_verified, s.profile_completed, s.created_at,
             s.updated_at, s.last_login_at
  `;

  try {
    const result = await dbManager.query(profileQuery, [studentId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Student profile');
    }

    const student = result.rows[0];

    sendSuccessResponse(res, {
      id: student.id,
      student_id: student.student_id,
      email: student.email,
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone,
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      address: student.address,
      city: student.city,
      state: student.state,
      country: student.country,
      postal_code: student.postal_code,
      emergency_contact_name: student.emergency_contact_name,
      emergency_contact_phone: student.emergency_contact_phone,
      emergency_contact_relation: student.emergency_contact_relation,
      profile_image: student.profile_image,
      bio: student.bio,
      interests: student.interests ? (Array.isArray(student.interests) ? student.interests : []) : [],
      learning_goals: student.learning_goals,
      preferred_language: student.preferred_language,
      timezone: student.timezone,
      is_active: student.is_active,
      email_verified: student.email_verified,
      phone_verified: student.phone_verified,
      profile_completed: student.profile_completed,
      created_at: student.created_at,
      updated_at: student.updated_at,
      last_login: student.last_login_at,
      enrolled_courses: parseInt(student.enrolled_courses) || 0,
      completed_courses: parseInt(student.completed_courses) || 0
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

/**
 * Update student profile
 */
export const updateStudentProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const studentId = req.user?.id;

  if (!studentId) {
    res.status(401).json({
      success: false,
      error: 'Student not authenticated'
    });
    return;
  }

  const {
    first_name,
    last_name,
    phone,
    date_of_birth,
    gender,
    address,
    city,
    state,
    country,
    postal_code,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    bio,
    interests,
    learning_goals,
    preferred_language,
    timezone
  } = req.body;

  // Validate gender if provided
  if (gender && !['male', 'female', 'other'].includes(gender)) {
    res.status(400).json({
      success: false,
      error: 'Invalid gender. Must be male, female, or other'
    });
    return;
  }

  // Validate interests if provided
  if (interests && !Array.isArray(interests)) {
    res.status(400).json({
      success: false,
      error: 'Interests must be an array'
    });
    return;
  }

  // Debug logging for CockroachDB
  console.log('Received interests:', interests, 'Type:', typeof interests);

  // Validate date of birth if provided
  if (date_of_birth && date_of_birth.trim() !== '') {
    const birthDate = new Date(date_of_birth);
    
    // Check if the date is valid
    if (isNaN(birthDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format for date of birth'
      });
      return;
    }
    
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 13 || age > 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid date of birth. Age must be between 13 and 100 years'
      });
      return;
    }
  }

  // Build update query dynamically
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  const fieldsToUpdate = {
    first_name,
    last_name,
    phone,
    date_of_birth: date_of_birth && date_of_birth.trim() !== '' ? date_of_birth : null,
    gender,
    address,
    city,
    state,
    country,
    postal_code,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    bio,
    interests: interests && Array.isArray(interests) && interests.length > 0 ? `{${interests.join(',')}}` : null,
    learning_goals,
    preferred_language,
    timezone
  };

  Object.entries(fieldsToUpdate).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      updateFields.push(`${key} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No fields to update'
    });
    return;
  }

  // Add updated_at
  updateFields.push(`updated_at = NOW()`);
  
  // Add profile_completed check
  updateFields.push(`profile_completed = CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL AND email IS NOT NULL 
    THEN true 
    ELSE false 
  END`);

  const updateQuery = `
    UPDATE students 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, student_id, email, first_name, last_name, phone, date_of_birth, 
              gender, address, city, state, country, postal_code, 
              emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
              profile_image, bio, interests, learning_goals, preferred_language, 
              timezone, is_active, email_verified, phone_verified, profile_completed,
              created_at, updated_at, last_login_at
  `;

  updateValues.push(studentId);

  // Debug logging for CockroachDB array format
  console.log('Final interests format:', fieldsToUpdate.interests);
  console.log('Update query:', updateQuery);
  console.log('Update values:', updateValues);

  try {
    const result = await dbManager.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      throw new NotFoundError('Student profile');
    }

    const student = result.rows[0];

    sendSuccessResponse(res, {
      id: student.id,
      student_id: student.student_id,
      email: student.email,
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone,
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      address: student.address,
      city: student.city,
      state: student.state,
      country: student.country,
      postal_code: student.postal_code,
      emergency_contact_name: student.emergency_contact_name,
      emergency_contact_phone: student.emergency_contact_phone,
      emergency_contact_relation: student.emergency_contact_relation,
      profile_image: student.profile_image,
      bio: student.bio,
      interests: student.interests ? (Array.isArray(student.interests) ? student.interests : []) : [],
      learning_goals: student.learning_goals,
      preferred_language: student.preferred_language,
      timezone: student.timezone,
      is_active: student.is_active,
      email_verified: student.email_verified,
      phone_verified: student.phone_verified,
      profile_completed: student.profile_completed,
      created_at: student.created_at,
      updated_at: student.updated_at,
      last_login: student.last_login_at
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

/**
 * Change student password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const studentId = req.user?.id;

  if (!studentId) {
    res.status(401).json({
      success: false,
      error: 'Student not authenticated'
    });
    return;
  }

  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    res.status(400).json({
      success: false,
      error: 'Current password and new password are required'
    });
    return;
  }

  if (new_password.length < 8) {
    res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long'
    });
    return;
  }

  try {
    // Get current password hash
    const studentResult = await dbManager.query(
      'SELECT password_hash FROM students WHERE id = $1',
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new NotFoundError('Student');
    }

    const currentPasswordHash = studentResult.rows[0].password_hash;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, currentPasswordHash);

    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await dbManager.query(
      'UPDATE students SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, studentId]
    );

    sendSuccessResponse(res, {
      message: 'Password changed successfully'
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

/**
 * Upload profile image
 */
export const uploadProfileImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const studentId = req.user?.id;

  if (!studentId) {
    res.status(401).json({
      success: false,
      error: 'Student not authenticated'
    });
    return;
  }

  const { profile_image_url } = req.body;

  if (!profile_image_url) {
    res.status(400).json({
      success: false,
      error: 'Profile image URL is required'
    });
    return;
  }

  try {
    const result = await dbManager.query(
      'UPDATE students SET profile_image = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_image',
      [profile_image_url, studentId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Student');
    }

    sendSuccessResponse(res, {
      profile_image: result.rows[0].profile_image,
      message: 'Profile image updated successfully'
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});
