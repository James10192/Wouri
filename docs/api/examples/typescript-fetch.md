# TypeScript Fetch Examples

Complete guide to using the Wouri Bot Admin API with TypeScript and the Fetch API.

---

## Setup

### Environment Variables

```typescript
// .env.local (Next.js)
NEXT_PUBLIC_API_BASE_URL=https://wouribot-backend.onrender.com
NEXT_PUBLIC_ADMIN_API_KEY=your_admin_api_key_here
```

### Base Fetch Client

```typescript
// lib/admin-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://wouribot-backend.onrender.com";
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  throw new Error("NEXT_PUBLIC_ADMIN_API_KEY is not defined");
}

export async function adminFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Unknown error",
      message: response.statusText,
    }));
    throw new Error(error.message || error.error || "API request failed");
  }

  return response.json();
}
```

---

## Conversations

### List Conversations

```typescript
// Get recent conversations
interface ConversationListParams {
  limit?: number;
  cursor?: string;
  wa_id?: string;
  language?: "fr" | "dioula" | "baoulé" | "en";
}

interface ConversationListResponse {
  conversations: Conversation[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

async function getConversations(
  params: ConversationListParams = {}
): Promise<ConversationListResponse> {
  const searchParams = new URLSearchParams();

  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.cursor) searchParams.append("cursor", params.cursor);
  if (params.wa_id) searchParams.append("wa_id", params.wa_id);
  if (params.language) searchParams.append("language", params.language);

  const queryString = searchParams.toString();
  const endpoint = `/admin/conversations${queryString ? `?${queryString}` : ""}`;

  return adminFetch<ConversationListResponse>(endpoint);
}

// Usage
const conversations = await getConversations({ limit: 20, language: "fr" });
console.log(`Found ${conversations.total} conversations`);
```

### Pagination

```typescript
// Fetch all conversations with pagination
async function* paginateConversations(
  params: ConversationListParams = {}
): AsyncGenerator<Conversation[], void, unknown> {
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const response = await getConversations({ ...params, cursor: cursor || undefined });

    yield response.conversations;

    cursor = response.nextCursor;
    hasMore = response.hasMore;
  }
}

// Usage
for await (const batch of paginateConversations({ limit: 50 })) {
  console.log(`Processing ${batch.length} conversations`);
  batch.forEach(conv => {
    console.log(`${conv.wa_id}: ${conv.user_message}`);
  });
}
```

### Get Conversation Details

```typescript
interface ConversationDetail extends Conversation {
  feedback: Feedback[];
}

async function getConversationById(id: string): Promise<ConversationDetail> {
  return adminFetch<ConversationDetail>(`/admin/conversations/${id}`);
}

// Usage
const conversation = await getConversationById("550e8400-e29b-41d4-a716-446655440000");
console.log(`Conversation has ${conversation.feedback.length} feedback entries`);
console.log(`Average rating: ${conversation.average_rating}/5`);
```

---

## Feedback

### Submit Feedback

```typescript
interface FeedbackCreateParams {
  conversation_id: string;
  rating?: number;
  comment?: string;
  embed_immediately?: boolean;
}

interface FeedbackCreateResponse {
  id: string;
  conversation_id: string;
  wa_id: string;
  rating: number | null;
  comment: string | null;
  is_embedded: boolean;
  created_at: string;
  updated_at: string;
}

async function submitFeedback(
  params: FeedbackCreateParams
): Promise<FeedbackCreateResponse> {
  return adminFetch<FeedbackCreateResponse>("/admin/feedback", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Usage - Submit with rating and comment
const feedback = await submitFeedback({
  conversation_id: "550e8400-e29b-41d4-a716-446655440000",
  rating: 5,
  comment: "Excellent advice on maize planting periods! Very accurate for Bouaké region.",
  embed_immediately: true,
});

console.log(`Feedback created: ${feedback.id}`);
console.log(`Embedded: ${feedback.is_embedded}`);

// Usage - Submit rating only
const ratingFeedback = await submitFeedback({
  conversation_id: "550e8400-e29b-41d4-a716-446655440000",
  rating: 4,
});
```

### List Feedback

