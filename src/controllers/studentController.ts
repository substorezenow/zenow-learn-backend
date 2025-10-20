import { Request, Response } from 'express';
import { dbManager } from '../utils/databaseManager';
import { asyncHandler, sendSuccessResponse, NotFoundError, DatabaseError, handleDatabaseError } from '../middleware/errorHandler';

// ==================== STUDENT MANAGEMENT ====================

export const getAllStudents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    status, 
    sort = 'created_at', 
    order = 'desc' 
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let whereConditions = [];
  let queryParams = [];

  // Build search conditions
  if (search) {
    whereConditions.push(`(
      s.first_name ILIKE $${queryParams.length + 1} OR 
      s.last_name ILIKE $${queryParams.length + 1} OR 
      s.email ILIKE $${queryParams.length + 1} OR 
      s.student_id ILIKE $${queryParams.length + 1}
    )`);
    queryParams.push(`%${search}%`);
  }

  // Build status filter
  if (status === 'active') {
    whereConditions.push(`s.is_active = $${queryParams.length + 1}`);
    queryParams.push(true);
  } else if (status === 'inactive') {
    whereConditions.push(`s.is_active = $${queryParams.length + 1}`);
    queryParams.push(false);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Validate sort field
  const allowedSortFields = ['created_at', 'last_login_at', 'first_name', 'email', 'student_id'];
  const sortField = allowedSortFields.includes(sort as string) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  // Get students with enrollment counts
  const studentsQuery = `
    SELECT 
      s.id,
      s.student_id,
      s.email,
      s.first_name,
      s.last_name,
      s.is_active,
      s.email_verified,
      s.created_at,
      s.updated_at,
      s.last_login_at,
      s.country,
      s.city,
      COUNT(e.id) as enrolled_courses,
      COUNT(CASE WHEN e.is_completed = true THEN 1 END) as completed_courses
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.user_id
    ${whereClause}
    GROUP BY s.id, s.student_id, s.email, s.first_name, s.last_name, 
             s.is_active, s.email_verified, s.created_at, s.updated_at, 
             s.last_login_at, s.country, s.city
    ORDER BY s.${sortField} ${sortOrder}
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `;

  queryParams.push(Number(limit), offset);

  try {
    const studentsResult = await dbManager.query(studentsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.user_id
      ${whereClause}
    `;

    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await dbManager.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const students = studentsResult.rows.map((student: any) => ({
      id: student.id,
      student_id: student.student_id,
      email: student.email,
      first_name: student.first_name,
      last_name: student.last_name,
      is_active: student.is_active,
      email_verified: student.email_verified,
      created_at: student.created_at,
      updated_at: student.updated_at,
      last_login: student.last_login_at,
      country: student.country,
      city: student.city,
      enrolled_courses: parseInt(student.enrolled_courses) || 0,
      completed_courses: parseInt(student.completed_courses) || 0
    }));

    res.json({
      success: true,
      data: students,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getStudentStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total_students,
      COUNT(CASE WHEN s.is_active = true THEN 1 END) as active_students,
      COUNT(CASE WHEN s.is_active = false THEN 1 END) as inactive_students,
      COUNT(CASE WHEN s.email_verified = true THEN 1 END) as verified_students,
      COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as students_last_30_days,
      COUNT(e.id) as total_enrollments,
      COUNT(CASE WHEN e.is_completed = true THEN 1 END) as completed_courses
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.user_id
  `;

  try {
    const result = await dbManager.query(statsQuery);
    const stats = result.rows[0];

    sendSuccessResponse(res, {
      total_students: parseInt(stats.total_students),
      active_students: parseInt(stats.active_students),
      inactive_students: parseInt(stats.inactive_students),
      verified_students: parseInt(stats.verified_students),
      students_last_30_days: parseInt(stats.students_last_30_days),
      total_enrollments: parseInt(stats.total_enrollments),
      completed_courses: parseInt(stats.completed_courses)
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getStudentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const studentQuery = `
    SELECT 
      s.id,
      s.student_id,
      s.email,
      s.first_name,
      s.last_name,
      s.is_active,
      s.email_verified,
      s.created_at,
      s.updated_at,
      s.last_login_at,
      s.country,
      s.city,
      COUNT(e.id) as enrolled_courses,
      COUNT(CASE WHEN e.is_completed = true THEN 1 END) as completed_courses
    FROM students s
    LEFT JOIN enrollments e ON s.id = e.user_id
    WHERE s.id = $1
    GROUP BY s.id, s.student_id, s.email, s.first_name, s.last_name, 
             s.is_active, s.email_verified, s.created_at, s.updated_at, 
             s.last_login_at, s.country, s.city
  `;

  try {
    const result = await dbManager.query(studentQuery, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Student');
    }

    const student = result.rows[0];

    sendSuccessResponse(res, {
      id: student.id,
      student_id: student.student_id,
      email: student.email,
      first_name: student.first_name,
      last_name: student.last_name,
      is_active: student.is_active,
      email_verified: student.email_verified,
      created_at: student.created_at,
      updated_at: student.updated_at,
      last_login: student.last_login_at,
      country: student.country,
      city: student.city,
      enrolled_courses: parseInt(student.enrolled_courses) || 0,
      completed_courses: parseInt(student.completed_courses) || 0
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const updateStudentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { is_active, email_verified } = req.body;

  if (is_active === undefined && email_verified === undefined) {
    res.status(400).json({
      success: false,
      error: 'At least one status field must be provided'
    });
    return;
  }

  let updateFields = [];
  let queryParams = [];
  let paramIndex = 1;

  if (is_active !== undefined) {
    updateFields.push(`is_active = $${paramIndex}`);
    queryParams.push(is_active);
    paramIndex++;
  }

  if (email_verified !== undefined) {
    updateFields.push(`email_verified = $${paramIndex}`);
    queryParams.push(email_verified);
    paramIndex++;
  }

  updateFields.push(`updated_at = NOW()`);
  queryParams.push(id);

  const updateQuery = `
    UPDATE students 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  try {
    const result = await dbManager.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      throw new NotFoundError('Student');
    }

    sendSuccessResponse(res, result.rows[0], 'Student status updated successfully');
  } catch (error) {
    throw handleDatabaseError(error);
  }
});
