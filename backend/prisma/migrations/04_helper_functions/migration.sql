-- Migration: Add database helper functions
-- Date: 2026-01-10
-- Purpose: SQL utility functions for admin dashboard

-- ============================================================================
-- Function: update_conversation_feedback_stats
-- Purpose: Update conversation feedback count and average rating
-- ============================================================================
CREATE OR REPLACE FUNCTION update_conversation_feedback_stats(conv_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  total_feedback INTEGER;
BEGIN
  -- Calculate average rating and total feedback count
  SELECT
    ROUND(AVG(rating), 2),
    COUNT(*)
  INTO avg_rating, total_feedback
  FROM feedback
  WHERE conversation_id = conv_id
    AND rating IS NOT NULL;

  -- Update conversation table with new stats
  UPDATE conversations
  SET
    feedback_count = total_feedback,
    average_rating = avg_rating,
    updated_at = NOW()
  WHERE id = conv_id;
END;
$$;

COMMENT ON FUNCTION update_conversation_feedback_stats IS 'Updates feedback count and average rating for a conversation';

-- ============================================================================
-- Function: get_pending_embeddings
-- Purpose: Get feedback comments that need embeddings (batch processing)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_embeddings(batch_size INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  comment TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.comment
  FROM feedback f
  WHERE f.comment IS NOT NULL
    AND f.is_embedded = FALSE
  ORDER BY f.created_at ASC
  LIMIT batch_size;
END;
$$;

COMMENT ON FUNCTION get_pending_embeddings IS 'Returns feedback comments that need to be embedded (for batch processing)';

-- ============================================================================
-- Function: mark_feedback_as_embedded
-- Purpose: Mark feedback as embedded and store the embedding vector
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_feedback_as_embedded(
  feedback_id UUID,
  embedding_vector VECTOR(768)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE feedback
  SET
    embedding = embedding_vector,
    is_embedded = TRUE,
    updated_at = NOW()
  WHERE id = feedback_id;
END;
$$;

COMMENT ON FUNCTION mark_feedback_as_embedded IS 'Updates feedback with embedding vector and marks as embedded';

-- ============================================================================
-- Function: search_translations
-- Purpose: Search translations with full-text search and fuzzy matching
-- ============================================================================
CREATE OR REPLACE FUNCTION search_translations(
  search_query TEXT,
  source_lang TEXT DEFAULT NULL,
  target_lang TEXT DEFAULT NULL,
  verified_only BOOLEAN DEFAULT FALSE,
  max_results INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  source_text TEXT,
  source_language TEXT,
  target_language TEXT,
  translated_text TEXT,
  context TEXT,
  verified BOOLEAN,
  relevance REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.source_text,
    t.source_language,
    t.target_language,
    t.translated_text,
    t.context,
    t.verified,
    ts_rank(to_tsvector('french', t.source_text), plainto_tsquery('french', search_query)) AS relevance
  FROM translations t
  WHERE
    to_tsvector('french', t.source_text) @@ plainto_tsquery('french', search_query)
    AND (source_lang IS NULL OR t.source_language = source_lang)
    AND (target_lang IS NULL OR t.target_language = target_lang)
    AND (verified_only = FALSE OR t.verified = TRUE)
  ORDER BY relevance DESC
  LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION search_translations IS 'Full-text search for translations with optional language and verification filters';

-- ============================================================================
-- Function: get_translation_stats
-- Purpose: Get translation statistics for admin dashboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_translation_stats()
RETURNS TABLE (
  source_language TEXT,
  target_language TEXT,
  total_translations BIGINT,
  verified_count BIGINT,
  verification_rate DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.source_language,
    t.target_language,
    COUNT(*) AS total_translations,
    SUM(CASE WHEN t.verified THEN 1 ELSE 0 END) AS verified_count,
    ROUND(
      (SUM(CASE WHEN t.verified THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100,
      2
    ) AS verification_rate
  FROM translations t
  GROUP BY t.source_language, t.target_language
  ORDER BY total_translations DESC;
END;
$$;

COMMENT ON FUNCTION get_translation_stats IS 'Returns translation statistics by language pair';

-- ============================================================================
-- Function: get_feedback_stats
-- Purpose: Get feedback statistics for admin dashboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_feedback_stats(
  start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
  total_feedback BIGINT,
  total_with_rating BIGINT,
  total_with_comment BIGINT,
  total_embedded BIGINT,
  avg_rating DECIMAL(3,2),
  rating_distribution JSON
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_feedback,
    SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) AS total_with_rating,
    SUM(CASE WHEN comment IS NOT NULL THEN 1 ELSE 0 END) AS total_with_comment,
    SUM(CASE WHEN is_embedded THEN 1 ELSE 0 END) AS total_embedded,
    ROUND(AVG(rating), 2) AS avg_rating,
    (
      SELECT json_object_agg(rating_val, rating_count)
      FROM (
        SELECT rating AS rating_val, COUNT(*) AS rating_count
        FROM feedback
        WHERE rating IS NOT NULL
          AND created_at BETWEEN start_date AND end_date
        GROUP BY rating
        ORDER BY rating
      ) rating_agg
    ) AS rating_distribution
  FROM feedback
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$;

COMMENT ON FUNCTION get_feedback_stats IS 'Returns comprehensive feedback statistics for a date range';
