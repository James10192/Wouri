# Monitoring Endpoint

Check health status of all backend services (Supabase, Groq, OpenWeather, Embeddings).

---

## GET `/admin/monitoring`

Perform health checks on all external services used by Wouri Bot.

### Request

**Headers**:
```http
x-admin-key: your-admin-api-key
Content-Type: application/json
```

**No query parameters required.**

### Response

**Success (200 OK)**:
```json
{
  "services": {
    "backend": {
      "status": "healthy",
      "latency_ms": 0,
      "last_checked": "2026-01-10T15:30:00Z"
    },
    "supabase": {
      "status": "healthy",
      "latency_ms": 45,
      "last_checked": "2026-01-10T15:30:00Z"
    },
    "groq": {
      "status": "healthy",
      "latency_ms": 120,
      "last_checked": "2026-01-10T15:30:00Z"
    },
    "openweather": {
      "status": "healthy",
      "latency_ms": 230,
      "last_checked": "2026-01-10T15:30:00Z"
    },
    "embeddings": {
      "status": "healthy",
      "latency_ms": 85,
      "last_checked": "2026-01-10T15:30:00Z"
    }
  }
}
```

**Partial Failure (200 OK with errors)**:
```json
{
  "services": {
    "backend": {
      "status": "healthy",
      "latency_ms": 0,
      "last_checked": "2026-01-10T15:30:00Z"
    },
    "supabase": {
      "status": "healthy",
      "latency_ms": 45,
      "last_checked": "2026-01-10T15:30:00Z"
    },
    "groq": {
      "status": "unhealthy",
      "latency_ms": 0,
      "last_checked": "2026-01-10T15:30:00Z",
      "error_message": "API key invalid or rate limit exceeded"
    },
    "openweather": {
      "status": "healthy",
      "latency_ms": 230,
      "last_checked": "2026-01-10T15:30:00Z"
    },
    "embeddings": {
      "status": "unhealthy",
      "latency_ms": 0,
      "last_checked": "2026-01-10T15:30:00Z",
      "error_message": "Supabase Edge Function timeout"
    }
  }
}
```

### Service Status Object

| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | healthy, degraded, unhealthy |
| `latency_ms` | integer | Response time in milliseconds |
| `last_checked` | datetime | Timestamp of last check (ISO 8601) |
| `error_message` | string | Error details (only if unhealthy) |

### Health Check Tests

#### 1. Backend
- **Test**: Server uptime
- **Method**: Internal timestamp check
- **Expected**: Always healthy (if API responds)

#### 2. Supabase
- **Test**: Database connectivity
- **Method**: Simple SELECT query
- **Expected**: < 100ms latency
- **Failure**: Connection timeout, authentication error

#### 3. Groq
- **Test**: LLM API availability
- **Method**: Minimal completion request (10 tokens)
- **Expected**: < 500ms latency
- **Failure**: Rate limit, API key invalid, service down

#### 4. OpenWeather
- **Test**: Weather API availability
- **Method**: Sample weather query for Abidjan
- **Expected**: < 500ms latency
- **Failure**: API key invalid, quota exceeded

#### 5. Embeddings
- **Test**: Supabase Edge Function
- **Method**: Embed sample text ("test")
- **Expected**: < 200ms latency, returns 768-dim vector
- **Failure**: Function timeout, model loading error

### Examples

**TypeScript/Fetch**:
```typescript
const status = await adminFetch('/admin/monitoring');

// Check if all services are healthy
const allHealthy = Object.values(status.services).every(
  service => service.status === 'healthy'
);

if (!allHealthy) {
  console.error('⚠️ Some services are unhealthy:');
  Object.entries(status.services).forEach(([name, service]) => {
    if (service.status !== 'healthy') {
      console.error(`- ${name}: ${service.error_message}`);
    }
  });
}

// Display latencies
Object.entries(status.services).forEach(([name, service]) => {
  if (service.status === 'healthy') {
    console.log(`✅ ${name}: ${service.latency_ms}ms`);
  }
});
```

**curl**:
```bash
curl -X GET "https://wouribot-backend.onrender.com/admin/monitoring" \
  -H "x-admin-key: your-api-key"
```

---

## Use Cases

### 1. Real-time Dashboard

```typescript
// Poll monitoring endpoint every 30 seconds
async function monitorServices() {
  const status = await adminFetch('/admin/monitoring');

  // Update UI indicators
  updateServiceStatus('supabase', status.services.supabase);
  updateServiceStatus('groq', status.services.groq);
  updateServiceStatus('openweather', status.services.openweather);
  updateServiceStatus('embeddings', status.services.embeddings);

  // Alert on issues
  const unhealthy = Object.entries(status.services)
    .filter(([_, service]) => service.status === 'unhealthy');

  if (unhealthy.length > 0) {
    showAlert(`${unhealthy.length} service(s) down!`);
  }
}

setInterval(monitorServices, 30000); // Poll every 30s
```

### 2. Service Degradation Detection

