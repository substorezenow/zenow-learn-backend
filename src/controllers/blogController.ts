import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { BlogModel } from '../models/Blog';
import { BlogCategoryModel } from '../models/BlogCategory';
import { BlogService } from '../services/blogService';
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
  const finalPublishedAt = status === 'published' && !published_at ? new Date() : published_at ? new Date(published_at) : undefined;
  
  try {
    const doc = await BlogModel.create({
      title,
      slug: finalSlug,
      content,
      excerpt,
      featured_image,
      author_id,
      status,
      published_at: finalPublishedAt,
      tags: Array.isArray(tags) ? tags : tags ? [String(tags)] : undefined,
      category_id: category_id ? category_id as any : undefined,
      read_time
    });
    
    await cacheManager.delPattern('blogs:*');
    
    sendSuccessResponse(res, doc, 'Blog created successfully', 201);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getAllBlogsAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, status, category_id, author_id } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);
  const filter: any = {};
  if (status) filter.status = status;
  if (category_id) filter.category_id = category_id;
  if (author_id) filter.author_id = author_id;
  try {
    const [blogs, total] = await Promise.all([
      BlogModel.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({ path: 'category_id', select: 'name slug' }),
      BlogModel.countDocuments(filter)
    ]);
    const totalPages = Math.ceil(total / Number(limit));
    const response = {
      blogs,
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
  try {
    const blog = await BlogModel.findById(id).populate({ path: 'category_id', select: 'name slug' });
    if (!blog) {
      throw new NotFoundError('Blog');
    }
    sendSuccessResponse(res, blog, undefined, 200);
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
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (slug !== undefined) updates.slug = slug;
  if (content !== undefined) updates.content = content;
  if (excerpt !== undefined) updates.excerpt = excerpt;
  if (featured_image !== undefined) updates.featured_image = featured_image;
  if (status !== undefined) updates.status = status;
  if (published_at !== undefined) updates.published_at = published_at ? new Date(published_at) : undefined;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags ? [String(tags)] : [];
  if (category_id !== undefined) updates.category_id = category_id as any;
  if (read_time !== undefined) updates.read_time = read_time;
  if (status === 'published' && published_at === undefined) {
    const existing = await BlogModel.findById(id).select('published_at');
    if (existing && !existing.published_at) {
      updates.published_at = new Date();
    }
  }
  try {
    const updated = await BlogModel.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      throw new NotFoundError('Blog');
    }
    await cacheManager.delPattern('blogs:*');
    await cacheManager.del(`blog:${id}`);
    sendSuccessResponse(res, updated, 'Blog updated successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const deleteBlog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const existing = await BlogModel.findById(id).select('_id');
  if (!existing) {
    throw new NotFoundError('Blog');
  }
  try {
    await BlogModel.findByIdAndDelete(id);
    await cacheManager.delPattern('blogs:*');
    await cacheManager.del(`blog:${id}`);
    sendSuccessResponse(res, null, 'Blog deleted successfully');
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

// ==================== PUBLIC BLOGS API ====================

export const getPublishedBlogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10, category, search, tags } = req.query as any;
  const cacheKey = `blogs:published:${JSON.stringify(req.query)}`;
  try {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    const filter: any = { status: 'published' };
    if (category) {
      const f = await BlogService.resolveCategoryFilter(String(category));
      Object.assign(filter, f);
    }
    if (search) {
      const q = String(search);
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { excerpt: { $regex: q, $options: 'i' } }
      ];
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags.map(String) : [String(tags)];
      filter.tags = { $in: tagArray };
    }
    const response = await BlogService.getPublishedBlogs(filter, Number(page), Number(limit));
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
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    const blog = await BlogService.getBlogBySlug(slug);
    if (!blog) {
      throw new NotFoundError('Blog');
    }
    await BlogModel.updateOne({ _id: blog._id }, { $inc: { views: 1 } });
    const updatedViews = (blog.views || 0) + 1;
    const doc = { ...blog.toObject(), views: updatedViews } as any;
    await cacheManager.set(cacheKey, doc, 1800);
    sendSuccessResponse(res, doc, undefined, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const getBlogsByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { categorySlug } = req.params;
  const { page = 1, limit = 10 } = req.query as any;
  const cacheKey = `blogs:category:${categorySlug}:${page}:${limit}`;
  const skip = (Number(page) - 1) * Number(limit);
  try {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    const response = await BlogService.getBlogsByCategorySlug(categorySlug, Number(page), Number(limit));
    await cacheManager.set(cacheKey, response, 900);
    sendSuccessResponse(res, response, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getFeaturedBlogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit = 5 } = req.query as any;
  const cacheKey = `blogs:featured:${limit}`;
  try {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    const blogs = await BlogService.getFeaturedBlogs(Number(limit));
    await cacheManager.set(cacheKey, blogs, 1800);
    sendSuccessResponse(res, blogs, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});