# Wouri Bot Admin Dashboard - Complete API Reference

**Version**: 1.0.0
**Stack**: Bun + Hono + TypeScript + Groq + Supabase (pgvector)
**Last Updated**: 2026-01-10

---

## Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [API Endpoints](#api-endpoints)
  - [Conversations](#conversations)
  - [Feedback](#feedback)
  - [Knowledge Base](#knowledge-base)
  - [Translations](#translations)
  - [Monitoring](#monitoring)
- [Database Schema](#database-schema)
- [Frontend Integration](#frontend-integration)
- [Deployment Guide](#deployment-guide)

---

## Introduction

The Admin Dashboard API provides complete control over Wouri Bot's backend services. Key features:

✅ **Real-time Conversation Monitoring** - View all user interactions with the bot
✅ **Feedback Loop** - Improve RAG quality by adding admin feedback to vector DB
✅ **Knowledge Management** - Add agricultural documents with automatic embeddings
✅ **Multilingual Support** - Manage FR/Dioula/Baoulé translations
✅ **Service Health** - Monitor Supabase, Groq, OpenWeather, Embeddings

---

## Authentication

All admin endpoints require API key authentication via the `x-admin-key` header.

### Setup

1. Generate a secure API key:
```bash
openssl rand -hex 32
```

2. Add to `backend/.env`:
```env
ADMIN_API_KEY=your-generated-32-char-key-here
```

3. Include in requests:
```http
x-admin-key: your-api-key-here
```

### Error Responses

**401 Unauthorized**:
```json
{
  "error": "Missing API key",
  "message": "Include 'x-admin-key' header with your admin API key"
}
```

**403 Forbidden**:
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is not authorized"
}
```

---

## Base URLs

- **Development**: `http://localhost:4456`
- **Production**: `https://wouribot-backend.onrender.com`

---

## API Endpoints

### Conversations

#### GET `/admin/conversations`

List conversations with cursor-based pagination.

**Query Parameters**:
- `limit` (number, default: 50, max: 100) - Number of results per page
- `cursor` (UUID) - Pagination cursor (from previous response)
- `wa_id` (string) - Filter by WhatsApp user ID
- `language` (fr | dioula | baoulé) - Filter by language

**Response** (200 OK):
```json
{
  "conversations": [
    {
      "id": "uuid",
      "wa_id": "1234567890",
      "message_id": "whatsapp-msg-id",
      "message_type": "text",
      "user_message": "Quand planter le maïs?",
      "bot_response": "Le maïs se plante...",
      "language": "fr",
      "region": "Bouaké",
      "feedback_count": 2,
      "average_rating": 4.5,
      "model_used": "llama-3.3-70b-versatile",
      "tokens_used": 450,
      "response_time_ms": 1200,
      "created_at": "2026-01-10T10:30:00Z"
    }
  ],
  "nextCursor": "next-uuid-here",
  "hasMore": true,
  "total": 50
}
```

**Example**:
```bash
curl -X GET "https://wouribot-backend.onrender.com/admin/conversations?limit=20&language=fr" \
  -H "x-admin-key: your-api-key"
```

---

#### GET `/admin/conversations/:id`

Get conversation details with all feedback entries.

**Path Parameters**:
- `id` (UUID) - Conversation ID

**Response** (200 OK):
```json
{
  "id": "uuid",
  "wa_id": "1234567890",
  "user_message": "Quand planter le maïs?",
  "bot_response": "Le maïs se plante...",
  "feedback": [
    {
      "id": "feedback-uuid",
      "rating": 5,
      "comment": "Excellent advice!",
      "is_embedded": true,
      "created_at": "2026-01-10T11:00:00Z"
    }
  ],
  ...
}
```

**Error** (404 Not Found):
```json
{
  "error": "Conversation not found"
}
```

---

### Feedback

#### POST `/admin/feedback`

Submit admin feedback that gets automatically embedded in the vector database.

**Request Body**:
```json
{
  "conversation_id": "uuid",
  "rating": 5,
  "comment": "Excellent advice on maize planting periods!",
  "embed_immediately": true
}
```

**Fields**:
- `conversation_id` (UUID, required) - Associated conversation
- `rating` (number, 1-5, optional) - Quality rating
- `comment` (string, max 2000 chars, optional) - Admin comment
- `embed_immediately` (boolean, default: true) - Generate embedding now

**Response** (201 Created):
```json
{
  "id": "feedback-uuid",
  "conversation_id": "conv-uuid",
  "wa_id": "1234567890",
  "rating": 5,
  "comment": "Excellent advice...",
  "is_embedded": true,
  "created_at": "2026-01-10T12:00:00Z",
  "updated_at": "2026-01-10T12:00:00Z"
}
```

**Process**:
1. Validate conversation exists
2. Generate embedding if `comment` provided (768-dim vector)
3. Insert into `feedback` table
4. Update conversation stats (feedback_count, average_rating)

---

#### GET `/admin/feedback`

List all feedback entries with optional filters.

**Query Parameters**:
- `limit` (number, default: 50, max: 100)
- `wa_id` (string) - Filter by user
- `min_rating` (number, 1-5) - Minimum rating filter

**Response** (200 OK):
```json
{
  "feedback": [
    {
      "id": "uuid",
      "conversation_id": "conv-uuid",
      "rating": 5,
      "comment": "Great response!",
      "is_embedded": true,
      "created_at": "2026-01-10T12:00:00Z"
    }
  ]
}
```

---

### Knowledge Base

#### POST `/admin/knowledge`

Add a new document to the RAG knowledge base with automatic embedding.

**Request Body**:
```json
{
  "content": "Le manioc nécessite un sol bien drainé et une température entre 25-29°C...",
  "metadata": {
    "source": "Ministère Agriculture CI",
    "page": 15,
    "region": "Bouaké",
    "category": "plantation",
    "crop": "manioc"
  }
}
```

**Fields**:
- `content` (string, 10-5000 chars, required) - Document text
- `metadata.source` (string, required) - Document source
- `metadata.page` (number, optional) - Page number
- `metadata.region` (string, optional) - Geographic region
- `metadata.category` (enum, optional) - plantation | harvest | disease | weather | general
- `metadata.crop` (string, optional) - Crop name (maïs, cacao, manioc, etc.)

**Response** (201 Created):
```json
{
  "id": "doc-uuid",
  "content": "Le manioc nécessite...",
  "embedding": "[0.123, 0.456, ...]",
  "metadata": { ... },
  "created_at": "2026-01-10T13:00:00Z"
}
```

**Process**:
1. Generate embedding (768-dim vector via Supabase Edge Function)
2. Insert into `documents` table with HNSW index
3. Document immediately searchable

---

#### GET `/admin/knowledge`

Search knowledge base using semantic vector search.

**Query Parameters**:
- `query` (string, required) - Search query
- `region` (string, optional) - Filter by region
- `limit` (number, default: 10, max: 50) - Number of results

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "doc-uuid",
      "content": "Le manioc nécessite...",
      "similarity": 0.85,
      "metadata": {
        "source": "Ministère Agriculture CI",
        "region": "Bouaké",
        "category": "plantation",
        "crop": "manioc"
      }
    }
  ]
}
```

**Search Process**:
1. Generate embedding for query
2. pgvector cosine similarity search (HNSW index)
3. Return top-k results with similarity scores

---

### Translations

#### POST `/admin/translations`

Add a new translation entry to the multilingual database.

**Request Body**:
```json
{
  "source_text": "Quand planter le maïs?",
  "source_language": "fr",
  "target_language": "dioula",
  "translated_text": "Kaba suman ka sɔrɔ?",
  "context": "agriculture",
  "verified": true
}
```

**Fields**:
- `source_text` (string, 1-1000 chars, required)
- `source_language` (fr | dioula | baoulé | en, required)
- `target_language` (fr | dioula | baoulé | en, required)
- `translated_text` (string, 1-1000 chars, required)
- `context` (string, max 500 chars, optional) - Agricultural context
- `verified` (boolean, default: false) - Admin-verified translation

**Response** (201 Created):
```json
{
  "id": "trans-uuid",
  "source_text": "Quand planter le maïs?",
  "source_language": "fr",
  "target_language": "dioula",
  "translated_text": "Kaba suman ka sɔrɔ?",
  "context": "agriculture",
  "verified": true,
  "created_by": "admin",
  "created_at": "2026-01-10T14:00:00Z",
  "updated_at": "2026-01-10T14:00:00Z"
}
```

**Error** (409 Conflict):
```json
{
  "error": "Translation already exists",
  "message": "Translation from fr to dioula already exists for this text"
}
```

---

#### GET `/admin/translations`

Query translations with full-text search and filters.

**Query Parameters**:
- `query` (string, optional) - Full-text search
- `source_language` (fr | dioula | baoulé | en, optional)
- `target_language` (fr | dioula | baoulé | en, optional)
- `verified_only` (boolean, default: false)
- `limit` (number, default: 20, max: 100)

**Response** (200 OK):
```json
{
  "translations": [
    {
      "id": "uuid",
      "source_text": "maïs",
      "source_language": "fr",
      "target_language": "dioula",
      "translated_text": "kaba",
      "verified": true,
      "relevance": 0.95
    }
  ]
}
```

**Full-text Search**: Uses PostgreSQL `to_tsvector` for French text search.

---

### Monitoring

#### GET `/admin/monitoring`

Check health status of all backend services.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-01-10T15:00:00Z",
  "services": {
    "backend": {
      "status": "ok",
      "latency_ms": 0,
      "last_checked": "2026-01-10T15:00:00Z",
      "error_message": null
    },
    "supabase": {
      "status": "ok",
      "latency_ms": 45,
      "last_checked": "2026-01-10T15:00:00Z",
      "error_message": null
    },
    "groq": {
      "status": "ok",
      "latency_ms": 120,
      "last_checked": "2026-01-10T15:00:00Z",
      "error_message": null
    },
    "openweather": {
      "status": "ok",
      "latency_ms": 210,
      "last_checked": "2026-01-10T15:00:00Z",
      "error_message": null
    },
    "embeddings": {
      "status": "ok",
      "latency_ms": 50,
      "last_checked": "2026-01-10T15:00:00Z",
      "error_message": null
    }
  }
}
```

**Service Status Values**:
- `ok` - Service healthy
- `degraded` - Service slow but functional
- `down` - Service unavailable

**Use Case**: Dashboard health widget, alert monitoring, uptime tracking

---

## Database Schema

### Tables

#### `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  wa_id TEXT NOT NULL,
  message_id TEXT UNIQUE,
  message_type TEXT,
  user_message TEXT,
  bot_response TEXT,
  language TEXT DEFAULT 'fr',
  region TEXT,
  feedback_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  model_used TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `feedback`
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  wa_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  embedding VECTOR(768), -- pgvector
  is_embedded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `translations`
```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY,
  source_text TEXT NOT NULL,
  source_language TEXT CHECK (source_language IN ('fr', 'dioula', 'baoulé', 'en')),
  target_language TEXT CHECK (target_language IN ('fr', 'dioula', 'baoulé', 'en')),
  translated_text TEXT NOT NULL,
  context TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_translation UNIQUE (source_text, source_language, target_language)
);
```

#### `documents` (existing, for knowledge base)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(768), -- pgvector with HNSW index
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Frontend Integration

### Next.js App Router Example

```typescript
// app/admin/page.tsx
import { useConversations } from "@/hooks/useConversations";

export default function AdminDashboard() {
  const { conversations, loading, error, loadMore, hasMore } = useConversations();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Conversations</h1>
      {conversations.map((conv) => (
        <div key={conv.id}>
          <p>{conv.user_message}</p>
          <p>{conv.bot_response}</p>
        </div>
      ))}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

### Custom React Hook

```typescript
// hooks/useConversations.ts
import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api";

export function useConversations(limit: number = 20) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const data = await adminFetch(`/admin/conversations?limit=${limit}`);
        setConversations(data.conversations);
        setNextCursor(data.nextCursor);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [limit]);

  const loadMore = async () => {
    if (!nextCursor) return;
    const data = await adminFetch(`/admin/conversations?limit=${limit}&cursor=${nextCursor}`);
    setConversations((prev) => [...prev, ...data.conversations]);
    setNextCursor(data.nextCursor);
  };

  return { conversations, loading, error, loadMore, hasMore: !!nextCursor };
}
```

---

## Deployment Guide

### 1. Database Migrations

```bash
# Run all migrations
cd backend/prisma/migrations
for dir in 0*/; do
  echo "Running migration: $dir"
  bunx supabase db execute -f "$dir/migration.sql"
done
```

### 2. Environment Variables

```bash
# Generate admin API key
openssl rand -hex 32

# Add to backend/.env
ADMIN_API_KEY=generated-key-here
```

### 3. Deploy Embedding Service

```bash
# Deploy Supabase Edge Function
cd supabase/functions
supabase functions deploy embed --no-verify-jwt

# Upload model to Supabase Storage (if using ONNX)
# supabase storage cp all-MiniLM-L6-v2.onnx models/
```

### 4. Test Endpoints

```bash
# Test authentication
curl -X GET http://localhost:4456/admin/conversations \
  -H "x-admin-key: your-key"

# Test monitoring
curl -X GET http://localhost:4456/admin/monitoring \
  -H "x-admin-key: your-key"
```

---

## Best Practices

### Security
- ✅ Rotate API keys every 90 days
- ✅ Use HTTPS in production
- ✅ Log all admin access for audit
- ✅ Implement rate limiting (100 req/min)
- ✅ Validate all inputs with Zod

### Performance
- ✅ Use cursor pagination (not offset-based)
- ✅ Index frequently queried columns
- ✅ Cache monitoring data (5-minute TTL)
- ✅ Batch embedding operations
- ✅ Use HNSW index for vector search

### Data Quality
- ✅ Verify translations before setting `verified: true`
- ✅ Add regional metadata to knowledge documents
- ✅ Include context in feedback comments
- ✅ Monitor embedding similarity scores
- ✅ Review low-rated conversations

---

## Support & Resources

- **API Documentation**: `/docs/api/README.md`
- **GitHub Repository**: https://github.com/yourusername/wouribot
- **Issue Tracker**: https://github.com/yourusername/wouribot/issues
- **Email Support**: admin@wouribot.com

---

## Changelog

### 2026-01-10 - v1.0.0
✨ **Initial Release**
- Admin API with 5 endpoint categories
- API key authentication
- Cursor-based pagination
- Production embedding service
- Service health monitoring
- Complete TypeScript types with Zod validation

**Database**: 4 migrations, 7 SQL helper functions

**Backend**: 17 new files created

**Documentation**: Comprehensive guides and examples

---

**Built with ❤️ for Côte d'Ivoire farmers** 🇨🇮🌾
