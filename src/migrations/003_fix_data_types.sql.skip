-- Fix data types to match actual database schema
-- The database is using BIGSERIAL for IDs but the schema says SERIAL/INTEGER

-- Update categories table
ALTER TABLE categories ALTER COLUMN id TYPE BIGINT;
ALTER TABLE categories ALTER COLUMN sort_order TYPE BIGINT;

-- Update fields table  
ALTER TABLE fields ALTER COLUMN id TYPE BIGINT;
ALTER TABLE fields ALTER COLUMN category_id TYPE BIGINT;
ALTER TABLE fields ALTER COLUMN sort_order TYPE BIGINT;

-- Update courses table
ALTER TABLE courses ALTER COLUMN id TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN field_id TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN duration_hours TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN total_ratings TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN enrolled_students TYPE BIGINT;

-- Update course_modules table
ALTER TABLE course_modules ALTER COLUMN id TYPE BIGINT;
ALTER TABLE course_modules ALTER COLUMN course_id TYPE BIGINT;
ALTER TABLE course_modules ALTER COLUMN sort_order TYPE BIGINT;

-- Update course_bundles table
ALTER TABLE course_bundles ALTER COLUMN id TYPE BIGINT;
ALTER TABLE course_bundles ALTER COLUMN total_duration_hours TYPE BIGINT;

-- Update bundle_courses table
ALTER TABLE bundle_courses ALTER COLUMN id TYPE BIGINT;
ALTER TABLE bundle_courses ALTER COLUMN bundle_id TYPE BIGINT;
ALTER TABLE bundle_courses ALTER COLUMN course_id TYPE BIGINT;
ALTER TABLE bundle_courses ALTER COLUMN sort_order TYPE BIGINT;

-- Update enrollments table
ALTER TABLE enrollments ALTER COLUMN id TYPE BIGINT;
ALTER TABLE enrollments ALTER COLUMN course_id TYPE BIGINT;
