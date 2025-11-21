import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { BlogCategoryModel } from '../models/BlogCategory';
import { BlogModel } from '../models/Blog';
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
  try {
    const doc = await BlogCategoryModel.create({
      name,
      slug: finalSlug,
      description,
      icon_url,
      banner_image,
      sort_order: sort_order || 0,
      is_active: is_active !== false
    });
    await cacheManager.delPattern('blog_categories:*');
    sendSuccessResponse(res, doc, 'Blog category created successfully', 201);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getAllBlogCategoriesAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await BlogCategoryModel.find().sort({ sort_order: 1, name: 1 });
    sendSuccessResponse(res, categories, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getBlogCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id || id === 'undefined' || id === 'null') {
    throw new NotFoundError('Blog category');
  }
  try {
    const category = await BlogCategoryModel.findById(id);
    if (!category) {
      throw new NotFoundError('Blog category');
    }
    sendSuccessResponse(res, category, undefined, 200);
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
  
  if (!id || id === 'undefined' || id === 'null') {
    throw new NotFoundError('Blog category');
  }
  try {
    const updated = await BlogCategoryModel.findByIdAndUpdate(
      id,
      { name, slug, description, icon_url, banner_image, sort_order, is_active },
      { new: true }
    );
    if (!updated) {
      throw new NotFoundError('Blog category');
    }
    await cacheManager.delPattern('blog_categories:*');
    sendSuccessResponse(res, updated, 'Blog category updated successfully');
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});

export const deleteBlogCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  if (!id || id === 'undefined' || id === 'null') {
    throw new NotFoundError('Blog category');
  }
  try {
    const category = await BlogCategoryModel.findById(id).select('_id name');
    if (!category) {
      throw new NotFoundError('Blog category');
    }
    const blogCount = await BlogModel.countDocuments({ category_id: category._id });
    if (blogCount > 0) {
      const response: ApiResponse = {
        success: false,
        error: `Cannot delete blog category. ${blogCount} blog(s) are using this category.`
      };
      res.status(400).json(response);
      return;
    }
    await BlogCategoryModel.findByIdAndDelete(id);
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
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    const categories = await BlogCategoryModel.find({ is_active: true }).sort({ sort_order: 1, name: 1 });
    await cacheManager.set(cacheKey, categories, 3600);
    sendSuccessResponse(res, categories, undefined, 200);
  } catch (error) {
    throw handleDatabaseError(error);
  }
});

export const getBlogCategoryBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const cacheKey = `blog_categories:slug:${slug}`;
  try {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      sendSuccessResponse(res, cached, undefined, 200);
      return;
    }
    const category = await BlogCategoryModel.findOne({ slug, is_active: true });
    if (!category) {
      throw new NotFoundError('Blog category');
    }
    await cacheManager.set(cacheKey, category, 3600);
    sendSuccessResponse(res, category, undefined, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw handleDatabaseError(error);
  }
});