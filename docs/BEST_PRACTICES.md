# Best Practices 2026 - Wouri Bot (Bun + Hono + TypeScript)

**Dernière mise à jour**: 9 Janvier 2026
**Stack**: Bun 1.1+, Hono 4.6+, TypeScript 5.7+, Groq API, Supabase (pgvector)

---

## 🚀 Bun Runtime

### Pourquoi Bun?

**Bun** est un runtime JavaScript/TypeScript ultra-rapide qui remplace Node.js.

| Métrique | Node.js 20 | Bun 1.1 | Amélioration |
|----------|------------|---------|--------------|
| **Démarrage** | ~200ms | **~50ms** | 4x plus rapide |
| **HTTP req/s** | ~40K | **~150K** | 3.7x plus rapide |
| **Mémoire** | ~80MB | **~35MB** | 2.3x moins |
| **TypeScript** | Via `tsc` | **Natif** | Pas de build! |
| **Package manager** | npm/pnpm | **Built-in** | 20x plus rapide |

### Installation

```bash
# Linux/macOS
curl -fsSL https://bun.sh/install | bash

# Windows (WSL2 recommandé)
powershell -c "irm bun.sh/install.ps1|iex"

# Vérifier version
bun --version # >= 1.1.0
```

### Commandes Essentielles

```bash
# Installer dépendances (20x plus rapide que npm)
bun install

# Lancer script TypeScript (sans build!)
bun run src/index.ts

# Watch mode (auto-reload)
bun --watch src/index.ts

# Tests built-in
bun test

# Build (si nécessaire)
bun build src/index.ts --outdir ./dist --target bun
```

### Configuration package.json

```json
{
  "name": "wouribot-backend",
  "type": "module", // ESM par défaut
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test",
    "lint": "bunx @biomejs/biome check src/",
    "format": "bunx @biomejs/biome format --write src/"
  },
  "dependencies": {
    "hono": "^4.6.14",
    "@supabase/supabase-js": "^2.47.10",
    "groq-sdk": "^0.8.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@types/bun": "^1.1.14",
    "bun-types": "^1.1.38"
  }
}
```

---

## ⚡ Hono Framework

### Pourquoi Hono?

**Hono** est un framework web ultra-léger et rapide pour TypeScript.

| Métrique | Express.js | Fastify | Hono |
|----------|------------|---------|------|
| **Bundle size** | 540KB | 200KB | **< 20KB** |
| **Req/s** | 25K | 70K | **150K+** |
| **Edge compatible** | ❌ | ❌ | ✅ |
| **TypeScript** | Externe | Externe | **Natif** |
| **Validation** | Manuel | via plugins | **Intégré** |

### Setup Basique

```typescript
// src/index.ts
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({ origin: "*" }));

// Routes
app.get("/", (c) => {
  return c.json({ message: "Hello Wouri Bot!" });
});

// Export pour Bun
export default {
  port: 3000,
  fetch: app.fetch,
};
```

### Routing

```typescript
// src/routes/webhooks.ts
import { Hono } from "hono";

const webhooks = new Hono();

// GET avec query params
webhooks.get("/whatsapp", (c) => {
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (token === "my_token") {
    return c.text(challenge || "");
  }
  return c.json({ error: "Invalid token" }, 403);
});

// POST avec body JSON
webhooks.post("/whatsapp", async (c) => {
  const body = await c.req.json();
  console.log(body);

  // Traitement en background
  c.executionCtx.waitUntil(processAsync(body));

  return c.json({ status: "received" });
});

// POST avec validation Zod
import { z } from "zod";

const messageSchema = z.object({
  wa_id: z.string().min(10),
  message: z.string().max(4096),
});

webhooks.post("/send", async (c) => {
  const body = await c.req.json();

  // Valider avec Zod
  try {
    const data = messageSchema.parse(body);
    // data est type-safe ici
    console.log(data.wa_id, data.message);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Invalid input" }, 400);
  }
});

export default webhooks;
```

### Middleware Custom

```typescript
// src/middleware/auth.ts
import { Context, Next } from "hono";

export async function authMiddleware(c: Context, next: Next) {
  const token = c.req.header("Authorization");

  if (!token || !token.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const apiKey = token.replace("Bearer ", "");

  // Vérifier API key
  if (apiKey !== process.env.API_SECRET_KEY) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  await next();
}

// Utilisation
import webhooks from "@/routes/webhooks";

app.use("/webhooks/*", authMiddleware);
app.route("/webhooks", webhooks);
```

### Error Handling

```typescript
app.onError((err, c) => {
  console.error("Error:", err);

  return c.json(
    {
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
    500
  );
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});
```

---

## 📐 TypeScript Strict Mode

### tsconfig.json Recommandé

