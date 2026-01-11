import { Hono } from "hono";
import { z } from "zod";
import { requireAdminKey } from "../lib/admin-auth";
import {
  adminSupabase,
  insertConversationLog,
  searchDocumentsByKeyword,
  searchSimilarDocuments,
  getTextEmbedding,
} from "../services/supabase";
import { groq } from "../services/groq";
import { getWeatherData } from "../services/weather";
import { isEmbeddingServiceHealthy } from "../services/embeddings";

const admin = new Hono();

admin.use("*", requireAdminKey);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  cursor: z.string().optional(),
});

const conversationQuerySchema = z.object({
  wa_id: z.string().optional(),
  language: z.string().optional(),
  region: z.string().optional(),
});

const feedbackQuerySchema = z.object({
  wa_id: z.string().optional(),
  min_rating: z.coerce.number().int().min(1).max(5).optional(),
});

const feedbackSchema = z.object({
  conversation_id: z.string().uuid().nullable().optional(),
  wa_id: z.string().min(1),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comment: z.string().min(1).nullable().optional(),
});

const knowledgeSchema = z.object({
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const translationSchema = z.object({
  source_text: z.string().min(1),
  source_language: z.string().min(1),
  target_language: z.string().min(1),
  translated_text: z.string().min(1),
  context: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  created_by: z.string().nullable().optional(),
});

const conversationSchema = z.object({
  wa_id: z.string().min(1),
  message_id: z.string().min(1),
  message_type: z.string().min(1),
  user_message: z.string().min(1),
  bot_response: z.string().nullable().optional(),
  language: z.string().optional(),
  region: z.string().nullable().optional(),
  model_used: z.string().nullable().optional(),
  tokens_used: z.number().int().nullable().optional(),
  response_time_ms: z.number().int().nullable().optional(),
});

const knowledgeQuerySchema = z.object({
  query: z.string().optional(),
  region: z.string().optional(),
});

const translationQuerySchema = z.object({
  query: z.string().optional(),
  source_language: z.string().optional(),
  target_language: z.string().optional(),
  verified_only: z.coerce.boolean().optional(),
});

const etlSchema = z.object({
  documents: z
    .array(
      z.object({
        content: z.string().min(1),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .min(1)
    .max(200),
  dry_run: z.boolean().optional(),
});

const queryValidationError = (c: any, issues: any) =>
  c.json({ error: "Validation error", message: issues }, 400);

const toMessages = (conversation: any) => {
  const base = {
    conversation_id: conversation.id,
    region: conversation.region,
    language: conversation.language,
    model: conversation.model_used,
    created_at: conversation.created_at,
    metadata: {
      usage: conversation.tokens_used
        ? {
            inputTokens: Math.floor(conversation.tokens_used * 0.6),
            outputTokens: Math.floor(conversation.tokens_used * 0.4),
          }
        : undefined,
    },
  };

  const result = [];

  if (conversation.user_message) {
    result.push({
      id: `user-${conversation.id}`,
      role: "user",
      text: conversation.user_message,
      ...base,
    });
  }

  if (conversation.bot_response) {
    result.push({
      id: `assistant-${conversation.id}`,
      role: "assistant",
      text: conversation.bot_response,
      ...base,
    });
  }

  return result;
};

admin.get("/conversations", async (c) => {
  const parsed = paginationSchema.safeParse({
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  });
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }
  const filters = conversationQuerySchema.safeParse({
    wa_id: c.req.query("wa_id"),
    language: c.req.query("language"),
    region: c.req.query("region"),
  });
  if (!filters.success) {
    return queryValidationError(c, filters.error.issues);
  }
  const limit = parsed.data.limit ?? DEFAULT_LIMIT;
  const cursor = parsed.data.cursor;

  let query = adminSupabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  if (filters.data.wa_id) {
    query = query.eq("wa_id", filters.data.wa_id);
  }
  if (filters.data.language) {
    query = query.eq("language", filters.data.language);
  }
  if (filters.data.region) {
    query = query.eq("region", filters.data.region);
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ error: "Failed to fetch conversations", message: error.message }, 500);
  }

  const items = (data || []).slice(0, limit);
  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return c.json({ data: items, nextCursor, hasMore });
});

admin.get("/conversations/:id", async (c) => {
  const id = c.req.param("id");
  const idParse = z.string().uuid().safeParse(id);
  if (!idParse.success) {
    return queryValidationError(c, idParse.error.issues);
  }

  const { data: conversation, error } = await adminSupabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return c.json({ error: "Failed to fetch conversation", message: error.message }, 500);
  }

  if (!conversation) {
    return c.json({ error: "Not found", message: "Conversation not found." }, 404);
  }

  const { data: feedback, error: feedbackError } = await adminSupabase
    .from("feedback")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false });

  if (feedbackError) {
    return c.json({ error: "Failed to fetch feedback", message: feedbackError.message }, 500);
  }

  return c.json({
    data: {
      conversation,
      feedback: feedback || [],
    },
  });
});

