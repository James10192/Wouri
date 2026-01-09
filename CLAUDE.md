# Wouri Bot - Documentation Développement

**Version**: 2.0 (Stack Bun + Hono)
**Dernière mise à jour**: 9 Janvier 2026
**Stack**: Bun + Hono + TypeScript + Groq + Supabase (pgvector)

---

## 📖 Contexte du Projet

### Vision

**Wouri Bot** est le premier assistant agricole WhatsApp multilingue pour la Côte d'Ivoire, utilisant RAG (Retrieval Augmented Generation) pour fournir des conseils agricoles validés par le Ministère de l'Agriculture CI.

**Proposition de valeur unique**:
> Accessible par audio/texte/photos pour agriculteurs illettrés ou lettrés, en Français, Dioula et Baoulé, avec données climatiques temps réel.

**Problème résolu**:
Les agriculteurs ivoiriens ont des difficultés à accéder à des informations techniques fiables sur les périodes de plantation, maladies des cultures et pratiques agricoles adaptées à leur région, avec des barrières d'illettrisme et de langue.

### Architecture Globale (100% GRATUITE!)

```
┌─────────────┐
│  WhatsApp   │ (Interface utilisateur)
│   Business  │
│     API     │
└──────┬──────┘
       │ Webhook HTTP POST
       ▼
┌────────────────────────────────────────────────────────────┐
│        Backend (Render.com - GRATUIT)                      │
│        Stack: Bun + Hono + TypeScript                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WhatsApp Webhook Handler                            │  │
│  │  - Vérification signature                            │  │
│  │  - Quota check (20 msg/mois freemium)                │  │
│  └───────────┬──────────────────────────────────────────┘  │
│              ▼                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       RAG Pipeline                                    │  │
│  │  1. User question → embedding                         │  │
│  │  2. Vector search (Supabase pgvector) - GRATUIT!     │  │
│  │  3. Context retrieval (top 5 docs)                    │  │
│  │  4. LLM generation (Groq API) - GRATUIT!             │  │
│  └───────────┬──────────────────────────────────────────┘  │
│              ▼                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Send Response via WhatsApp API                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Supabase   │     │   Groq API   │     │   FedaPay    │
│  PostgreSQL  │     │  (LLM FREE)  │     │   Payment    │
│  + pgvector  │     │  14K req/day │     │              │
│  (GRATUIT)   │     │  (GRATUIT!)  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 🎯 Stack Technique (100% GRATUITE!)

| Composant | Technologie | Coût | Pourquoi? |
|-----------|-------------|------|-----------|
| **Runtime** | Bun 1.1+ | $0 | 4x plus rapide que Node.js, TypeScript natif, moins de RAM |
| **Backend Framework** | Hono 4.6+ | $0 | Ultra-léger (< 20KB), 3x plus rapide qu'Express |
| **Validation** | Zod | $0 | Type-safe runtime validation |
| **LLM** | Groq API | **$0** | 300 tok/s (10x OpenAI!), 14,400 req/jour FREE |
| **Vector DB** | Supabase pgvector | **$0** | Extension PostgreSQL gratuite |
| **Database** | Supabase | $0 | 500MB DB, 1GB storage, 2GB bandwidth |
| **Hosting Backend** | Render.com | $0 | 750h/mois = 24/7 gratuit (avec sleep 15min) |
| **Hosting Frontend** | Vercel | $0 | Next.js 16, 100GB bandwidth |
| **WhatsApp API** | Meta | $0 | Messages entrants illimités |

**Coût total: $0/mois** 🎉 (jusqu'à 10,000 messages/mois)

---

## 🎯 Règles de Développement Strictes

### 1. Standards de Code TypeScript (Strict Mode)

```typescript
// ✅ TOUJOURS utiliser types stricts
import { z } from "zod";

// Zod schemas pour validation runtime
const userSchema = z.object({
  wa_id: z.string().min(10),
  phone_number: z.string().regex(/^\+\d{10,15}$/),
  preferred_language: z.enum(["fr", "dioula", "baoulé"]),
});

type User = z.infer<typeof userSchema>;

// ✅ Async functions pour I/O
async function getUserByWaId(wa_id: string): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("wa_id", wa_id)
    .single();

  return data ? userSchema.parse(data) : null;
}

