-- Fix enrollments foreign key to reference students table
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE;
