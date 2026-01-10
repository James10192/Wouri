-- Migration: Add translations table for multilingual support
-- Date: 2026-01-10
-- Purpose: Store translations for FR, Dioula, Baoulé languages

-- Create translations table
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  source_language TEXT NOT NULL CHECK (source_language IN ('fr', 'dioula', 'baoulé', 'en')),
  target_language TEXT NOT NULL CHECK (target_language IN ('fr', 'dioula', 'baoulé', 'en')),
  translated_text TEXT NOT NULL,
  context TEXT, -- Agricultural context (e.g., "plantation", "harvest", "disease")
  verified BOOLEAN DEFAULT FALSE, -- Admin verified translation
  created_by TEXT, -- Admin user ID/name
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Ensure uniqueness for source_text + language pair
  CONSTRAINT unique_translation UNIQUE (source_text, source_language, target_language)
);

-- Index for fast translation lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS translations_lookup_idx
ON translations(source_language, target_language);

-- Full-text search index for source_text (using French text search config)
CREATE INDEX IF NOT EXISTS translations_source_text_idx
ON translations USING GIN (to_tsvector('french', source_text));

-- Index for verified translations only
CREATE INDEX IF NOT EXISTS translations_verified_idx
ON translations(verified) WHERE verified = TRUE;

-- Index for context-based filtering
CREATE INDEX IF NOT EXISTS translations_context_idx
ON translations(context) WHERE context IS NOT NULL;

-- Index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS translations_created_at_idx ON translations(created_at DESC);

-- Comment the table and columns
COMMENT ON TABLE translations IS 'Multilingual translation database for FR, Dioula, Baoulé languages';
COMMENT ON COLUMN translations.source_language IS 'ISO 639-1 language code (fr, dioula, baoulé, en)';
COMMENT ON COLUMN translations.target_language IS 'ISO 639-1 language code (fr, dioula, baoulé, en)';
COMMENT ON COLUMN translations.context IS 'Agricultural context for better translation accuracy';
COMMENT ON COLUMN translations.verified IS 'Admin-verified translation (higher quality)';
COMMENT ON CONSTRAINT unique_translation ON translations IS 'Prevents duplicate translations for same source + language pair';
