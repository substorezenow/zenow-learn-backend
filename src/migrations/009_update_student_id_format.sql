-- Migration: Update Student ID Format for Billions of Students
-- Description: Updates the student_id column to support 10-digit format (STU0000000001 to STU9999999999)
-- Capacity: 9,999,999,999 students

-- Update the student_id column length to accommodate 10-digit format
-- Format: STU + 10 digits = 13 characters total
ALTER TABLE students ALTER COLUMN student_id TYPE VARCHAR(15);

-- Update any existing 4-digit student IDs to 10-digit format
-- This will pad existing IDs like STU0001 to STU0000000001
UPDATE students 
SET student_id = 'STU' || LPAD(SUBSTRING(student_id FROM 4)::INTEGER::TEXT, 10, '0')
WHERE LENGTH(student_id) = 7; -- Only update 4-digit format (STU + 4 digits = 7 chars)

-- Add a comment to document the new format
COMMENT ON COLUMN students.student_id IS 'Custom student ID format: STU + 10-digit number (STU0000000001 to STU9999999999). Supports up to 9,999,999,999 students.';

-- Verify the update
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_students,
    MIN(student_id) as min_student_id,
    MAX(student_id) as max_student_id,
    AVG(LENGTH(student_id)) as avg_id_length
FROM students;
