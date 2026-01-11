import { Hono } from "hono";
import { groq, isReasoningModel } from "../services/groq";

const models = new Hono();

models.get("/", async (c) => {
  try {
    const response = await groq.models.list();
    const data = response.data || [];

    const modelList = data.map((model) => {
      const raw = model as {
        context_window?: number;
        active?: boolean;
      };

      return {
        id: model.id,
        owned_by: model.owned_by,
        context_window: raw.context_window ?? null,
        active: raw.active ?? null,
        reasoning_supported: isReasoningModel(model.id),
      };
    });

    return c.json({ success: true, models: modelList });
  } catch (error: any) {
    console.error("❌ Groq models error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Groq models error",
      },
      500,
    );
  }
});

export default models;