```typescript
interface FeedbackListParams {
  limit?: number;
  wa_id?: string;
  min_rating?: number;
}

interface FeedbackListResponse {
  feedback: Feedback[];
}

async function listFeedback(
  params: FeedbackListParams = {}
): Promise<FeedbackListResponse> {
  const searchParams = new URLSearchParams();

  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.wa_id) searchParams.append("wa_id", params.wa_id);
  if (params.min_rating) searchParams.append("min_rating", params.min_rating.toString());

  const queryString = searchParams.toString();
  const endpoint = `/admin/feedback${queryString ? `?${queryString}` : ""}`;

  return adminFetch<FeedbackListResponse>(endpoint);
}

// Usage - Get all feedback
const allFeedback = await listFeedback({ limit: 100 });

// Usage - Get high-rated feedback only
const topFeedback = await listFeedback({ min_rating: 5 });

// Usage - Get feedback for specific user
const userFeedback = await listFeedback({ wa_id: "1234567890" });
```

### Batch Feedback Submission

```typescript
async function submitBatchFeedback(
  feedbackList: FeedbackCreateParams[]
): Promise<FeedbackCreateResponse[]> {
  const results: FeedbackCreateResponse[] = [];

  for (const params of feedbackList) {
    try {
      const feedback = await submitFeedback(params);
      results.push(feedback);
      console.log(`✅ Feedback submitted: ${feedback.id}`);
    } catch (error) {
      console.error(`❌ Failed to submit feedback:`, error);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Usage
const feedbackBatch = [
  {
    conversation_id: "conv-1",
    rating: 5,
    comment: "Excellent advice!",
  },
  {
    conversation_id: "conv-2",
    rating: 4,
    comment: "Very helpful.",
  },
];

await submitBatchFeedback(feedbackBatch);
```

---

## Knowledge Base

### Add Document

```typescript
interface DocumentMetadata {
  source: string;
  page?: number;
  region?: string;
  category?: "plantation" | "harvest" | "disease" | "weather" | "general";
  crop?: string;
  language?: "fr" | "dioula" | "baoulé" | "en";
  verified?: boolean;
}

interface KnowledgeCreateParams {
  content: string;
  metadata: DocumentMetadata;
}

interface Document {
  id: string;
  content: string;
  embedding: string;
  metadata: DocumentMetadata;
  created_at: string;
}

async function addDocument(params: KnowledgeCreateParams): Promise<Document> {
  return adminFetch<Document>("/admin/knowledge", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Usage
const document = await addDocument({
  content: "Le manioc nécessite un sol bien drainé et une température entre 25-29°C. La plantation se fait avec des boutures de 20-25cm.",
  metadata: {
    source: "Ministère de l'Agriculture - Guide Manioc 2025",
    page: 15,
    region: "Bouaké",
    category: "plantation",
    crop: "manioc",
    language: "fr",
    verified: true,
  },
});

console.log(`Document added: ${document.id}`);
```

### Search Knowledge Base

```typescript
interface KnowledgeSearchParams {
  query: string;
  region?: string;
  limit?: number;
}

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: DocumentMetadata;
}

interface KnowledgeSearchResponse {
  results: SearchResult[];
}

async function searchKnowledge(
  params: KnowledgeSearchParams
): Promise<KnowledgeSearchResponse> {
  const searchParams = new URLSearchParams();

  searchParams.append("query", params.query);
  if (params.region) searchParams.append("region", params.region);
  if (params.limit) searchParams.append("limit", params.limit.toString());

  return adminFetch<KnowledgeSearchResponse>(`/admin/knowledge?${searchParams.toString()}`);
}

// Usage - Basic search
const results = await searchKnowledge({
  query: "plantation manioc",
  limit: 5,
});

results.results.forEach(doc => {
  console.log(`Similarity: ${doc.similarity.toFixed(2)}`);
  console.log(`Content: ${doc.content.substring(0, 100)}...`);
});

// Usage - Region-specific search
const bouakeResults = await searchKnowledge({
  query: "maïs plantation",
  region: "Bouaké",
  limit: 10,
});
```

### Bulk Import Documents

```typescript
async function bulkImportDocuments(
  documents: KnowledgeCreateParams[]
): Promise<Document[]> {
  const results: Document[] = [];

  for (const doc of documents) {
    try {
      const created = await addDocument(doc);
      results.push(created);
      console.log(`✅ Added: ${doc.metadata.source}`);
    } catch (error) {
      console.error(`❌ Failed: ${doc.metadata.source}`, error);
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Usage
const documents = [
  {
    content: "Le maïs se plante entre avril et juin...",
    metadata: {
      source: "Guide Maïs 2025",
      region: "Bouaké",
      category: "plantation" as const,
      crop: "maïs",
    },
  },
  {
    content: "Le cacao nécessite de l'ombre...",
    metadata: {
      source: "Guide Cacao 2025",
      region: "Daloa",
      category: "plantation" as const,
      crop: "cacao",
    },
  },
];

await bulkImportDocuments(documents);
```