```json
{
  "compilerOptions": {
    // Bun settings
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowJs": true,

    // Strict mode (IMPORTANT!)
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,

    // Best practices
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,

    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // Types
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Conventions TypeScript

```typescript
// ✅ GOOD - Type-safe avec Zod
import { z } from "zod";

const userSchema = z.object({
  wa_id: z.string().min(10).max(20),
  phone_number: z.string().regex(/^\+\d{10,15}$/),
  preferred_language: z.enum(["fr", "dioula", "baoulé"]),
  region: z.string().nullable(),
});

type User = z.infer<typeof userSchema>;

async function getUser(wa_id: string): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("wa_id", wa_id)
    .single();

  if (!data) return null;

  // Valider au runtime
  return userSchema.parse(data);
}

// ❌ BAD - Type any
function badFunction(data: any) {  // ❌ Interdit!
  return data.whatever;
}

// ❌ BAD - Pas de validation runtime
type UserUnsafe = {
  wa_id: string;
  phone_number: string;
};

async function getUserUnsafe(wa_id: string): Promise<UserUnsafe | null> {
  const { data } = await supabase.from("users").select("*").eq("wa_id", wa_id).single();

  // ❌ Pas de validation! data peut avoir n'importe quoi
  return data as UserUnsafe;
}
```

---

## 🗄️ Supabase + pgvector

### Client Setup

```typescript
// src/services/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

export const supabase: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Server-side, no session
    },
  }
);

// Type-safe queries avec Database types
import { Database } from "./database.types"; // Généré via Supabase CLI

const supabase: SupabaseClient<Database> = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);
```

### pgvector Usage

```typescript
// Recherche vectorielle
export async function searchSimilarDocuments(
  embedding: number[],
  match_threshold: number = 0.7,
  match_count: number = 5,
  filter?: { region?: string }
) {
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold,
    match_count,
    filter: filter || {},
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return data || [];
}

// Insérer document avec embedding
export async function insertDocument(
  content: string,
  embedding: number[],
  metadata: { source: string; page?: number; region?: string }
) {
  const { error } = await supabase.from("documents").insert({
    content,
    embedding,
    metadata,
  });

  if (error) {
    throw new Error(`Insert failed: ${error.message}`);
  }
}
```

### Query Optimization

```typescript
// ✅ GOOD - Select specific fields
const { data } = await supabase
  .from("users")
  .select("wa_id, phone_number, preferred_language")
  .eq("wa_id", wa_id)
  .single();

// ❌ BAD - Select all
const { data } = await supabase
  .from("users")
  .select("*")
  .eq("wa_id", wa_id)
  .single();

// ✅ GOOD - Batch operations
const wa_ids = ["123", "456", "789"];
const { data } = await supabase
  .from("users")
  .select("*")
  .in("wa_id", wa_ids);

// ❌ BAD - N+1 queries
for (const wa_id of wa_ids) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("wa_id", wa_id)
    .single();
}
```

---

## 🤖 Groq API (LLM Gratuit)

### Client Setup

```typescript
// src/services/groq.ts
import Groq from "groq-sdk";
import { config } from "@/lib/config";

export const groq = new Groq({
  apiKey: config.GROQ_API_KEY, // gsk_...
});

export const GROQ_MODELS = {
  LLAMA_70B: "llama-3.3-70b-versatile", // Recommandé pour RAG
  LLAMA_8B: "llama-3.1-8b-instant",     // Ultra-rapide
  MIXTRAL: "mixtral-8x7b-32768",        // Multilingue
} as const;
```

### Chat Completion

```typescript
export async function generateRAGResponse(
  question: string,
  context: string,
  userRegion: string
) {
  const response = await groq.chat.completions.create({
    model: GROQ_MODELS.LLAMA_70B,
    messages: [
      {
        role: "system",
        content: "Tu es un conseiller agricole pour la Côte d'Ivoire.",
      },
      {
        role: "user",
        content: `CONTEXTE:\n${context}\n\nQUESTION: ${question}`,
      },
    ],
    temperature: 0.3, // Factuel (0.0-1.0)
    max_tokens: 300,
    top_p: 0.9,
  });

  return response.choices[0]?.message?.content || "";
}
```

### Rate Limiting

**Limites FREE Groq:**
- 14,400 requêtes/jour = 600 req/h = 10 req/min
- 6,000 requêtes/minute (burst)

```typescript
// Simple rate limiter (in-memory)
const rateLimiter = new Map<string, number[]>();

export function checkRateLimit(wa_id: string, maxPerMinute: number = 10): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(wa_id) || [];

  // Garder seulement dernière minute
  const recentRequests = userRequests.filter((t) => now - t < 60000);

  if (recentRequests.length >= maxPerMinute) {
    return false; // Rate limit atteint
  }

  recentRequests.push(now);
  rateLimiter.set(wa_id, recentRequests);
  return true;
}
```

---

## 🧪 Tests avec Bun:test

```typescript
// src/services/groq.test.ts
import { describe, test, expect } from "bun:test";
import { generateRAGResponse } from "./groq";

