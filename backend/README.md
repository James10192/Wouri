# Wouri Bot Backend 🌾

**WhatsApp RAG Agriculture Bot pour la Côte d'Ivoire**

Stack: **Bun + Hono + TypeScript + Groq + Supabase**

**100% Déployable GRATUITEMENT** sur Render.com ou Railway.app

---

## 🎯 Stack Technique

| Composant | Technologie | Coût | Pourquoi? |
|-----------|-------------|------|-----------|
| **Runtime** | Bun 1.1+ | Gratuit | 4x plus rapide que Node.js, TypeScript natif |
| **Framework** | Hono 4.6+ | Gratuit | Ultra-léger (< 20KB), edge-ready, 3x plus rapide qu'Express |
| **Validation** | Zod | Gratuit | Type-safe schema validation |
| **LLM** | Groq API | **GRATUIT** | 300 tok/s (10x plus rapide que OpenAI), 14K req/jour |
| **Vector DB** | Supabase pgvector | **GRATUIT** | Extension PostgreSQL incluse dans Supabase free tier |
| **Database** | Supabase PostgreSQL | **GRATUIT** | 500MB DB, 1GB storage, 2GB bandwidth |
| **WhatsApp** | Meta Business API | Gratuit | Messages entrants illimités |

**Coût total: $0/mois** (phase test jusqu'à 10K messages/mois)

---

## 📁 Structure du Projet

```
backend/
├── src/
│   ├── index.ts              # Point d'entrée (serveur Hono)
│   ├── routes/
│   │   └── webhooks.ts       # Routes WhatsApp + FedaPay
│   ├── services/
│   │   ├── groq.ts           # Client Groq (LLM gratuit)
│   │   ├── supabase.ts       # Client Supabase + pgvector
│   │   └── whatsapp.ts       # Client WhatsApp Business API
│   ├── lib/
│   │   ├── config.ts         # Configuration (validation env vars)
│   │   └── rag.ts            # Pipeline RAG principal
│   └── types/
│       └── index.ts          # Types TypeScript + Zod schemas
├── package.json              # Dépendances Bun
├── tsconfig.json             # Configuration TypeScript
├── Dockerfile                # Build image Docker (Render/Railway)
├── render.yaml               # Configuration Render.com
└── .env.example              # Template variables d'environnement
```

---

## 🚀 Installation Locale

### Prérequis

- **Bun 1.1+** (installer: `curl -fsSL https://bun.sh/install | bash`)
- **Git**
- Comptes gratuits:
  - [Supabase](https://supabase.com) (database + pgvector)
  - [Groq](https://console.groq.com) (LLM API)
  - [Meta Developers](https://developers.facebook.com) (WhatsApp API)

### Setup

```bash
# 1. Cloner le repo
git clone https://github.com/yourusername/wouribot-backend.git
cd wouribot-backend

# 2. Installer les dépendances
bun install

# 3. Copier .env.example → .env
cp .env.example .env

# 4. Remplir les variables d'environnement
nano .env

# 5. Lancer le serveur dev
bun run dev

# ✅ Le serveur démarre sur http://localhost:3000
```

---

## 🔐 Configuration Variables d'Environnement

Créez un fichier `.env` avec les variables suivantes:

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase (FREE - https://supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Groq API (100% FREE - https://console.groq.com)
GROQ_API_KEY=gsk_...

# WhatsApp Business API (Meta)
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_APP_SECRET=abc123
WHATSAPP_VERIFY_TOKEN=your_custom_token

# FedaPay (Côte d'Ivoire payments)
FEDAPAY_SECRET_KEY=sk_sandbox_...
FEDAPAY_PUBLIC_KEY=pk_sandbox_...

# OpenWeatherMap (FREE - https://openweathermap.org)
OPENWEATHER_API_KEY=your_api_key
```

### Où obtenir les clés API?

#### 1. **Supabase** (Gratuit)

```bash
# 1. Créer compte sur https://supabase.com
# 2. Créer un nouveau projet
# 3. Aller dans Project Settings → API
# 4. Copier:
#    - URL: https://xxx.supabase.co
#    - anon/public key
#    - service_role key (secret!)
```

**Setup pgvector (vector database):**

```sql
-- Dans Supabase SQL Editor, exécuter:

-- 1. Activer extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Créer table documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768), -- Dimension pour sentence-transformers
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Index pour recherche vectorielle (HNSW = ultra-rapide!)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- 4. Fonction de recherche (appelée par le backend)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT,
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
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity,
    documents.metadata
  FROM documents
  WHERE
    1 - (documents.embedding <=> query_embedding) > match_threshold
    AND (filter = '{}'::JSONB OR documents.metadata @> filter)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

#### 2. **Groq API** (100% Gratuit)

```bash
# 1. Créer compte sur https://console.groq.com
# 2. Aller dans API Keys
# 3. Créer nouvelle clé → Copier (commence par gsk_...)

# Modèles disponibles:
# - llama-3.3-70b-versatile (recommandé pour RAG)
# - llama-3.1-8b-instant (ultra-rapide)
# - mixtral-8x7b-32768 (multilingue)

# Limites FREE:
# - 14,400 requêtes/jour
# - 6,000 requêtes/minute
# - 300+ tokens/seconde (ultra-rapide!)
```

#### 3. **WhatsApp Business API** (Meta)

```bash
# 1. Créer compte Meta Developers: https://developers.facebook.com
# 2. Créer une app → WhatsApp Business API
# 3. Configurer un numéro de test (gratuit)
# 4. Générer Access Token permanent
# 5. Configurer webhook:
#    - URL: https://your-backend.onrender.com/webhooks/whatsapp
#    - Verify Token: votre_token_custom
#    - Souscrire aux événements: messages
```

---

## 🚀 Déploiement GRATUIT

### Option 1: Render.com (RECOMMANDÉ)

**Avantages:**
- ✅ Free tier: 750h/mois (suffit pour 24/7!)
- ✅ Sleep après 15min inactivité (OK pour webhooks)
- ✅ Build Docker automatique
- ✅ Accepte cartes prépayées
- ✅ SSL gratuit
- ✅ Deploy depuis GitHub en 1 clic

**Limitations free tier:**
- ❌ Cold start: ~30-60s après sleep
- ❌ 512 MB RAM (OK pour Bun)
- ❌ Redémarre après 15min inactivité

**Deploy:**

```bash
# 1. Créer compte sur https://render.com

# 2. New → Web Service → Connect GitHub repo

# 3. Configurer:
#    - Name: wouribot-backend
#    - Runtime: Docker
#    - Branch: main
#    - Instance Type: Free
#    - Auto-Deploy: Yes

# 4. Variables d'environnement:
#    Dans Render Dashboard → Environment → Add
#    Copier toutes les variables de .env

# 5. Deploy! 🎉
#    URL: https://wouribot-backend.onrender.com
```

**Garder l'app éveillée (éviter cold start):**

```bash
# Option 1: Cron job externe (UptimeRobot - gratuit)
# Ping https://wouribot-backend.onrender.com/health chaque 10min

# Option 2: GitHub Actions (cron job)
# .github/workflows/keep-alive.yml
name: Keep Alive
on:
  schedule:
    - cron: '*/10 * * * *' # Chaque 10min
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl https://wouribot-backend.onrender.com/health
```

---

### Option 2: Railway.app

**Avantages:**
- ✅ $5 crédit gratuit/mois (suffit pour ~500h)
- ✅ **Pas de cold start** (instance toujours active)
- ✅ Build automatique depuis GitHub
- ✅ Accepte cartes prépayées

**Limitations:**
- ⚠️ $5/mois de crédit = ~$0.01/h × 500h max
- ⚠️ Après crédit épuisé: $5-10/mois payant

**Deploy:**

```bash
# 1. Installer Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Init project
railway init

# 4. Link GitHub repo
railway link

# 5. Add environment variables
railway variables set GROQ_API_KEY=gsk_...
railway variables set SUPABASE_URL=https://...
# ... etc

# 6. Deploy
railway up

# ✅ URL automatique: https://wouribot-backend.railway.app
```

---

### Option 3: Vercel Serverless Functions (Limité)

**⚠️ PAS RECOMMANDÉ** pour ce projet car:
- ❌ Timeout 10s (Hobby) / 60s (Pro) → RAG peut prendre 15-20s
- ❌ Cold start 1-3s
- ❌ Pas adapté pour webhooks temps réel

**Seulement si vous optimisez RAG à < 10s:**

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Variables d'environnement via dashboard
vercel env add GROQ_API_KEY
```

---

## 📊 Coûts Réels par Plateforme

| Plateforme | Free Tier | Coût réel (10K msg/mois) | Cold Start | Déploiement | Carte prépayée? |
|------------|-----------|---------------------------|------------|-------------|-----------------|
| **Render.com** | 750h/mois | **$0** | 30-60s | ⭐⭐⭐⭐⭐ | ✅ Oui |
| **Railway.app** | $5 crédit | **$5-10/mois** | 0s | ⭐⭐⭐⭐⭐ | ✅ Oui |
| **Vercel** | Hobby | **$0** (si < 10s) | 1-3s | ⭐⭐⭐⭐ | ✅ Oui |
| **Fly.io** | 3 VMs | **$0-5/mois** | 0s | ⭐⭐⭐ | ✅ Oui |

**Recommandation: Render.com** pour phase test (gratuit + simple).

---

## 🧪 Tests Locaux

```bash
# Tests unitaires (TODO: implémenter avec Bun:test)
bun test

# Linter
bun run lint

# Format code
bun run format

# Build production
bun run build

# Test webhook WhatsApp (avec ngrok)
# 1. Installer ngrok: https://ngrok.com
ngrok http 3000

# 2. URL publique: https://xxx.ngrok.io
# 3. Configurer webhook Meta avec cette URL
```

---

## 📚 API Endpoints

### GET `/`
Informations API
```json
{
  "status": "ok",
  "service": "Wouri Bot Backend",
  "version": "1.0.0",
  "stack": "Bun + Hono + TypeScript + Groq + Supabase"
}
```

### GET `/health`
Health check (pour monitoring)
```json
{
  "status": "healthy",
  "timestamp": "2025-01-09T10:00:00Z"
}
```

### GET `/webhooks/whatsapp`
Vérification webhook Meta (automatique)

### POST `/webhooks/whatsapp`
Recevoir messages WhatsApp (appelé par Meta)

### POST `/webhooks/fedapay`
Notifications paiement FedaPay

---

## 🐛 Troubleshooting

### Erreur: "Cannot find module '@/...'"

```bash
# Vérifier tsconfig.json paths configuration
# Relancer:
bun install
```

### Erreur: "Groq API key invalid"

```bash
# Vérifier la clé commence par gsk_
echo $GROQ_API_KEY

# Régénérer sur https://console.groq.com
```

### Erreur: "Supabase connection failed"

```bash
# Tester la connexion:
curl https://your-project.supabase.co/rest/v1/?apikey=YOUR_ANON_KEY

# Vérifier RLS policies désactivées pour tests
```

---

## 📖 Documentation Complète

- [CLAUDE.md](/CLAUDE.md) - Règles développement (mis à jour avec stack Bun)
- [BEST_PRACTICES.md](/docs/BEST_PRACTICES.md) - Best practices Bun + Hono
- [PRD_REFINED_v2.md](/PRD_REFINED_v2.md) - Product Requirements Document

---

## 📝 License

MIT

---

**Développé avec ❤️ pour les agriculteurs ivoiriens** 🇨🇮🌾
