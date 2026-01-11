# Translations Endpoints

Manage multilingual translation database (Français, Dioula, Baoulé).

---

## POST `/admin/translations`

Add a new translation entry to the multilingual database.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Body**:
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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_text` | string | Yes | Source text (1-1000 chars) |
| `source_language` | enum | Yes | fr, dioula, baoulé, en |
| `target_language` | enum | Yes | fr, dioula, baoulé, en |
| `translated_text` | string | Yes | Translation (1-1000 chars) |
| `context` | string | No | Agricultural context (max 500 chars) |
| `verified` | boolean | No | Admin-verified translation (default: false) |

### Response

**Success (201 Created)**:
```json
{
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440000",
    "source_text": "Quand planter le maïs?",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "Kaba suman ka sɔrɔ?",
    "context": "agriculture",
    "verified": true,
    "created_by": "admin",
    "created_at": "2026-01-10T15:00:00Z",
    "updated_at": "2026-01-10T15:00:00Z"
  }
}
```

**Error (409 Conflict)**:
```json
{
  "error": "Translation already exists",
  "message": "Translation from fr to dioula already exists for this text"
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "message": "source_language and target_language must be different"
}
```

### Unique Constraint

The database enforces uniqueness on `(source_text, source_language, target_language)`.

You can have:
- ✅ "maïs" (fr → dioula) + "maïs" (fr → baoulé)
- ✅ "maïs" (fr → en) + "corn" (en → fr)
- ❌ Duplicate "maïs" (fr → dioula)

### Examples

**TypeScript/Fetch**:
```typescript
const translation = await adminFetch('/admin/translations', {
  method: 'POST',
  body: JSON.stringify({
    source_text: "maïs",
    source_language: "fr",
    target_language: "dioula",
    translated_text: "kaba",
    context: "crop name",
    verified: true
  })
});

console.log(`Translation created: ${translation.data.id}`);
```

**curl**:
```bash
curl -X POST "https://wouribot-backend.onrender.com/admin/translations" \
  -H "x-admin-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "Quand planter le maïs?",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "Kaba suman ka sɔrɔ?",
    "verified": true
  }'
```

---

## GET `/admin/translations`

Query translations with full-text search and filters.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | No | - | Full-text search in source_text |
| `source_language` | enum | No | - | fr, dioula, baoulé, en |
| `target_language` | enum | No | - | fr, dioula, baoulé, en |
| `limit` | integer | No | 20 | Number of results (max: 200) |
| `cursor` | ISO datetime | No | - | Pagination cursor |

### Response

**Success (200 OK)**:

With `query` parameter (full-text search):
```json
{
  "data": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "source_text": "maïs",
      "source_language": "fr",
      "target_language": "dioula",
      "translated_text": "kaba",
      "context": "crop name",
      "verified": true
    },
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
      "source_text": "plantation de maïs",
      "source_language": "fr",
      "target_language": "dioula",
      "translated_text": "kaba suman",
      "context": "agriculture",
      "verified": true
    }
  ],
  "nextCursor": "2026-01-10T15:00:00Z",
  "hasMore": false
}
```

Without `query` parameter (simple filtering):
```json
{
  "data": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "source_text": "maïs",
      "source_language": "fr",
      "target_language": "dioula",
      "translated_text": "kaba",
      "context": "crop name",
      "verified": true,
      "created_by": "admin",
      "created_at": "2026-01-10T15:00:00Z",
      "updated_at": "2026-01-10T15:00:00Z"
    }
  ],
  "nextCursor": "2026-01-10T15:00:00Z",
  "hasMore": false
}
```

### Examples

**Full-text search**:
```typescript
// Search for "maïs" in source text
const results = await adminFetch('/admin/translations?query=maïs&limit=10');

results.data.forEach(t => {
  console.log(`${t.source_text} (${t.source_language}) → ${t.translated_text} (${t.target_language})`);
});
```

**Filter by language pair**:
```typescript
// Get all French to Dioula translations
const frToDioula = await adminFetch(
  '/admin/translations?source_language=fr&target_language=dioula&limit=100'
);
```

**Verified translations only**:
```typescript
// Get verified translations only
const verified = await adminFetch('/admin/translations?verified_only=true');
```

**curl**:
```bash
# Search translations
curl -X GET "https://wouribot-backend.onrender.com/admin/translations?query=maïs" \
  -H "x-admin-key: your-api-key"

# Get all French to Dioula translations
curl -X GET "https://wouribot-backend.onrender.com/admin/translations?source_language=fr&target_language=dioula" \
  -H "x-admin-key: your-api-key"

# Get verified translations only
curl -X GET "https://wouribot-backend.onrender.com/admin/translations?verified_only=true&limit=50" \
  -H "x-admin-key: your-api-key"
