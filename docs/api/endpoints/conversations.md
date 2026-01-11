# Conversations Endpoints

View and manage conversation history between users and Wouri Bot.

---

## GET `/admin/conversations`

List conversations with cursor-based pagination.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 50 | Number of results (max: 200) |
| `cursor` | ISO datetime | No | - | Pagination cursor from previous response |
| `wa_id` | string | No | - | Filter by WhatsApp user ID |
| `language` | enum | No | - | Filter by language (fr, dioula, baoulé) |
| `region` | string | No | - | Filter by region |

### Response

**Success (200 OK)**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "wa_id": "1234567890",
      "message_id": "wamid.HBgLMTIzNDU2Nzg5MAVReplyMessageId",
      "message_type": "text",
      "user_message": "Quand planter le maïs à Bouaké?",
      "bot_response": "Le maïs se plante à Bouaké entre avril et juin...",
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
  "nextCursor": "2026-01-10T10:30:00Z",
  "hasMore": true
}
```

**Conversation Object**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique conversation identifier |
| `wa_id` | string | WhatsApp user ID |
| `message_id` | string | WhatsApp message ID |
| `message_type` | enum | Message type (text, audio, image) |
| `user_message` | string | User's question/message |
| `bot_response` | string | Bot's response |
| `language` | string | Conversation language |
| `region` | string | User's region |
| `feedback_count` | integer | Number of feedback entries |
| `average_rating` | decimal | Average rating (1-5) |
| `model_used` | string | Groq model used |
| `tokens_used` | integer | Total tokens consumed |
| `response_time_ms` | integer | Response time in milliseconds |
| `created_at` | datetime | Creation timestamp (ISO 8601) |

### Examples

**TypeScript/Fetch**:
```typescript
const response = await adminFetch('/admin/conversations?limit=20&language=fr');
console.log(response.data);
```

**curl**:
```bash
curl -X GET "https://wouribot-backend.onrender.com/admin/conversations?limit=20&language=fr" \
  -H "x-admin-key: your-api-key"
```

### Pagination

To fetch next page, use the `nextCursor` from the previous response:

```typescript
// Page 1
const page1 = await adminFetch('/admin/conversations?limit=50');

// Page 2
if (page1.hasMore) {
  const page2 = await adminFetch(`/admin/conversations?limit=50&cursor=${page1.nextCursor}`);
}
```

---

## GET `/admin/conversations/:id`

Get detailed conversation with all associated feedback.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Conversation ID |

### Response

**Success (200 OK)**:
```json
{
  "data": {
    "conversation": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "wa_id": "1234567890",
      "message_id": "wamid.HBgLMTIzNDU2Nzg5MAVReplyMessageId",
      "message_type": "text",
      "user_message": "Quand planter le maïs?",
      "bot_response": "Le maïs se plante entre avril et juin...",
      "language": "fr",
      "region": "Bouaké",
      "feedback_count": 2,
      "average_rating": 4.5,
      "model_used": "llama-3.3-70b-versatile",
      "tokens_used": 450,
      "response_time_ms": 1200,
      "created_at": "2026-01-10T10:30:00Z"
    },
    "feedback": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
        "wa_id": "1234567890",
        "rating": 5,
        "comment": "Excellent advice on maize planting!",
        "is_embedded": true,
        "created_at": "2026-01-10T11:00:00Z",
        "updated_at": "2026-01-10T11:00:00Z"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
        "wa_id": "1234567890",
        "rating": 4,
        "comment": "Very helpful information",
        "is_embedded": true,
        "created_at": "2026-01-10T12:00:00Z",
        "updated_at": "2026-01-10T12:00:00Z"
      }
    ]
  }
}
```

**Error (404 Not Found)**:
```json
{
  "error": "Conversation not found"
}
```

### Examples

**TypeScript/Fetch**:
```typescript
const conversationId = "550e8400-e29b-41d4-a716-446655440000";
const response = await adminFetch(`/admin/conversations/${conversationId}`);
console.log(response.feedback); // Array of feedback entries
```

**curl**:
```bash
curl -X GET "https://wouribot-backend.onrender.com/admin/conversations/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-admin-key: your-api-key"
```

---

## Use Cases

### 1. Monitor Recent Conversations

```typescript
// Get latest 50 conversations
const recent = await adminFetch('/admin/conversations?limit=50');

// Filter low-rated conversations
const lowRated = recent.data.filter(c =>
  c.average_rating && c.average_rating < 3
);
```

### 2. User-Specific Analysis

```typescript
// Get all conversations for a specific user
const userId = "1234567890";
const userConvs = await adminFetch(`/admin/conversations?wa_id=${userId}`);

console.log(`User has ${userConvs.data.length} conversations`);
```

### 3. Language Statistics

```typescript
// Get French conversations
const frConvs = await adminFetch('/admin/conversations?language=fr&limit=100');

// Calculate average response time
const avgResponseTime = frConvs.data.reduce((sum, c) =>
  sum + (c.response_time_ms || 0), 0
) / frConvs.data.length;

console.log(`Average response time: ${avgResponseTime}ms`);
```

---

## Related Endpoints

- [Feedback Endpoints](./feedback.md) - Submit feedback for conversations
- [Monitoring](./monitoring.md) - Check system performance

---

## GET `/admin/messages/stream`

Server-sent events (SSE) stream of new messages.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: text/event-stream
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `since` | ISO datetime | No | - | Only stream messages after this timestamp |
| `region` | string | No | - | Filter by region |
| `language` | string | No | - | Filter by language |

### Response

SSE stream of events:
```
data: { "type": "message", "data": { ... } }
```

### Example

```bash
curl -N "https://wouribot-backend.onrender.com/admin/messages/stream?since=2026-01-10T00:00:00Z" \
  -H "x-admin-key: your-api-key"
```
