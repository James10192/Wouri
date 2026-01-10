# Monitoring Setup Guide

Complete guide to monitoring Wouri Bot services and setting up alerts.

---

## Overview

Monitor all services in the Wouri Bot stack:
- **Backend** (Render.com)
- **Database** (Supabase PostgreSQL + pgvector)
- **LLM** (Groq API)
- **Weather** (OpenWeather API)
- **Embeddings** (Supabase Edge Function)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│              GET /admin/monitoring (every 30s)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          Backend Monitoring Endpoint                         │
│          backend/src/routes/admin/monitoring.ts             │
│                                                              │
│  Checks:                                                     │
│  ✓ Backend uptime                                           │
│  ✓ Supabase connectivity (SELECT 1)                         │
│  ✓ Groq API (minimal completion)                            │
│  ✓ OpenWeather API (sample query)                           │
│  ✓ Embeddings (sample text → 768-dim vector)                │
│                                                              │
│  Returns:                                                    │
│  {                                                           │
│    services: {                                               │
│      backend: { status, latency_ms, last_checked },         │
│      supabase: { status, latency_ms, last_checked },        │
│      groq: { status, latency_ms, last_checked },            │
│      openweather: { status, latency_ms, last_checked },     │
│      embeddings: { status, latency_ms, last_checked }       │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Monitoring Endpoint

### Implementation

Already implemented in `backend/src/routes/admin/monitoring.ts`:

```typescript
import { Hono } from "hono";
import { supabase } from "@/services/supabase";
import { groq, GROQ_MODELS } from "@/services/groq";
import { getTextEmbedding } from "@/services/embeddings";
import { config } from "@/lib/config";

const monitoring = new Hono();

interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms: number;
  last_checked: string;
  error_message?: string;
}

monitoring.get("/", async (c) => {
  const results: Record<string, ServiceStatus> = {
    backend: {
      status: "healthy",
      latency_ms: 0,
      last_checked: new Date().toISOString(),
    },
  };

  // Check Supabase
  const supabaseStart = performance.now();
  try {
    const { error } = await supabase.from("conversations").select("id").limit(1);
    if (error) throw error;

    results.supabase = {
      status: "healthy",
      latency_ms: Math.round(performance.now() - supabaseStart),
      last_checked: new Date().toISOString(),
    };
  } catch (error) {
    results.supabase = {
      status: "unhealthy",
      latency_ms: 0,
      last_checked: new Date().toISOString(),
      error_message: (error as Error).message,
    };
  }

  // Check Groq
  const groqStart = performance.now();
  try {
    await groq.chat.completions.create({
      model: GROQ_MODELS.LLAMA_8B,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });

    results.groq = {
      status: "healthy",
      latency_ms: Math.round(performance.now() - groqStart),
      last_checked: new Date().toISOString(),
    };
  } catch (error) {
    results.groq = {
      status: "unhealthy",
      latency_ms: 0,
      last_checked: new Date().toISOString(),
      error_message: (error as Error).message,
    };
  }

  // Check OpenWeather
  const weatherStart = performance.now();
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Abidjan&appid=${config.OPENWEATHER_API_KEY}`
    );
    if (!response.ok) throw new Error("OpenWeather API request failed");

    results.openweather = {
      status: "healthy",
      latency_ms: Math.round(performance.now() - weatherStart),
      last_checked: new Date().toISOString(),
    };
  } catch (error) {
    results.openweather = {
      status: "unhealthy",
      latency_ms: 0,
      last_checked: new Date().toISOString(),
      error_message: (error as Error).message,
    };
  }

  // Check Embeddings
  const embeddingsStart = performance.now();
  try {
    const embedding = await getTextEmbedding("test");
    if (!Array.isArray(embedding) || embedding.length !== 768) {
      throw new Error("Invalid embedding response");
    }

    results.embeddings = {
      status: "healthy",
      latency_ms: Math.round(performance.now() - embeddingsStart),
      last_checked: new Date().toISOString(),
    };
  } catch (error) {
    results.embeddings = {
      status: "unhealthy",
      latency_ms: 0,
      last_checked: new Date().toISOString(),
      error_message: (error as Error).message,
    };
  }

  return c.json({ services: results });
});

export default monitoring;
```

---

## Health Check Thresholds

### Latency Thresholds

| Service | Expected (ms) | Warning (ms) | Critical (ms) |
|---------|---------------|--------------|---------------|
| Backend | < 10 | 10-50 | > 50 |
| Supabase | < 100 | 100-500 | > 500 |
| Groq | < 500 | 500-2000 | > 2000 |
| OpenWeather | < 500 | 500-2000 | > 2000 |
| Embeddings | < 200 | 200-1000 | > 1000 |

### Status Definitions

```typescript
interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms: number;
  last_checked: string;
  error_message?: string;
}
```

**Status levels**:
- **healthy**: Service responding within expected latency, no errors
- **degraded**: Service responding but slow (> 2x expected latency)
- **unhealthy**: Service not responding or returning errors

---

## Frontend Monitoring Dashboard

### useMonitoring Hook

```typescript
// hooks/useMonitoring.ts
"use client";

