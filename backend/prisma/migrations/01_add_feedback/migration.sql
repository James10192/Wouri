-- Migration: Add feedback table for admin feedback loop
-- Date: 2026-01-10
-- Purpose: Store user feedback with embeddings for RAG improvement

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  wa_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  embedding VECTOR(768), -- pgvector for semantic search (sentence-transformers dimension)
  is_embedded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for user feedback history lookup
CREATE INDEX IF NOT EXISTS feedback_wa_id_idx ON feedback(wa_id);

-- Index for conversation feedback lookup
CREATE INDEX IF NOT EXISTS feedback_conversation_id_idx ON feedback(conversation_id);

-- HNSW index for fast vector similarity search
-- Uses cosine distance for semantic similarity
CREATE INDEX IF NOT EXISTS feedback_embedding_idx
ON feedback USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

-- Comment the table
COMMENT ON TABLE feedback IS 'Admin feedback entries with embeddings for RAG improvement loop';
COMMENT ON COLUMN feedback.embedding IS 'Vector embedding (768-dim) for semantic search via pgvector';
COMMENT ON COLUMN feedback.is_embedded IS 'Whether comment has been successfully embedded';
COMMENT ON COLUMN feedback.rating IS 'User rating (1-5 stars) for conversation quality';
