# 🚀 Guide Setup Complet - Wouri Bot

**Temps estimé: 10 minutes**

Votre projet Supabase: **wouribot-dev**
Mot de passe DB: `9wUj2ozHqHKKf05C` ✅

---

## ✅ Checklist Rapide

- [ ] Récupérer les clés Supabase (étape 1)
- [ ] Mettre à jour `.env` (étape 2)
- [ ] Exécuter la migration SQL (étape 3)
- [ ] Tester la connexion (étape 4)

---

## Étape 1: Récupérer les Clés Supabase (5 min)

### A. Ouvrir le Dashboard

```bash
# Ouvrir dans le navigateur:
https://supabase.com/dashboard/project/wouribot-dev/settings/api
```

### B. Copier ces 4 valeurs:

**1. Project URL**
```
https://xxxxxxxxx.supabase.co
```

**2. Anon Key** (commence par `eyJ...`)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

**3. Service Role Key** (commence par `eyJ...`)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

**4. Database Connection String** (aller dans Settings → Database)
```bash
# Ouvrir:
https://supabase.com/dashboard/project/wouribot-dev/settings/database

# Copier "Connection string" → URI (Session Mode - port 6543)
postgresql://postgres.xxx:9wUj2ozHqHKKf05C@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**Format complet des URLs:**
```bash
# DATABASE_URL (port 6543 = pooled, pour app runtime)
DATABASE_URL="postgresql://postgres.[project-ref]:9wUj2ozHqHKKf05C@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# DIRECT_URL (port 5432 = direct, pour migrations)
DIRECT_URL="postgresql://postgres.[project-ref]:9wUj2ozHqHKKf05C@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

---

## Étape 2: Mettre à Jour .env (2 min)

```bash
cd /home/levraimd/workspace/Wouribot/backend
nano .env
```

Remplacer ces lignes:

```env
# AVANT (placeholder):
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# APRÈS (vos vraies valeurs - copiées depuis étape 1):
SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M... (votre vraie clé)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M... (votre vraie clé)

# Ajouter aussi ces 2 lignes (pour Prisma):
DATABASE_URL="postgresql://postgres.xxx:9wUj2ozHqHKKf05C@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:9wUj2ozHqHKKf05C@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

**⚠️ IMPORTANT**: Remplacez `xxx` dans les URLs par votre vrai project-ref!

**Sauvegarder**: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## Étape 3: Exécuter la Migration SQL (3 min)

### Option A: Via Supabase SQL Editor (Recommandé)

```bash
# 1. Ouvrir SQL Editor:
https://supabase.com/dashboard/project/wouribot-dev/sql

# 2. Click "New query"

# 3. Copier le contenu de:
cat prisma/migrations/00_init_pgvector/migration.sql

# 4. Coller dans l'éditeur SQL

# 5. Click "Run" (ou Ctrl+Enter)

# 6. Vérifier: "Success. No rows returned" ✅
```

**Ce que fait cette migration:**
- ✅ Active l'extension pgvector
- ✅ Crée les tables: users, documents, conversations
- ✅ Crée les index HNSW (vector search ultra-rapide)
- ✅ Crée les fonctions: match_documents(), increment_quota()
- ✅ Insère 3 documents de test (maïs, cacao, manioc)
- ✅ Insère 1 utilisateur de test

### Option B: Via Prisma (si connexion directe)

```bash
# Générer le client Prisma
bunx prisma generate

# Appliquer les migrations
bunx prisma db push
```

---

## Étape 4: Tester la Connexion (1 min)

```bash
# 1. Démarrer le serveur
cd /home/levraimd/workspace/Wouribot/backend
bun run dev

# ✅ Vous devriez voir:
# "🌾 Wouri Bot Backend 🌾"
# "Port: 4456"

# 2. Dans un autre terminal, tester:

# Test Supabase connection
curl http://localhost:4456/test/supabase