admin.get("/messages", async (c) => {
  const parsed = paginationSchema.safeParse({
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  });
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }
  const filters = conversationQuerySchema.safeParse({
    wa_id: c.req.query("wa_id"),
    language: c.req.query("language"),
    region: c.req.query("region"),
  });
  if (!filters.success) {
    return queryValidationError(c, filters.error.issues);
  }
  const limit = parsed.data.limit ?? DEFAULT_LIMIT;
  const cursor = parsed.data.cursor;

  let query = adminSupabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  if (filters.data.wa_id) {
    query = query.eq("wa_id", filters.data.wa_id);
  }
  if (filters.data.language) {
    query = query.eq("language", filters.data.language);
  }
  if (filters.data.region) {
    query = query.eq("region", filters.data.region);
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ error: "Failed to fetch messages", message: error.message }, 500);
  }

  const items = (data || []).slice(0, limit);
  const messages = items.flatMap((conversation) => toMessages(conversation));

  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return c.json({ data: messages, nextCursor, hasMore });
});

admin.get("/messages/stream", async (c) => {
  const encoder = new TextEncoder();
  let lastCursor = c.req.query("since") || null;
  const region = c.req.query("region") || null;
  const language = c.req.query("language") || null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      const sendHeartbeat = () => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      };

      const poll = async () => {
        try {
          let query = adminSupabase
            .from("conversations")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(50);

          if (lastCursor) {
            query = query.gt("created_at", lastCursor);
          }
          if (region) {
            query = query.eq("region", region);
          }
          if (language) {
            query = query.eq("language", language);
          }

          const { data, error } = await query;
          if (error) {
            send({ type: "error", message: error.message });
            return;
          }

          if (data && data.length > 0) {
            data.forEach((conversation) => {
              toMessages(conversation).forEach((message) => {
                send({ type: "message", data: message });
              });
            });
            lastCursor = data[data.length - 1]?.created_at || lastCursor;
          }
        } catch (error: any) {
          send({ type: "error", message: error.message || "Stream error" });
        }
      };

      const pollInterval = setInterval(poll, 2000);
      const heartbeatInterval = setInterval(sendHeartbeat, 15000);

      poll();

      c.req.raw.signal?.addEventListener("abort", () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});

admin.post("/etl", async (c) => {
  const body = await c.req.json();
  const parsed = etlSchema.safeParse(body);
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }

  const { documents, dry_run } = parsed.data;
  const results: Array<{ index: number; status: string; error?: string }> = [];

  if (dry_run) {
    return c.json({
      data: {
        count: documents.length,
        results: documents.map((_, index) => ({ index, status: "skipped" })),
      },
    });
  }

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    try {
      const embedding = await getTextEmbedding(doc.content);
      const { error } = await adminSupabase.from("documents").insert({
        content: doc.content,
        embedding,
        metadata: doc.metadata || {},
      });
      if (error) {
        results.push({ index: i, status: "error", error: error.message });
      } else {
        results.push({ index: i, status: "ok" });
      }
    } catch (error: any) {
      results.push({
        index: i,
        status: "error",
        error: error.message || "Embedding failed",
      });
    }
  }

  return c.json({
    data: {
      count: documents.length,
      results,
    },
  });
});

