# Wouri Bot Admin API Documentation

**Version**: 1.0.0
**Base URL**: `https://wouribot-backend.onrender.com`
**Last Updated**: 2026-01-10

---

## Overview

The Wouri Bot Admin API provides endpoints for managing the agricultural assistant chatbot, including:

- 📊 **Conversation Monitoring** - View real-time message streams and user interactions
- 💬 **Feedback Management** - Submit admin feedback that gets embedded in the RAG system
- 📚 **Knowledge Base** - Add and search agricultural documents in the vector database
- 🌍 **Translation Database** - Manage multilingual translations (FR, Dioula, Baoulé)
- 🔍 **Service Monitoring** - Check health status of all backend dependencies

---

## Authentication

All admin endpoints require an API key in the request header:

```http
x-admin-key: your-admin-api-key-here
```

### Generating an API Key

```bash
# Generate a secure 32-character API key
openssl rand -hex 32
```

Add the generated key to your `.env` file:

```env
ADMIN_API_KEY=your-generated-key-here
```

**Security Notes**:
- Never commit API keys to version control
- Rotate keys regularly (every 90 days recommended)
- Use different keys for development and production
- Log all admin API access for audit trails

---

## Quick Start

### TypeScript/Fetch Example

```typescript
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;
const API_BASE_URL = "https://wouribot-backend.onrender.com";

async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_API_KEY!,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

// Example: Get conversations
const data = await adminFetch("/admin/conversations?limit=20");
console.log(data.conversations);
```

### curl Example

```bash
curl -X GET https://wouribot-backend.onrender.com/admin/conversations \
  -H "x-admin-key: your-api-key-here" \
  -H "Content-Type: application/json"
```

---

## Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/conversations` | GET | List conversations with pagination |
| `/admin/conversations/:id` | GET | Get conversation details with feedback |
| `/admin/feedback` | POST | Submit feedback (auto-embedded) |
| `/admin/feedback` | GET | List all feedback entries |
| `/admin/knowledge` | POST | Add document to vector DB |
| `/admin/knowledge` | GET | Search knowledge base |
| `/admin/translations` | POST | Add translation entry |
| `/admin/translations` | GET | Query translations |
| `/admin/monitoring` | GET | Service health checks |

---

## Response Format

All endpoints return JSON responses:

### Success Response (200/201)

```json
{
  "data": { ... },
  "nextCursor": "uuid-for-pagination",
  "hasMore": true
}
```

### Error Response (400/401/403/404/500)

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": { ... }
}
```

---

## Pagination

Endpoints that return lists use cursor-based pagination:

```typescript
// First page
GET /admin/conversations?limit=50

// Next page
GET /admin/conversations?limit=50&cursor=last-item-uuid
```

**Response includes**:
- `items`: Array of results
- `nextCursor`: UUID for next page (null if no more)
- `hasMore`: boolean indicating more results

---

## Rate Limiting

- **Authentication failures**: Max 10 attempts per IP per hour
- **Successful requests**: Unlimited (fair use policy)
- **Embedding operations**: Max 100 per minute

Headers in response:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704902400
```

---

## Documentation Index

### Endpoints
- [Conversations](./endpoints/conversations.md) - View message history
- [Feedback](./endpoints/feedback.md) - Submit admin feedback
- [Knowledge](./endpoints/knowledge.md) - Manage vector database
- [Translations](./endpoints/translations.md) - Multilingual dictionary
- [Monitoring](./endpoints/monitoring.md) - Service health checks

### Schemas
- [Conversation Schema](./schemas/conversation.md)
- [Feedback Schema](./schemas/feedback.md)
- [Knowledge Schema](./schemas/knowledge.md)
- [Translation Schema](./schemas/translation.md)

### Examples
- [TypeScript/Fetch](./examples/typescript-fetch.md)
- [React Hooks](./examples/react-hooks.md)
- [curl Commands](./examples/curl.md)

### Guides
- [Production Embeddings Setup](./guides/embeddings-production.md)
- [Frontend Integration](./guides/frontend-integration.md)
- [Monitoring Setup](./guides/monitoring-setup.md)

---

## Tech Stack

- **Runtime**: Bun 1.1+
- **Framework**: Hono 4.6+
- **Database**: PostgreSQL + pgvector (Supabase)
- **LLM**: Groq API (100% FREE)
- **Embeddings**: Supabase Edge Function + all-MiniLM-L6-v2
- **Validation**: Zod

**Cost**: $0/month (100% free tier)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/wouribot/issues)
- **Email**: support@wouribot.com
- **Documentation**: [Full API Docs](https://wouribot.com/docs)

---

## Changelog

### 2026-01-10 - v1.0.0
- Initial admin API release
- Conversation monitoring endpoints
- Feedback loop system with embeddings
- Knowledge base management
- Translation database
- Service monitoring

---

**Built with ❤️ for Côte d'Ivoire farmers** 🇨🇮🌾
