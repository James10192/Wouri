# Frontend Integration Guide

Complete guide to integrating the Wouri Bot Admin API with Next.js 16 App Router frontend.

---

## Overview

This guide covers building a production-ready admin dashboard with:
- **Framework**: Next.js 16.0.10 + React 19.2.1
- **State Management**: Zustand + SWR
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript strict mode
- **Data Fetching**: SWR (stale-while-revalidate)

---

## Project Setup

### 1. Create Next.js Project

```bash
# Create Next.js app
bunx create-next-app@latest wouribot-admin \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd wouribot-admin
```

### 2. Install Dependencies

```bash
# Data fetching & state management
bun add swr zustand

# UI components (optional)
bun add @headlessui/react @heroicons/react

# Charts (optional)
bun add recharts

# Date formatting
bun add date-fns
```

### 3. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://wouribot-backend.onrender.com
NEXT_PUBLIC_ADMIN_API_KEY=your_admin_api_key_here
```

---

## Project Structure

```
wouribot-admin/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Dashboard home
│   ├── conversations/
│   │   ├── page.tsx                  # Conversations list
│   │   └── [id]/page.tsx             # Conversation details
│   ├── feedback/
│   │   └── page.tsx                  # Feedback management
│   ├── knowledge/
│   │   └── page.tsx                  # Knowledge base
│   ├── translations/
│   │   └── page.tsx                  # Translations
│   └── monitoring/
│       └── page.tsx                  # Service monitoring
├── components/
│   ├── ui/                           # Reusable UI components
│   ├── conversations/                # Conversation components
│   ├── feedback/                     # Feedback components
│   └── monitoring/                   # Monitoring components
├── lib/
│   ├── admin-api.ts                  # API client
│   └── types.ts                      # TypeScript types
├── hooks/
│   ├── useConversations.ts
│   ├── useFeedback.ts
│   ├── useKnowledge.ts
│   ├── useTranslations.ts
│   └── useMonitoring.ts
└── stores/
    └── admin-store.ts                # Zustand global state
```

---

## API Client Setup

### lib/admin-api.ts

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://wouribot-backend.onrender.com";
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  throw new Error("NEXT_PUBLIC_ADMIN_API_KEY is not defined");
}

export class AdminApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    public details?: string
  ) {
    super(details || error);
    this.name = "AdminApiError";
  }
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

    throw new AdminApiError(
      response.status,
      error.error || "API request failed",
      error.message
    );
  }

  return response.json();
}
```

### lib/types.ts

```typescript
// Import types from admin API docs
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

// ... other types
```

---

## Root Layout

### app/layout.tsx

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wouri Bot Admin",
  description: "Admin dashboard for Wouri Bot agricultural assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <h1 className="text-xl font-bold text-green-600">
                      🌾 Wouri Bot Admin
                    </h1>
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                    <a
                      href="/"
                      className="border-green-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/conversations"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Conversations
                    </a>
                    <a
                      href="/feedback"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Feedback
                    </a>
                    <a
                      href="/knowledge"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Knowledge
                    </a>
                    <a
                      href="/translations"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Translations
                    </a>
                    <a
                      href="/monitoring"
                      className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                    >
                      Monitoring
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

---

## Dashboard Home Page

### app/page.tsx

```typescript
"use client";

import { useConversations } from "@/hooks/useConversations";
import { useFeedback } from "@/hooks/useFeedback";
import { useMonitoring } from "@/hooks/useMonitoring";

export default function DashboardPage() {
  const { conversations, isLoading: convLoading } = useConversations({ limit: 5 });
  const { feedback, isLoading: fbLoading } = useFeedback({ limit: 5 });
  const { services, allHealthy, isLoading: monLoading } = useMonitoring(30000);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">
          Overview of Wouri Bot admin metrics
        </p>
      </div>

      {/* Service Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Service Status</h3>
        {monLoading ? (
          <div>Loading status...</div>
        ) : (
          <div className="flex items-center">
            {allHealthy ? (
              <div className="flex items-center text-green-600">
                <span className="text-2xl mr-2">✅</span>
                <span className="font-medium">All services healthy</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <span className="text-2xl mr-2">⚠️</span>
                <span className="font-medium">Some services are down</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Total Conversations</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {convLoading ? "..." : conversations.length}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Feedback Entries</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {fbLoading ? "..." : feedback.length}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500">Average Rating</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {convLoading
              ? "..."
              : (
                  conversations
                    .filter(c => c.average_rating)
                    .reduce((sum, c) => sum + (c.average_rating || 0), 0) /
                  conversations.filter(c => c.average_rating).length || 0
                ).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Conversations</h3>
        {convLoading ? (
          <div>Loading conversations...</div>
        ) : (
          <div className="space-y-4">
            {conversations.slice(0, 5).map(conv => (
              <div key={conv.id} className="border-l-4 border-green-500 pl-4">
                <p className="text-sm text-gray-600">
                  <strong>User:</strong> {conv.user_message}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>Bot:</strong> {conv.bot_response.substring(0, 100)}...
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <span className="mr-4">Language: {conv.language}</span>
                  <span>Rating: {conv.average_rating || "N/A"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Conversations Page

### app/conversations/page.tsx

```typescript
"use client";

import { useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { format } from "date-fns";
import Link from "next/link";

export default function ConversationsPage() {
  const [language, setLanguage] = useState<"fr" | "dioula" | "baoulé" | "en" | null>(null);

  const { conversations, hasMore, isLoading, error, loadMore } = useConversations({
    limit: 20,
    language: language || undefined,
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Conversations</h2>
          <p className="mt-1 text-sm text-gray-600">
            View and manage user conversations
          </p>
        </div>

        <select
          value={language || ""}
          onChange={e => setLanguage((e.target.value as any) || null)}
          className="border border-gray-300 rounded-md px-4 py-2 text-sm"
        >
          <option value="">All languages</option>
          <option value="fr">Français</option>
          <option value="dioula">Dioula</option>
          <option value="baoulé">Baoulé</option>
          <option value="en">English</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {conversations.map(conv => (
                <li key={conv.id}>
                  <Link
                    href={`/conversations/${conv.id}`}
                    className="block hover:bg-gray-50 transition"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conv.user_message}
                          </p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {conv.bot_response}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex flex-col items-end">
                          <p className="text-xs text-gray-400">
                            {format(new Date(conv.created_at), "MMM d, HH:mm")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {conv.language}
                          </p>
                          {conv.average_rating && (
                            <p className="text-xs text-yellow-600 mt-1">
                              ⭐ {conv.average_rating.toFixed(1)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### app/conversations/[id]/page.tsx

```typescript
"use client";

import { useConversation } from "@/hooks/useConversation";
import { useFeedback } from "@/hooks/useFeedback";
import { format } from "date-fns";
import { useState } from "react";

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const { conversation, isLoading, error } = useConversation(params.id);
  const { submitFeedback, isSubmitting } = useFeedback();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await submitFeedback({
        conversation_id: params.id,
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

  if (isLoading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  if (error || !conversation) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error?.message || "Conversation not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Conversation Details</h2>
        <p className="mt-1 text-sm text-gray-600">
          {format(new Date(conversation.created_at), "MMMM d, yyyy 'at' HH:mm")}
        </p>
      </div>

      {/* Conversation */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">User Message</h3>
          <p className="mt-2 text-base text-gray-900">{conversation.user_message}</p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Bot Response</h3>
          <p className="mt-2 text-base text-gray-900">{conversation.bot_response}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-500">Language</p>
            <p className="text-base font-medium">{conversation.language}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Region</p>
            <p className="text-base font-medium">{conversation.region || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Model</p>
            <p className="text-base font-medium text-xs">{conversation.model_used || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Response Time</p>
            <p className="text-base font-medium">{conversation.response_time_ms || "N/A"}ms</p>
          </div>
        </div>
      </div>

      {/* Feedback Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Feedback</h3>
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <select
              value={rating}
              onChange={e => setRating(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-4 py-2"
            >
              <option value={5}>5 - Perfect</option>
              <option value={4}>4 - Good</option>
              <option value={3}>3 - Acceptable</option>
              <option value={2}>2 - Poor</option>
              <option value={1}>1 - Bad</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder="Provide detailed feedback to improve RAG responses..."
              className="w-full border border-gray-300 rounded-md px-4 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      </div>

      {/* Existing Feedback */}
      {conversation.feedback.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Feedback ({conversation.feedback.length})
          </h3>
          <div className="space-y-4">
            {conversation.feedback.map(fb => (
              <div key={fb.id} className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    Rating: {fb.rating}/5
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(fb.created_at), "MMM d, HH:mm")}
                  </p>
                </div>
                {fb.comment && (
                  <p className="text-sm text-gray-600 mt-2">{fb.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {fb.is_embedded ? "✅ Embedded in vector DB" : "⏳ Not embedded"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_API_BASE_URL
vercel env add NEXT_PUBLIC_ADMIN_API_KEY

# Deploy to production
vercel --prod
```

### Environment Variables (Vercel Dashboard)

1. Go to Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - `NEXT_PUBLIC_API_BASE_URL`: https://wouribot-backend.onrender.com
   - `NEXT_PUBLIC_ADMIN_API_KEY`: your_admin_api_key

---

## Best Practices

### 1. Error Handling

```typescript
// Use try-catch with user-friendly messages
try {
  await submitFeedback(params);
} catch (error) {
  if (error instanceof AdminApiError) {
    if (error.status === 401) {
      alert("Authentication failed. Please check your API key.");
    } else if (error.status === 404) {
      alert("Conversation not found.");
    } else {
      alert(`Error: ${error.details || error.error}`);
    }
  }
}
```

### 2. Loading States

```typescript
// Always show loading indicators
{isLoading ? (
  <div className="animate-pulse">Loading...</div>
) : (
  <div>{data}</div>
)}
```

### 3. Optimistic Updates

```typescript
// Update UI immediately, revert on error
mutate(
  async () => {
    const newData = await submitFeedback(params);
    return newData;
  },
  {
    optimisticData: [...currentData, newItem],
    rollbackOnError: true,
  }
);
```

---

## Next Steps

1. ✅ Complete all pages (conversations, feedback, knowledge, translations, monitoring)
2. ✅ Add authentication (optional - consider NextAuth.js)
3. ✅ Implement advanced filtering and search
4. ✅ Add charts and visualizations (recharts)
5. ✅ Deploy to Vercel
6. ✅ Set up monitoring and error tracking (Sentry)

---

## References

- [Next.js 16 Docs](https://nextjs.org/docs)
- [SWR Documentation](https://swr.vercel.app/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
