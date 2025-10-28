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

-- Note: Token cleanup function skipped for CockroachDB compatibility
-- The application will handle token cleanup manually or through scheduled jobs

-- Create a scheduled job to clean up expired tokens (if pg_cron is available)
-- This would need to be set up separately in production
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_student_tokens();');