```typescript
// Track latency trends
const latencyHistory: Record<string, number[]> = {
  supabase: [],
  groq: [],
  openweather: [],
  embeddings: []
};

async function checkServiceDegradation() {
  const status = await adminFetch('/admin/monitoring');

  for (const [name, service] of Object.entries(status.services)) {
    if (name === 'backend') continue;

    // Store latency
    latencyHistory[name].push(service.latency_ms);

    // Keep only last 10 checks
    if (latencyHistory[name].length > 10) {
      latencyHistory[name].shift();
    }

    // Calculate average latency
    const avgLatency = latencyHistory[name].reduce((a, b) => a + b, 0) / latencyHistory[name].length;

    // Alert if current latency is 2x average
    if (service.latency_ms > avgLatency * 2) {
      console.warn(`⚠️ ${name} latency spike: ${service.latency_ms}ms (avg: ${avgLatency.toFixed(0)}ms)`);
    }
  }
}
```

### 3. Uptime Tracking

```typescript
// Track service uptime over time
interface UptimeStats {
  service: string;
  total_checks: number;
  healthy_checks: number;
  uptime_percentage: number;
}

const uptimeTracker: Record<string, UptimeStats> = {
  supabase: { service: 'supabase', total_checks: 0, healthy_checks: 0, uptime_percentage: 100 },
  groq: { service: 'groq', total_checks: 0, healthy_checks: 0, uptime_percentage: 100 },
  openweather: { service: 'openweather', total_checks: 0, healthy_checks: 0, uptime_percentage: 100 },
  embeddings: { service: 'embeddings', total_checks: 0, healthy_checks: 0, uptime_percentage: 100 }
};

async function trackUptime() {
  const status = await adminFetch('/admin/monitoring');

  for (const [name, service] of Object.entries(status.services)) {
    if (name === 'backend') continue;

    const stats = uptimeTracker[name];
    stats.total_checks++;

    if (service.status === 'healthy') {
      stats.healthy_checks++;
    }

    stats.uptime_percentage = (stats.healthy_checks / stats.total_checks) * 100;
  }

  // Display uptime report
  console.log('\n📊 Service Uptime Report:');
  Object.values(uptimeTracker).forEach(stats => {
    console.log(`${stats.service}: ${stats.uptime_percentage.toFixed(2)}% (${stats.healthy_checks}/${stats.total_checks})`);
  });
}

// Run every minute
setInterval(trackUptime, 60000);
```

### 4. Automated Alerting

```typescript
// Send alerts via Slack/Discord/Email when services fail
async function checkAndAlert() {
  const status = await adminFetch('/admin/monitoring');

  const unhealthyServices = Object.entries(status.services)
    .filter(([name, service]) => service.status === 'unhealthy' && name !== 'backend');

  if (unhealthyServices.length > 0) {
    const message = unhealthyServices
      .map(([name, service]) => `🔴 ${name}: ${service.error_message}`)
      .join('\n');

    // Send to Slack
    await fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
      method: 'POST',
      body: JSON.stringify({
        text: `⚠️ Wouri Bot Services Alert\n\n${message}`
      })
    });

    console.error(`[ALERT] ${unhealthyServices.length} service(s) unhealthy`);
  }
}
```

---

## Status Interpretation

### Healthy
- ✅ Service responding within expected latency
- ✅ All API calls successful
- ✅ No errors in last check

**Action**: No action needed

### Degraded
- ⚠️ Service responding but slow (> 2x normal latency)
- ⚠️ Intermittent errors (< 50% failure rate)

**Action**: Monitor closely, investigate if persists

### Unhealthy
- 🔴 Service not responding
- 🔴 API authentication failed
- 🔴 Timeout or connection error

**Action**: Immediate investigation required

---

## Latency Benchmarks

| Service | Expected (ms) | Degraded (ms) | Unhealthy (ms) |
|---------|---------------|---------------|----------------|
| Backend | < 10 | 10-50 | > 50 |
| Supabase | < 100 | 100-500 | > 500 |
| Groq | < 500 | 500-2000 | > 2000 |
| OpenWeather | < 500 | 500-2000 | > 2000 |
| Embeddings | < 200 | 200-1000 | > 1000 |

---

## Common Issues

### Supabase: "Connection timeout"
**Cause**: Network issue or Supabase instance paused (free tier)
**Fix**: Wait 1-2 minutes for instance to wake up, check SUPABASE_URL

### Groq: "Rate limit exceeded"
**Cause**: 14,400 requests/day limit reached (free tier)
**Fix**: Wait until next day, consider upgrading plan, or implement request queuing

### OpenWeather: "Invalid API key"
**Cause**: API key expired or incorrect
**Fix**: Regenerate API key on openweathermap.org

### Embeddings: "Supabase Edge Function timeout"
**Cause**: Cold start (first request after 15min inactivity)
**Fix**: Retry request, consider keep-alive pings

---

## Related Endpoints

- [Conversations](./conversations.md) - View system activity
- [Feedback](./feedback.md) - Check RAG pipeline health
- [Knowledge Base](./knowledge.md) - Verify vector search performance
