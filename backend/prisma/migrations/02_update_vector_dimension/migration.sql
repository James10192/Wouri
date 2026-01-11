-- Migration: Update vector dimensions from 768 to 384
-- Reason: Using Hugging Face all-MiniLM-L6-v2 (384 dims) instead of 768
-- Date: 2026-01-11

-- Table documents: Change embedding dimension from VECTOR(768) to VECTOR(384)
DO $$
BEGIN
  -- Drop existing index if exists
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'documents_embedding_idx') THEN
    DROP INDEX documents_embedding_idx;
  END IF;

  -- Alter column type (this will clear existing data in the column)
  ALTER TABLE documents ALTER COLUMN embedding TYPE VECTOR(384);

  -- Recreate HNSW index for fast similarity search
  CREATE INDEX documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops);
END $$;

-- Table feedback: Change embedding dimension from VECTOR(768) to VECTOR(384)
DO $$
BEGIN
  -- Drop existing index if exists
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'feedback_embedding_idx') THEN
    DROP INDEX feedback_embedding_idx;
  END IF;

  -- Alter column type (this will clear existing data in the column)
  ALTER TABLE feedback ALTER COLUMN embedding TYPE VECTOR(384);

  -- Recreate index
  CREATE INDEX feedback_embedding_idx ON feedback USING hnsw (embedding vector_cosine_ops);
END $$;

-- Note: Existing embeddings will be lost. Re-run embedding generation for existing documents.
