import { Schema, model } from 'mongoose';

export interface BlogCategory {
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  banner_image?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  blog_count?: number;
}

const BlogCategorySchema = new Schema<BlogCategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    icon_url: { type: String },
    banner_image: { type: String },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

export const BlogCategoryModel = model<BlogCategory>('BlogCategory', BlogCategorySchema);