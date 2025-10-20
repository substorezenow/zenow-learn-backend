-- Migration: Fix Enrollments Table Foreign Key
-- Description: Updates enrollments table to reference students table instead of users table

-- First, drop the existing foreign key constraint
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;

-- Update the column to reference students table
ALTER TABLE enrollments 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Add the new foreign key constraint to reference students table
ALTER TABLE enrollments 
ADD CONSTRAINT enrollments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE;

-- Update any other tables that reference users(id) to reference students(id) instead
-- Update course_reviews table
ALTER TABLE course_reviews DROP CONSTRAINT IF EXISTS course_reviews_user_id_fkey;
ALTER TABLE course_reviews 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
ALTER TABLE course_reviews 
ADD CONSTRAINT course_reviews_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE;

-- Update sessions table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
        ALTER TABLE sessions 
        ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;
END $$;
