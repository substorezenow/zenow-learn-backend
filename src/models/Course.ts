import { Course as CourseType, CreateCourseRequest, UpdateCourseRequest } from '../types';
import { dbManager } from '../utils/databaseManager';

interface CourseFilters {
  category_id?: string;
  field_id?: string;
  difficulty_level?: string;
  is_free?: boolean;
  search?: string;
  limit?: number;
}

export class Course {

  async getAllCourses(filters: CourseFilters = {}): Promise<CourseType[]> {
    try {
      let query = `
        SELECT c.id, c.title, c.slug, c.description, c.short_description,
               c.banner_image, c.thumbnail_image, c.duration_hours,
               c.difficulty_level, c.price, c.is_free, c.is_published,
               c.instructor_id, c.prerequisites, c.learning_outcomes,
               c.course_modules, c.tags, c.rating, c.total_ratings,
               c.enrolled_students, c.created_at, c.updated_at,
               f.name as field_name, f.slug as field_slug,
               cat.name as category_name, cat.slug as category_slug,
               u.username as instructor_name, u.email as instructor_email
        FROM courses c
        JOIN fields f ON c.field_id = f.id
        JOIN categories cat ON f.category_id = cat.id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE c.is_published = true AND f.is_active = true AND cat.is_active = true
      `;
      
      const values: any[] = [];
      let paramCount = 1;

      if (filters.category_id) {
        query += ` AND cat.id = $${paramCount}`;
        values.push(filters.category_id);
        paramCount++;
      }

      if (filters.field_id) {
        query += ` AND f.id = $${paramCount}`;
        values.push(filters.field_id);
        paramCount++;
      }

      if (filters.difficulty_level) {
        query += ` AND c.difficulty_level = $${paramCount}`;
        values.push(filters.difficulty_level);
        paramCount++;
      }

      if (filters.is_free !== undefined) {
        query += ` AND c.is_free = $${paramCount}`;
        values.push(filters.is_free);
        paramCount++;
      }

      if (filters.search) {
        query += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
        paramCount++;
      }

      query += ` ORDER BY c.created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filters.limit);
      }

      const result = await dbManager.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  async getCourseById(id: number): Promise<CourseType | null> {
    try {
      const query = `
        SELECT c.id, c.title, c.slug, c.description, c.short_description,
               c.banner_image, c.thumbnail_image, c.duration_hours,
               c.difficulty_level, c.price, c.is_free, c.is_published,
               c.instructor_id, c.prerequisites, c.learning_outcomes,
               c.course_modules, c.tags, c.rating, c.total_ratings,
               c.enrolled_students, c.created_at, c.updated_at,
               f.name as field_name, f.slug as field_slug,
               cat.name as category_name, cat.slug as category_slug,
               u.username as instructor_name, u.email as instructor_email
        FROM courses c
        JOIN fields f ON c.field_id = f.id
        JOIN categories cat ON f.category_id = cat.id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE c.id = $1 AND c.is_published = true
      `;
      const result = await dbManager.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching course by ID:', error);
      throw error;
    }
  }

  async getCourseBySlug(slug: string): Promise<CourseType | null> {
    try {
      const query = `
        SELECT c.id, c.title, c.slug, c.description, c.short_description,
               c.banner_image, c.thumbnail_image, c.duration_hours,
               c.difficulty_level, c.price, c.is_free, c.is_published,
               c.instructor_id, c.prerequisites, c.learning_outcomes,
               c.course_modules, c.tags, c.rating, c.total_ratings,
               c.enrolled_students, c.created_at, c.updated_at,
               f.name as field_name, f.slug as field_slug,
               cat.name as category_name, cat.slug as category_slug,
               u.username as instructor_name, u.email as instructor_email
        FROM courses c
        JOIN fields f ON c.field_id = f.id
        JOIN categories cat ON f.category_id = cat.id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE c.slug = $1 AND c.is_published = true
      `;
      const result = await dbManager.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching course by slug:', error);
      throw error;
    }
  }

  async getCourseModules(courseId: number): Promise<any[]> {
    try {
      const query = `
        SELECT id, title, description, module_type, content_url, 
               duration_minutes, sort_order, is_free, created_at, updated_at
        FROM course_modules 
        WHERE course_id = $1 
        ORDER BY sort_order ASC
      `;
      const result = await dbManager.query(query, [courseId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching course modules:', error);
      throw error;
    }
  }

  async getSimilarCourses(courseId: number, limit: number = 3): Promise<any[]> {
    try {
      const query = `
        SELECT c.id, c.title, c.slug, c.description, c.short_description,
               c.banner_image, c.thumbnail_image, c.duration_hours,
               c.difficulty_level, c.price, c.is_free, c.rating,
               c.enrolled_students, f.name as field_name
        FROM courses c
        JOIN fields f ON c.field_id = f.id
        WHERE c.field_id = (
          SELECT field_id FROM courses WHERE id = $1
        ) AND c.id != $1 AND c.is_published = true
        ORDER BY c.rating DESC, c.enrolled_students DESC
        LIMIT $2
      `;
      const result = await dbManager.query(query, [courseId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching similar courses:', error);
      throw error;
    }
  }

  async createCourse(courseData: CreateCourseRequest): Promise<CourseType> {
    try {
      const {
        field_id, title, slug, description, short_description,
        banner_image, thumbnail_image, duration_hours, difficulty_level,
        price, is_free, instructor_id, prerequisites, learning_outcomes,
        course_modules, tags
      } = courseData;

      const query = `
        INSERT INTO courses (
          field_id, title, slug, description, short_description,
          banner_image, thumbnail_image, duration_hours, difficulty_level,
          price, is_free, instructor_id, prerequisites, learning_outcomes,
          course_modules, tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const values = [
        field_id, title, slug, description, short_description,
        banner_image, thumbnail_image, duration_hours, difficulty_level,
        price, is_free, instructor_id, prerequisites, learning_outcomes,
        course_modules, tags
      ];

      const result = await dbManager.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  async updateCourse(id: number, courseData: UpdateCourseRequest): Promise<CourseType | undefined> {
    try {
      const {
        title, slug, description, short_description, banner_image,
        thumbnail_image, duration_hours, difficulty_level, price,
        is_free, instructor_id, prerequisites, learning_outcomes,
        course_modules, tags, is_published
      } = courseData;

      const query = `
        UPDATE courses 
        SET title = $1, slug = $2, description = $3, short_description = $4,
            banner_image = $5, thumbnail_image = $6, duration_hours = $7,
            difficulty_level = $8, price = $9, is_free = $10,
            instructor_id = $11, prerequisites = $12, learning_outcomes = $13,
            course_modules = $14, tags = $15, is_published = $16,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $17
        RETURNING *
      `;
      
      const values = [
        title, slug, description, short_description, banner_image,
        thumbnail_image, duration_hours, difficulty_level, price,
        is_free, instructor_id, prerequisites, learning_outcomes,
        course_modules, tags, is_published, id
      ];

      const result = await dbManager.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  }

  async enrollUser(userId: string, courseId: string): Promise<any> {
    try {
      const query = `
        INSERT INTO enrollments (user_id, course_id, enrollment_type)
        VALUES ($1, $2, 'course')
        ON CONFLICT (user_id, course_id) DO NOTHING
        RETURNING *
      `;
      const result = await dbManager.query(query, [userId, courseId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error enrolling user:', error);
      throw error;
    }
  }

  async getUserEnrollment(userId: string, courseId: string): Promise<any> {
    try {
      const query = `
        SELECT * FROM enrollments 
        WHERE user_id = $1 AND course_id = $2
      `;
      const result = await dbManager.query(query, [userId, courseId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user enrollment:', error);
      throw error;
    }
  }

}
