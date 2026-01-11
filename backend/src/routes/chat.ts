import { Hono } from "hono";
import { ragPipeline } from "../lib/rag";
import { insertConversationLog } from "../services/supabase";
import { config } from "../lib/config";
import type { RAGResponse } from "../types";

const chat = new Hono();

/**
 * GET /chat/ping - SSE ping to verify streaming
 */
chat.get("/ping", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: message\n` + `data: ${JSON.stringify({ status: "pong" })}\n\n`)
      );
      controller.close();
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

/**
 * POST /chat - Production RAG endpoint (streamed SSE)
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
      fast = false,
    } = body;

    if (!question) {
      return c.json({ error: "Question is required" }, 400);
    }

    if (fast) {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              `event: message\n` +
                `data: ${JSON.stringify({ answer: "Réponse rapide activée.", fast: true })}\n\n`
            )
          );
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const pipelineTimeoutMs = parseInt(config.RAG_PIPELINE_TIMEOUT_MS || "45000", 10);
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`)
          );
        };
        const sendComment = () => {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        };

        sendEvent("start", { status: "started" });
        const heartbeat = setInterval(sendComment, 10000);

        (async () => {
          try {
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

            sendEvent("message", payload);

            void insertConversationLog({
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
            }).catch((error) => {
              console.warn("⚠️ Failed to store chat conversation:", error);
            });
          } catch (error: any) {
            sendEvent("error", {
              success: false,
              error: error.message || "Internal server error",
              answer:
                "Désolé, cette requête a pris trop de temps. Peux-tu reformuler ou préciser ta question ?",
            });
          } finally {
            clearInterval(heartbeat);
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return c.json({
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
