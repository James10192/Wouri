# 🚀 Wouri Bot - Démarrage Rapide (Local)

**Temps estimé:** 15-20 minutes pour tout configurer

---

## ✅ Prérequis

- ✅ Bun installé: `bun --version` (vous avez v1.3.5 ✅)
- ✅ Dépendances installées: `bun install` ✅

---

## 📝 Étape 1: Configurer Groq API (LLM GRATUIT - 2 minutes)

**Groq = 100% GRATUIT** avec 14,400 requêtes/jour!

### Steps:

1. **Créer compte Groq:**
   ```bash
   # Ouvrir dans le navigateur:
   https://console.groq.com

   # Sign up avec Google/Email (gratuit)
   ```

2. **Créer clé API:**
   - Dashboard → **API Keys**
   - Click **Create API Key**
   - Nom: "Wouri Bot Dev"
   - Copier la clé (commence par `gsk_...`)

3. **Ajouter dans `.env`:**
   ```bash
   cd /home/levraimd/workspace/Wouribot/backend
   nano .env

   # Remplacer cette ligne:
   GROQ_API_KEY=gsk_your_groq_api_key_here

   # Par votre vraie clé:
   GROQ_API_KEY=gsk_abc123xyz...

   # Sauvegarder: Ctrl+O, Enter, Ctrl+X
   ```

4. **Tester Groq:**
   ```bash
   # Lancer le serveur:
   bun run dev

   # Dans un autre terminal:
   curl http://localhost:3000/test/groq

   # ✅ Vous devriez voir: "Bonjour! Je suis Wouri Bot..."
   ```

---

## 📝 Étape 2: Configurer Supabase (Database GRATUIT - 5 minutes)

**Supabase = PostgreSQL gratuit** avec 500MB storage!

### Steps:

1. **Créer compte Supabase:**
   ```bash
   # Ouvrir:
   https://supabase.com

   # Sign up (gratuit)
   ```

2. **Créer projet:**
   - Click **New Project**
   - Nom: `wouribot-dev`
   - Database Password: (choisir un mot de passe fort)
   - Region: **Europe West** (le plus proche de CI)
   - Click **Create new project** (⏱️ attendre 2 minutes)

3. **Copier les clés:**
   - Aller dans **Settings** → **API**
   - Copier:
     - **Project URL**: `https://xxx.supabase.co`
     - **anon/public key**: `eyJhbGc...` (long texte)

4. **Ajouter dans `.env`:**
   ```bash
   nano .env

   # Remplacer:
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Par vos vraies valeurs
   ```

5. **Setup pgvector (Vector DB):**
   - Dans Supabase Dashboard → **SQL Editor**
   - Click **New query**
   - Copier-coller ce script:

   ```sql
   -- 1. Activer extension pgvector
   CREATE EXTENSION IF NOT EXISTS vector;

   -- 2. Table users
   CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     wa_id TEXT UNIQUE NOT NULL,
     phone_number TEXT,
     preferred_language TEXT DEFAULT 'fr',
     region TEXT,
     subscription_status TEXT DEFAULT 'freemium',
     subscription_end_date TIMESTAMP,
     monthly_quota_used INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- 3. Table documents (pour RAG)
   CREATE TABLE IF NOT EXISTS documents (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     content TEXT NOT NULL,
     embedding VECTOR(768),
     metadata JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- 4. Index HNSW (ultra-rapide pour recherche vectorielle)
   CREATE INDEX IF NOT EXISTS documents_embedding_idx
   ON documents USING hnsw (embedding vector_cosine_ops);

   -- 5. Fonction de recherche vectorielle
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
       1 - (d.embedding <=> query_embedding) > match_threshold
       AND (filter = '{}'::JSONB OR d.metadata @> filter)
     ORDER BY similarity DESC
     LIMIT match_count;
   END;
   $$;

   -- 6. Insert test document (pour tester le RAG)
   INSERT INTO documents (content, embedding, metadata) VALUES
   ('Le maïs se plante en avril-mai en Côte d''Ivoire, au début de la saison des pluies. Les variétés recommandées sont le maïs jaune et le maïs blanc.',
    -- Mock embedding (768 dimensions de zéros pour test)
    ARRAY_FILL(0::float, ARRAY[768])::vector,
    '{"source": "Manuel Agriculture CI", "page": 12, "region": "Bouaké", "category": "plantation"}'::jsonb
   );
   ```

   - Click **Run** (⚡)
   - ✅ Vous devriez voir: "Success. No rows returned"

6. **Tester Supabase:**
   ```bash
   curl http://localhost:3000/test/supabase

   # ✅ Devrait retourner: "success": true
   ```

---

## 📝 Étape 3: Tester le RAG en Local (2 minutes)

Maintenant vous pouvez tester le système complet!

### Test 1: Groq seul

