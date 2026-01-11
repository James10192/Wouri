-- Admin tables for dashboard and feedback loop

CREATE EXTENSION IF NOT EXISTS vector;

-- Table conversations: Ajouter colonnes manquantes si elle existe déjà
-- (la table existe déjà avec colonnes basiques)
DO $$
BEGIN
  -- Ajouter colonnes analytics si elles n'existent pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='feedback_count') THEN
    ALTER TABLE conversations ADD COLUMN feedback_count INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='average_rating') THEN
    ALTER TABLE conversations ADD COLUMN average_rating NUMERIC(3,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='model_used') THEN
    ALTER TABLE conversations ADD COLUMN model_used TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='tokens_used') THEN
    ALTER TABLE conversations ADD COLUMN tokens_used INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='response_time_ms') THEN
    ALTER TABLE conversations ADD COLUMN response_time_ms INT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  wa_id TEXT NOT NULL,
  rating INT,
  comment TEXT,
  embedding VECTOR(768),
  is_embedded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_wa_id_idx ON feedback(wa_id);
CREATE INDEX IF NOT EXISTS feedback_conversation_id_idx ON feedback(conversation_id);

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  context TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_translation
ON translations(source_text, source_language, target_language);

CREATE INDEX IF NOT EXISTS translations_lang_idx
ON translations(source_language, target_language);
