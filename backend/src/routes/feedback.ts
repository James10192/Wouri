import { Hono } from "hono";
import { createFeedback } from "../services/supabase";

const feedback = new Hono();

/**
 * POST /feedback
 * Body: { question, answer, improved_answer?, language?, region?, model?, category? }
 */
feedback.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      question,
      answer,
      improved_answer,
      language,
      region,
      model,
      category,
    } = body || {};

    if (!question || !answer) {
      return c.json({ success: false, error: "question and answer are required" }, 400);
    }

    await createFeedback({
      question,
      answer,
      improved_answer,
      language,
      region,
      model,
      category,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error("❌ Feedback error:", error);
    return c.json(
      { success: false, error: error.message || "Feedback error" },
      500,
    );
  }
});

export default feedback;
