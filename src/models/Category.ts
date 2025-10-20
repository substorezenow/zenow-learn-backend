import { Category as CategoryType, CreateCategoryRequest, UpdateCategoryRequest } from '../types';
import { dbManager } from '../utils/databaseManager';

export class Category {
  async getAllCategories(): Promise<CategoryType[]> {
    try {
      const query = `
        SELECT id, name, slug, description, icon_url, banner_image, 
               is_active, sort_order, created_at, updated_at
        FROM categories 
        WHERE is_active = true 
        ORDER BY sort_order ASC, name ASC
      `;
      const result = await dbManager.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getCategoryById(id: string | number): Promise<CategoryType | null> {
    try {
      const query = `
        SELECT id, name, slug, description, icon_url, banner_image, 
               is_active, sort_order, created_at, updated_at
        FROM categories 
        WHERE id = $1 AND is_active = true
      `;
      const result = await dbManager.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching category by ID:', error);
      throw error;
    }
  }

  async getCategoryBySlug(slug: string): Promise<CategoryType | null> {
    try {
      const query = `
        SELECT id, name, slug, description, icon_url, banner_image, 
               is_active, sort_order, created_at, updated_at
        FROM categories 
        WHERE slug = $1 AND is_active = true
      `;
      const result = await dbManager.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching category by slug:', error);
      throw error;
    }
  }

  async createCategory(categoryData: CreateCategoryRequest): Promise<CategoryType> {
    try {
      const { name, slug, description, icon_url, banner_image, sort_order } = categoryData;
      const query = `
        INSERT INTO categories (name, slug, description, icon_url, banner_image, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [name, slug, description, icon_url, banner_image, sort_order];
      const result = await dbManager.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: number, categoryData: UpdateCategoryRequest): Promise<CategoryType | null> {
    try {
      const { name, slug, description, icon_url, banner_image, sort_order, is_active } = categoryData;
      const query = `
        UPDATE categories 
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
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<CategoryType | null> {
    try {
      const query = `
        UPDATE categories 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await dbManager.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  async getFieldsByCategoryId(categoryId: string | number): Promise<any[]> {
    try {
      const query = `
        SELECT f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
               f.is_active, f.sort_order, f.created_at, f.updated_at,
               COUNT(c.id) as course_count
        FROM fields f
        LEFT JOIN courses c ON f.id = c.field_id AND c.is_published = true
        WHERE f.category_id = $1 AND f.is_active = true
        GROUP BY f.id, f.name, f.slug, f.description, f.icon_url, f.banner_image,
                 f.is_active, f.sort_order, f.created_at, f.updated_at
        ORDER BY f.sort_order ASC, f.name ASC
      `;
      const result = await dbManager.query(query, [categoryId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching fields by category:', error);
      throw error;
    }
  }
}