describe("Groq Service", () => {
  test("should generate response", async () => {
    const context = "Le maïs se plante en avril-mai en Côte d'Ivoire.";
    const question = "Quand planter le maïs?";

    const response = await generateRAGResponse(question, context, "Bouaké");

    expect(response).toBeTruthy();
    expect(response.toLowerCase()).toContain("maïs");
  });

  test("should handle empty context", async () => {
    const response = await generateRAGResponse("Test", "", "Bouaké");

    expect(response).toBeTruthy();
  });
});
```

**Lancer tests:**

```bash
bun test
bun test --watch
```

---

## 🚀 Déploiement Production

### Checklist Avant Deploy

- [ ] Variables d'environnement validées (Zod)
- [ ] Tests passent (`bun test`)
- [ ] Lint OK (`bun run lint`)
- [ ] Docker build réussit
- [ ] HTTPS configuré (Render auto)
- [ ] Webhook WhatsApp vérifié
- [ ] Rate limiting activé
- [ ] Logging structuré

### Dockerfile Optimisé

```dockerfile
FROM oven/bun:1.1-slim AS base
WORKDIR /app

# Dependencies
FROM base AS dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Release
FROM base AS release
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s \
  CMD bun fetch http://localhost:3000/health || exit 1

# Run
USER bun
ENTRYPOINT ["bun", "run", "src/index.ts"]
```

### Variables d'Environnement Production

```bash
# IMPORTANT: Ne JAMAIS commit .env en production!

# Utiliser plateforme secrets management:
# - Render.com: Dashboard → Environment → Add
# - Railway.app: railway variables set KEY=VALUE
# - Vercel: vercel env add KEY
```

---

## 🔒 Sécurité Best Practices

### 1. Validation Input (Zod)

```typescript
import { z } from "zod";

const webhookSchema = z.object({
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          value: z.object({
            messages: z.array(
              z.object({
                from: z.string().regex(/^\d{10,15}$/),
                text: z.object({
                  body: z.string().max(4096),
                }),
              })
            ),
          }),
        })
      ),
    })
  ),
});

// Valider payload WhatsApp
const payload = await c.req.json();
const validated = webhookSchema.parse(payload); // Throws si invalide
```

### 2. Webhook Signature Verification

```typescript
import { createHmac } from "crypto";

export function verifyWebhookSignature(signature: string, body: string): boolean {
  const expectedSignature = createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
    .update(body)
    .digest("hex");

  const signatureHash = signature.replace("sha256=", "");

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signatureHash),
    Buffer.from(expectedSignature)
  );
}
```

### 3. CORS Strict

```typescript
import { cors } from "hono/cors";

app.use(
  "*",
  cors({
    origin: [
      "https://graph.facebook.com", // Meta webhooks
      "https://wouribot.vercel.app", // Frontend
    ],
    allowMethods: ["GET", "POST"],
    allowHeaders: ["Content-Type", "Authorization", "x-hub-signature-256"],
  })
);
```

---

## 📊 Performance Optimization

### 1. Caching Strategy

```typescript
// In-memory cache (simple)
const cache = new Map<string, { data: any; expiry: number }>();

export function cacheGet(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiry) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

export function cacheSet(key: string, data: any, ttl: number = 3600000) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
}

// Usage
const cachedWeather = cacheGet(`weather:${region}`);
if (cachedWeather) {
  return cachedWeather;
}

const weather = await fetchWeatherAPI(region);
cacheSet(`weather:${region}`, weather, 1800000); // 30min
```

### 2. Parallel Requests

```typescript
// ✅ GOOD - Parallel (Bun est ultra-rapide pour ça!)
const [user, weather, embedding] = await Promise.all([
  getUserByWaId(wa_id),
  getWeatherContext(region),
  getTextEmbedding(question),
]);

// ❌ BAD - Sequential
const user = await getUserByWaId(wa_id); // Wait 100ms
const weather = await getWeatherContext(region); // Wait 200ms
const embedding = await getTextEmbedding(question); // Wait 300ms
// Total: 600ms vs 300ms parallel!
```

---

## 📚 Sources Officielles

- [Bun Docs](https://bun.sh/docs)
- [Hono Docs](https://hono.dev)
- [TypeScript 5.7](https://www.typescriptlang.org/docs/)
- [Zod Docs](https://zod.dev)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Groq API Docs](https://console.groq.com/docs)

---

## 🔄 Changelog

### 9 Janvier 2026
- Création document basé sur Bun 1.1 + Hono 4.6
- Migration depuis Python/FastAPI
- Stack 100% gratuite (Groq + Supabase pgvector)
- Best practices TypeScript strict
- Deployment Render.com/Railway

---

*Maintenu par: Wouri Bot Team*
*Dernière mise à jour: 9 Janvier 2026*
