-- Migration: Create Blog Management Tables
-- Description: Creates blog categories and blogs tables for content management

-- Create Blog Categories table
CREATE TABLE IF NOT EXISTS blog_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(255),
    banner_image VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(255),
    author_id VARCHAR(255) NOT NULL, -- Using VARCHAR to match user ID format
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP,
    tags JSONB,
    category_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
    read_time INTEGER, -- Estimated read time in minutes
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_category_id ON blogs(category_id);
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_active ON blog_categories(is_active);

-- Insert some default blog categories
INSERT INTO blog_categories (name, slug, description, sort_order) VALUES
('Technology', 'technology', 'Latest trends and insights in technology', 1),
('Career Development', 'career-development', 'Tips and strategies for career growth', 2),
('Learning Tips', 'learning-tips', 'Effective learning strategies and techniques', 3),
('Industry Insights', 'industry-insights', 'Deep dives into various industries', 4),
('Success Stories', 'success-stories', 'Inspiring stories from our community', 5)
ON CONFLICT (slug) DO NOTHING;

-- Note: Automatic updated_at triggers are skipped for CockroachDB compatibility
-- The application will handle updating the updated_at field manually in the controllers