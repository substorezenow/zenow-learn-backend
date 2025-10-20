import { Field as FieldType, CreateFieldRequest, UpdateFieldRequest } from '../types';
import { dbManager } from '../utils/databaseManager';

export class Field {

  async getAllFields(): Promise<FieldType[]> {
    try {
      const query = `
        SELECT f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
               f.is_active, f.sort_order, f.created_at, f.updated_at,
               c.name as category_name, c.slug as category_slug,
               COUNT(co.id) as course_count
        FROM fields f
        JOIN categories c ON f.category_id = c.id
        LEFT JOIN courses co ON f.id = co.field_id AND co.is_published = true
        WHERE f.is_active = true AND c.is_active = true
        GROUP BY f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
                 f.is_active, f.sort_order, f.created_at, f.updated_at,
                 c.name, c.slug
        ORDER BY f.sort_order ASC, f.name ASC
      `;
      const result = await dbManager.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching fields:', error);
      throw error;
    }
  }

  async getFieldById(id: number): Promise<FieldType | null> {
    try {
      const query = `
        SELECT f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
               f.is_active, f.sort_order, f.created_at, f.updated_at,
               c.name as category_name, c.slug as category_slug
        FROM fields f
        JOIN categories c ON f.category_id = c.id
        WHERE f.id = $1 AND f.is_active = true AND c.is_active = true
      `;
      const result = await dbManager.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching field by ID:', error);
      throw error;
    }
  }

  async getFieldBySlug(slug: string): Promise<FieldType | null> {
    try {
      const query = `
        SELECT f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
               f.is_active, f.sort_order, f.created_at, f.updated_at,
               c.name as category_name, c.slug as category_slug
        FROM fields f
        JOIN categories c ON f.category_id = c.id
        WHERE f.slug = $1 AND f.is_active = true AND c.is_active = true
      `;
      const result = await dbManager.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching field by slug:', error);
      throw error;
    }
  }

  async createField(fieldData: CreateFieldRequest): Promise<FieldType> {
    try {
      const { category_id, name, slug, description, icon_url, banner_image, sort_order } = fieldData;
      const query = `
        INSERT INTO fields (category_id, name, slug, description, icon_url, banner_image, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [category_id, name, slug, description, icon_url, banner_image, sort_order];
      const result = await dbManager.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating field:', error);
      throw error;
    }
  }

  async updateField(id: number, fieldData: UpdateFieldRequest): Promise<FieldType | null> {
    try {
      const { name, slug, description, icon_url, banner_image, sort_order, is_active } = fieldData;
      const query = `
        UPDATE fields 
        SET name = $1, slug = $2, description = $3, icon_url = $4, 
            banner_image = $5, sort_order = $6, is_active = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;
      const values = [name, slug, description, icon_url, banner_image, sort_order, is_active, id];
      const result = await dbManager.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating field:', error);
      throw error;
    }
  }

  async deleteField(id: number): Promise<FieldType | null> {
    try {
      const query = `
        UPDATE fields 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await dbManager.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error deleting field:', error);
      throw error;
    }
  }

  async getCoursesByFieldId(fieldId: string | number): Promise<any[]> {
    try {
      const query = `
        SELECT c.id, c.title, c.slug, c.description, c.short_description,
               c.banner_image, c.thumbnail_image, c.duration_hours,
               c.difficulty_level, c.price, c.is_free, c.is_published,
               c.instructor_id, c.prerequisites, c.learning_outcomes,
               c.course_modules, c.tags, c.rating, c.total_ratings,
               c.enrolled_students, c.created_at, c.updated_at,
               u.username as instructor_name, u.username as instructor_email
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE c.field_id = $1 AND c.is_published = true
        ORDER BY c.created_at DESC
      `;
      const result = await dbManager.query(query, [fieldId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching courses by field:', error);
      throw error;
    }
  }

}
