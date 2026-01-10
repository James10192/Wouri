# Knowledge Base Endpoints

Add and search documents in the RAG vector database.

---

## POST `/admin/knowledge`

Add a new agricultural document to the knowledge base with automatic embedding.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Body**:
```json
{
  "content": "Le manioc nécessite un sol bien drainé et une température entre 25-29°C. La plantation se fait avec des boutures de 20-25cm. Espacement: 1m entre rangs et 1m entre plants. Récolte après 10-12 mois.",
  "metadata": {
    "source": "Ministère de l'Agriculture - Guide Manioc 2025",
    "page": 15,
    "region": "Bouaké",
    "category": "plantation",
    "crop": "manioc"
  }
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Document text (10-5000 chars) |
| `metadata.source` | string | Yes | Document source |
| `metadata.page` | integer | No | Page number |
| `metadata.region` | string | No | Geographic region |
| `metadata.category` | enum | No | plantation, harvest, disease, weather, general |
| `metadata.crop` | string | No | Crop name (maïs, cacao, manioc, etc.) |

### Response

**Success (201 Created)**:
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "content": "Le manioc nécessite un sol bien drainé...",
  "embedding": "[0.123, 0.456, 0.789, ...]",
  "metadata": {
    "source": "Ministère de l'Agriculture - Guide Manioc 2025",
    "page": 15,
    "region": "Bouaké",
    "category": "plantation",
    "crop": "manioc"
  },
  "created_at": "2026-01-10T14:00:00Z"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "message": "content must be between 10 and 5000 characters"
}
```

### Processing Flow

1. **Validate** content and metadata
2. **Generate embedding** (768-dimensional vector via Supabase Edge Function)
3. **Insert** into `documents` table with HNSW index
4. **Document immediately searchable** via semantic search

### Examples

**TypeScript/Fetch**:
```typescript
const document = await adminFetch('/admin/knowledge', {
  method: 'POST',
  body: JSON.stringify({
    content: "Le manioc nécessite un sol bien drainé...",
    metadata: {
      source: "Ministère de l'Agriculture CI",
      page: 15,
      region: "Bouaké",
      category: "plantation",
      crop: "manioc"
    }
  })
});

console.log(`Document added: ${document.id}`);
```

**curl**:
```bash
curl -X POST "https://wouribot-backend.onrender.com/admin/knowledge" \
  -H "x-admin-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Le manioc nécessite un sol bien drainé et une température entre 25-29°C...",
    "metadata": {
      "source": "Ministère Agriculture CI",
      "region": "Bouaké",
      "category": "plantation",
      "crop": "manioc"
    }
  }'
```

---

## GET `/admin/knowledge`

Search the knowledge base using semantic vector similarity.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query |
| `region` | string | No | - | Filter by region |
| `limit` | integer | No | 10 | Number of results (max: 50) |

### Response

**Success (200 OK)**:
```json
{
  "results": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "content": "Le manioc nécessite un sol bien drainé et une température entre 25-29°C...",
      "similarity": 0.92,
      "metadata": {
        "source": "Ministère de l'Agriculture - Guide Manioc 2025",
        "page": 15,
        "region": "Bouaké",
        "category": "plantation",
        "crop": "manioc"
      }
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "content": "Culture du manioc: choisir un terrain plat ou légèrement incliné...",
      "similarity": 0.87,
      "metadata": {
        "source": "Guide Pratique Agriculture CI 2024",
        "page": 42,
        "region": "Bouaké",
        "category": "plantation",
        "crop": "manioc"
      }
    }
  ]
}
```

**Search Result Object**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Document ID |
| `content` | string | Document text |
| `similarity` | float | Cosine similarity score (0-1) |
| `metadata` | object | Document metadata |

### Search Process

1. **Generate embedding** for query text (768-dim vector)
2. **pgvector search** using HNSW index with cosine distance
3. **Filter** by metadata (region, category, etc.) if provided
4. **Return** top-k results sorted by similarity

### Examples

**Basic search**:
```typescript
const results = await adminFetch('/admin/knowledge?query=plantation manioc&limit=5');

results.results.forEach(doc => {
  console.log(`Similarity: ${doc.similarity.toFixed(2)}`);
  console.log(`Content: ${doc.content.substring(0, 100)}...`);
});
```