// ❌ JAMAIS de types any
function bad(data: any) { // ❌ Interdit!
  return data.whatever;
}
```

#### Conventions Nommage

```typescript
// Files: kebab-case
// whatsapp-webhook.ts, rag-pipeline.ts

// Types/Interfaces: PascalCase
interface WhatsAppMessage {
  wa_id: string;
  message: string;
}

// Functions/variables: camelCase
async function getUserByWaId(waId: string) {
  const userData = await fetchUser(waId);
  return userData;
}

// Constants: UPPER_SNAKE_CASE
const MAX_FREEMIUM_QUOTA = 20;
const GROQ_MODEL = "llama-3.3-70b-versatile";
```

### 2. Structure Fichiers Backend (Bun + Hono)

```
backend/
├── src/
│   ├── index.ts           # Entry point (Hono app)
│   ├── routes/
│   │   └── webhooks.ts    # WhatsApp + FedaPay routes
│   ├── services/
│   │   ├── groq.ts        # Groq LLM client (FREE!)
│   │   ├── supabase.ts    # Supabase + pgvector
│   │   └── whatsapp.ts    # WhatsApp Business API
│   ├── lib/
│   │   ├── config.ts      # Env vars validation (Zod)
│   │   └── rag.ts         # RAG pipeline
│   └── types/
│       └── index.ts       # Zod schemas + TypeScript types
├── package.json           # Bun dependencies
├── tsconfig.json          # TypeScript strict config
├── Dockerfile             # Docker build (Render/Railway)
└── README.md              # Documentation déploiement
```

---

### 3. Validation Variables d'Environnement (Zod)

```typescript
// src/lib/config.ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]),

  // Supabase (FREE)
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),

  // Groq API (100% FREE)
  GROQ_API_KEY: z.string().startsWith("gsk_"),

  // WhatsApp
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Environment validation failed:", error);
    process.exit(1);
  }
}

export const config = loadConfig();
```

**Avantage**: Si une variable manque, l'app crash au démarrage (fail-fast).

---

### 4. Base de Données (Supabase + pgvector)

#### Setup pgvector (Vector DB GRATUIT!)

```sql
-- Dans Supabase SQL Editor:

-- 1. Activer extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Table documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(768), -- sentence-transformers dimension
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Index HNSW (ultra-rapide!)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- 4. Fonction de recherche
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
```

#### Utilisation depuis TypeScript

```typescript
// src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

// Recherche vectorielle
export async function searchSimilarDocuments(
  embedding: number[],
  region?: string
) {
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5,
    filter: region ? { region } : {},
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);
  return data || [];
}
```

---

### 5. LLM avec Groq (100% GRATUIT + Ultra-rapide!)

```typescript
// src/services/groq.ts
import Groq from "groq-sdk";
import { config } from "@/lib/config";

export const groq = new Groq({
  apiKey: config.GROQ_API_KEY,
});

// Modèles disponibles (tous GRATUITS!)
export const GROQ_MODELS = {
  LLAMA_70B: "llama-3.3-70b-versatile", // Recommandé pour RAG
  LLAMA_8B: "llama-3.1-8b-instant",     // Ultra-rapide
  MIXTRAL: "mixtral-8x7b-32768",        // Multilingue
};

