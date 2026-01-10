/**
 * Admin Knowledge Base Endpoints
 * Add and search documents in the vector database
 *
 * @module routes/admin/knowledge
 */

import { Hono } from "hono";
import { supabase } from "@/services/supabase";
import { getTextEmbedding, formatEmbeddingForPostgres } from "@/services/embeddings";
import { knowledgeCreateSchema, knowledgeQuerySchema } from "@/types/admin";

const knowledge = new Hono();

/**
 * POST /admin/knowledge
 * Add document to knowledge base (auto-embedded)
 *
 * Body:
 * - content: string (10-5000 chars)
 * - metadata: { source, page?, region?, category?, crop? }
 */
knowledge.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = knowledgeCreateSchema.parse(body);

    // Generate embedding
    console.log("[Admin API] Generating embedding for knowledge document...");
    const embedding = await getTextEmbedding(validated.content);
    console.log(`[Admin API] Embedding generated (${embedding.length} dimensions)`);

    // Insert document
    const { data, error } = await supabase
      .from("documents")
      .insert({
        content: validated.content,
        embedding: formatEmbeddingForPostgres(embedding),
        metadata: validated.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    console.log(`[Admin API] Knowledge document added: ${data.id}`);

    return c.json(data, 201);
  } catch (error: any) {
    console.error("[Admin API] Error adding knowledge:", error);
    return c.json({ error: error.message || "Failed to add knowledge document" }, 400);
  }
});

/**
 * GET /admin/knowledge
 * Search knowledge base using vector similarity
 *
 * Query params:
 * - query: string (required)
 * - region: string (optional filter)
 * - limit: number (default: 10, max: 50)
 */
knowledge.get("/", async (c) => {
  try {
    const params = knowledgeQuerySchema.parse({
      query: c.req.query("query"),
      limit: c.req.query("limit") || "10",
      region: c.req.query("region"),
    });

    if (!params.query) {
      return c.json({ error: "Missing 'query' parameter" }, 400);
    }

    // Generate embedding for query
    console.log("[Admin API] Generating embedding for search query...");
    const queryEmbedding = await getTextEmbedding(params.query);

    // Search using pgvector match_documents function
    const filter = params.region ? { region: params.region } : {};

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // Lower threshold for admin search (more results)
      match_count: params.limit,
      filter,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`[Admin API] Found ${data?.length || 0} matching documents`);

    return c.json({ results: data || [] });
  } catch (error: any) {
    console.error("[Admin API] Error searching knowledge:", error);
    return c.json({ error: error.message || "Failed to search knowledge base" }, 400);
  }
});

export default knowledge;