```

---

## Use Cases

### 1. Bulk Import Translations

```typescript
const translations = [
  {
    source_text: "maïs",
    source_language: "fr",
    target_language: "dioula",
    translated_text: "kaba",
    context: "crop",
    verified: true
  },
  {
    source_text: "manioc",
    source_language: "fr",
    target_language: "dioula",
    translated_text: "banan",
    context: "crop",
    verified: true
  },
  {
    source_text: "cacao",
    source_language: "fr",
    target_language: "dioula",
    translated_text: "kakao",
    context: "crop",
    verified: true
  }
];

for (const t of translations) {
  try {
    await adminFetch('/admin/translations', {
      method: 'POST',
      body: JSON.stringify(t)
    });
    console.log(`✅ Added: ${t.source_text} → ${t.translated_text}`);
  } catch (error) {
    console.error(`❌ Failed: ${t.source_text}`, error.message);
  }
}
```

### 2. Translation Coverage Report

```typescript
const languages = ['fr', 'dioula', 'baoulé'];

for (const source of languages) {
  for (const target of languages) {
    if (source === target) continue;

    const translations = await adminFetch(
      `/admin/translations?source_language=${source}&target_language=${target}&limit=1000`
    );

console.log(`${source} → ${target}: ${translations.data.length} translations`);
  }
}

// Output:
// fr → dioula: 45 translations
// fr → baoulé: 32 translations
// dioula → fr: 45 translations
// baoulé → fr: 32 translations
```

### 3. Verification Workflow

```typescript
// Get unverified translations
const unverified = await adminFetch('/admin/translations?verified_only=false&limit=100');
const needsReview = unverified.data.filter(t => !t.verified);

console.log(`${needsReview.length} translations need verification`);

// Review and verify each one
for (const t of needsReview) {
  console.log(`\nReview: ${t.source_text} (${t.source_language}) → ${t.translated_text} (${t.target_language})`);

  // After manual verification, update (Note: UPDATE endpoint not yet implemented)
  // Would need PATCH /admin/translations/:id endpoint
}
```

### 4. Find Missing Translations

```typescript
// Core agricultural terms
const coreTerms = ["maïs", "manioc", "cacao", "plantation", "récolte", "engrais"];

for (const term of coreTerms) {
  // Check French → Dioula
  const frToDioula = await adminFetch(
    `/admin/translations?query=${term}&source_language=fr&target_language=dioula`
  );

  if (frToDioula.data.length === 0) {
    console.warn(`⚠️ Missing FR→Dioula: ${term}`);
  }

  // Check French → Baoulé
  const frToBaoule = await adminFetch(
    `/admin/translations?query=${term}&source_language=fr&target_language=baoulé`
  );

  if (frToBaoule.data.length === 0) {
    console.warn(`⚠️ Missing FR→Baoulé: ${term}`);
  }
}
```

---

## Best Practices

### 1. Language Codes

Use ISO 639-1 codes:

| Language | Code | Notes |
|----------|------|-------|
| Français | `fr` | Standard French |
| Dioula | `dioula` | Bambara variant spoken in CI |
| Baoulé | `baoulé` | Akan language of CI |
| English | `en` | For documentation |

### 2. Translation Quality

**Good Translation**:
- ✅ Culturally appropriate
- ✅ Uses common terms
- ✅ Verified by native speaker
- ✅ Includes context

**Poor Translation**:
- ❌ Direct word-for-word translation
- ❌ No context provided
- ❌ Not verified

### 3. Context Guidelines

| Context | Description | Example |
|---------|-------------|---------|
| `crop` | Crop name | "maïs" → "kaba" |
| `action` | Agricultural action | "planter" → "suman" |
| `season` | Season/timing | "saison des pluies" → "..." |
| `tool` | Tool/equipment | "houe" → "..." |
| `disease` | Plant disease | "mildiou" → "..." |

### 4. Verification Process

1. **Add translation** with `verified: false`
2. **Review** with native speaker
3. **Test** in real conversation
4. **Update** to `verified: true` (when PATCH endpoint available)

---

## Language Support

### Current Languages

| Language | Speakers in CI | RAG Support | Translation DB |
|----------|----------------|-------------|----------------|
| Français | ~10M (official) | ✅ | ✅ |
| Dioula | ~5M (north) | ✅ | ✅ |
| Baoulé | ~4M (center) | ✅ | ✅ |

### Future Languages

- Bété
- Senoufo
- Malinké
- Agni

---

## Related Endpoints

- [Knowledge Base](./knowledge.md) - Add multilingual agricultural content
- [Conversations](./conversations.md) - View conversations by language
