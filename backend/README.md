# Wouri Bot Backend - Assistant Agricole WhatsApp

**Stack**: Bun + Hono + TypeScript + Groq + Supabase
**Version**: 2.0
**Derniere mise a jour**: 9 Janvier 2026

---

## 📖 Vue d'Ensemble

Backend Bun + Hono pour Wouri Bot, un assistant agricole WhatsApp multilingue (FR, Dioula, Baoule) qui utilise un pipeline RAG (pgvector + Groq) pour repondre avec des sources fiables.

### Fonctionnalites

✅ **RAG Pipeline (Groq + Supabase pgvector)**
- Recherche contextuelle (vector search)
- Reponses courtes, factuelles

✅ **WhatsApp Webhooks (Meta)**
- Reception messages texte/audio/image
- Envoi des reponses via API WhatsApp

✅ **Tests et Monitoring**
- Endpoints de test (Groq, Supabase, RAG)
- Health checks

✅ **Deploiement Gratuit**
- Docker pour Render/Railway
- Configuration env stricte (Zod)

---

## 📁 Structure du Dossier

```
backend/
├── src/
│   ├── index.ts              # Point d'entree (serveur Hono)
│   ├── routes/
│   │   ├── webhooks.ts       # Routes WhatsApp + FedaPay
│   │   └── test.ts           # Endpoints de test (Groq, RAG, Supabase)
│   ├── services/
│   │   ├── groq.ts           # Client Groq (LLM)
│   │   ├── supabase.ts       # Client Supabase + pgvector
│   │   ├── whatsapp.ts       # Client WhatsApp Business API
│   │   └── audio.ts          # STT (Groq Whisper)
│   ├── lib/
│   │   ├── config.ts         # Validation env vars (Zod)
│   │   └── rag.ts            # Pipeline RAG principal
│   └── types/
│       └── index.ts          # Types TypeScript + Zod schemas
├── package.json              # Dependances Bun
├── tsconfig.json             # TypeScript strict config
├── Dockerfile                # Build image Docker (Render/Railway)
├── render.yaml               # Configuration Render.com
├── .env.example              # Template env vars
└── README.md                 # Documentation backend
```

---

## 🔧 Configuration

### Variables d'environnement

Creez un fichier `.env` avec les variables suivantes:

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

# FedaPay (Cote d'Ivoire payments)
FEDAPAY_SECRET_KEY=sk_sandbox_...
FEDAPAY_PUBLIC_KEY=pk_sandbox_...

# OpenWeatherMap (FREE - https://openweathermap.org)
OPENWEATHER_API_KEY=your_api_key
```

### Connexion frontend → backend (obligatoire)

Le frontend ne parle pas directement aux SDKs AI. Il passe par le backend.

Assurez-vous que:
- `backend/.env` contient `GROQ_API_KEY`.
- Le backend tourne (par defaut `http://localhost:8000` si configure ainsi).
- Cote frontend, si le backend n'est pas sur `http://localhost:8000`, creez `frontend/.env.local` et ajoutez:

```env
BACKEND_URL=http://localhost:8000
# ou
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Ou obtenir les cles API?

#### 1. **Supabase** (Gratuit)

```bash
# 1. Creer compte sur https://supabase.com
# 2. Creer un nouveau projet
# 3. Aller dans Project Settings -> API
# 4. Copier:
#    - URL: https://xxx.supabase.co
#    - anon/public key
#    - service_role key (secret!)
```

#### 2. **Groq API** (100% Gratuit)

```bash
# 1. Creer compte sur https://console.groq.com
# 2. Aller dans API Keys: https://console.groq.com/keys
# 3. Creer nouvelle cle -> Copier (commence par gsk_...)

# Modeles disponibles:
# - llama-3.3-70b-versatile (recommande pour RAG)
# - llama-3.1-8b-instant (ultra-rapide)
# - mixtral-8x7b-32768 (multilingue)
```

#### 3. **WhatsApp Business API** (Meta)

```bash
# 1. Creer compte Meta Developers: https://developers.facebook.com
# 2. Creer une app -> WhatsApp Business API
# 3. Configurer un numero de test (gratuit)
# 4. Generer Access Token permanent
# 5. Configurer webhook:
#    - URL: https://your-backend.onrender.com/webhooks/whatsapp
#    - Verify Token: votre_token_custom
#    - Souscrire aux evenements: messages
```

---

## 📚 API Endpoints

### GET `/`
Informations API

### GET `/health`
Health check (monitoring)

### GET `/webhooks/whatsapp`
Verification webhook Meta

### POST `/webhooks/whatsapp`
Recevoir messages WhatsApp

### POST `/webhooks/fedapay`
Notifications paiement FedaPay

### POST `/test/chat`
Test RAG pipeline (body: `{ question, region, language }`)

### GET `/test/groq`
Test Groq API

---

## 📚 Groq API Reference (Extrait)

> Docs officielles: https://console.groq.com/docs

### Chat Completions

**POST** `https://api.groq.com/openai/v1/chat/completions`

**Champs cles**:
- `messages` (array, requis)
- `model` (string, requis)
- `stream` (boolean)
- `max_completion_tokens` (int)
- `temperature` (number)
- `tools` / `tool_choice`

**Exemple (curl)**

```bash
curl https://api.groq.com/openai/v1/chat/completions -s \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {"role": "user", "content": "Explain the importance of fast language models"}
    ]
  }'
```

### Responses API (beta)

**POST** `https://api.groq.com/openai/v1/responses`

**Champs cles**:
- `input` (string | array)
- `model` (string)
- `instructions` (string, optionnel)
- `stream` (boolean)

### Audio

**Transcription**: `POST https://api.groq.com/openai/v1/audio/transcriptions`
- `model`: `whisper-large-v3` | `whisper-large-v3-turbo`

**Translation**: `POST https://api.groq.com/openai/v1/audio/translations`

**Text-to-Speech**: `POST https://api.groq.com/openai/v1/audio/speech`

### Models

**GET** `https://api.groq.com/openai/v1/models`

### Batches

**POST** `https://api.groq.com/openai/v1/batches`

### Files

**POST** `https://api.groq.com/openai/v1/files`

### Fine Tuning (beta)

**GET** `https://api.groq.com/v1/fine_tunings`

---

## 📚 Ressources

- [Groq Docs](https://console.groq.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

## 🔄 Changelog

### 9 Janvier 2026 - v2.0
- Migration stack Bun + Hono
- Integration Groq + Supabase pgvector
- Deploy Docker (Render/Railway)

---

*Derniere mise a jour: 9 Janvier 2026*
