import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { timeout } from "hono/timeout";
import { config } from "./lib/config";
import webhooks from "./routes/webhooks";
import test from "./routes/test";
import models from "./routes/models";
import admin from "./routes/admin";
import chat from "./routes/chat";

/**
 * Wouri Bot Backend
 * Stack: Bun + Hono + TypeScript + Groq + Supabase
 * 100% FREE deployment on Render/Railway/Vercel
 */
const app = new Hono();

// ============================================================================
// Middleware
// ============================================================================

// Logger
app.use("*", logger());

// CORS (allow WhatsApp Business API + Frontend)
app.use(
  "*",
  cors({
    origin: ["https://graph.facebook.com", config.NODE_ENV === "development" ? "*" : "https://wouribot.vercel.app"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-hub-signature-256"],
  }),
);

// Request timeout (buffer before Vercel limit)
app.use("*", timeout(50000));

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "Wouri Bot Backend",
    version: "1.0.0",
    stack: "Bun + Hono + TypeScript + Groq + Supabase",
    uptime: process.uptime(),
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Webhooks (WhatsApp + FedaPay)
app.route("/webhooks", webhooks);

// Models endpoint
app.route("/models", models);

// Chat endpoint (production)
app.route("/chat", chat);

// Admin API
app.route("/admin", admin);

// Test routes (Development only)
if (config.NODE_ENV === "development") {
  app.route("/test", test);
  const debug = await import("./routes/debug");
  app.route("/debug", debug.default);
}

// ============================================================================
// Error Handler
// ============================================================================

app.onError((err, c) => {
  console.error("❌ Server error:", err);

  return c.json(
    {
      error: config.NODE_ENV === "development" ? err.message : "Internal server error",
      timestamp: new Date().toISOString(),
    },
    500,
  );
});

// 404 Handler
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

export default app;