admin.get("/feedback", async (c) => {
  const parsed = paginationSchema.safeParse({
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  });
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }
  const filters = feedbackQuerySchema.safeParse({
    wa_id: c.req.query("wa_id"),
    min_rating: c.req.query("min_rating"),
  });
  if (!filters.success) {
    return queryValidationError(c, filters.error.issues);
  }
  const limit = parsed.data.limit ?? DEFAULT_LIMIT;
  const cursor = parsed.data.cursor;

  let query = adminSupabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  if (filters.data.wa_id) {
    query = query.eq("wa_id", filters.data.wa_id);
  }
  if (filters.data.min_rating) {
    query = query.gte("rating", filters.data.min_rating);
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ error: "Failed to fetch feedback", message: error.message }, 500);
  }

  const items = (data || []).slice(0, limit);
  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return c.json({ data: items, nextCursor, hasMore });
});

admin.post("/feedback", async (c) => {
  const body = await c.req.json();
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }
  const { conversation_id, wa_id, rating, comment } = parsed.data;

  const { data, error } = await adminSupabase
    .from("feedback")
    .insert({
      conversation_id: conversation_id || null,
      wa_id,
      rating: rating ?? null,
      comment: comment ?? null,
      is_embedded: false,
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: "Failed to create feedback", message: error.message }, 500);
  }

  let embeddingError: string | null = null;
  if (comment && typeof comment === "string") {
    try {
      const embedding = await getTextEmbedding(comment, { timeoutMs: 3000 });
      const { error: insertError } = await adminSupabase.from("documents").insert({
        content: comment,
        embedding,
        metadata: {
          source: "Admin Feedback",
          conversation_id: conversation_id || null,
          wa_id,
          rating: rating ?? null,
        },
      });

      if (insertError) {
        embeddingError = insertError.message;
      } else {
        await adminSupabase.from("feedback").update({ is_embedded: true }).eq("id", data.id);
      }
    } catch (error: any) {
      embeddingError = error.message || "Embedding failed";
    }
  }

  return c.json(
    {
      data,
      embeddingError,
    },
    201
  );
});

admin.get("/knowledge", async (c) => {
  const pagination = paginationSchema.safeParse({
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  });
  if (!pagination.success) {
    return queryValidationError(c, pagination.error.issues);
  }
  const queryParsed = knowledgeQuerySchema.safeParse({
    query: c.req.query("query"),
    region: c.req.query("region"),
  });
  if (!queryParsed.success) {
    return queryValidationError(c, queryParsed.error.issues);
  }
  const limit = pagination.data.limit ?? DEFAULT_LIMIT;
  const queryText = queryParsed.data.query;
  const region = queryParsed.data.region;
  const cursor = pagination.data.cursor;

  if (queryText) {
    try {
      const embedding = await getTextEmbedding(queryText);
      const results = await searchSimilarDocuments(
        embedding,
        0.5,
        limit,
        region ? { region } : undefined
      );
      const keywordFallback =
        results.length > 0
          ? []
          : await searchDocumentsByKeyword(
              queryText,
              limit,
              region ? { region } : undefined
            );
      return c.json({
        data: results.length > 0 ? results : keywordFallback,
        nextCursor: null,
        hasMore: false,
      });
    } catch (error: any) {
      return c.json({ error: "Search failed", message: error.message }, 500);
    }
  }

  let query = adminSupabase
    .from("documents")
    .select("id, content, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ error: "Failed to fetch knowledge base", message: error.message }, 500);
  }

  const items = (data || []).slice(0, limit);
  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return c.json({ data: items, nextCursor, hasMore });
});

admin.post("/knowledge", async (c) => {
  const body = await c.req.json();
  const parsed = knowledgeSchema.safeParse(body);
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }
  const { content, metadata } = parsed.data;

  try {
    const embedding = await getTextEmbedding(content);
    const { data, error } = await adminSupabase
      .from("documents")
      .insert({
        content,
        embedding,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      return c.json({ error: "Failed to insert knowledge", message: error.message }, 500);
    }

    return c.json({ data }, 201);
  } catch (error: any) {
    return c.json({ error: "Embedding failed", message: error.message }, 500);
  }
});

