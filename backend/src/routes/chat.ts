import { Hono } from "hono";
import { ragPipeline } from "../lib/rag";
import { insertConversationLog } from "../services/supabase";
import type { RAGResponse } from "../types";

const chat = new Hono();

/**
 * POST /chat - Production RAG endpoint
 *
 * Body: {
 *   "question": "Quand planter le maïs?",
 *   "region": "Bouaké",
 *   "language": "fr",
 *   "model": "qwen/qwen3-32b",
 *   "reasoningEnabled": false,
 *   "history": [{ role, content }]
 * }
 */
chat.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      question,
      region = "Côte d'Ivoire",
      language = "fr",
      model,
      reasoningEnabled = false,
      history = [],
    } = body;

    if (!question) {
      return c.json({ error: "Question is required" }, 400);
    }

    const response: RAGResponse = await ragPipeline(
      question,
      region,
      language,
      model,
      reasoningEnabled,
      history,
    );

    const payload = {
      success: true,
      question,
      region,
      language,
      answer: response.answer,
      reasoning: response.reasoning,
      sources: response.sources,
      metadata: response.metadata,
      debug: response.debug,
      usage: {
        inputTokens: Math.floor((response.metadata?.tokens_used || 0) * 0.6),
        outputTokens: Math.floor((response.metadata?.tokens_used || 0) * 0.4),
        reasoningTokens: response.reasoning ? 50 : 0,
      },
    };

    try {
      await insertConversationLog({
        wa_id: "web-user",
        message_id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message_type: "text",
        user_message: question,
        bot_response: response.answer,
        language,
        region,
        model_used: response.metadata?.model,
        tokens_used: response.metadata?.tokens_used,
        response_time_ms: response.metadata?.response_time_ms,
      });
    } catch (error) {
      console.warn("⚠️ Failed to store chat conversation:", error);
    }

    return c.json(payload);
  } catch (error: any) {
    console.error("❌ Chat error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      500,
    );
  }
});

export default chat;
