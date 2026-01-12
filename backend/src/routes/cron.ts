import { Hono } from "hono";
import { config } from "../lib/config";
import { adminSupabase, getTextEmbedding } from "../services/supabase";

const cron = new Hono();

const MAX_BATCH = 50;

const isCronAuthorized = (c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }) => {
  const cronHeader = c.req.header("x-vercel-cron");
  const secret = config.CRON_SECRET;
  if (secret) {
    const provided = c.req.query("key") || c.req.header("x-cron-key");
    return provided === secret;
  }
  if (process.env["VERCEL"]) {
    return cronHeader === "1";
  }
  return config.NODE_ENV === "development";
};

cron.get("/embeddings", async (c) => {
  if (!isCronAuthorized(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const limitRaw = c.req.query("limit") || "25";
  const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 25, 1), MAX_BATCH);

  const { data, error } = await adminSupabase
    .from("documents")
    .select("id, content")
    .is("embedding", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return c.json({ error: "Failed to load pending embeddings", message: error.message }, 500);
  }

  const results: Array<{ id: string; status: string; error?: string }> = [];
  for (const doc of data || []) {
    try {
      const embedding = await getTextEmbedding(doc.content);
      const { error: updateError } = await adminSupabase
        .from("documents")
        .update({ embedding })
        .eq("id", doc.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
      results.push({ id: doc.id, status: "ok" });
    } catch (err: any) {
      results.push({ id: doc.id, status: "error", error: err?.message || "Embedding failed" });
    }
  }

  return c.json({ data: { processed: results.length, results } });
});

export default cron;
