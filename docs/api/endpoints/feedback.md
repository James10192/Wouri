# Feedback Endpoints

Submit and retrieve admin feedback for RAG improvement loop.

---

## POST `/admin/feedback`

Submit admin feedback that gets automatically embedded in the vector database.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Body**:
```json
{
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 5,
  "comment": "Excellent advice on maize planting periods! Very accurate for Bouaké region.",
  "embed_immediately": true
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversation_id` | UUID | Yes | Associated conversation ID |
| `rating` | integer | No | Quality rating (1-5) |
| `comment` | string | No | Admin feedback (max 2000 chars) |
| `embed_immediately` | boolean | No | Generate embedding now (default: true) |

### Response

**Success (201 Created)**:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "wa_id": "1234567890",
  "rating": 5,
  "comment": "Excellent advice on maize planting periods!",
  "is_embedded": true,
  "created_at": "2026-01-10T12:00:00Z",
  "updated_at": "2026-01-10T12:00:00Z"
}
```

**Error (404 Not Found)**:
```json
{
  "error": "Conversation not found"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "message": "comment must be 2000 characters or less"
}
```

### Processing Flow

1. **Validate** conversation exists
2. **Generate embedding** if comment provided (768-dimensional vector)
3. **Insert** feedback into database
4. **Update** conversation stats (feedback_count, average_rating)

**Embedding Process**:
- Text → Supabase Edge Function → all-MiniLM-L6-v2 model → 768-dim vector
- Vector stored with HNSW index for fast similarity search
- Used by RAG pipeline to improve future responses

### Examples

**TypeScript/Fetch**:
```typescript
const feedback = await adminFetch('/admin/feedback', {
  method: 'POST',
  body: JSON.stringify({
    conversation_id: "550e8400-e29b-41d4-a716-446655440000",
    rating: 5,
    comment: "Excellent advice on maize planting!",
    embed_immediately: true
  })
});

console.log(`Feedback created: ${feedback.id}`);
console.log(`Embedded: ${feedback.is_embedded}`);
```

**curl**:
```bash
curl -X POST "https://wouribot-backend.onrender.com/admin/feedback" \
  -H "x-admin-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 5,
    "comment": "Excellent advice!"
  }'
```

---

## GET `/admin/feedback`

List all feedback entries with optional filters.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 50 | Number of results (max: 100) |
| `wa_id` | string | No | - | Filter by WhatsApp user ID |
| `min_rating` | integer | No | - | Minimum rating (1-5) |

### Response

**Success (200 OK)**:
```json
{
  "feedback": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
      "wa_id": "1234567890",
      "rating": 5,
      "comment": "Excellent advice on maize planting!",
      "is_embedded": true,
      "created_at": "2026-01-10T12:00:00Z",
      "updated_at": "2026-01-10T12:00:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "conversation_id": "660e8400-e29b-41d4-a716-446655440000",
      "wa_id": "9876543210",
      "rating": 4,
      "comment": "Very helpful information",
      "is_embedded": true,
      "created_at": "2026-01-10T13:00:00Z",
      "updated_at": "2026-01-10T13:00:00Z"
    }
  ]
}
```

### Examples

**Get all feedback**:
```typescript
const allFeedback = await adminFetch('/admin/feedback?limit=100');
```

**Filter by rating**:
```typescript
// Get only 5-star feedback
const topFeedback = await adminFetch('/admin/feedback?min_rating=5');
```

**Filter by user**:
```typescript
const userFeedback = await adminFetch('/admin/feedback?wa_id=1234567890');
```

**curl**:
```bash
# Get high-rated feedback
curl -X GET "https://wouribot-backend.onrender.com/admin/feedback?min_rating=4&limit=20" \
  -H "x-admin-key: your-api-key"
```

---

## Use Cases

### 1. RAG Improvement Loop

```typescript
// Submit feedback after reviewing conversation
const improvedAnswer = `
Le maïs se plante à Bouaké entre avril et juin, pendant la saison des pluies.
Température idéale: 25-30°C. Sol bien drainé requis.
`;

await adminFetch('/admin/feedback', {
  method: 'POST',
  body: JSON.stringify({
    conversation_id: conversationId,
    rating: 5,
    comment: improvedAnswer,
    embed_immediately: true
  })
});

// This feedback is now searchable in the vector database
// and will improve future RAG responses!
```

### 2. Quality Monitoring

```typescript
// Get feedback statistics
const allFeedback = await adminFetch('/admin/feedback?limit=1000');

const stats = {
  total: allFeedback.feedback.length,
  embedded: allFeedback.feedback.filter(f => f.is_embedded).length,
  avgRating: allFeedback.feedback
    .filter(f => f.rating)
    .reduce((sum, f) => sum + f.rating!, 0) / allFeedback.feedback.length,
  withComments: allFeedback.feedback.filter(f => f.comment).length
};

console.log('Feedback Stats:', stats);
```

### 3. Conversation Improvement Workflow

```typescript
// 1. Find low-rated conversations
const lowRated = await adminFetch('/admin/conversations?limit=100');
const needsImprovement = lowRated.conversations.filter(c =>
  c.average_rating && c.average_rating < 3
);

// 2. Review each conversation
for (const conv of needsImprovement) {
  console.log(`\nConversation: ${conv.id}`);
  console.log(`Question: ${conv.user_message}`);
  console.log(`Answer: ${conv.bot_response}`);
  console.log(`Rating: ${conv.average_rating}`);

  // 3. Add improved feedback
  const improvedFeedback = await adminFetch('/admin/feedback', {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: conv.id,
      rating: 5,
      comment: "Improved answer with region-specific details...",
      embed_immediately: true
    })
  });
}
```

---

## Best Practices

### 1. Embedding Strategy

- ✅ **Always embed comments** - Set `embed_immediately: true` for immediate RAG improvement
- ✅ **Include context** - Add region, crop, and seasonal information in comments
- ✅ **Be specific** - Detailed feedback improves RAG quality more than generic comments

### 2. Comment Quality

**Good Example**:
```
Le maïs se plante à Bouaké entre avril et juin pendant la saison des pluies.
Température idéale: 25-30°C. Espacement recommandé: 75cm entre rangs, 40cm entre plants.
Variétés adaptées: Early Thaï, Obatanpa.
```

**Poor Example**:
```
Bonne réponse
```

### 3. Rating Guidelines

| Rating | When to Use |
|--------|-------------|
| 5 ⭐⭐⭐⭐⭐ | Perfect answer, region-specific, actionable |
| 4 ⭐⭐⭐⭐ | Good answer, minor improvements possible |
| 3 ⭐⭐⭐ | Acceptable but needs more detail |
| 2 ⭐⭐ | Partially correct, missing key information |
| 1 ⭐ | Incorrect or misleading |

---

## Related Endpoints

- [Conversations](./conversations.md) - View conversations to provide feedback on
- [Knowledge Base](./knowledge.md) - Add documents directly to vector DB