```bash
curl http://localhost:3000/test/groq

# ✅ Réponse attendue:
# {
#   "success": true,
#   "answer": "Bonjour! Je suis Wouri Bot, ton assistant agricole.",
#   "model": "llama-3.3-70b-versatile",
#   "tokens_used": 25
# }
```

### Test 2: RAG complet (Question → Recherche vectorielle → LLM)

```bash
curl -X POST http://localhost:3000/test/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Quand planter le maïs?",
    "region": "Bouaké",
    "language": "fr"
  }'

# ✅ Réponse attendue:
# {
#   "success": true,
#   "answer": "Selon le manuel d'agriculture, le maïs se plante en avril-mai en Côte d'Ivoire, au début de la saison des pluies. Les variétés recommandées sont le maïs jaune et blanc.",
#   "sources": [
#     {
#       "source": "Manuel Agriculture CI",
#       "page": 12,
#       "similarity": 0.85
#     }
#   ],
#   "metadata": {
#     "model": "llama-3.3-70b-versatile",
#     "tokens_used": 150,
#     "response_time_ms": 850
#   }
# }
```

### Test 3: Simple "Salut"

```bash
curl -X POST http://localhost:3000/test/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Salut",
    "region": "Abidjan"
  }'

# ✅ Devrait répondre un message de bienvenue
```

---

## 📝 Étape 4: Configurer OpenWeatherMap (Météo - Optionnel - 3 min)

**OpenWeatherMap = 1,000 appels/jour GRATUITS**

### Steps:

1. **Créer compte:**
   ```bash
   https://openweathermap.org/api

   # Sign up → Free plan
   ```

2. **Récupérer clé API:**
   - Dashboard → **API keys**
   - Copier la clé par défaut (ou créer nouvelle)
   - ⏱️ **Attendre 10 minutes** (activation de la clé)

3. **Ajouter dans `.env`:**
   ```bash
   nano .env

   # Remplacer:
   OPENWEATHER_API_KEY=your_openweather_api_key_here

   # Par votre vraie clé
   ```

4. **Tester:**
   ```bash
   curl "http://localhost:3000/test/weather?region=Abidjan"

   # ✅ Devrait retourner:
   # {
   #   "success": true,
   #   "region": "Abidjan",
   #   "weather": {
   #     "temperature": 28.5,
   #     "humidity": 85,
   #     "description": "nuageux"
   #   }
   # }
   ```

---

## 🎯 Résumé Commandes

```bash
# 1. Démarrer le serveur
cd /home/levraimd/workspace/Wouribot/backend
bun run dev

# 2. Tester Groq (LLM)
curl http://localhost:3000/test/groq

# 3. Tester Supabase (Database)
curl http://localhost:3000/test/supabase

# 4. Tester RAG complet
curl -X POST http://localhost:3000/test/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Quand planter le maïs?", "region": "Bouaké"}'

# 5. Tester météo (optionnel)
curl "http://localhost:3000/test/weather?region=Abidjan"
```

---

## 🐛 Troubleshooting

### Erreur: "GROQ_API_KEY not configured"

```bash
# Vérifier .env:
cat backend/.env | grep GROQ_API_KEY

# Si vide, ajouter votre clé Groq (voir Étape 1)
```

### Erreur: "Supabase connection error"

```bash
# Vérifier .env:
cat backend/.env | grep SUPABASE

# Vérifier que les valeurs sont correctes (pas de "your-project")
```

### Erreur: "pgvector function not found"

```bash
# Retourner sur Supabase SQL Editor
# Ré-exécuter le script pgvector de l'Étape 2, section 5
```

### Port 3000 déjà utilisé

```bash
# Modifier le port dans .env:
PORT=3001

# Relancer:
bun run dev
```

---

## ✅ Checklist Configuration

- [ ] Bun installé (v1.3.5+) ✅
- [ ] Dépendances installées (`bun install`) ✅
- [ ] Groq API configuré (étape 1)
- [ ] Supabase configuré (étape 2)
- [ ] pgvector setupé (étape 2.5)
- [ ] Test document inséré (étape 2.6)
- [ ] Tests passent:
  - [ ] `/test/groq` → success
  - [ ] `/test/supabase` → success
  - [ ] `/test/chat` → success
- [ ] OpenWeatherMap configuré (étape 4 - optionnel)

---

## 🚀 Prochaines Étapes

Une fois que tout fonctionne en local:

1. **Ajouter plus de documents** dans Supabase (données agriculture réelles)
2. **Configurer WhatsApp API** pour tester les webhooks
3. **Déployer sur Render.com** (gratuit!)
4. **Ajouter audio STT/TTS** (Groq Whisper)

---

**Questions? Consultez:**
- [backend/README.md](./README.md) - Documentation complète
- [CLAUDE.md](../CLAUDE.md) - Règles développement

**Bon dev!** 🌾🇨🇮
