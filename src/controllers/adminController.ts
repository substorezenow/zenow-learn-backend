import { Request, Response } from 'express';
import { Client } from 'pg';
import { ApiResponse, AdminStats, Category as CategoryType, Field as FieldType, Course as CourseType, CreateCategoryRequest, UpdateCategoryRequest, CreateFieldRequest, UpdateFieldRequest, CreateCourseRequest, UpdateCourseRequest } from '../types';

// Helper function to create database connection
const createConnection = (): Client => {
  if (process.env.COCKROACH_URL) {
    return new Client({
      connectionString: process.env.COCKROACH_URL,
      ssl: { rejectUnauthorized: false },
    });
  } else {
    return new Client({
      host: process.env.COCKROACH_HOST || 'localhost',
      port: parseInt(process.env.COCKROACH_PORT || '26257'),
      user: process.env.COCKROACH_USER || 'root',
      password: process.env.COCKROACH_PASS || '',
      database: process.env.COCKROACH_DB || 'defaultdb',
      ssl:
        process.env.COCKROACH_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
    });
  }
};

// Using real database data only - no mock data

// ==================== CATEGORIES ADMIN CRUD ====================

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { name, slug, description, icon_url, banner_image, sort_order, is_active } = req.body as CreateCategoryRequest;
    
    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const query = `
      INSERT INTO categories (name, slug, description, icon_url, banner_image, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [name, finalSlug, description, icon_url, banner_image, sort_order || 0, is_active !== false];
    
    const result = await client.query(query, values);
    
    const response: ApiResponse<CategoryType> = {
      success: true,
      data: result.rows[0],
      message: 'Category created successfully'
    };
    res.status(201).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const getAllCategoriesAdmin = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const query = `
      SELECT id, name, slug, description, icon_url, banner_image, 
             is_active, sort_order, created_at, updated_at
      FROM categories 
      ORDER BY sort_order ASC, name ASC
    `;
    
    const result = await client.query(query);
    
    const response: ApiResponse<CategoryType[]> = {
      success: true,
      data: result.rows,
      count: result.rows.length
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { id } = req.params;
    const { name, slug, description, icon_url, banner_image, sort_order, is_active } = req.body as UpdateCategoryRequest;
    
    const query = `
      UPDATE categories 
      SET name = $1, slug = $2, description = $3, icon_url = $4, 
          banner_image = $5, sort_order = $6, is_active = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    
    const values = [name, slug, description, icon_url, banner_image, sort_order, is_active, id];
    
    const result = await client.query(query, values);
    
    if (!result.rows[0]) {
      const response: ApiResponse = {
        success: false,
        error: 'Category not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<CategoryType> = {
      success: true,
      data: result.rows[0],
      message: 'Category updated successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { id } = req.params;
    
    // First check if category exists
    const checkQuery = `SELECT id FROM categories WHERE id = $1`;
    const checkResult = await client.query(checkQuery, [id]);
    
    if (!checkResult.rows[0]) {
      const response: ApiResponse = {
        success: false,
        error: 'Category not found'
      };
      res.status(404).json(response);
      return;
    }
    
    // Perform hard delete
    const deleteQuery = `DELETE FROM categories WHERE id = $1`;
    await client.query(deleteQuery, [id]);
    
    const response: ApiResponse = {
      success: true,
      message: 'Category deleted successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

// ==================== FIELDS ADMIN CRUD ====================

export const createField = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { category_id, name, slug, description, icon_url, banner_image, sort_order, is_active } = req.body as CreateFieldRequest;
    
    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const query = `
      INSERT INTO fields (category_id, name, slug, description, icon_url, banner_image, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [category_id, name, finalSlug, description, icon_url, banner_image, sort_order || 0, is_active !== false];
    
    const result = await client.query(query, values);
    
    const response: ApiResponse<FieldType> = {
      success: true,
      data: result.rows[0],
      message: 'Field created successfully'
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const getAllFieldsAdmin = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const query = `
      SELECT f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
             f.is_active, f.sort_order, f.category_id, f.created_at, f.updated_at,
             c.name as category_name, c.slug as category_slug,
             COUNT(co.id) as course_count
      FROM fields f
      JOIN categories c ON f.category_id = c.id
      LEFT JOIN courses co ON f.id = co.field_id AND co.is_published = true
      GROUP BY f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
               f.is_active, f.sort_order, f.category_id, f.created_at, f.updated_at,
               c.name, c.slug
      ORDER BY f.sort_order ASC, f.name ASC
    `;
    
    const result = await client.query(query);
    
    const response: ApiResponse<FieldType[]> = {
      success: true,
      data: result.rows,
      count: result.rows.length
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const updateField = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { id } = req.params;
    const { name, slug, description, icon_url, banner_image, sort_order, is_active } = req.body as UpdateFieldRequest;
    
    const query = `
      UPDATE fields 
      SET name = $1, slug = $2, description = $3, icon_url = $4, 
          banner_image = $5, sort_order = $6, is_active = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
    
    const values = [name, slug, description, icon_url, banner_image, sort_order, is_active, id];
    
    const result = await client.query(query, values);
    
    if (!result.rows[0]) {
      const response: ApiResponse = {
        success: false,
        error: 'Field not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<FieldType> = {
      success: true,
      data: result.rows[0],
      message: 'Field updated successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: (error as Error).message
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const deleteField = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { id } = req.params;
    
    // First check if field exists
    const checkQuery = `SELECT id FROM fields WHERE id = $1`;
    const checkResult = await client.query(checkQuery, [id]);
    
    if (!checkResult.rows[0]) {
      const response: ApiResponse = {
        success: false,
        error: 'Field not found'
      };
      res.status(404).json(response);
      return;
    }
    
    // Perform hard delete
    const deleteQuery = `DELETE FROM fields WHERE id = $1`;
    await client.query(deleteQuery, [id]);
    
    const response: ApiResponse = {
      success: true,
      message: 'Field deleted successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

// ==================== COURSES ADMIN CRUD ====================

export const getAllCoursesAdmin = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const query = `
      SELECT c.id, c.title, c.slug, c.description, c.short_description,
             c.banner_image, c.thumbnail_image, c.duration_hours, c.difficulty_level,
             c.price, c.is_free, c.is_published, c.instructor_id, c.prerequisites,
             c.learning_outcomes::text, c.course_modules::text, c.tags, c.rating, c.total_ratings,
             c.enrolled_students, c.created_at, c.updated_at, c.field_id,
             f.name as field_name, f.slug as field_slug,
             cat.name as category_name, cat.slug as category_slug
      FROM courses c
      JOIN fields f ON c.field_id = f.id
      JOIN categories cat ON f.category_id = cat.id
      ORDER BY c.created_at DESC
    `;
    
    const result = await client.query(query);
    
    const response: ApiResponse<CourseType[]> = {
      success: true,
      data: result.rows,
      count: result.rows.length
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { field_id, title, slug, description, short_description, banner_image, thumbnail_image, duration_hours, difficulty_level, price, is_free, is_published, instructor_id, prerequisites, learning_outcomes, course_modules, tags } = req.body as CreateCourseRequest;
    
    // Generate slug if not provided
    const finalSlug = slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const insertQuery = `
      INSERT INTO courses (field_id, title, slug, description, short_description, banner_image, thumbnail_image, duration_hours, difficulty_level, price, is_free, is_published, instructor_id, prerequisites, learning_outcomes, course_modules, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `;
    
    // Handle instructor_id - convert to UUID or set to null if invalid
    let finalInstructorId = null;
    if (instructor_id) {
      if (typeof instructor_id === 'string' && instructor_id.trim() !== '') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (instructor_id.match(uuidRegex)) {
          finalInstructorId = instructor_id;
        }
      }
      // If it's a number or invalid string, set to null
    }
    
    // Keep field_id as string - let the database handle the conversion
    const finalFieldId = field_id;
    
    // Convert empty strings to null for JSONB fields
    const finalLearningOutcomes = learning_outcomes === '' ? null : learning_outcomes;
    const finalCourseModules = course_modules === '' ? null : course_modules;
    
    // Convert comma-separated string to PostgreSQL array format for tags
    let finalTags = null;
    if (tags && typeof tags === 'string' && tags.trim() !== '') {
      // Convert "tag1,tag2,tag3" to "{tag1,tag2,tag3}"
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      if (tagArray.length > 0) {
        finalTags = `{${tagArray.join(',')}}`;
      }
    }
    
    const values = [finalFieldId, title, finalSlug, description, short_description, banner_image, thumbnail_image, duration_hours, difficulty_level, price, is_free, is_published, finalInstructorId, prerequisites, finalLearningOutcomes, finalCourseModules, finalTags];
    
    const insertResult = await client.query(insertQuery, values);
    const newCourseId = insertResult.rows[0].id;
    
    // Now fetch the created course with joined field and category data
    const fetchQuery = `
      SELECT c.id, c.title, c.slug, c.description, c.short_description,
             c.banner_image, c.thumbnail_image, c.duration_hours, c.difficulty_level,
             c.price, c.is_free, c.is_published, c.instructor_id, c.prerequisites,
             c.learning_outcomes::text, c.course_modules::text, c.tags, c.rating, c.total_ratings,
             c.enrolled_students, c.created_at, c.updated_at, c.field_id,
             f.name as field_name, f.slug as field_slug,
             cat.name as category_name, cat.slug as category_slug
      FROM courses c
      JOIN fields f ON c.field_id = f.id
      JOIN categories cat ON f.category_id = cat.id
      WHERE c.id = $1
    `;
    
    const result = await client.query(fetchQuery, [newCourseId]);
    
    const response: ApiResponse<CourseType> = {
      success: true,
      data: result.rows[0],
      message: 'Course created successfully'
    };
    res.status(201).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { id } = req.params;
    const { field_id, title, slug, description, short_description, banner_image, thumbnail_image, duration_hours, difficulty_level, price, is_free, is_published, instructor_id, prerequisites, learning_outcomes, course_modules, tags } = req.body as UpdateCourseRequest;
    
    // Build dynamic query based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (field_id !== undefined) {
      updateFields.push(`field_id = $${paramCount}`);
      // Keep field_id as string - let the database handle the conversion
      values.push(field_id);
      paramCount++;
    }
    if (title !== undefined) {
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    if (slug !== undefined) {
      updateFields.push(`slug = $${paramCount}`);
      values.push(slug);
      paramCount++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (short_description !== undefined) {
      updateFields.push(`short_description = $${paramCount}`);
      values.push(short_description);
      paramCount++;
    }
    if (banner_image !== undefined) {
      updateFields.push(`banner_image = $${paramCount}`);
      values.push(banner_image);
      paramCount++;
    }
    if (thumbnail_image !== undefined) {
      updateFields.push(`thumbnail_image = $${paramCount}`);
      values.push(thumbnail_image);
      paramCount++;
    }
    if (duration_hours !== undefined) {
      updateFields.push(`duration_hours = $${paramCount}`);
      values.push(duration_hours);
      paramCount++;
    }
    if (difficulty_level !== undefined) {
      updateFields.push(`difficulty_level = $${paramCount}`);
      values.push(difficulty_level);
      paramCount++;
    }
    if (price !== undefined) {
      updateFields.push(`price = $${paramCount}`);
      values.push(price);
      paramCount++;
    }
    if (is_free !== undefined) {
      updateFields.push(`is_free = $${paramCount}`);
      values.push(is_free);
      paramCount++;
    }
    if (is_published !== undefined) {
      updateFields.push(`is_published = $${paramCount}`);
      values.push(is_published);
      paramCount++;
    }
    if (instructor_id !== undefined) {
      updateFields.push(`instructor_id = $${paramCount}`);
      // Handle instructor_id - convert to UUID or set to null if invalid
      let finalInstructorId = null;
      if (instructor_id) {
        if (typeof instructor_id === 'string' && instructor_id.trim() !== '') {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (instructor_id.match(uuidRegex)) {
            finalInstructorId = instructor_id;
          }
        }
        // If it's a number or invalid string, set to null
      }
      values.push(finalInstructorId);
      paramCount++;
    }
    if (prerequisites !== undefined) {
      updateFields.push(`prerequisites = $${paramCount}`);
      values.push(prerequisites);
      paramCount++;
    }
    if (learning_outcomes !== undefined) {
      updateFields.push(`learning_outcomes = $${paramCount}`);
      // Convert empty string to null for JSONB field
      const finalLearningOutcomes = learning_outcomes === '' ? null : learning_outcomes;
      values.push(finalLearningOutcomes);
      paramCount++;
    }
    if (course_modules !== undefined) {
      updateFields.push(`course_modules = $${paramCount}`);
      // Convert empty string to null for JSONB field
      const finalCourseModules = course_modules === '' ? null : course_modules;
      values.push(finalCourseModules);
      paramCount++;
    }
    if (tags !== undefined) {
      updateFields.push(`tags = $${paramCount}`);
      // Convert comma-separated string to PostgreSQL array format
      let finalTags = null;
      if (tags && typeof tags === 'string' && tags.trim() !== '') {
        // Convert "tag1,tag2,tag3" to "{tag1,tag2,tag3}"
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        if (tagArray.length > 0) {
          finalTags = `{${tagArray.join(',')}}`;
        }
      }
      values.push(finalTags);
      paramCount++;
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add the WHERE clause parameter
    values.push(id);
    
    const updateQuery = `
      UPDATE courses 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
    `;
    
    await client.query(updateQuery, values);
    
    // Now fetch the updated course with joined field and category data
    const fetchQuery = `
      SELECT c.id, c.title, c.slug, c.description, c.short_description,
             c.banner_image, c.thumbnail_image, c.duration_hours, c.difficulty_level,
             c.price, c.is_free, c.is_published, c.instructor_id, c.prerequisites,
             c.learning_outcomes::text, c.course_modules::text, c.tags, c.rating, c.total_ratings,
             c.enrolled_students, c.created_at, c.updated_at, c.field_id,
             f.name as field_name, f.slug as field_slug,
             cat.name as category_name, cat.slug as category_slug
      FROM courses c
      JOIN fields f ON c.field_id = f.id
      JOIN categories cat ON f.category_id = cat.id
      WHERE c.id = $1
    `;
    
    const result = await client.query(fetchQuery, [id]);
    
    if (!result.rows[0]) {
      const response: ApiResponse = {
        success: false,
        error: 'Course not found'
      };
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<CourseType> = {
      success: true,
      data: result.rows[0],
      message: 'Course updated successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const { id } = req.params;
    
    // First check if course exists
    const checkQuery = `SELECT id FROM courses WHERE id = $1`;
    const checkResult = await client.query(checkQuery, [id]);
    
    if (!checkResult.rows[0]) {
      const response: ApiResponse = {
        success: false,
        error: 'Course not found'
      };
      res.status(404).json(response);
      return;
    }
    
    // Perform hard delete
    const deleteQuery = `DELETE FROM courses WHERE id = $1`;
    await client.query(deleteQuery, [id]);
    
    const response: ApiResponse = {
      success: true,
      message: 'Course deleted successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};

// ==================== STATISTICS ====================

export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  const client = createConnection();
  
  try {
    await client.connect();
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM categories WHERE is_active = true) as total_categories,
        (SELECT COUNT(*) FROM fields WHERE is_active = true) as total_fields,
        (SELECT COUNT(*) FROM courses WHERE is_published = true) as published_courses,
        (SELECT COUNT(*) FROM courses WHERE is_published = false) as draft_courses,
        (SELECT COUNT(*) FROM enrollments) as total_enrollments,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins
    `;
    
    const result = await client.query(statsQuery);
    
    const response: ApiResponse<AdminStats> = {
      success: true,
      data: result.rows[0]
    };
    res.status(200).json(response);
  } catch (error) {
    console.log('Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: `Database error: ${(error as Error).message}`
    };
    res.status(500).json(response);
  } finally {
    await client.end();
  }
};