---

## Translations

### Add Translation

```typescript
interface TranslationCreateParams {
  source_text: string;
  source_language: "fr" | "dioula" | "baoulé" | "en";
  target_language: "fr" | "dioula" | "baoulé" | "en";
  translated_text: string;
  context?: string;
  verified?: boolean;
}

interface Translation {
  id: string;
  source_text: string;
  source_language: string;
  target_language: string;
  translated_text: string;
  context: string | null;
  verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function addTranslation(
  params: TranslationCreateParams
): Promise<Translation> {
  return adminFetch<Translation>("/admin/translations", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Usage
const translation = await addTranslation({
  source_text: "maïs",
  source_language: "fr",
  target_language: "dioula",
  translated_text: "kaba",
  context: "crop name",
  verified: true,
});

console.log(`Translation created: ${translation.id}`);
```

### Search Translations

```typescript
interface TranslationSearchParams {
  query?: string;
  source_language?: "fr" | "dioula" | "baoulé" | "en";
  target_language?: "fr" | "dioula" | "baoulé" | "en";
  verified_only?: boolean;
  limit?: number;
}

interface TranslationSearchResult extends Translation {
  relevance?: number;
}

interface TranslationSearchResponse {
  translations: TranslationSearchResult[];
}

async function searchTranslations(
  params: TranslationSearchParams = {}
): Promise<TranslationSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.append("query", params.query);
  if (params.source_language) searchParams.append("source_language", params.source_language);
  if (params.target_language) searchParams.append("target_language", params.target_language);
  if (params.verified_only) searchParams.append("verified_only", "true");
  if (params.limit) searchParams.append("limit", params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/admin/translations${queryString ? `?${queryString}` : ""}`;

  return adminFetch<TranslationSearchResponse>(endpoint);
}

// Usage - Full-text search
const results = await searchTranslations({
  query: "maïs",
  limit: 10,
});

results.translations.forEach(t => {
  console.log(`${t.source_text} (${t.source_language}) → ${t.translated_text} (${t.target_language})`);
  if (t.relevance) console.log(`Relevance: ${t.relevance}`);
});

// Usage - Get language pair
const frToDioula = await searchTranslations({
  source_language: "fr",
  target_language: "dioula",
  limit: 100,
});

