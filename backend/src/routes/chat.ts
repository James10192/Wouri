import { Hono } from "hono";
import { ragPipeline } from "../lib/rag";
import { insertConversationLog } from "../services/supabase";
import { config } from "../lib/config";
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
  const startTime = Date.now();
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

    const pipelineTimeoutMs = parseInt(config.RAG_PIPELINE_TIMEOUT_MS || "45000", 10);
    const response: RAGResponse = await withTimeout(
      ragPipeline(
        question,
        region,
        language,
        model,
        reasoningEnabled,
        history,
      ),
      pipelineTimeoutMs,
      "chat",
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
    return c.json({
      success: false,
      answer: "Désolé, cette requête a pris trop de temps. Peux-tu reformuler ou préciser ta question ?",
      sources: [],
      metadata: {
        model: "timeout",
        tokens_used: 0,
        response_time_ms: Date.now() - startTime,
      },
      error: error.message || "Internal server error",
    });
  }
});

export default chat;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
