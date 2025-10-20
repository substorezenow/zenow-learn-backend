import { Request, Response } from 'express';
import { dbManager } from '../utils/databaseManager';
import { asyncHandler, sendSuccessResponse, NotFoundError, DatabaseError, handleDatabaseError } from '../middleware/errorHandler';

// ==================== ENROLLMENT MANAGEMENT ====================

export const getAllEnrollments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20, status, course_id, student_id } = req.query;
  
  // Build query with filters
  let whereClause = 'WHERE 1=1';
  const queryParams: any[] = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    whereClause += ` AND e.is_completed = $${paramCount}`;
    queryParams.push(status === 'completed');
  }

  if (course_id) {
    paramCount++;
    whereClause += ` AND e.course_id = $${paramCount}`;
    queryParams.push(course_id);
  }

  if (student_id) {
    paramCount++;
    whereClause += ` AND e.user_id = $${paramCount}`;
    queryParams.push(student_id);
  }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  paramCount++;
  const limitParam = paramCount;
  paramCount++;
  const offsetParam = paramCount;

  const enrollmentsQuery = `
    SELECT 
      e.id,
      e.user_id,
      e.course_id,
      e.enrollment_type,
      e.enrollment_date,
      e.completion_percentage,
      e.last_accessed,
      e.is_completed,
      e.completion_date,
      s.first_name,
      s.last_name,
      s.email,
      s.student_id,
      c.title as course_title,
      c.slug as course_slug,
      c.price as course_price,
      c.is_free,
      f.name as field_name,
      cat.name as category_name
    FROM enrollments e
    JOIN students s ON e.user_id = s.id
    JOIN courses c ON e.course_id = c.id
    JOIN fields f ON c.field_id = f.id
    JOIN categories cat ON f.category_id = cat.id
    ${whereClause}
    ORDER BY e.enrollment_date DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM enrollments e
    JOIN students s ON e.user_id = s.id
    JOIN courses c ON e.course_id = c.id
    ${whereClause}
  `;

  try {
    const [enrollmentsResult, countResult] = await Promise.all([
      dbManager.query(enrollmentsQuery, [...queryParams, parseInt(limit as string), offset]),
      dbManager.query(countQuery, queryParams)
    ]);

    res.json({
      success: true,
      data: enrollmentsResult.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string))
      }
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getEnrollmentStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total_enrollments,
      COUNT(CASE WHEN e.is_completed = true THEN 1 END) as completed_enrollments,
      COUNT(CASE WHEN e.is_completed = false AND e.completion_percentage > 0 THEN 1 END) as in_progress_enrollments,
      COUNT(CASE WHEN e.completion_percentage = 0 THEN 1 END) as not_started_enrollments,
      COUNT(CASE WHEN e.enrollment_date >= NOW() - INTERVAL '30 days' THEN 1 END) as enrollments_last_30_days,
      AVG(e.completion_percentage) as avg_completion_percentage
    FROM enrollments e
    JOIN students s ON e.user_id = s.id
    JOIN courses c ON e.course_id = c.id
    JOIN fields f ON c.field_id = f.id
    JOIN categories cat ON f.category_id = cat.id
  `;

  try {
    const result = await dbManager.query(statsQuery);
    const stats = result.rows[0];

    sendSuccessResponse(res, {
      total_enrollments: parseInt(stats.total_enrollments),
      completed_enrollments: parseInt(stats.completed_enrollments),
      in_progress_enrollments: parseInt(stats.in_progress_enrollments),
      not_started_enrollments: parseInt(stats.not_started_enrollments),
      enrollments_last_30_days: parseInt(stats.enrollments_last_30_days),
      avg_completion_percentage: parseFloat(stats.avg_completion_percentage) || 0
    });
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getEnrollmentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  const enrollmentQuery = `
    SELECT 
      e.*,
      s.first_name,
      s.last_name,
      s.email,
      s.student_id,
      c.title as course_title,
      c.slug as course_slug,
      c.description as course_description,
      c.price as course_price,
      c.is_free,
      f.name as field_name,
      cat.name as category_name
    FROM enrollments e
    JOIN students s ON e.user_id = s.id
    JOIN courses c ON e.course_id = c.id
    JOIN fields f ON c.field_id = f.id
    JOIN categories cat ON f.category_id = cat.id
    WHERE e.id = $1
  `;

  try {
    const result = await dbManager.query(enrollmentQuery, [id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Enrollment');
    }

    sendSuccessResponse(res, result.rows[0]);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const updateEnrollmentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { is_completed, completion_percentage, completion_date } = req.body;
  
  const updateQuery = `
    UPDATE enrollments 
    SET 
      is_completed = COALESCE($2, is_completed),
      completion_percentage = COALESCE($3, completion_percentage),
      completion_date = COALESCE($4, completion_date),
      last_accessed = NOW()
    WHERE id = $1
    RETURNING *
  `;

  try {
    const result = await dbManager.query(updateQuery, [
      id, 
      is_completed, 
      completion_percentage, 
      completion_date
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Enrollment');
    }

    sendSuccessResponse(res, result.rows[0], 'Enrollment status updated successfully');
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const deleteEnrollment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  const deleteQuery = 'DELETE FROM enrollments WHERE id = $1 RETURNING *';
  
  try {
    const result = await dbManager.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Enrollment');
    }

    sendSuccessResponse(res, null, 'Enrollment deleted successfully');
  } catch (error) {
    throw handleDatabaseError(error);
  }
});