admin.get("/translations", async (c) => {
  const pagination = paginationSchema.safeParse({
    limit: c.req.query("limit"),
    cursor: c.req.query("cursor"),
  });
  if (!pagination.success) {
    return queryValidationError(c, pagination.error.issues);
  }
  const queryParsed = translationQuerySchema.safeParse({
    query: c.req.query("query"),
    source_language: c.req.query("source_language"),
    target_language: c.req.query("target_language"),
    verified_only: c.req.query("verified_only"),
  });
  if (!queryParsed.success) {
    return queryValidationError(c, queryParsed.error.issues);
  }
  const limit = pagination.data.limit ?? DEFAULT_LIMIT;
  const queryText = queryParsed.data.query;
  const sourceLanguage = queryParsed.data.source_language;
  const targetLanguage = queryParsed.data.target_language;
  const verifiedOnly = queryParsed.data.verified_only;
  const cursor = pagination.data.cursor;

  let query = adminSupabase
    .from("translations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (queryText) {
    query = query.ilike("source_text", `%${queryText}%`);
  }

  if (sourceLanguage) {
    query = query.eq("source_language", sourceLanguage);
  }

  if (targetLanguage) {
    query = query.eq("target_language", targetLanguage);
  }
  if (verifiedOnly !== undefined) {
    query = query.eq("verified", verifiedOnly);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ error: "Failed to fetch translations", message: error.message }, 500);
  }

  const items = (data || []).slice(0, limit);
  const hasMore = (data || []).length > limit;
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return c.json({ data: items, nextCursor, hasMore });
});

admin.post("/translations", async (c) => {
  const body = await c.req.json();
  const parsed = translationSchema.safeParse(body);
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }
  const { source_text, source_language, target_language, translated_text, context, verified, created_by } =
    parsed.data;

  const { data, error } = await adminSupabase
    .from("translations")
    .insert({
      source_text,
      source_language,
      target_language,
      translated_text,
      context: context ?? null,
      verified: Boolean(verified),
      created_by: created_by ?? null,
    })
    .select()
    .single();

  // If duplicate, return existing translation
  if (error && error.code === "23505") {
    const { data: existing } = await adminSupabase
      .from("translations")
      .select("*")
      .eq("source_text", source_text)
      .eq("source_language", source_language)
      .eq("target_language", target_language)
      .single();

    if (existing) {
      return c.json({ data: existing, existing: true }, 200);
    }
  }

  if (error) {
    return c.json({ error: "Failed to insert translation", message: error.message }, 500);
  }

  return c.json({ data, existing: false }, 201);
});

admin.get("/monitoring", async (c) => {
  const checks: Record<string, { status: string; latency_ms: number }> = {};

  const check = async (name: string, fn: () => Promise<void>) => {
    const start = Date.now();
    try {
      await fn();
      checks[name] = { status: "ok", latency_ms: Date.now() - start };
    } catch (error) {
      checks[name] = { status: "error", latency_ms: Date.now() - start };
    }
  };

  await check("supabase", async () => {
    const { error } = await adminSupabase.from("users").select("id").limit(1);
    if (error) throw error;
  });

  await check("groq", async () => {
    await groq.models.list();
  });

  await check("openweather", async () => {
    const data = await getWeatherData("Abidjan");
    if (!data) {
      throw new Error("No weather data");
    }
  });

  await check("embeddings", async () => {
    const ok = await isEmbeddingServiceHealthy();
    if (!ok) {
      throw new Error("Embedding service unavailable");
    }
  });

  return c.json({ data: { services: checks } });
});

// Optional: expose insert utility for scripts
admin.post("/conversations", async (c) => {
  const body = await c.req.json();
  const parsed = conversationSchema.safeParse(body);
  if (!parsed.success) {
    return queryValidationError(c, parsed.error.issues);
  }
  try {
    await insertConversationLog(parsed.data);
    return c.json({ data: { status: "ok" } }, 201);
  } catch (error: any) {
    return c.json({ error: "Failed to create conversation", message: error.message }, 500);
  }
});

export default admin;
