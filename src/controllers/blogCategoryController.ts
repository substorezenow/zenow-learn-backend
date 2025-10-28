import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { dbManager } from '../utils/databaseManager';
import { cacheManager } from '../utils/cacheManager';
import { asyncHandler, sendSuccessResponse, NotFoundError, DatabaseError, handleDatabaseError } from '../middleware/errorHandler';

// Blog Category interfaces
interface CreateBlogCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  icon_url?: string;
  banner_image?: string;
  sort_order?: number;
  is_active?: boolean;
}

interface UpdateBlogCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  icon_url?: string;
  banner_image?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ==================== BLOG CATEGORIES ADMIN CRUD ====================

export const createBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, slug, description, icon_url, banner_image, sort_order, is_active } = req.body as CreateBlogCategoryRequest;
  
  // Generate slug if not provided
  const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  const query = `
    INSERT INTO blog_categories (name, slug, description, icon_url, banner_image, sort_order, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [name, finalSlug, description, icon_url, banner_image, sort_order || 0, is_active !== false];
  
  try {
    const result = await dbManager.query(query, values);
    
    // Invalidate cache
    await cacheManager.delPattern('blog_categories:*');
    
    // Convert ID to string to prevent JavaScript precision loss
    const categoryWithStringId = {
      ...result.rows[0],
      id: result.rows[0].id.toString()
    };
    
    sendSuccessResponse(res, categoryWithStringId, 'Blog category created successfully', 201);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getAllBlogCategoriesAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = `
    SELECT id, name, slug, description, icon_url, banner_image, 
           is_active, sort_order, created_at, updated_at
    FROM blog_categories 
    ORDER BY sort_order ASC, name ASC
  `;
  
  try {
    const result = await dbManager.query(query);
    // Convert IDs to strings to prevent JavaScript precision loss
    const categoriesWithStringIds = result.rows.map((row: any) => ({
      ...row,
      id: row.id.toString()
    }));
    sendSuccessResponse(res, categoriesWithStringIds, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getBlogCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  // Use the ID as string directly for database query (CockroachDB handles string to BIGINT conversion)
  if (!id || id === 'undefined' || id === 'null') {
    throw new NotFoundError('Blog category');
  }
  
  const query = `
    SELECT id, name, slug, description, icon_url, banner_image, 
           is_active, sort_order, created_at, updated_at
    FROM blog_categories 
    WHERE id = $1
  `;
  
  try {
    const result = await dbManager.query(query, [id]);
    
    if (!result.rows[0]) {
      throw new NotFoundError('Blog category');
    }
    
    // Convert ID to string to prevent JavaScript precision loss
    const categoryWithStringId = {
      ...result.rows[0],
      id: result.rows[0].id.toString()
    };
    
    sendSuccessResponse(res, categoryWithStringId, undefined, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const updateBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, slug, description, icon_url, banner_image, sort_order, is_active } = req.body as UpdateBlogCategoryRequest;
  
  // Use the ID as string directly for database query (CockroachDB handles string to BIGINT conversion)
  if (!id || id === 'undefined' || id === 'null') {
    throw new NotFoundError('Blog category');
  }
  
  const query = `
    UPDATE blog_categories 
    SET name = $1, slug = $2, description = $3, icon_url = $4, 
        banner_image = $5, sort_order = $6, is_active = $7,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
  `;
  
  const values = [name, slug, description, icon_url, banner_image, sort_order, is_active, id];
  
  try {
    const result = await dbManager.query(query, values);
    
    if (!result.rows[0]) {
      throw new NotFoundError('Blog category');
    }
    
    // Invalidate cache
    await cacheManager.delPattern('blog_categories:*');
    
    // Convert ID to string to prevent JavaScript precision loss
    const categoryWithStringId = {
      ...result.rows[0],
      id: result.rows[0].id.toString()
    };
    
    sendSuccessResponse(res, categoryWithStringId, 'Blog category updated successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const deleteBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  // Use the ID as string directly for database query (CockroachDB handles string to BIGINT conversion)
  if (!id || id === 'undefined' || id === 'null') {
    throw new NotFoundError('Blog category');
  }
  
  // Check if category exists and if any blogs are using it
  const checkQuery = `
    SELECT bc.id, bc.name, COUNT(b.id) as blog_count
    FROM blog_categories bc
    LEFT JOIN blogs b ON bc.id = b.category_id
    WHERE bc.id = $1
    GROUP BY bc.id, bc.name
  `;
  
  try {
    const checkResult = await dbManager.query(checkQuery, [id]);
    
    if (!checkResult.rows[0]) {
      throw new NotFoundError('Blog category');
    }
    
    const blogCount = parseInt(checkResult.rows[0].blog_count);
    
    if (blogCount > 0) {
      const response: ApiResponse = {
        success: false,
        error: `Cannot delete blog category. ${blogCount} blog(s) are using this category.`
      };
      res.status(400).json(response);
      return;
    }
    
    const deleteQuery = `DELETE FROM blog_categories WHERE id = $1`;
    await dbManager.query(deleteQuery, [id]);
    
    // Invalidate cache
    await cacheManager.delPattern('blog_categories:*');
    
    sendSuccessResponse(res, null, 'Blog category deleted successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

// ==================== PUBLIC BLOG CATEGORIES API ====================

export const getActiveBlogCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cacheKey = 'blog_categories:active';
  
  try {
    // Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    
    const query = `
      SELECT id, name, slug, description, icon_url, banner_image, sort_order
      FROM blog_categories 
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `;
    
    const result = await dbManager.query(query);
    
    // Cache the result for 1 hour
    await cacheManager.set(cacheKey, result.rows, 3600);
    
    sendSuccessResponse(res, result.rows, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getBlogCategoryBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const cacheKey = `blog_categories:slug:${slug}`;
  
  try {
    // Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    
    const query = `
      SELECT id, name, slug, description, icon_url, banner_image, sort_order
      FROM blog_categories 
      WHERE slug = $1 AND is_active = true
    `;
    
    const result = await dbManager.query(query, [slug]);
    
    if (!result.rows[0]) {
      throw new NotFoundError('Blog category');
    }
    
    // Cache the result for 1 hour
    await cacheManager.set(cacheKey, result.rows[0], 3600);
    
    sendSuccessResponse(res, result.rows[0], undefined, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});