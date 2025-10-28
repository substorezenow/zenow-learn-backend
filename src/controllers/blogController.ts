import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { dbManager } from '../utils/databaseManager';
import { cacheManager } from '../utils/cacheManager';
import { asyncHandler, sendSuccessResponse, NotFoundError, DatabaseError, handleDatabaseError } from '../middleware/errorHandler';

// Blog interfaces
interface CreateBlogRequest {
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

interface UpdateBlogRequest {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  status?: 'draft' | 'published' | 'archived';
  published_at?: string;
  tags?: string[];
  category_id?: string | number;
  read_time?: number;
}

// ==================== BLOGS ADMIN CRUD ====================

export const createBlog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { 
    title, 
    slug, 
    content, 
    excerpt, 
    featured_image, 
    author_id, 
    status = 'draft', 
    published_at, 
    tags, 
    category_id, 
    read_time 
  } = req.body as CreateBlogRequest;
  
  // Generate slug if not provided
  const finalSlug = slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Set published_at if status is published and no date provided
  const finalPublishedAt = status === 'published' && !published_at ? new Date().toISOString() : published_at;
  
  const query = `
    INSERT INTO blogs (title, slug, content, excerpt, featured_image, author_id, status, published_at, tags, category_id, read_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  
  const values = [
    title, 
    finalSlug, 
    content, 
    excerpt, 
    featured_image, 
    author_id, 
    status, 
    finalPublishedAt, 
    tags ? JSON.stringify(tags) : null, 
    category_id, 
    read_time
  ];
  
  try {
    const result = await dbManager.query(query, values);
    
    // Invalidate cache
    await cacheManager.delPattern('blogs:*');
    
    sendSuccessResponse(res, result.rows[0], 'Blog created successfully', 201);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getAllBlogsAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, status, category_id, author_id } = req.query;
  
  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;
  
  if (status) {
    whereConditions.push(`b.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }
  
  if (category_id) {
    whereConditions.push(`b.category_id = $${paramIndex}`);
    queryParams.push(category_id);
    paramIndex++;
  }
  
  if (author_id) {
    whereConditions.push(`b.author_id = $${paramIndex}`);
    queryParams.push(author_id);
    paramIndex++;
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const offset = (Number(page) - 1) * Number(limit);
  
  const query = `
    SELECT 
      b.id, b.title, b.slug, b.content, b.excerpt, b.featured_image, 
      b.author_id, b.status, b.published_at, b.tags, b.category_id, 
      b.read_time, b.views, b.created_at, b.updated_at,
      bc.name as category_name, bc.slug as category_slug
    FROM blogs b
    LEFT JOIN blog_categories bc ON b.category_id = bc.id
    ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(limit, offset);
  
  // Count query for pagination
  const countQuery = `
    SELECT COUNT(*) as total
    FROM blogs b
    ${whereClause}
  `;
  
  try {
    const [result, countResult] = await Promise.all([
      dbManager.query(query, queryParams),
      dbManager.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / Number(limit));
    
    const response = {
      blogs: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };
    
    sendSuccessResponse(res, response, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getBlogById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      b.id, b.title, b.slug, b.content, b.excerpt, b.featured_image, 
      b.author_id, b.status, b.published_at, b.tags, b.category_id, 
      b.read_time, b.views, b.created_at, b.updated_at,
      bc.name as category_name, bc.slug as category_slug
    FROM blogs b
    LEFT JOIN blog_categories bc ON b.category_id = bc.id
    WHERE b.id = $1
  `;
  
  try {
    const result = await dbManager.query(query, [id]);
    
    if (!result.rows[0]) {
      throw new NotFoundError('Blog');
    }
    
    sendSuccessResponse(res, result.rows[0], undefined, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const updateBlog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { 
    title, 
    slug, 
    content, 
    excerpt, 
    featured_image, 
    status, 
    published_at, 
    tags, 
    category_id, 
    read_time 
  } = req.body as UpdateBlogRequest;
  
  // Build dynamic update query with only provided fields
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;
  
  if (title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  
  if (slug !== undefined) {
    updates.push(`slug = $${paramCount++}`);
    values.push(slug);
  }
  
  if (content !== undefined) {
    updates.push(`content = $${paramCount++}`);
    values.push(content);
  }
  
  if (excerpt !== undefined) {
    updates.push(`excerpt = $${paramCount++}`);
    values.push(excerpt);
  }
  
  if (featured_image !== undefined) {
    updates.push(`featured_image = $${paramCount++}`);
    values.push(featured_image);
  }
  
  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
    
    // If status is being changed to published and no published_at is provided, set it now
    if (status === 'published' && published_at === undefined) {
      // Check if blog was already published
      const checkQuery = `SELECT published_at FROM blogs WHERE id = $1`;
      const checkResult = await dbManager.query(checkQuery, [id]);
      if (checkResult.rows[0] && !checkResult.rows[0].published_at) {
        updates.push(`published_at = $${paramCount++}`);
        values.push(new Date().toISOString());
      }
    }
  }
  
  if (published_at !== undefined) {
    updates.push(`published_at = $${paramCount++}`);
    values.push(published_at);
  }
  
  if (tags !== undefined) {
    updates.push(`tags = $${paramCount++}`);
    values.push(tags ? JSON.stringify(tags) : null);
  }
  
  if (category_id !== undefined) {
    updates.push(`category_id = $${paramCount++}`);
    values.push(category_id);
  }
  
  if (read_time !== undefined) {
    updates.push(`read_time = $${paramCount++}`);
    values.push(read_time);
  }
  
  if (updates.length === 0) {
    throw new Error('No fields to update');
  }
  
  // Always update the updated_at timestamp
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  
  const query = `
    UPDATE blogs 
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  try {
    const result = await dbManager.query(query, values);
    
    if (!result.rows[0]) {
      throw new NotFoundError('Blog');
    }
    
    // Invalidate cache
    await cacheManager.delPattern('blogs:*');
    await cacheManager.del(`blog:${id}`);
    
    sendSuccessResponse(res, result.rows[0], 'Blog updated successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const deleteBlog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  // First check if blog exists
  const checkQuery = `SELECT id FROM blogs WHERE id = $1`;
  const checkResult = await dbManager.query(checkQuery, [id]);
  
  if (!checkResult.rows[0]) {
    throw new NotFoundError('Blog');
  }
  
  try {
    const deleteQuery = `DELETE FROM blogs WHERE id = $1`;
    await dbManager.query(deleteQuery, [id]);
    
    // Invalidate cache
    await cacheManager.delPattern('blogs:*');
    await cacheManager.del(`blog:${id}`);
    
    sendSuccessResponse(res, null, 'Blog deleted successfully');
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

// ==================== PUBLIC BLOGS API ====================

export const getPublishedBlogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, category, search, tags } = req.query;
  
  let whereConditions = ['b.status = $1'];
  let queryParams = ['published'];
  let paramIndex = 2;
  
  if (category) {
    whereConditions.push(`bc.slug = $${paramIndex}`);
    queryParams.push(String(category));
    paramIndex++;
  }
  
  if (search) {
    whereConditions.push(`(b.title ILIKE $${paramIndex} OR b.content ILIKE $${paramIndex} OR b.excerpt ILIKE $${paramIndex})`);
    queryParams.push(`%${String(search)}%`);
    paramIndex++;
  }
  
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags.map(String) : [String(tags)];
    whereConditions.push(`b.tags ?| ARRAY[${tagArray.map((_, i) => `$${paramIndex + i}`).join(',')}]`);
    queryParams.push(...tagArray);
    paramIndex += tagArray.length;
  }
  
  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);
  
  const cacheKey = `blogs:published:${JSON.stringify(req.query)}`;
  
  try {
    // Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    
    const query = `
      SELECT 
        b.id, b.title, b.slug, b.excerpt, b.featured_image, 
        b.author_id, b.published_at, b.tags, b.category_id, 
        b.read_time, b.views,
        bc.name as category_name, bc.slug as category_slug
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.category_id = bc.id
      ${whereClause}
      ORDER BY b.published_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(String(limit), String(offset));
    
    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.category_id = bc.id
      ${whereClause}
    `;
    
    const [result, countResult] = await Promise.all([
      dbManager.query(query, queryParams),
      dbManager.query(countQuery, queryParams.slice(0, -2)) // Remove limit and offset for count
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / Number(limit));
    
    const response = {
      blogs: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };
    
    // Cache the result for 15 minutes
    await cacheManager.set(cacheKey, response, 900);
    
    sendSuccessResponse(res, response, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getBlogBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const cacheKey = `blog:slug:${slug}`;
  
  try {
    // Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    
    const query = `
      SELECT 
        b.id, b.title, b.slug, b.content, b.excerpt, b.featured_image, 
        b.author_id, b.published_at, b.tags, b.category_id, 
        b.read_time, b.views, b.created_at,
        bc.name as category_name, bc.slug as category_slug
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.category_id = bc.id
      WHERE b.slug = $1 AND b.status = 'published'
    `;
    
    const result = await dbManager.query(query, [slug]);
    
    if (!result.rows[0]) {
      throw new NotFoundError('Blog');
    }
    
    // Increment view count
    const updateViewsQuery = `UPDATE blogs SET views = views + 1 WHERE id = $1`;
    await dbManager.query(updateViewsQuery, [result.rows[0].id]);
    
    // Update the views in the result
    result.rows[0].views = (result.rows[0].views || 0) + 1;
    
    // Cache the result for 30 minutes
    await cacheManager.set(cacheKey, result.rows[0], 1800);
    
    sendSuccessResponse(res, result.rows[0], undefined, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const getBlogsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { categorySlug } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const offset = (Number(page) - 1) * Number(limit);
  const cacheKey = `blogs:category:${categorySlug}:${page}:${limit}`;
  
  try {
    // Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    
    const query = `
      SELECT 
        b.id, b.title, b.slug, b.excerpt, b.featured_image, 
        b.author_id, b.published_at, b.tags, b.category_id, 
        b.read_time, b.views,
        bc.name as category_name, bc.slug as category_slug
      FROM blogs b
      INNER JOIN blog_categories bc ON b.category_id = bc.id
      WHERE bc.slug = $1 AND b.status = 'published' AND bc.is_active = true
      ORDER BY b.published_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM blogs b
      INNER JOIN blog_categories bc ON b.category_id = bc.id
      WHERE bc.slug = $1 AND b.status = 'published' AND bc.is_active = true
    `;
    
    const [result, countResult] = await Promise.all([
      dbManager.query(query, [categorySlug, limit, offset]),
      dbManager.query(countQuery, [categorySlug])
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / Number(limit));
    
    const response = {
      blogs: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };
    
    // Cache the result for 15 minutes
    await cacheManager.set(cacheKey, response, 900);
    
    sendSuccessResponse(res, response, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getFeaturedBlogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit = 5 } = req.query;
  const cacheKey = `blogs:featured:${limit}`;
  
  try {
    // Try to get from cache first
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    
    const query = `
      SELECT 
        b.id, b.title, b.slug, b.excerpt, b.featured_image, 
        b.author_id, b.published_at, b.tags, b.category_id, 
        b.read_time, b.views,
        bc.name as category_name, bc.slug as category_slug
      FROM blogs b
      LEFT JOIN blog_categories bc ON b.category_id = bc.id
      WHERE b.status = 'published'
      ORDER BY b.views DESC, b.published_at DESC
      LIMIT $1
    `;
    
    const result = await dbManager.query(query, [limit]);
    
    // Cache the result for 30 minutes
    await cacheManager.set(cacheKey, result.rows, 1800);
    
    sendSuccessResponse(res, result.rows, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});