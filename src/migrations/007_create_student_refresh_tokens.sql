-- Migration: Create Student Refresh Tokens Table
-- Description: Creates table to store student refresh tokens for JWT token management

-- Create student refresh tokens table
CREATE TABLE IF NOT EXISTS student_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_refresh_tokens_student_id ON student_refresh_tokens(student_id);
CREATE INDEX IF NOT EXISTS idx_student_refresh_tokens_token ON student_refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_student_refresh_tokens_expires_at ON student_refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_student_refresh_tokens_is_revoked ON student_refresh_tokens(is_revoked);

-- Create a function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_student_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM student_refresh_tokens 
    WHERE expires_at < NOW() OR is_revoked = true;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired tokens (if pg_cron is available)
-- This would need to be set up separately in production
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_student_tokens();');
