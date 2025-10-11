-- Migration: Ensure all ID columns work properly with string IDs
-- Description: This migration ensures all ID columns are properly configured for string handling

-- Update categories table to ensure proper string handling
ALTER TABLE categories ALTER COLUMN id TYPE BIGINT;
ALTER TABLE categories ALTER COLUMN sort_order TYPE BIGINT;

-- Update fields table to ensure proper string handling
ALTER TABLE fields ALTER COLUMN id TYPE BIGINT;
ALTER TABLE fields ALTER COLUMN category_id TYPE BIGINT;
ALTER TABLE fields ALTER COLUMN sort_order TYPE BIGINT;

-- Update courses table to ensure proper string handling
ALTER TABLE courses ALTER COLUMN id TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN field_id TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN duration_hours TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN total_ratings TYPE BIGINT;
ALTER TABLE courses ALTER COLUMN enrolled_students TYPE BIGINT;

-- Update course_modules table to ensure proper string handling
ALTER TABLE course_modules ALTER COLUMN id TYPE BIGINT;
ALTER TABLE course_modules ALTER COLUMN course_id TYPE BIGINT;
ALTER TABLE course_modules ALTER COLUMN sort_order TYPE BIGINT;

-- Update course_bundles table to ensure proper string handling
ALTER TABLE course_bundles ALTER COLUMN id TYPE BIGINT;
ALTER TABLE course_bundles ALTER COLUMN total_duration_hours TYPE BIGINT;

-- Update bundle_courses table to ensure proper string handling
ALTER TABLE bundle_courses ALTER COLUMN id TYPE BIGINT;
ALTER TABLE bundle_courses ALTER COLUMN bundle_id TYPE BIGINT;
ALTER TABLE bundle_courses ALTER COLUMN course_id TYPE BIGINT;
ALTER TABLE bundle_courses ALTER COLUMN sort_order TYPE BIGINT;

-- Update enrollments table to ensure proper string handling
ALTER TABLE enrollments ALTER COLUMN id TYPE BIGINT;
ALTER TABLE enrollments ALTER COLUMN course_id TYPE BIGINT;

-- Update user_sessions table to ensure proper string handling
ALTER TABLE user_sessions ALTER COLUMN id TYPE BIGINT;

-- Update security_events table to ensure proper string handling
ALTER TABLE security_events ALTER COLUMN id TYPE BIGINT;

-- Update rate_limits table to ensure proper string handling
ALTER TABLE rate_limits ALTER COLUMN id TYPE BIGINT;

-- Update blocked_ips table to ensure proper string handling
ALTER TABLE blocked_ips ALTER COLUMN id TYPE BIGINT;

-- Add comments to document the string ID approach
COMMENT ON COLUMN categories.id IS 'Primary key - stored as BIGINT but handled as string in application';
COMMENT ON COLUMN fields.id IS 'Primary key - stored as BIGINT but handled as string in application';
COMMENT ON COLUMN fields.category_id IS 'Foreign key to categories.id - stored as BIGINT but handled as string in application';
COMMENT ON COLUMN courses.id IS 'Primary key - stored as BIGINT but handled as string in application';
COMMENT ON COLUMN courses.field_id IS 'Foreign key to fields.id - stored as BIGINT but handled as string in application';
COMMENT ON COLUMN course_modules.id IS 'Primary key - stored as BIGINT but handled as string in application';
COMMENT ON COLUMN course_modules.course_id IS 'Foreign key to courses.id - stored as BIGINT but handled as string in application';