# ✅ Devrait retourner:
# {"success":true,"message":"Supabase connection works!"}

# Test RAG avec question agriculture
curl -X POST http://localhost:4456/test/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Quand planter le maïs?","region":"Bouaké"}'

# ✅ Devrait retourner une réponse sur la plantation du maïs!
```

---

## 🎯 Résumé des Fichiers Créés

```
backend/
├── prisma/
│   ├── schema.prisma                       ✅ Schéma Prisma avec pgvector
│   └── migrations/
│       └── 00_init_pgvector/
│           └── migration.sql               ✅ Migration complète
├── SUPABASE_SETUP.md                       ✅ Guide récupération clés
├── SETUP_GUIDE.md                          ✅ Ce fichier
├── setup-supabase.sh                       ✅ Script automatique
└── .env                                    ⚠️  À remplir avec vos clés
```

---

## 🐛 Troubleshooting

### Erreur: "Unable to connect. Is the computer able to access the url?"

**Cause**: `SUPABASE_URL` ou `SUPABASE_ANON_KEY` incorrect dans `.env`

**Solution**:
```bash
# Vérifier .env:
grep SUPABASE backend/.env

# Vérifier que les valeurs ne sont PAS "your-project.supabase.co"
# Si c'est le cas, retourner à l'Étape 1 pour récupérer les vraies valeurs
```

### Erreur: "relation 'documents' does not exist"

**Cause**: Migration SQL pas exécutée

**Solution**:
```bash
# Retourner à l'Étape 3
# Ouvrir Supabase SQL Editor
# Exécuter le contenu de: prisma/migrations/00_init_pgvector/migration.sql
```

### Erreur: "extension 'vector' does not exist"

**Cause**: Extension pgvector pas activée

**Solution**:
```bash
# Dans Supabase SQL Editor, exécuter:
CREATE EXTENSION IF NOT EXISTS vector;

# Puis ré-exécuter la migration complète
```

### Test: Vérifier que tout est bien configuré

```bash
# Dans Supabase SQL Editor:

-- 1. Vérifier pgvector:
SELECT * FROM pg_extension WHERE extname = 'vector';
-- ✅ Devrait retourner 1 ligne

-- 2. Vérifier les tables:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- ✅ Devrait lister: users, documents, conversations

-- 3. Vérifier les documents de test:
SELECT content, metadata FROM documents;
-- ✅ Devrait retourner 3 documents (maïs, cacao, manioc)

-- 4. Tester la fonction vector search:
SELECT * FROM match_documents(
  ARRAY_FILL(0::float, ARRAY[768])::VECTOR(768),
  0.5,
  3
);
-- ✅ Devrait retourner 3 documents avec similarity ~1.0
```

---

## ✅ Checklist Finale

Une fois toutes les étapes terminées:

- [ ] `.env` rempli avec vraies valeurs Supabase ✅
- [ ] Migration SQL exécutée dans Supabase ✅
- [ ] `curl http://localhost:4456/test/supabase` → success ✅
- [ ] `curl http://localhost:4456/test/chat` → réponse RAG ✅
- [ ] Extension pgvector active ✅
- [ ] 3 documents de test insérés ✅

---

**🎉 Setup Terminé!**

Vous pouvez maintenant tester le RAG complet:

```bash
# Question agriculture:
curl -X POST http://localhost:4456/test/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Quand planter le maïs?","region":"Bouaké"}'

# Simple salut:
curl -X POST http://localhost:4456/test/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Salut","region":"Abidjan"}'
```

**Prochaines étapes:**
1. Ajouter de vrais documents agricoles (avec embeddings réels)
2. Configurer WhatsApp Business API
3. Tester l'audio STT/TTS
4. Déployer sur Render.com

**Besoin d'aide?** Consultez:
- `backend/QUICKSTART.md` - Guide complet
- `backend/README.md` - Documentation
- `CLAUDE.md` - Règles développement