// Usage - Verified translations only
const verified = await searchTranslations({
  verified_only: true,
});
```

### Bulk Import Translations

```typescript
async function bulkImportTranslations(
  translations: TranslationCreateParams[]
): Promise<Translation[]> {
  const results: Translation[] = [];

  for (const t of translations) {
    try {
      const created = await addTranslation(t);
      results.push(created);
      console.log(`✅ Added: ${t.source_text} → ${t.translated_text}`);
    } catch (error) {
      console.error(`❌ Failed: ${t.source_text}`, error);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Usage
const translations = [
  {
    source_text: "maïs",
    source_language: "fr" as const,
    target_language: "dioula" as const,
    translated_text: "kaba",
    context: "crop",
    verified: true,
  },
  {
    source_text: "manioc",
    source_language: "fr" as const,
    target_language: "dioula" as const,
    translated_text: "banan",
    context: "crop",
    verified: true,
  },
];

await bulkImportTranslations(translations);
```

---

## Monitoring

### Check Service Status

```typescript
interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms: number;
  last_checked: string;
  error_message?: string;
}

interface MonitoringResponse {
  services: {
    backend: ServiceStatus;
    supabase: ServiceStatus;
    groq: ServiceStatus;
    openweather: ServiceStatus;
    embeddings: ServiceStatus;
  };
}

async function checkServiceStatus(): Promise<MonitoringResponse> {
  return adminFetch<MonitoringResponse>("/admin/monitoring");
}

// Usage
const status = await checkServiceStatus();

// Check if all services are healthy
const allHealthy = Object.values(status.services).every(
  service => service.status === "healthy"
);

if (allHealthy) {
  console.log("✅ All services healthy");
} else {
  console.error("⚠️ Some services are unhealthy:");
  Object.entries(status.services).forEach(([name, service]) => {
    if (service.status !== "healthy") {
      console.error(`- ${name}: ${service.error_message}`);
    }
  });
}

// Display latencies
Object.entries(status.services).forEach(([name, service]) => {
  console.log(`${name}: ${service.latency_ms}ms`);
});
```

### Continuous Monitoring

```typescript
async function monitorServicesInterval(intervalMs: number = 30000): Promise<void> {
  const check = async () => {
    try {
      const status = await checkServiceStatus();

      const unhealthy = Object.entries(status.services)
        .filter(([_, service]) => service.status === "unhealthy");

      if (unhealthy.length > 0) {
        console.error(`[${new Date().toISOString()}] ⚠️ ${unhealthy.length} service(s) unhealthy`);
        unhealthy.forEach(([name, service]) => {
          console.error(`  - ${name}: ${service.error_message}`);
        });
      } else {
        console.log(`[${new Date().toISOString()}] ✅ All services healthy`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Monitoring check failed:`, error);
    }
  };

  // Initial check
  await check();

  // Periodic checks
  setInterval(check, intervalMs);
}

// Usage - Check every 30 seconds
monitorServicesInterval(30000);
```

---

## Error Handling

### Type-Safe Error Handling

```typescript
interface ApiError {
  error: string;
  message?: string;
}

class AdminApiError extends Error {
  constructor(
    public error: string,
    public details?: string
  ) {
    super(details || error);
    this.name = "AdminApiError";
  }
}

export async function adminFetchSafe<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_API_KEY!,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "Unknown error",
        message: response.statusText,
      }));

      throw new AdminApiError(error.error, error.message);
    }

    return response.json();
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }

    // Network errors
    throw new AdminApiError("Network error", (error as Error).message);
  }
}

// Usage
try {
  const conversations = await adminFetchSafe<ConversationListResponse>("/admin/conversations");
  console.log(`Found ${conversations.total} conversations`);
} catch (error) {
  if (error instanceof AdminApiError) {
    console.error(`API Error: ${error.error}`);
    if (error.details) console.error(`Details: ${error.details}`);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

---

## Complete Example

```typescript
// Complete admin dashboard workflow
async function adminWorkflow() {
  try {
    // 1. Check service status
    console.log("Checking service status...");
    const status = await checkServiceStatus();

    if (!Object.values(status.services).every(s => s.status === "healthy")) {
      console.warn("⚠️ Some services are unhealthy");
    }

    // 2. Get recent conversations
    console.log("\nFetching recent conversations...");
    const conversations = await getConversations({ limit: 10, language: "fr" });
    console.log(`Found ${conversations.total} conversations`);

    // 3. Find low-rated conversations
    const lowRated = conversations.conversations.filter(
      c => c.average_rating && c.average_rating < 3
    );
    console.log(`${lowRated.length} conversations need review`);

    // 4. Submit feedback for low-rated conversations
    for (const conv of lowRated) {
      const feedback = await submitFeedback({
        conversation_id: conv.id,
        rating: 5,
        comment: "Improved answer with region-specific details...",
        embed_immediately: true,
      });
      console.log(`✅ Feedback submitted: ${feedback.id}`);
    }

    // 5. Add new knowledge
    console.log("\nAdding new knowledge...");
    const document = await addDocument({
      content: "Le maïs se plante à Bouaké entre avril et juin...",
      metadata: {
        source: "Guide Maïs 2025",
        region: "Bouaké",
        category: "plantation",
        crop: "maïs",
        verified: true,
      },
    });
    console.log(`✅ Document added: ${document.id}`);

    console.log("\n✅ Workflow completed successfully");
  } catch (error) {
    console.error("❌ Workflow failed:", error);
  }
}

// Run workflow
adminWorkflow();
```

---

## TypeScript Types

Complete type definitions for the Admin API:

```typescript
// types/admin.ts
export interface Conversation {
  id: string;
  wa_id: string;
  message_id: string;
  message_type: "text" | "audio" | "image";
  user_message: string;
  bot_response: string;
  language: "fr" | "dioula" | "baoulé" | "en";
  region: string | null;
  feedback_count: number;
  average_rating: number | null;
  model_used: string | null;
  tokens_used: number | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  conversation_id: string;
  wa_id: string;
  rating: number | null;
  comment: string | null;
  is_embedded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  content: string;
  embedding: string | null;
  metadata: DocumentMetadata;
  created_at: string;
}

export interface DocumentMetadata {
  source: string;
  page?: number;
  region?: string;
  category?: "plantation" | "harvest" | "disease" | "weather" | "general";
  crop?: string;
  language?: "fr" | "dioula" | "baoulé" | "en";
  verified?: boolean;
  [key: string]: any;
}

export interface Translation {
  id: string;
  source_text: string;
  source_language: "fr" | "dioula" | "baoulé" | "en";
  target_language: "fr" | "dioula" | "baoulé" | "en";
  translated_text: string;
  context: string | null;
  verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms: number;
  last_checked: string;
  error_message?: string;
}
```
