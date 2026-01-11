import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../lib/config";
import type { User } from "../types";

/**
 * Supabase client singleton
 * FREE TIER: 500MB database, 1GB file storage, 2GB bandwidth
 */
export const supabase: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Server-side, no session needed
    },
  },
);

/**
 * Admin Supabase client (service role)
 * Use for server-side admin operations only.
 */
export const adminSupabase: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

/**
 * Get user by WhatsApp ID
 */
export async function getUserByWaId(wa_id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wa_id", wa_id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data as User;
}

/**
 * Create new user
 */
export async function createUser(
  wa_id: string,
  phone_number: string,
  preferred_language: string = "fr",
): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({
      wa_id,
      phone_number,
      preferred_language,
      subscription_status: "freemium",
      monthly_quota_used: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data as User;
}

/**
 * Update user's monthly quota (increment by 1)
 */
export async function incrementUserQuota(wa_id: string): Promise<void> {
  const { error } = await supabase.rpc("increment_quota", { user_wa_id: wa_id });

  if (error) {
    throw new Error(`Failed to increment quota: ${error.message}`);
  }
}

/**
 * Check if user has quota remaining
 */
export async function checkUserQuota(user: User): Promise<boolean> {
  // Premium users have unlimited quota
  if (user.subscription_status === "premium") {
    // Check if subscription is still active
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      if (endDate > new Date()) {
        return true;
      }
    }
  }

  // Freemium users have 20 messages/month
  const MAX_FREEMIUM_QUOTA = 20;
  return user.monthly_quota_used < MAX_FREEMIUM_QUOTA;
}

// ============================================================================
// Vector Search with pgvector (FREE on Supabase!)
// ============================================================================

/**
 * Search similar documents using pgvector
 * FREE: pgvector extension included in Supabase free tier
 */
export async function searchSimilarDocuments(
  embedding: number[],
  match_threshold: number = 0.7,
  match_count: number = 5,
  filter?: { region?: string },
): Promise<Array<{ content: string; similarity: number; metadata: any }>> {
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold,
    match_count,
    filter: filter || {},
  });

  if (error) {
    throw new Error(`Failed to search documents: ${error.message}`);
  }

  return data || [];
}

/**
 * Fallback keyword search when embeddings are unavailable or unreliable
 */
export async function searchDocumentsByKeyword(
  query: string,
  match_count: number = 5,
  filter?: { region?: string },
): Promise<Array<{ content: string; similarity: number; metadata: any }>> {
  const keywords = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 5);

  const orFilter =
    keywords.length > 0
      ? keywords.map((word) => `content.ilike.%${word}%`).join(",")
      : `content.ilike.%${query}%`;

  let request = supabase
    .from("documents")
    .select("content, metadata")
    .or(orFilter)
    .limit(match_count);

  if (filter?.region) {
    request = request.contains("metadata", { region: filter.region });
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Failed to search documents by keyword: ${error.message}`);
  }

  return (data || []).map((doc) => ({
    content: doc.content,
    metadata: doc.metadata,
    similarity: 1,
  }));
}

/**
 * Get embedding for text using production embedding service
 * Uses Supabase Edge Function with all-MiniLM-L6-v2 model (768 dimensions)
 */
export async function getTextEmbedding(
  text: string,
  options?: { timeoutMs?: number }
): Promise<number[]> {
  // Import production embedding service
  const { getTextEmbedding: embedFn } = await import("./embeddings");
  return embedFn(text, options);
}

export type ConversationLog = {
  wa_id: string;
  message_id: string;
  message_type: string;
  user_message: string;
  bot_response?: string | null;
  language?: string;
  region?: string | null;
  model_used?: string | null;
  tokens_used?: number | null;
  response_time_ms?: number | null;
};

export async function insertConversationLog(log: ConversationLog): Promise<void> {
  const { error } = await adminSupabase.from("conversations").insert({
    wa_id: log.wa_id,
    message_id: log.message_id,
    message_type: log.message_type,
    user_message: log.user_message,
    bot_response: log.bot_response ?? null,
    language: log.language || "fr",
    region: log.region ?? null,
    model_used: log.model_used ?? null,
    tokens_used: log.tokens_used ?? null,
    response_time_ms: log.response_time_ms ?? null,
  });

  if (error) {
    throw new Error(`Failed to insert conversation log: ${error.message}`);
  }
}
