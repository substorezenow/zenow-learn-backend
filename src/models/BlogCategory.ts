/**
 * BlogCategory Model
 * 
 * Handles database operations for blog categories following the existing Category pattern.
 * Provides methods for CRUD operations and category-specific queries.
 */

import { dbManager } from '../utils/databaseManager';

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  banner_image?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  blog_count?: number; // Additional field for UI
}

export interface CreateBlogCategoryData {
  name: string;
  slug?: string;
  description?: string;
  icon_url?: string;
  banner_image?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateBlogCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  icon_url?: string;
  banner_image?: string;
  sort_order?: number;
  is_active?: boolean;
}

export class BlogCategoryModel {
  /**
   * Get all blog categories with optional blog count
   */
  static async getAllBlogCategories(): Promise<BlogCategory[]> {
    try {
      const query = `
        SELECT 
          bc.*,
          COUNT(b.id) as blog_count
        FROM blog_categories bc
        LEFT JOIN blogs b ON bc.id = b.category_id AND b.status = 'published'
        GROUP BY bc.id
        ORDER BY bc.sort_order ASC, bc.name ASC
      `;
      
      const result = await dbManager.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching blog categories:', error);
      throw error;
    }
  }

  /**
   * Get blog category by ID
   */
  static async getBlogCategoryById(id: number): Promise<BlogCategory | null> {
    try {
      const query = `
        SELECT 
          bc.*,
          COUNT(b.id) as blog_count
        FROM blog_categories bc
        LEFT JOIN blogs b ON bc.id = b.category_id AND b.status = 'published'
        WHERE bc.id = $1
        GROUP BY bc.id
      `;
      
      const result = await dbManager.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching blog category by ID:', error);
      throw error;
    }
  }

  /**
   * Get blog category by slug
   */
  static async getBlogCategoryBySlug(slug: string): Promise<BlogCategory | null> {
    try {
      const query = `
        SELECT 
          bc.*,
          COUNT(b.id) as blog_count
        FROM blog_categories bc
        LEFT JOIN blogs b ON bc.id = b.category_id AND b.status = 'published'
        WHERE bc.slug = $1
        GROUP BY bc.id
      `;
      
      const result = await dbManager.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching blog category by slug:', error);
      throw error;
    }
  }

  /**
   * Create a new blog category
   */
  static async createBlogCategory(data: CreateBlogCategoryData): Promise<BlogCategory> {
    try {
      // Generate slug if not provided
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const query = `
        INSERT INTO blog_categories (
          name, slug, description, icon_url, banner_image, sort_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        data.name,
        slug,
        data.description || null,
        data.icon_url || null,
        data.banner_image || null,
        data.sort_order || 0,
        data.is_active !== undefined ? data.is_active : true
      ];
      
      const result = await dbManager.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating blog category:', error);
      throw error;
    }
  }

  /**
   * Update a blog category
   */
  static async updateBlogCategory(id: number, data: UpdateBlogCategoryData): Promise<BlogCategory | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      
      if (data.slug !== undefined) {
        updates.push(`slug = $${paramCount++}`);
        values.push(data.slug);
      }
      
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      
      if (data.icon_url !== undefined) {
        updates.push(`icon_url = $${paramCount++}`);
        values.push(data.icon_url);
      }
      
      if (data.banner_image !== undefined) {
        updates.push(`banner_image = $${paramCount++}`);
        values.push(data.banner_image);
      }
      
      if (data.sort_order !== undefined) {
        updates.push(`sort_order = $${paramCount++}`);
        values.push(data.sort_order);
      }
      
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(data.is_active);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE blog_categories 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await dbManager.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating blog category:', error);
      throw error;
    }
  }

  /**
   * Delete a blog category
   */
  static async deleteBlogCategory(id: number): Promise<boolean> {
    try {
      // Check if category has blogs
      const blogCheck = await dbManager.query(
        'SELECT COUNT(*) as count FROM blogs WHERE category_id = $1',
        [id]
      );
      
      if (parseInt(blogCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete blog category with existing blogs');
      }

      const query = 'DELETE FROM blog_categories WHERE id = $1';
      const result = await dbManager.query(query, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting blog category:', error);
      throw error;
    }
  }

  /**
   * Get active blog categories for public use
   */
  static async getActiveBlogCategories(): Promise<BlogCategory[]> {
    try {
      const query = `
        SELECT 
          bc.*,
          COUNT(b.id) as blog_count
        FROM blog_categories bc
        LEFT JOIN blogs b ON bc.id = b.category_id AND b.status = 'published'
        WHERE bc.is_active = true
        GROUP BY bc.id
        ORDER BY bc.sort_order ASC, bc.name ASC
      `;
      
      const result = await dbManager.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active blog categories:', error);
      throw error;
    }
  }
}