// Génération RAG
export async function generateRAGResponse(
  question: string,
  context: string,
  userRegion: string,
  language: string = "fr"
) {
  const systemPrompt = `Tu es un conseiller agricole pour la Côte d'Ivoire.
Réponds UNIQUEMENT avec les documents fournis.
Si pas dans les documents, dis: "Je ne trouve pas cette information."
Sois concis (max 150 mots).`;

  const userPrompt = `CONTEXTE:\n${context}\n\nRÉGION: ${userRegion}\n\nQUESTION: ${question}`;

  const response = await groq.chat.completions.create({
    model: GROQ_MODELS.LLAMA_70B,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3, // Factuel, pas créatif
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content || "Erreur génération.";
}
```

**Limites Groq FREE:**
- 14,400 requêtes/jour = 600 req/heure = 10 req/minute
- 6,000 requêtes/minute (burst)
- **300+ tokens/seconde** (10x plus rapide qu'OpenAI!)

---

### 6. RAG Pipeline Complet

```typescript
// src/lib/rag.ts
import { generateRAGResponse } from "@/services/groq";
import { searchSimilarDocuments, getTextEmbedding } from "@/services/supabase";

export async function ragPipeline(
  question: string,
  userRegion: string,
  language: string = "fr"
) {
  // 1. Embedding de la question
  const embedding = await getTextEmbedding(question);

  // 2. Recherche vectorielle (pgvector)
  const docs = await searchSimilarDocuments(embedding, userRegion);

  // 3. Vérifier similarité minimale
  if (docs.length === 0 || docs[0].similarity < 0.7) {
    return {
      answer: "Je ne trouve pas cette information dans mes sources officielles.",
      sources: [],
    };
  }

  // 4. Construire contexte
  const context = docs
    .map((doc, i) => `[Doc ${i + 1}]\n${doc.content}\n---`)
    .join("\n");

  // 5. Génération LLM (Groq - GRATUIT!)
  const answer = await generateRAGResponse(question, context, userRegion, language);

  return {
    answer,
    sources: docs.map((d) => ({
      source: d.metadata.source,
      page: d.metadata.page,
      similarity: d.similarity,
    })),
  };
}
```

---

### 7. Webhook WhatsApp

```typescript
// src/routes/webhooks.ts
import { Hono } from "hono";
import { ragPipeline } from "@/lib/rag";
import { sendWhatsAppMessage } from "@/services/whatsapp";
import { getUserByWaId, checkUserQuota, incrementUserQuota } from "@/services/supabase";

const webhooks = new Hono();

webhooks.post("/whatsapp", async (c) => {
  const payload = await c.req.json();

  // Traiter en background (retourner 200 immédiatement pour Meta)
  c.executionCtx.waitUntil(processMessage(payload));

  return c.json({ status: "received" });
});

async function processMessage(payload: any) {
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  const from = message.from;
  const text = message.text?.body;

  // Récupérer utilisateur
  let user = await getUserByWaId(from);
  if (!user) {
    user = await createUser(from, `+${from}`);
  }

  // Vérifier quota (20 msg/mois freemium)
  if (!(await checkUserQuota(user))) {
    await sendWhatsAppMessage(
      `+${from}`,
      "🌾 Quota épuisé (20/mois). Abonnez-vous pour 500 FCFA/mois!"
    );
    return;
  }

  // Incrémenter quota
  await incrementUserQuota(from);

  // RAG pipeline
  const response = await ragPipeline(text, user.region || "Côte d'Ivoire", user.preferred_language);

  // Envoyer réponse
  await sendWhatsAppMessage(`+${from}`, response.answer);
}
```

---

## 🚀 Déploiement GRATUIT sur Render.com

### Prérequis
- Compte Render.com (gratuit, accepte cartes prépayées)
- Repo GitHub avec le code

### Steps

```bash
# 1. Push code sur GitHub
git push origin main

# 2. Sur Render.com:
#    - New → Web Service
#    - Connect GitHub repo
#    - Runtime: Docker
#    - Instance Type: Free
#    - Auto-Deploy: Yes

# 3. Variables d'environnement (Render Dashboard):
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
GROQ_API_KEY=gsk_...
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
# ... etc

# 4. Deploy! 🎉
# URL: https://wouribot-backend.onrender.com
```

**Garder l'app éveillée (éviter cold start):**

```yaml
# .github/workflows/keep-alive.yml
name: Keep Alive
on:
  schedule:
    - cron: '*/10 * * * *' # Ping chaque 10min
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl https://wouribot-backend.onrender.com/health
```

---

## 🔄 Règles de Commit Git

**Suivre [Conventional Commits](https://www.conventionalcommits.org/)**

```bash
# ✅ GOOD
feat(rag): add Groq API integration with pgvector search
fix(webhook): verify Meta signature before processing
refactor(supabase): extract pgvector client to separate service

# ❌ BAD
updated stuff
fix
WIP
```

**Types autorisés:**
- `feat` → Nouvelle fonctionnalité
- `fix` → Correction bug
- `refactor` → Refactoring (pas de changement fonctionnel)
- `perf` → Amélioration performance
- `docs` → Documentation uniquement
- `test` → Ajout/modification tests
- `chore` → Maintenance (deps, config)

---

## 🚀 Commandes Développement

```bash
# Setup
bun install

# Dev (auto-reload)
bun run dev

# Build production
bun run build

# Tests
bun test

# Lint
bun run lint

# Format
bun run format
```

---

## 📦 Variables d'Environnement

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase (FREE - https://supabase.com)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Groq API (100% FREE - https://console.groq.com)
GROQ_API_KEY=gsk_...

# WhatsApp Business API (Meta)
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_APP_SECRET=abc123
WHATSAPP_VERIFY_TOKEN=your_token

# FedaPay (Côte d'Ivoire)
FEDAPAY_SECRET_KEY=sk_sandbox_...
FEDAPAY_PUBLIC_KEY=pk_sandbox_...

# OpenWeatherMap (FREE)
OPENWEATHER_API_KEY=xxx
```

---

## ✅ Checklist Avant Chaque PR

- [ ] Code TypeScript strict (pas de `any`)
- [ ] Tests ajoutés/modifiés
- [ ] Documentation mise à jour si nécessaire
- [ ] Commits suivent Conventional Commits
- [ ] Variables env validées (Zod)
- [ ] Erreurs gérées avec try/catch
- [ ] Bun lint + format pass

---

## 💰 Coût Total (Phase Test)

| Service | Plateforme | Coût |
|---------|-----------|------|
| Frontend | Vercel | **$0** |
| Backend | Render.com | **$0** |
| Database | Supabase | **$0** |
| Vector DB | Supabase pgvector | **$0** (inclus) |
| LLM | Groq API | **$0** |
| WhatsApp API | Meta | **$0** |
| **TOTAL** | | **$0/mois** 🎉 |

**Jusqu'à 10,000 messages/mois gratuits!**

---

## 📚 Documentation par Module

- [backend/README.md](/backend/README.md) - Setup + déploiement backend
- [docs/BEST_PRACTICES.md](/docs/BEST_PRACTICES.md) - Best practices Bun + Hono
- [PRD_REFINED_v2.md](/PRD_REFINED_v2.md) - Product Requirements

---

## 🔐 Sécurité Checklist

- [x] Zod validation (env vars + inputs)
- [x] Webhook signature verification (X-Hub-Signature-256)
- [x] Rate limiting (20 msg/jour freemium)
- [x] HTTPS only (production)
- [x] CORS whitelist (Meta + frontend only)
- [ ] Secrets rotation (Supabase + Groq)

---

## 🔧 Troubleshooting

### Erreur: "Groq API key invalid"
```bash
# Vérifier format gsk_...
echo $GROQ_API_KEY

# Régénérer sur https://console.groq.com
```

### Erreur: "pgvector function not found"
```sql
-- Créer la fonction dans Supabase SQL Editor
-- (voir section "Setup pgvector" ci-dessus)
```

### Cold start trop long sur Render (> 30s)
```bash
# Option 1: GitHub Actions keep-alive (ping chaque 10min)
# Option 2: Upgrade Render plan ($7/mois = 0s cold start)
# Option 3: Railway.app ($5 crédit/mois, 0s cold start)
```

---

## 🔄 Changelog

### 9 Janvier 2026 - v2.0
**🎉 Migration vers stack 100% gratuite:**
- ❌ Supprimé: Python/FastAPI
- ❌ Supprimé: Google Gemini (payant)
- ❌ Supprimé: Pinecone (payant après free tier)
- ✅ Ajouté: Bun + Hono (ultra-rapide, TypeScript natif)
- ✅ Ajouté: Groq API (100% gratuit, 300 tok/s)
- ✅ Ajouté: Supabase pgvector (gratuit, pas de 2ème DB)
- ✅ Ajouté: Déploiement Render.com (gratuit)
- **Économie: ~$25/mois → $0/mois** 🎉

### 12 Décembre 2025 - v1.0
- Création CLAUDE.md initial (stack Python/FastAPI)
- Architecture FastAPI + Gemini + Pinecone

---

**Fin de CLAUDE.md v2.0**

*Document vivant - Dernière mise à jour: 9 Janvier 2026*
**Développé avec ❤️ pour les agriculteurs ivoiriens** 🇨🇮🌾
