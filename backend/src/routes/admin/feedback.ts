/**
 * Admin Feedback Endpoints
 * Submit and retrieve admin feedback for RAG improvement
 *
 * @module routes/admin/feedback
 */

import { Hono } from "hono";
import { supabase } from "../../services/supabase";
import { getTextEmbedding } from "../../services/embeddings";
import { formatEmbeddingForPostgres } from "../../services/embeddings";
import { feedbackCreateSchema, feedbackQuerySchema, feedbackSchema } from "../../types/admin";

const feedback = new Hono();

/**
 * POST /admin/feedback
 * Submit feedback (auto-embedded into vector DB)
 *
 * Body:
 * - conversation_id: UUID
 * - rating: number (1-5)
 * - comment: string (max 2000 chars)
 * - embed_immediately: boolean (default: true)
 */
feedback.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = feedbackCreateSchema.parse(body);

    // Get conversation details to extract wa_id
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("wa_id")
      .eq("id", validated.conversation_id)
      .single();

    if (convError || !conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    // Generate embedding if comment provided and embed_immediately is true
    let embedding: number[] | null = null;
    if (validated.comment && validated.embed_immediately) {
      try {
        embedding = await getTextEmbedding(validated.comment, { timeoutMs: 3000 });
        console.log(`[Admin API] Generated embedding for feedback (${embedding.length} dimensions)`);
      } catch (embedError: any) {
        console.error("[Admin API] Embedding generation failed:", embedError);
        // Continue without embedding (will be retried later via batch job)
      }
    }

    // Insert feedback
    const { data: newFeedback, error: insertError } = await supabase
      .from("feedback")
      .insert({
        conversation_id: validated.conversation_id,
        wa_id: conversation.wa_id,
        rating: validated.rating,
        comment: validated.comment,
        embedding: embedding ? formatEmbeddingForPostgres(embedding) : null,
        is_embedded: embedding !== null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    // Update conversation feedback stats using SQL function
    const { error: statsError } = await supabase.rpc("update_conversation_feedback_stats", {
      conv_id: validated.conversation_id,
    });

    if (statsError) {
      console.error("[Admin API] Failed to update conversation stats:", statsError);
      // Don't fail the request, stats will be eventually consistent
    }

    return c.json(feedbackSchema.parse(newFeedback), 201);
  } catch (error: any) {
    console.error("[Admin API] Error creating feedback:", error);
    return c.json({ error: error.message || "Failed to create feedback" }, 400);
  }
});

/**
 * GET /admin/feedback
 * List all feedback entries
 *
 * Query params:
 * - limit: number (default: 50, max: 100)
 * - wa_id: string (filter by user)
 * - min_rating: number (1-5)
 */
feedback.get("/", async (c) => {
  try {
    const params = feedbackQuerySchema.parse({
      limit: c.req.query("limit") || "50",
      wa_id: c.req.query("wa_id"),
      min_rating: c.req.query("min_rating"),
    });

    let query = supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit);

    if (params.wa_id) {
      query = query.eq("wa_id", params.wa_id);
    }

    if (params.min_rating) {
      query = query.gte("rating", params.min_rating);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return c.json({ feedback: data || [] });
  } catch (error: any) {
    console.error("[Admin API] Error fetching feedback:", error);
    return c.json({ error: error.message || "Failed to fetch feedback" }, 400);
  }
});

export default feedback;