import useSWR from "swr";
import { adminFetch } from "@/lib/admin-api";

interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms: number;
  last_checked: string;
  error_message?: string;
}

interface MonitoringResponse {
  services: {
    backend: ServiceStatus;
    supabase: ServiceStatus;
    groq: ServiceStatus;
    openweather: ServiceStatus;
    embeddings: ServiceStatus;
  };
}

export function useMonitoring(refreshInterval: number = 30000) {
  const { data, error, isLoading, mutate } = useSWR<MonitoringResponse>(
    "/admin/monitoring",
    adminFetch,
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  );

  const allHealthy =
    data && Object.values(data.services).every(s => s.status === "healthy");

  const unhealthyServices =
    data
      ? Object.entries(data.services)
          .filter(([_, service]) => service.status === "unhealthy")
          .map(([name]) => name)
      : [];

  return {
    services: data?.services || null,
    allHealthy: allHealthy || false,
    unhealthyServices,
    isLoading,
    error,
    mutate,
  };
}
```

### Monitoring Dashboard Component

```typescript
// app/monitoring/page.tsx
"use client";

import { useMonitoring } from "@/hooks/useMonitoring";
import { format } from "date-fns";

export default function MonitoringPage() {
  const { services, allHealthy, unhealthyServices, isLoading } = useMonitoring(30000);

  if (isLoading) {
    return <div className="flex justify-center py-12">Loading service status...</div>;
  }

  if (!services) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Unable to fetch service status
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Service Monitoring</h2>
        <p className="mt-1 text-sm text-gray-600">
          Real-time health status of all services (refreshes every 30s)
        </p>
      </div>

      {/* Overall Status */}
      <div className={`p-6 rounded-lg ${allHealthy ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border`}>
        <div className="flex items-center">
          <span className="text-4xl mr-4">{allHealthy ? "✅" : "⚠️"}</span>
          <div>
            <h3 className={`text-xl font-bold ${allHealthy ? "text-green-900" : "text-red-900"}`}>
              {allHealthy ? "All Services Healthy" : `${unhealthyServices.length} Service(s) Down`}
            </h3>
            {!allHealthy && (
              <p className="text-sm text-red-700 mt-1">
                Affected: {unhealthyServices.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(services).map(([name, service]) => (
          <div
            key={name}
            className={`bg-white shadow rounded-lg p-6 border-l-4 ${
              service.status === "healthy"
                ? "border-green-500"
                : service.status === "degraded"
                ? "border-yellow-500"
                : "border-red-500"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 capitalize">{name}</h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  service.status === "healthy"
                    ? "bg-green-100 text-green-800"
                    : service.status === "degraded"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {service.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Latency:</span>
                <span className="font-medium text-gray-900">{service.latency_ms}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Last Checked:</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(service.last_checked), "HH:mm:ss")}
                </span>
              </div>
              {service.error_message && (
                <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                  <strong>Error:</strong> {service.error_message}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Automated Alerting

### 1. Slack Webhook Alerts

```typescript
// lib/alerts.ts
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function sendSlackAlert(message: string) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("Slack webhook not configured");
    return;
  }

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 Wouri Bot Alert\n\n${message}`,
      }),
    });
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
  }
}

// Usage
import { sendSlackAlert } from "@/lib/alerts";

const { services } = await adminFetch("/admin/monitoring");
const unhealthy = Object.entries(services)
  .filter(([_, s]) => s.status === "unhealthy")
  .map(([name, s]) => `- ${name}: ${s.error_message}`);

if (unhealthy.length > 0) {
  await sendSlackAlert(
    `⚠️ ${unhealthy.length} service(s) unhealthy:\n${unhealthy.join("\n")}`
  );
}
```

### 2. Email Alerts (SendGrid)

```bash
bun add @sendgrid/mail
```

```typescript
// lib/email-alerts.ts
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmailAlert(subject: string, body: string) {
  try {
    await sgMail.send({
      to: process.env.ALERT_EMAIL!,
      from: process.env.FROM_EMAIL!,
      subject: `🚨 Wouri Bot: ${subject}`,
      text: body,
    });
  } catch (error) {
    console.error("Failed to send email alert:", error);
  }
}
```

### 3. Discord Webhook Alerts

```typescript
// lib/discord-alerts.ts
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordAlert(message: string) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn("Discord webhook not configured");
    return;
  }

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🚨 **Wouri Bot Alert**\n\n${message}`,
      }),
    });
  } catch (error) {
    console.error("Failed to send Discord alert:", error);
  }
}
```

---

## Cron Job Monitoring

### GitHub Actions (Free)

Create `.github/workflows/monitoring.yml`:

```yaml
name: Service Monitoring

on:
  schedule:
    - cron: "*/5 * * * *" # Every 5 minutes
  workflow_dispatch: # Manual trigger

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Check Services
        run: |
          RESPONSE=$(curl -s -X GET "https://wouribot-backend.onrender.com/admin/monitoring" \
            -H "x-admin-key: ${{ secrets.ADMIN_API_KEY }}")

          echo "Service Status:"
          echo "$RESPONSE" | jq .

          # Check for unhealthy services
          UNHEALTHY=$(echo "$RESPONSE" | jq '.services | to_entries | .[] | select(.value.status != "healthy") | .key' | wc -l)

          if [ "$UNHEALTHY" -gt 0 ]; then
            echo "⚠️ $UNHEALTHY service(s) unhealthy!"
            exit 1
          else
            echo "✅ All services healthy"
          fi
