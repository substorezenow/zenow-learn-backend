# Course Management Database Schema

## Database Tables Structure

### 1. Categories (Level 1)
```sql
CREATE TABLE categories (
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

-- Sample data
INSERT INTO categories (name, slug, description, icon_url) VALUES
('General Education', 'general-education', 'Basic education courses for fundamental learning', '/icons/general.svg'),
('Engineering', 'engineering', 'Technical and engineering courses', '/icons/engineering.svg'),
('Medical', 'medical', 'Medical and healthcare courses', '/icons/medical.svg');
```

### 2. Fields (Level 2)
```sql
CREATE TABLE fields (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    banner_image VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, slug)
);

-- Sample data
INSERT INTO fields (category_id, name, slug, description) VALUES
(1, 'Basic Mathematics', 'basic-math', 'Fundamental mathematics courses'),
(1, 'Reading & Writing', 'reading-writing', 'Language and literacy courses'),
(2, 'Computer Science', 'computer-science', 'Programming and computer science courses'),
(2, 'Mechanical Engineering', 'mechanical-engineering', 'Mechanical engineering courses'),
(2, 'Robotics', 'robotics', 'Robotics and automation courses'),
(3, 'General Medicine', 'general-medicine', 'General medical courses'),
(3, 'Nursing', 'nursing', 'Nursing and patient care courses');
```

### 3. Courses (Level 3)
```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    banner_image VARCHAR(255),
    thumbnail_image VARCHAR(255),
    duration_hours INTEGER DEFAULT 0,
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    price DECIMAL(10,2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    instructor_id INTEGER REFERENCES users(id),
    prerequisites TEXT,
    learning_outcomes JSONB,
    course_modules JSONB,
    tags TEXT[],
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    enrolled_students INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(field_id, slug)
);

-- Sample data
INSERT INTO courses (field_id, title, slug, description, duration_hours, difficulty_level, price) VALUES
(3, 'Frontend Development with React', 'frontend-react', 'Complete React.js course for frontend development', 40, 'intermediate', 99.99),
(3, 'Backend Development with Node.js', 'backend-nodejs', 'Complete Node.js course for backend development', 35, 'intermediate', 89.99),
(3, 'Full Stack Development', 'fullstack-development', 'Complete full stack development course', 75, 'advanced', 179.99),
(4, 'Mechanical Design Basics', 'mechanical-design', 'Fundamental mechanical design principles', 30, 'beginner', 79.99);
```

### 4. Course Bundles (Combination of Multiple Courses)
```sql
CREATE TABLE course_bundles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    banner_image VARCHAR(255),
    thumbnail_image VARCHAR(255),
    total_duration_hours INTEGER DEFAULT 0,
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    bundle_price DECIMAL(10,2) DEFAULT 0.00,
    individual_price DECIMAL(10,2) DEFAULT 0.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_published BOOLEAN DEFAULT false,
    instructor_id INTEGER REFERENCES users(id),
    prerequisites TEXT,
    learning_outcomes JSONB,
    tags TEXT[],
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    enrolled_students INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO course_bundles (title, slug, description, bundle_price, individual_price, discount_percentage) VALUES
('Complete Web Development Bundle', 'web-development-bundle', 'Frontend + Backend + Database course bundle', 249.99, 299.97, 16.67),
('Engineering Fundamentals Bundle', 'engineering-fundamentals', 'Mechanical + Electrical + Civil engineering basics', 199.99, 239.97, 16.67);
```

### 5. Bundle Courses (Many-to-Many relationship)
```sql
CREATE TABLE bundle_courses (
    id SERIAL PRIMARY KEY,
    bundle_id INTEGER REFERENCES course_bundles(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, course_id)
);

-- Sample data
INSERT INTO bundle_courses (bundle_id, course_id, sort_order) VALUES
(1, 1, 1), -- Web Development Bundle includes Frontend React
(1, 2, 2), -- Web Development Bundle includes Backend Node.js
(1, 3, 3); -- Web Development Bundle includes Full Stack
```

### 6. Course Modules/Content
```sql
CREATE TABLE course_modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    module_type VARCHAR(50) DEFAULT 'video', -- video, text, quiz, assignment
    content_url VARCHAR(500),
    duration_minutes INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO course_modules (course_id, title, description, module_type, duration_minutes, sort_order) VALUES
(1, 'Introduction to React', 'Learn the basics of React.js', 'video', 45, 1),
(1, 'Components and Props', 'Understanding React components', 'video', 60, 2),
(1, 'State and Lifecycle', 'Managing component state', 'video', 50, 3),
(1, 'React Quiz 1', 'Test your React knowledge', 'quiz', 30, 4);
```

### 7. User Enrollments
```sql
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    bundle_id INTEGER REFERENCES course_bundles(id) ON DELETE CASCADE,
    enrollment_type VARCHAR(20) DEFAULT 'course', -- course, bundle
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_completed BOOLEAN DEFAULT false,
    completion_date TIMESTAMP,
    UNIQUE(user_id, course_id),
    UNIQUE(user_id, bundle_id)
);
```

### 8. Course Progress
```sql
CREATE TABLE course_progress (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completion_date TIMESTAMP,
    time_spent_minutes INTEGER DEFAULT 0,
    last_position_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(enrollment_id, module_id)
);
```

### 9. Course Reviews
```sql
CREATE TABLE course_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    bundle_id INTEGER REFERENCES course_bundles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id),
    UNIQUE(user_id, bundle_id)
);
```

## API Endpoints Structure

### Categories API
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category
- `GET /api/categories/:id/fields` - Get fields in category

### Fields API
- `GET /api/fields` - Get all fields
- `GET /api/fields/:id` - Get single field
- `GET /api/fields/:id/courses` - Get courses in field

### Courses API
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get single course with modules
- `POST /api/courses/:id/enroll` - Enroll in course
- `GET /api/courses/:id/progress` - Get course progress

### Bundles API
- `GET /api/bundles` - Get all bundles
- `GET /api/bundles/:id` - Get single bundle with courses
- `POST /api/bundles/:id/enroll` - Enroll in bundle

### Progress API
- `GET /api/progress` - Get user's course progress
- `POST /api/progress/module/:id/complete` - Mark module as complete
- `PUT /api/progress/module/:id/position` - Update video position
