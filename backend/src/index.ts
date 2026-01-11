import { config } from "./lib/config";
import app from "./app";

// ============================================================================
// Start Server
// ============================================================================

const port = parseInt(config.PORT, 10);

const testEndpoints = config.NODE_ENV === "development" ? `
║  🧪 Test Endpoints (dev only):                            ║
║    GET  /test/health       - Test server                  ║
║    POST /test/chat         - Test RAG (body: {question})  ║
║    GET  /test/groq         - Test Groq API                ║
║    GET  /test/supabase     - Test Supabase connection     ║
║    GET  /test/weather      - Test OpenWeatherMap          ║
║                                                            ║` : '';

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🌾 Wouri Bot Backend 🌾                       ║
║                                                            ║
║  Stack: Bun + Hono + TypeScript + Groq + Supabase         ║
║  Port: ${port}                                             ║
║  Environment: ${config.NODE_ENV}                           ║
║                                                            ║
║  Production Endpoints:                                     ║
║    GET  /                  - API info                      ║
║    GET  /health            - Health check                  ║
║    GET  /webhooks/whatsapp - Webhook verification          ║
║    POST /webhooks/whatsapp - Receive WhatsApp messages     ║
║    POST /webhooks/fedapay  - Payment notifications         ║${testEndpoints}
╚════════════════════════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
