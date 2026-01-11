/**
 * Admin Conversations Endpoints
 * View conversation history and message streams
 *
 * @module routes/admin/conversations
 */

import { Hono } from "hono";
import { supabase } from "../../services/supabase";
import { conversationsQuerySchema, conversationDetailSchema } from "../../types/admin";

const conversations = new Hono();

/**
 * GET /admin/conversations
 * List conversations with pagination
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - cursor: UUID (for pagination)
 * - wa_id: string (filter by user)
 * - language: fr | dioula | baoulé
 */
conversations.get("/", async (c) => {
  try {
    const params = conversationsQuerySchema.parse({
      limit: c.req.query("limit") || "50",
      cursor: c.req.query("cursor"),
      wa_id: c.req.query("wa_id"),
      language: c.req.query("language"),
    });

    let query = supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit + 1); // Fetch one extra to check if there's more

    if (params.cursor) {
      query = query.lt("id", params.cursor);
    }

    if (params.wa_id) {
      query = query.eq("wa_id", params.wa_id);
    }

    if (params.language) {
      query = query.eq("language", params.language);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const hasMore = data.length > params.limit;
    const items = hasMore ? data.slice(0, -1) : data;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return c.json({
      conversations: items,
      nextCursor,
      hasMore,
      total: items.length,
    });
  } catch (error: any) {
    console.error("[Admin API] Error fetching conversations:", error);
    return c.json({ error: error.message || "Failed to fetch conversations" }, 400);
  }
});

/**
 * GET /admin/conversations/:id
 * Get conversation details with feedback
 */
conversations.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        feedback (*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    const validated = conversationDetailSchema.parse(data);

    return c.json(validated);
  } catch (error: any) {
    console.error("[Admin API] Error fetching conversation:", error);

    if (error.message.includes("not found")) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json({ error: error.message || "Failed to fetch conversation" }, 400);
  }
});

export default conversations;
