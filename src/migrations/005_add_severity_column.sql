-- Add severity column to existing security_events table if it doesn't exist
ALTER TABLE security_events 
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'MEDIUM';
