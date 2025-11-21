import { BlogModel } from '../models/Blog'
import { BlogCategoryModel } from '../models/BlogCategory'

export const BlogService = {
  async getPublishedBlogs(filter: any, page: number, limit: number) {
    const skip = (page - 1) * limit
    const [blogs, total] = await Promise.all([
      BlogModel.find(filter)
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'category_id', select: 'name slug' }),
      BlogModel.countDocuments(filter)
    ])
    const totalPages = Math.ceil(total / limit)
    return {
      blogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  },

  async getBlogBySlug(slug: string) {
    const blog = await BlogModel.findOne({ slug, status: 'published' }).populate({ path: 'category_id', select: 'name slug' })
    return blog
  },

  async getBlogsByCategorySlug(categorySlug: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    const category = await BlogCategoryModel.findOne({ slug: categorySlug, is_active: true }).select('_id')
    if (!category) {
      return {
        blogs: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      }
    }
    const [blogs, total] = await Promise.all([
      BlogModel.find({ category_id: category._id, status: 'published' })
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'category_id', select: 'name slug' }),
      BlogModel.countDocuments({ category_id: category._id, status: 'published' })
    ])
    const totalPages = Math.ceil(total / limit)
    return {
      blogs,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    }
  },

  async getFeaturedBlogs(limit: number) {
    const blogs = await BlogModel.find({ status: 'published' })
      .sort({ views: -1, published_at: -1 })
      .limit(limit)
      .populate({ path: 'category_id', select: 'name slug' })
    return blogs
  },

  async resolveCategoryFilter(categorySlug?: string) {
    if (!categorySlug) return {}
    const cat = await BlogCategoryModel.findOne({ slug: String(categorySlug) }).select('_id')
    if (!cat) return { category_id: null }
    return { category_id: cat._id }
  }
}