import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { config } from "@/lib/config";
import webhooks from "@/routes/webhooks";

/**
 * Wouri Bot Backend
 * Stack: Bun + Hono + TypeScript + Groq + Supabase
 * 100% FREE deployment on Render/Railway
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

// ============================================================================
// Start Server
// ============================================================================

const port = parseInt(config.PORT, 10);

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🌾 Wouri Bot Backend 🌾                       ║
║                                                            ║
║  Stack: Bun + Hono + TypeScript + Groq + Supabase         ║
║  Port: ${port}                                             ║
║  Environment: ${config.NODE_ENV}                           ║
║                                                            ║
║  Endpoints:                                                ║
║    GET  /                  - API info                      ║
║    GET  /health            - Health check                  ║
║    GET  /webhooks/whatsapp - Webhook verification          ║
║    POST /webhooks/whatsapp - Receive WhatsApp messages     ║
║    POST /webhooks/fedapay  - Payment notifications         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
