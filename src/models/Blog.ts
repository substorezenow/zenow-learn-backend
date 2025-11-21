import mongoose, { Schema, model, Types } from 'mongoose';

export interface Blog {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  author_id: string;
  author?: string;
  status: 'draft' | 'published' | 'archived';
  is_published?: boolean;
  published_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  tags?: string[];
  category_id?: Types.ObjectId | string;
  category?: string;
  read_time?: number;
  views?: number;
  likes?: number;
}

const BlogSchema = new Schema<Blog>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    featured_image: { type: String },
    author_id: { type: String },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    published_at: { type: Date, index: true },
    tags: { type: [String] },
    category_id: { type: Schema.Types.ObjectId, ref: 'BlogCategory' },
    read_time: { type: Number },
    views: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

BlogSchema.virtual('is_published').get(function (this: any) {
  return this.status === 'published';
});

export const BlogModel = model<Blog>('Blog', BlogSchema);