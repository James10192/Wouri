-- Wouri Bot - Initial Migration with pgvector
-- Created: 2026-01-09

-- ============================================================================
-- Enable pgvector extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  preferred_language TEXT DEFAULT 'fr' NOT NULL,
  region TEXT,
  subscription_status TEXT DEFAULT 'freemium' NOT NULL,
  subscription_end_date TIMESTAMP,
  monthly_quota_used INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index on wa_id for fast lookups
CREATE INDEX IF NOT EXISTS users_wa_id_idx ON users(wa_id);

-- ============================================================================
-- Documents Table (RAG Knowledge Base)
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768), -- pgvector: 768 dimensions for sentence-transformers
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- HNSW index for ultra-fast vector similarity search
-- Uses cosine distance (<=>)
CREATE INDEX IF NOT EXISTS documents_embedding_idx
ON documents USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- Conversations Table (WhatsApp Messages History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT NOT NULL,
  message_id TEXT UNIQUE NOT NULL,
  message_type TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT,
  language TEXT DEFAULT 'fr' NOT NULL,
  region TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index on wa_id for user conversation history
CREATE INDEX IF NOT EXISTS conversations_wa_id_idx ON conversations(wa_id);

-- Index on message_id for deduplication
CREATE INDEX IF NOT EXISTS conversations_message_id_idx ON conversations(message_id);

-- ============================================================================
-- Vector Search Function (appelée par le backend)
-- ============================================================================

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.metadata
  FROM documents d
  WHERE
    d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
    AND (filter = '{}'::JSONB OR d.metadata @> filter)
  ORDER BY d.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Helper Function: Increment User Quota
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_quota(user_wa_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET monthly_quota_used = monthly_quota_used + 1,
      updated_at = NOW()
  WHERE wa_id = user_wa_id;
END;
$$;

-- ============================================================================
-- Seed Data: Test Document (pour tester le RAG)
-- ============================================================================

INSERT INTO documents (content, embedding, metadata) VALUES
(
  'Le maïs se plante en avril-mai en Côte d''Ivoire, au début de la saison des pluies. Les variétés recommandées sont le maïs jaune et le maïs blanc. La récolte se fait 3-4 mois après la plantation.',
  -- Mock embedding (768 zéros pour test - remplacer par vrai embedding en production)
  ARRAY_FILL(0::float, ARRAY[768])::VECTOR(768),
  '{"source": "Manuel Agriculture CI", "page": 12, "region": "Bouaké", "category": "plantation", "crop": "maïs"}'::JSONB
),
(
  'Le cacao se plante pendant la saison des pluies en Côte d''Ivoire. Les cacaoyers nécessitent de l''ombre et un sol riche. La production commence 3-4 ans après plantation.',
  ARRAY_FILL(0::float, ARRAY[768])::VECTOR(768),
  '{"source": "Guide Cacao CI", "page": 8, "region": "San Pedro", "category": "plantation", "crop": "cacao"}'::JSONB
),
(
  'Le manioc est une culture vivrière importante. Il se plante toute l''année mais préférablement en début de saison des pluies. Récolte après 8-12 mois.',
  ARRAY_FILL(0::float, ARRAY[768])::VECTOR(768),
  '{"source": "Manuel Agriculture CI", "page": 45, "region": "Abidjan", "category": "plantation", "crop": "manioc"}'::JSONB
);

-- ============================================================================
-- Seed Data: Test User
-- ============================================================================

INSERT INTO users (wa_id, phone_number, preferred_language, region) VALUES
('2250123456789', '+2250123456789', 'fr', 'Abidjan');

-- ============================================================================
-- Verification Queries (pour debug)
-- ============================================================================

-- Vérifier que pgvector est activé:
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Vérifier les tables créées:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Vérifier les index HNSW:
-- SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE '%embedding%';

-- Tester la fonction match_documents (avec embedding de zéros):
-- SELECT * FROM match_documents(ARRAY_FILL(0::float, ARRAY[768])::VECTOR(768), 0.5, 3);