```

### Uptime Robot (Free)

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Create HTTP(S) monitor:
   - URL: `https://wouribot-backend.onrender.com/health` (create health endpoint)
   - Interval: 5 minutes
   - Alert contacts: Email, Slack, Discord

### Health Endpoint

Create simple health endpoint:

```typescript
// backend/src/routes/health.ts
import { Hono } from "hono";

const health = new Hono();

health.get("/", async (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default health;
```

Mount in `backend/src/index.ts`:

```typescript
import health from "@/routes/health";
app.route("/health", health);
```

---

## Performance Metrics

### Track Response Times

```typescript
// backend/src/middleware/metrics.ts
import { Context, Next } from "hono";

export async function metricsMiddleware(c: Context, next: Next) {
  const start = performance.now();
  const path = c.req.path;
  const method = c.req.method;

  await next();

  const latency = performance.now() - start;
  const status = c.res.status;

  console.log(`[Metrics] ${method} ${path} - ${status} - ${latency.toFixed(0)}ms`);

  // Store in metrics database (optional)
  // await storeMetric({ path, method, status, latency, timestamp: new Date() });
}

// Apply to all routes
app.use("*", metricsMiddleware);
```

### Supabase Metrics Table

```sql
-- Optional: Store metrics in database
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX metrics_timestamp_idx ON metrics(timestamp DESC);
```

---

## Dashboard Visualization

### Response Time Chart (Recharts)

```bash
bun add recharts
```

```typescript
// components/ResponseTimeChart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useMonitoring } from "@/hooks/useMonitoring";
import { useState, useEffect } from "react";

export function ResponseTimeChart() {
  const { services } = useMonitoring(30000);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (services) {
      setData(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          supabase: services.supabase.latency_ms,
          groq: services.groq.latency_ms,
          embeddings: services.embeddings.latency_ms,
        },
      ].slice(-20)); // Keep last 20 data points
    }
  }, [services]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time Trends</h3>
      <LineChart width={800} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis label={{ value: "Latency (ms)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="supabase" stroke="#8884d8" />
        <Line type="monotone" dataKey="groq" stroke="#82ca9d" />
        <Line type="monotone" dataKey="embeddings" stroke="#ffc658" />
      </LineChart>
    </div>
  );
}
```

---

## Best Practices

### 1. Alert Fatigue Prevention

```typescript
// Implement cooldown period for repeated alerts
const alertCooldown = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

function shouldSendAlert(serviceName: string): boolean {
  const lastAlert = alertCooldown.get(serviceName);
  if (lastAlert && Date.now() - lastAlert < COOLDOWN_MS) {
    return false; // Don't send duplicate alert
  }
  alertCooldown.set(serviceName, Date.now());
  return true;
}
```

### 2. Escalation Levels

```typescript
interface AlertConfig {
  email: boolean;
  slack: boolean;
  discord: boolean;
  pagerduty?: boolean;
}

function getAlertConfig(severity: "low" | "medium" | "high"): AlertConfig {
  switch (severity) {
    case "high":
      return { email: true, slack: true, discord: true, pagerduty: true };
    case "medium":
      return { email: true, slack: true, discord: false };
    case "low":
      return { email: false, slack: true, discord: false };
  }
}
```

### 3. Health Check Endpoints

```typescript
// Separate health checks for different aspects
app.get("/health", (c) => c.json({ status: "ok" })); // Simple uptime
app.get("/health/ready", async (c) => {
  // Check if app is ready to serve requests
  const supabaseOk = await checkSupabase();
  return c.json({ ready: supabaseOk });
});
app.get("/health/live", (c) => c.json({ alive: true })); // Liveness probe
```

---

## Troubleshooting

### High Latency Issues

**Symptoms**: Response times > 2x expected

**Investigate**:
1. Check Render.com instance status (cold start?)
2. Verify Supabase connection pooling
3. Review Groq API rate limits
4. Check database query performance

### Service Unavailable

**Symptoms**: Service returning unhealthy status

**Steps**:
1. Check service logs
2. Verify API keys and credentials
3. Test service directly (curl)
4. Check rate limits and quotas

---

## Next Steps

1. ✅ Deploy monitoring endpoint
2. ✅ Set up frontend dashboard
3. ✅ Configure alerting (Slack/Discord/Email)
4. ✅ Set up cron job monitoring (GitHub Actions or Uptime Robot)
5. ⏳ Implement metrics tracking (optional)
6. ⏳ Add performance charts (optional)

---

## References

- [Render.com Monitoring](https://render.com/docs/monitoring)
- [Supabase Metrics](https://supabase.com/docs/guides/platform/metrics)
- [Uptime Robot](https://uptimerobot.com/)
- [GitHub Actions Cron](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
