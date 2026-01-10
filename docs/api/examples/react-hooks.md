# React Hooks Examples

Custom React hooks for integrating the Wouri Bot Admin API with Next.js 16 App Router.

---

## Setup

### Install Dependencies

```bash
bun add swr zustand
```

### Admin API Client

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

## useConversations Hook

Fetch and paginate conversations with SWR.

```typescript
// hooks/useConversations.ts
"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";

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

export function useConversations(params: ConversationListParams = {}) {
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);

  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.cursor) queryParams.append("cursor", params.cursor);
  if (params.wa_id) queryParams.append("wa_id", params.wa_id);
  if (params.language) queryParams.append("language", params.language);

  const endpoint = `/admin/conversations${queryParams.toString() ? `?${queryParams}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<ConversationListResponse>(
    endpoint,
    adminFetch,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const loadMore = useCallback(async () => {
    if (!data?.nextCursor) return;

    const nextPage = await adminFetch<ConversationListResponse>(
      `/admin/conversations?${new URLSearchParams({
        ...Object.fromEntries(queryParams),
        cursor: data.nextCursor,
      })}`
    );

    setAllConversations(prev => [...prev, ...nextPage.conversations]);
    mutate(
      {
        ...nextPage,
        conversations: [...allConversations, ...nextPage.conversations],
      },
      false
    );
  }, [data?.nextCursor, allConversations, queryParams, mutate]);

  return {
    conversations: data?.conversations || [],
    allConversations: allConversations.length > 0 ? allConversations : data?.conversations || [],
    nextCursor: data?.nextCursor || null,
    hasMore: data?.hasMore || false,
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
    loadMore,
  };
}

// Usage in component
export default function ConversationsPage() {
  const { conversations, hasMore, isLoading, error, loadMore } = useConversations({
    limit: 20,
    language: "fr",
  });

  if (isLoading) return <div>Loading conversations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Conversations ({conversations.length})</h1>
      {conversations.map(conv => (
        <div key={conv.id}>
          <p><strong>User:</strong> {conv.user_message}</p>
          <p><strong>Bot:</strong> {conv.bot_response}</p>
          <p>Rating: {conv.average_rating || "N/A"}</p>
        </div>
      ))}
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

---

## useConversation Hook

Fetch single conversation with feedback.

```typescript
// hooks/useConversation.ts
"use client";

import useSWR from "swr";
import { adminFetch } from "@/lib/admin-api";

interface ConversationDetail extends Conversation {
  feedback: Feedback[];
}

export function useConversation(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ConversationDetail>(
    id ? `/admin/conversations/${id}` : null,
    adminFetch,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    conversation: data || null,
    isLoading,
    error,
    mutate,
  };
}

// Usage in component
export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const { conversation, isLoading, error } = useConversation(params.id);

  if (isLoading) return <div>Loading conversation...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!conversation) return <div>Conversation not found</div>;

  return (
    <div>
      <h1>Conversation Details</h1>
      <p><strong>User:</strong> {conversation.user_message}</p>
      <p><strong>Bot:</strong> {conversation.bot_response}</p>
      <p><strong>Language:</strong> {conversation.language}</p>
      <p><strong>Region:</strong> {conversation.region}</p>

      <h2>Feedback ({conversation.feedback.length})</h2>
      {conversation.feedback.map(fb => (
        <div key={fb.id}>
          <p>Rating: {fb.rating}/5</p>
          <p>{fb.comment}</p>
          <p>Embedded: {fb.is_embedded ? "Yes" : "No"}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## useFeedback Hook

Submit and list feedback.

```typescript
// hooks/useFeedback.ts
"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";

interface FeedbackListParams {
  limit?: number;
  wa_id?: string;
  min_rating?: number;
}

interface FeedbackCreateParams {
  conversation_id: string;
  rating?: number;
  comment?: string;
  embed_immediately?: boolean;
}

export function useFeedback(params: FeedbackListParams = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.wa_id) queryParams.append("wa_id", params.wa_id);
  if (params.min_rating) queryParams.append("min_rating", params.min_rating.toString());

  const endpoint = `/admin/feedback${queryParams.toString() ? `?${queryParams}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<{ feedback: Feedback[] }>(
    endpoint,
    adminFetch,
    {
      revalidateOnFocus: false,
    }
  );

  const submitFeedback = useCallback(
    async (params: FeedbackCreateParams) => {
      setIsSubmitting(true);
      try {
        const feedback = await adminFetch<Feedback>("/admin/feedback", {
          method: "POST",
          body: JSON.stringify(params),
        });

        // Optimistically update cache
        mutate(
          current => ({
            feedback: current ? [feedback, ...current.feedback] : [feedback],
          }),
          false
        );

        return feedback;
      } catch (error) {
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [mutate]
  );

  return {
    feedback: data?.feedback || [],
    isLoading,
    error,
    isSubmitting,
    submitFeedback,
    mutate,
  };
}

// Usage in component
export default function FeedbackForm({ conversationId }: { conversationId: string }) {
  const { submitFeedback, isSubmitting } = useFeedback();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await submitFeedback({
        conversation_id: conversationId,
        rating,
        comment,
        embed_immediately: true,
      });

      alert("Feedback submitted successfully!");
      setComment("");
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Rating:
        <select value={rating} onChange={e => setRating(Number(e.target.value))}>
          <option value={5}>5 - Perfect</option>
          <option value={4}>4 - Good</option>
          <option value={3}>3 - Acceptable</option>
          <option value={2}>2 - Poor</option>
          <option value={1}>1 - Bad</option>
        </select>
      </label>

      <label>
        Comment:
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Provide detailed feedback..."
        />
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Feedback"}
      </button>
    </form>
  );
}
```

---

## useKnowledge Hook

Add and search knowledge base documents.

```typescript
// hooks/useKnowledge.ts
"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";

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

interface KnowledgeCreateParams {
  content: string;
  metadata: DocumentMetadata;
}

export function useKnowledge(searchParams: KnowledgeSearchParams | null = null) {
  const [isAdding, setIsAdding] = useState(false);

  const endpoint = searchParams
    ? `/admin/knowledge?${new URLSearchParams({
        query: searchParams.query,
        ...(searchParams.region && { region: searchParams.region }),
        ...(searchParams.limit && { limit: searchParams.limit.toString() }),
      })}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{ results: SearchResult[] }>(
    endpoint,
    adminFetch,
    {
      revalidateOnFocus: false,
    }
  );

  const addDocument = useCallback(
    async (params: KnowledgeCreateParams) => {
      setIsAdding(true);
      try {
        const document = await adminFetch<Document>("/admin/knowledge", {
          method: "POST",
          body: JSON.stringify(params),
        });

        return document;
      } catch (error) {
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
    []
  );

  return {
    results: data?.results || [],
    isLoading,
    error,
    isAdding,
    addDocument,
    mutate,
  };
}

// Usage in search component
export default function KnowledgeSearchPage() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const { results, isLoading, error } = useKnowledge(
    query ? { query, region, limit: 10 } : null
  );

  return (
    <div>
      <h1>Knowledge Base Search</h1>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search knowledge base..."
      />
      <input
        type="text"
        value={region}
        onChange={e => setRegion(e.target.value)}
        placeholder="Filter by region (optional)"
      />

      {isLoading && <div>Searching...</div>}
      {error && <div>Error: {error.message}</div>}

      <div>
        {results.map(doc => (
          <div key={doc.id}>
            <p><strong>Similarity:</strong> {doc.similarity.toFixed(2)}</p>
            <p>{doc.content}</p>
            <p><small>Source: {doc.metadata.source}</small></p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Usage in add document component
export function AddDocumentForm() {
  const { addDocument, isAdding } = useKnowledge();
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addDocument({
        content,
        metadata: {
          source: "Admin Dashboard",
          region: "Bouaké",
          category: "plantation",
          crop: "maïs",
          verified: true,
        },
      });

      alert("Document added successfully!");
      setContent("");
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Enter document content..."
        rows={10}
      />
      <button type="submit" disabled={isAdding}>
        {isAdding ? "Adding..." : "Add Document"}
      </button>
    </form>
  );
}
```

---

## useTranslations Hook

Add and search translations.

```typescript
// hooks/useTranslations.ts
"use client";

import useSWR from "swr";
import { useState, useCallback } from "react";
import { adminFetch } from "@/lib/admin-api";

interface TranslationSearchParams {
  query?: string;
  source_language?: "fr" | "dioula" | "baoulé" | "en";
  target_language?: "fr" | "dioula" | "baoulé" | "en";
  verified_only?: boolean;
  limit?: number;
}

interface TranslationCreateParams {
  source_text: string;
  source_language: "fr" | "dioula" | "baoulé" | "en";
  target_language: "fr" | "dioula" | "baoulé" | "en";
  translated_text: string;
  context?: string;
  verified?: boolean;
}

export function useTranslations(searchParams: TranslationSearchParams = {}) {
  const [isAdding, setIsAdding] = useState(false);

  const queryParams = new URLSearchParams();
  if (searchParams.query) queryParams.append("query", searchParams.query);
  if (searchParams.source_language) queryParams.append("source_language", searchParams.source_language);
  if (searchParams.target_language) queryParams.append("target_language", searchParams.target_language);
  if (searchParams.verified_only) queryParams.append("verified_only", "true");
  if (searchParams.limit) queryParams.append("limit", searchParams.limit.toString());

  const endpoint = `/admin/translations${queryParams.toString() ? `?${queryParams}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<{ translations: Translation[] }>(
    endpoint,
    adminFetch,
    {
      revalidateOnFocus: false,
    }
  );

  const addTranslation = useCallback(
    async (params: TranslationCreateParams) => {
      setIsAdding(true);
      try {
        const translation = await adminFetch<Translation>("/admin/translations", {
          method: "POST",
          body: JSON.stringify(params),
        });

        // Optimistically update cache
        mutate(
          current => ({
            translations: current ? [translation, ...current.translations] : [translation],
          }),
          false
        );

        return translation;
      } catch (error) {
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
    [mutate]
  );

  return {
    translations: data?.translations || [],
    isLoading,
    error,
    isAdding,
    addTranslation,
    mutate,
  };
}

// Usage in component
export default function TranslationsPage() {
  const { translations, isLoading, error, addTranslation, isAdding } = useTranslations({
    source_language: "fr",
    target_language: "dioula",
    limit: 100,
  });

  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addTranslation({
        source_text: sourceText,
        source_language: "fr",
        target_language: "dioula",
        translated_text: translatedText,
        context: "crop",
        verified: true,
      });

      alert("Translation added!");
      setSourceText("");
      setTranslatedText("");
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  if (isLoading) return <div>Loading translations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Translations (FR → Dioula)</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={sourceText}
          onChange={e => setSourceText(e.target.value)}
          placeholder="French text"
        />
        <input
          type="text"
          value={translatedText}
          onChange={e => setTranslatedText(e.target.value)}
          placeholder="Dioula translation"
        />
        <button type="submit" disabled={isAdding}>
          {isAdding ? "Adding..." : "Add Translation"}
        </button>
      </form>

      <div>
        {translations.map(t => (
          <div key={t.id}>
            <p>{t.source_text} → {t.translated_text}</p>
            <p><small>{t.context}</small></p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## useMonitoring Hook

Monitor service health.

```typescript
// hooks/useMonitoring.ts
"use client";

import useSWR from "swr";
import { adminFetch } from "@/lib/admin-api";

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

export function useMonitoring(refreshInterval: number = 30000) {
  const { data, error, isLoading, mutate } = useSWR<MonitoringResponse>(
    "/admin/monitoring",
    adminFetch,
    {
      refreshInterval,
      revalidateOnFocus: true,
    }
  );

  const allHealthy =
    data && Object.values(data.services).every(s => s.status === "healthy");

  const unhealthyServices =
    data
      ? Object.entries(data.services)
          .filter(([_, service]) => service.status === "unhealthy")
          .map(([name]) => name)
      : [];

  return {
    services: data?.services || null,
    allHealthy: allHealthy || false,
    unhealthyServices,
    isLoading,
    error,
    mutate,
  };
}

// Usage in component
export default function MonitoringDashboard() {
  const { services, allHealthy, unhealthyServices, isLoading } = useMonitoring(30000);

  if (isLoading) return <div>Loading service status...</div>;
  if (!services) return <div>No service data available</div>;

  return (
    <div>
      <h1>Service Monitoring</h1>
      {allHealthy ? (
        <p style={{ color: "green" }}>✅ All services healthy</p>
      ) : (
        <p style={{ color: "red" }}>
          ⚠️ {unhealthyServices.length} service(s) unhealthy: {unhealthyServices.join(", ")}
        </p>
      )}

      {Object.entries(services).map(([name, service]) => (
        <div key={name}>
          <h3>
            {name} {service.status === "healthy" ? "✅" : "❌"}
          </h3>
          <p>Status: {service.status}</p>
          <p>Latency: {service.latency_ms}ms</p>
          {service.error_message && <p>Error: {service.error_message}</p>}
        </div>
      ))}
    </div>
  );
}
```

---

## useAdminStore Hook (Zustand)

Global state management for admin dashboard.

```typescript
// stores/admin-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminState {
  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Filters
  languageFilter: "fr" | "dioula" | "baoulé" | "en" | null;
  setLanguageFilter: (lang: "fr" | "dioula" | "baoulé" | "en" | null) => void;

  regionFilter: string | null;
  setRegionFilter: (region: string | null) => void;

  // Pagination
  conversationsPage: number;
  setConversationsPage: (page: number) => void;

  // Selection
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      // UI state
      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      // Filters
      languageFilter: null,
      setLanguageFilter: lang => set({ languageFilter: lang }),

      regionFilter: null,
      setRegionFilter: region => set({ regionFilter: region }),

      // Pagination
      conversationsPage: 1,
      setConversationsPage: page => set({ conversationsPage: page }),

      // Selection
      selectedConversationId: null,
      setSelectedConversationId: id => set({ selectedConversationId: id }),
    }),
    {
      name: "admin-store",
    }
  )
);

// Usage in component
export default function ConversationsWithFilters() {
  const {
    languageFilter,
    setLanguageFilter,
    regionFilter,
    setRegionFilter,
  } = useAdminStore();

  const { conversations, isLoading } = useConversations({
    language: languageFilter || undefined,
    limit: 20,
  });

  return (
    <div>
      <select value={languageFilter || ""} onChange={e => setLanguageFilter(e.target.value as any)}>
        <option value="">All languages</option>
        <option value="fr">Français</option>
        <option value="dioula">Dioula</option>
        <option value="baoulé">Baoulé</option>
      </select>

      {/* Conversations list */}
      {isLoading ? <div>Loading...</div> : (
        conversations.map(conv => <div key={conv.id}>{conv.user_message}</div>)
      )}
    </div>
  );
}
```

---

## Complete Dashboard Example

```typescript
// app/admin/page.tsx
"use client";

import { useConversations } from "@/hooks/useConversations";
import { useMonitoring } from "@/hooks/useMonitoring";
import { useFeedback } from "@/hooks/useFeedback";
import { useAdminStore } from "@/stores/admin-store";

export default function AdminDashboard() {
  const { languageFilter, setLanguageFilter } = useAdminStore();

  const { conversations, hasMore, isLoading: convLoading, loadMore } = useConversations({
    limit: 20,
    language: languageFilter || undefined,
  });

  const { services, allHealthy, isLoading: monLoading } = useMonitoring(30000);
  const { submitFeedback } = useFeedback();

  const handleSubmitFeedback = async (conversationId: string) => {
    try {
      await submitFeedback({
        conversation_id: conversationId,
        rating: 5,
        comment: "Excellent response!",
        embed_immediately: true,
      });
      alert("Feedback submitted!");
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Wouri Bot Admin Dashboard</h1>

      {/* Service Status */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Service Status</h2>
        {monLoading ? (
          <div>Loading status...</div>
        ) : (
          <div>
            {allHealthy ? (
              <p className="text-green-600">✅ All services healthy</p>
            ) : (
              <p className="text-red-600">⚠️ Some services are down</p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <label className="mr-2">Language:</label>
        <select
          value={languageFilter || ""}
          onChange={e => setLanguageFilter(e.target.value as any || null)}
          className="border p-2 rounded"
        >
          <option value="">All</option>
          <option value="fr">Français</option>
          <option value="dioula">Dioula</option>
          <option value="baoulé">Baoulé</option>
        </select>
      </div>

      {/* Conversations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>
        {convLoading ? (
          <div>Loading conversations...</div>
        ) : (
          <>
            <div className="space-y-4">
              {conversations.map(conv => (
                <div key={conv.id} className="border p-4 rounded">
                  <p><strong>User:</strong> {conv.user_message}</p>
                  <p><strong>Bot:</strong> {conv.bot_response}</p>
                  <p><strong>Language:</strong> {conv.language}</p>
                  <p><strong>Rating:</strong> {conv.average_rating || "N/A"}</p>
                  <button
                    onClick={() => handleSubmitFeedback(conv.id)}
                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Add Feedback
                  </button>
                </div>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                className="mt-4 bg-gray-500 text-white px-6 py-2 rounded"
              >
                Load More
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```
