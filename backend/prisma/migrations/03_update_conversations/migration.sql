-- Migration: Update conversations table with analytics fields
-- Date: 2026-01-10
-- Purpose: Add feedback and performance tracking columns

-- Add analytics columns to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS feedback_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;

-- Index for created_at (already exists in 00_init_pgvector but ensure DESC order)
-- DROP INDEX IF EXISTS conversations_created_at_idx; -- Commented out to avoid errors if already exists
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at DESC);

-- Index for analytics queries (filter by model, sort by performance)
CREATE INDEX IF NOT EXISTS conversations_model_used_idx ON conversations(model_used) WHERE model_used IS NOT NULL;

-- Index for high-feedback conversations (useful for quality analysis)
CREATE INDEX IF NOT EXISTS conversations_feedback_count_idx ON conversations(feedback_count DESC) WHERE feedback_count > 0;

-- Comment the new columns
COMMENT ON COLUMN conversations.feedback_count IS 'Number of feedback entries for this conversation';
COMMENT ON COLUMN conversations.average_rating IS 'Average rating (1-5) from feedback';
COMMENT ON COLUMN conversations.model_used IS 'Groq model used for response (e.g., llama-3.3-70b-versatile)';
COMMENT ON COLUMN conversations.tokens_used IS 'Total tokens used (input + output) for LLM generation';
COMMENT ON COLUMN conversations.response_time_ms IS 'Response time in milliseconds from RAG pipeline';
