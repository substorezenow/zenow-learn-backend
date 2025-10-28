-- Migration: Create Students Table
-- Description: Creates the students table for student authentication (separate from users table)

-- Create Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(15) UNIQUE NOT NULL, -- Custom student ID (e.g., STU0000000001, STU0000000002)
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    profile_image VARCHAR(500),
    bio TEXT,
    interests TEXT[], -- Array of interests/topics
    learning_goals TEXT,
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    profile_completed BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_students_email_verified ON students(email_verified);
CREATE INDEX IF NOT EXISTS idx_students_last_login ON students(last_login_at);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_students_country ON students(country);
CREATE INDEX IF NOT EXISTS idx_students_city ON students(city);

-- Note: Automatic updated_at trigger skipped for CockroachDB compatibility
-- The application will handle updating the updated_at field manually in the controllers

-- Insert sample student (password: student123)
INSERT INTO students (
    student_id,
    email, 
    password_hash, 
    first_name, 
    last_name,
    phone,
    date_of_birth,
    gender,
    country,
    city,
    is_active, 
    email_verified
) VALUES (
    'STU0000000001',
    'student@zenow.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- student123
    'John',
    'Doe',
    '+1234567890',
    '2000-01-15',
    'male',
    'United States',
    'New York',
    true,
    true
) ON CONFLICT (email) DO NOTHING;
