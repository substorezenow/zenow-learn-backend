/**
 * Blog Model
 * 
 * Handles database operations for blogs following the existing patterns.
 * Provides methods for CRUD operations and blog-specific queries.
 */

import { dbManager } from '../utils/databaseManager';

export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  author_id: string;
  author?: string; // Additional field for UI
  status: 'draft' | 'published' | 'archived';
  is_published?: boolean; // Additional field for UI compatibility
  published_at?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  category_id?: string | number;
  category?: string;
  read_time?: number;
  views?: number;
  likes?: number; // Additional field for UI
}

export interface CreateBlogData {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  author_id: string;
  status?: 'draft' | 'published' | 'archived';
  published_at?: string;
  tags?: string[];
  category_id?: string | number;
  read_time?: number;
}

export interface UpdateBlogData {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  author_id?: string;
  status?: 'draft' | 'published' | 'archived';
  published_at?: string;
  tags?: string[];
  category_id?: string | number;
  read_time?: number;
}

export class BlogModel {
  /**
   * Get all blogs with optional filters
   */
  static async getAllBlogs(filters?: {
    status?: string;
    category_id?: number;
    author_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Blog[]> {
    try {
      let query = `
        SELECT 
          b.*,
          bc.name as category,
          CASE WHEN b.status = 'published' THEN true ELSE false END as is_published
        FROM blogs b
        LEFT JOIN blog_categories bc ON b.category_id = bc.id
      `;
      
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (filters?.status) {
        conditions.push(`b.status = $${paramCount++}`);
        values.push(filters.status);
      }

      if (filters?.category_id) {
        conditions.push(`b.category_id = $${paramCount++}`);
        values.push(filters.category_id);
      }

      if (filters?.author_id) {
        conditions.push(`b.author_id = $${paramCount++}`);
        values.push(filters.author_id);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY b.created_at DESC`;

      if (filters?.limit) {
        query += ` LIMIT $${paramCount++}`;
        values.push(filters.limit);
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramCount++}`;
        values.push(filters.offset);
      }
      
      const result = await dbManager.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching blogs:', error);
      throw error;
    }
  }

  /**
   * Get blog by ID
   */
  static async getBlogById(id: number): Promise<Blog | null> {
    try {
      const query = `
        SELECT 
          b.*,
          bc.name as category,
          CASE WHEN b.status = 'published' THEN true ELSE false END as is_published
        FROM blogs b
        LEFT JOIN blog_categories bc ON b.category_id = bc.id
        WHERE b.id = $1
      `;
      
      const result = await dbManager.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching blog by ID:', error);
      throw error;
    }
  }

  /**
   * Get blog by slug
   */
  static async getBlogBySlug(slug: string): Promise<Blog | null> {
    try {
      const query = `
        SELECT 
          b.*,
          bc.name as category,
          CASE WHEN b.status = 'published' THEN true ELSE false END as is_published
        FROM blogs b
        LEFT JOIN blog_categories bc ON b.category_id = bc.id
        WHERE b.slug = $1
      `;
      
      const result = await dbManager.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching blog by slug:', error);
      throw error;
    }
  }

  /**
   * Create a new blog
   */
  static async createBlog(data: CreateBlogData): Promise<Blog> {
    try {
      // Generate slug if not provided
      const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const query = `
        INSERT INTO blogs (
          title, slug, content, excerpt, featured_image, author_id, 
          status, published_at, tags, category_id, read_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        data.title,
        slug,
        data.content,
        data.excerpt || null,
        data.featured_image || null,
        data.author_id,
        data.status || 'draft',
        data.published_at || null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.category_id || null,
        data.read_time || null
      ];
      
      const result = await dbManager.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating blog:', error);
      throw error;
    }
  }

  /**
   * Update a blog
   */
  static async updateBlog(id: number, data: UpdateBlogData): Promise<Blog | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(data.title);
      }
      
      if (data.slug !== undefined) {
        updates.push(`slug = $${paramCount++}`);
        values.push(data.slug);
      }
      
      if (data.content !== undefined) {
        updates.push(`content = $${paramCount++}`);
        values.push(data.content);
      }
      
      if (data.excerpt !== undefined) {
        updates.push(`excerpt = $${paramCount++}`);
        values.push(data.excerpt);
      }
      
      if (data.featured_image !== undefined) {
        updates.push(`featured_image = $${paramCount++}`);
        values.push(data.featured_image);
      }
      
      if (data.author_id !== undefined) {
        updates.push(`author_id = $${paramCount++}`);
        values.push(data.author_id);
      }
      
      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }
      
      if (data.published_at !== undefined) {
        updates.push(`published_at = $${paramCount++}`);
        values.push(data.published_at);
      }
      
      if (data.tags !== undefined) {
        updates.push(`tags = $${paramCount++}`);
        values.push(data.tags ? JSON.stringify(data.tags) : null);
      }
      
      if (data.category_id !== undefined) {
        updates.push(`category_id = $${paramCount++}`);
        values.push(data.category_id);
      }
      
      if (data.read_time !== undefined) {
        updates.push(`read_time = $${paramCount++}`);
        values.push(data.read_time);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE blogs 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await dbManager.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating blog:', error);
      throw error;
    }
  }

  /**
   * Delete a blog
   */
  static async deleteBlog(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM blogs WHERE id = $1';
      const result = await dbManager.query(query, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting blog:', error);
      throw error;
    }
  }

  /**
   * Get published blogs for public use
   */
  static async getPublishedBlogs(filters?: {
    category_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<Blog[]> {
    try {
      let query = `
        SELECT 
          b.*,
          bc.name as category,
          true as is_published
        FROM blogs b
        LEFT JOIN blog_categories bc ON b.category_id = bc.id
        WHERE b.status = 'published'
      `;
      
      const values: any[] = [];
      let paramCount = 1;

      if (filters?.category_id) {
        query += ` AND b.category_id = $${paramCount++}`;
        values.push(filters.category_id);
      }

      query += ` ORDER BY b.published_at DESC, b.created_at DESC`;

      if (filters?.limit) {
        query += ` LIMIT $${paramCount++}`;
        values.push(filters.limit);
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramCount++}`;
        values.push(filters.offset);
      }
      
      const result = await dbManager.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching published blogs:', error);
      throw error;
    }
  }

  /**
   * Get blogs by category
   */
  static async getBlogsByCategory(categoryId: number, limit?: number): Promise<Blog[]> {
    try {
      let query = `
        SELECT 
          b.*,
          bc.name as category,
          CASE WHEN b.status = 'published' THEN true ELSE false END as is_published
        FROM blogs b
        LEFT JOIN blog_categories bc ON b.category_id = bc.id
        WHERE b.category_id = $1
        ORDER BY b.created_at DESC
      `;
      
      const values = [categoryId];

      if (limit) {
        query += ` LIMIT $2`;
        values.push(limit);
      }
      
      const result = await dbManager.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching blogs by category:', error);
      throw error;
    }
  }

  /**
   * Increment blog views
   */
  static async incrementViews(id: number): Promise<void> {
    try {
      const query = `
        UPDATE blogs 
        SET views = COALESCE(views, 0) + 1 
        WHERE id = $1
      `;
      
      await dbManager.query(query, [id]);
    } catch (error) {
      console.error('Error incrementing blog views:', error);
      throw error;
    }
  }
}