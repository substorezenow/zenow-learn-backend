// Database Models
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url?: string;
  banner_image?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Field {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url?: string;
  banner_image?: string;
  is_active: boolean;
  sort_order: number;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  course_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  banner_image?: string;
  thumbnail_image?: string;
  duration_hours?: number;
  difficulty_level?: string;
  price: number;
  is_free: boolean;
  is_published: boolean;
  field_id: string;
  instructor_id?: string;
  prerequisites?: string;
  learning_outcomes?: string;
  course_modules?: CourseModule[];
  tags?: string;
  rating?: number;
  total_ratings?: number;
  enrolled_students?: number;
  created_at: string;
  updated_at: string;
  field_name?: string;
  field_slug?: string;
  category_name?: string;
  category_slug?: string;
  instructor_name?: string;
  instructor_email?: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'text' | 'quiz' | 'assignment';
  content_url?: string;
  duration_minutes?: number;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseBundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner_image?: string;
  thumbnail_image?: string;
  price: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface BundleCourse {
  id: string;
  bundle_id: string;
  course_id: string;
  sort_order: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'instructor' | 'admin' | 'superuser';
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at?: string;
  progress_percentage: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request/Response Types
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description: string;
  icon_url?: string;
  banner_image?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

export interface CreateFieldRequest {
  name: string;
  slug?: string;
  description: string;
  icon_url?: string;
  banner_image?: string;
  sort_order?: number;
  is_active?: boolean;
  category_id: string;
}

export interface UpdateFieldRequest extends Partial<CreateFieldRequest> {
  id: string;
}

export interface CreateCourseRequest {
  title: string;
  slug?: string;
  description: string;
  short_description?: string;
  banner_image?: string;
  thumbnail_image?: string;
  duration_hours: number;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  is_free: boolean;
  is_published?: boolean;
  field_id: string;
  instructor_id: string;
  prerequisites?: string;
  learning_outcomes?: string;
  course_modules?: any;
  tags?: string;
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  id: string;
}

export interface CreateModuleRequest {
  course_id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'text' | 'quiz' | 'assignment';
  content_url?: string;
  duration_minutes?: number;
  sort_order?: number;
  is_published?: boolean;
}

export interface UpdateModuleRequest extends Partial<CreateModuleRequest> {
  id: string;
}

// Admin Statistics
export interface AdminStats {
  total_categories: number;
  total_fields: number;
  published_courses: number;
  draft_courses: number;
  total_enrollments: number;
  total_students: number;
  total_admins: number;
}

// Authentication Types
export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin' | 'superuser';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: AuthUser;
    token: string;
  };
  error?: string;
}

// Database Connection Types
export interface DatabaseConfig {
  connectionString: string;
  ssl?: boolean;
}

// Express Request Extensions
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