**Region-specific search**:
```typescript
const bouakeResults = await adminFetch(
  '/admin/knowledge?query=maïs plantation&region=Bouaké&limit=10'
);
```

**curl**:
```bash
# Search for cassava information
curl -X GET "https://wouribot-backend.onrender.com/admin/knowledge?query=manioc%20plantation&limit=10" \
  -H "x-admin-key: your-api-key"

# Region-specific search
curl -X GET "https://wouribot-backend.onrender.com/admin/knowledge?query=maïs&region=Bouaké" \
  -H "x-admin-key: your-api-key"
```

---

## Use Cases

### 1. Bulk Import Documents

```typescript
const documents = [
  {
    content: "Le maïs se plante entre avril et juin...",
    metadata: {
      source: "Guide Maïs 2025",
      region: "Bouaké",
      category: "plantation",
      crop: "maïs"
    }
  },
  {
    content: "Le cacao nécessite de l'ombre...",
    metadata: {
      source: "Guide Cacao 2025",
      region: "Daloa",
      category: "plantation",
      crop: "cacao"
    }
  }
];

for (const doc of documents) {
  await adminFetch('/admin/knowledge', {
    method: 'POST',
    body: JSON.stringify(doc)
  });

  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### 2. Verify Document Quality

```typescript
// Add a document
const newDoc = await adminFetch('/admin/knowledge', {
  method: 'POST',
  body: JSON.stringify({
    content: "Le manioc...",
    metadata: { source: "Test", crop: "manioc" }
  })
});

// Immediately search to verify it's indexed
const searchResults = await adminFetch(
  `/admin/knowledge?query=manioc&limit=1`
);

if (searchResults.results[0]?.id === newDoc.id) {
  console.log('✅ Document successfully indexed!');
  console.log(`Similarity: ${searchResults.results[0].similarity}`);
}
```

### 3. Find Similar Documents

```typescript
// Find documents similar to a specific one
const targetDoc = await adminFetch(
  `/admin/knowledge?query=${encodeURIComponent(existingDocument.content)}&limit=5`
);

// Filter out the original document
const similar = targetDoc.results.filter(r => r.id !== existingDocument.id);

console.log('Similar documents:');
similar.forEach(doc => {
  console.log(`- ${doc.content.substring(0, 50)}... (${doc.similarity.toFixed(2)})`);
});
```

### 4. Quality Audit

```typescript
// Search for a known topic
const results = await adminFetch('/admin/knowledge?query=plantation maïs Bouaké&limit=10');

// Check if we have enough good results
const highQuality = results.results.filter(r => r.similarity > 0.8);

if (highQuality.length < 3) {
  console.warn('⚠️ Low coverage for "plantation maïs Bouaké"');
  console.log('Consider adding more documents on this topic');
}
```

---

## Best Practices

### 1. Content Quality

**Good Example**:
```
Le manioc nécessite un sol bien drainé et une température entre 25-29°C.
La plantation se fait avec des boutures de 20-25cm prélevées sur des plants sains.
Espacement recommandé: 1m entre rangs et 1m entre plants.
Récolte après 10-12 mois lorsque les feuilles jaunissent.
```

**Poor Example**:
```
Le manioc
```

### 2. Metadata Guidelines

- ✅ **Always include source** - Track document provenance
- ✅ **Add region** - Enables location-specific search
- ✅ **Specify crop** - Improves search relevance
- ✅ **Use categories** - plantation, harvest, disease, weather, general

### 3. Content Length

| Length | Recommendation |
|--------|----------------|
| < 50 chars | Too short - add more detail |
| 50-500 chars | Good for specific facts |
| 500-2000 chars | Ideal for comprehensive guides |
| 2000-5000 chars | Maximum - consider splitting |

### 4. Similarity Thresholds

| Similarity | Interpretation |
|------------|----------------|
| > 0.9 | Excellent match |
| 0.8 - 0.9 | Good match |
| 0.7 - 0.8 | Relevant |
| < 0.7 | May not be relevant |

---

## Related Endpoints

- [Feedback](./feedback.md) - Alternative way to add knowledge via feedback
- [Translations](./translations.md) - Multilingual content management
