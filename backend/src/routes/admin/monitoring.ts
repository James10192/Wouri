/**
 * Admin Monitoring Endpoints
 * Service health checks and status monitoring
 *
 * @module routes/admin/monitoring
 */

import { Hono } from "hono";
import { supabase } from "../../services/supabase";
import { groq } from "../../services/groq";
import { config } from "../../lib/config";
import { isEmbeddingServiceHealthy } from "../../services/embeddings";
import type { ServiceStatus } from "../../types/admin";

const monitoring = new Hono();

/**
 * GET /admin/monitoring
 * Service health checks for all dependencies
 *
 * Returns:
 * - backend: always ok (if this endpoint responds)
 * - supabase: database connection status
 * - groq: LLM API status
 * - openweather: weather API status
 * - embeddings: embedding service status
 */
monitoring.get("/", async (c) => {
  // Check all services in parallel
  const [supabaseStatus, groqStatus, openweatherStatus, embeddingsStatus] = await Promise.all([
    checkSupabase(),
    checkGroq(),
    checkOpenWeather(),
    checkEmbeddings(),
  ]);

  const services = {
    backend: {
      status: "ok" as const,
      latency_ms: 0,
      last_checked: new Date().toISOString(),
      error_message: null,
    },
    supabase: supabaseStatus,
    groq: groqStatus,
    openweather: openweatherStatus,
    embeddings: embeddingsStatus,
  };

  // Determine overall status
  const hasDownService = Object.values(services).some((s) => s.status === "down");
  const hasDegradedService = Object.values(services).some((s) => s.status === "degraded");

  const overallStatus = hasDownService ? "down" : hasDegradedService ? "degraded" : "ok";

  return c.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
  });
});

/**
 * Check Supabase database connection
 */
async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();

  try {
    const { error } = await supabase.from("users").select("count").limit(1);

    if (error) {
      return {
        status: "down",
        latency_ms: null,
        last_checked: new Date().toISOString(),
        error_message: error.message,
      };
    }

    return {
      status: "ok",
      latency_ms: Date.now() - start,
      last_checked: new Date().toISOString(),
      error_message: null,
    };
  } catch (error: any) {
    return {
      status: "down",
      latency_ms: null,
      last_checked: new Date().toISOString(),
      error_message: error.message || "Unknown error",
    };
  }
}

/**
 * Check Groq API connection
 */
async function checkGroq(): Promise<ServiceStatus> {
  const start = Date.now();

  try {
    await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });

    return {
      status: "ok",
      latency_ms: Date.now() - start,
      last_checked: new Date().toISOString(),
      error_message: null,
    };
  } catch (error: any) {
    return {
      status: "down",
      latency_ms: null,
      last_checked: new Date().toISOString(),
      error_message: error.message || "Unknown error",
    };
  }
}

/**
 * Check OpenWeatherMap API connection
 */
async function checkOpenWeather(): Promise<ServiceStatus> {
  const start = Date.now();

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=Abidjan,CI&appid=${config.OPENWEATHER_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      status: "ok",
      latency_ms: Date.now() - start,
      last_checked: new Date().toISOString(),
      error_message: null,
    };
  } catch (error: any) {
    return {
      status: "down",
      latency_ms: null,
      last_checked: new Date().toISOString(),
      error_message: error.message || "Unknown error",
    };
  }
}

/**
 * Check embedding service availability
 */
async function checkEmbeddings(): Promise<ServiceStatus> {
  const start = Date.now();

  try {
    const isHealthy = await isEmbeddingServiceHealthy();

    if (!isHealthy) {
      throw new Error("Embedding service health check failed");
    }

    return {
      status: "ok",
      latency_ms: Date.now() - start,
      last_checked: new Date().toISOString(),
      error_message: null,
    };
  } catch (error: any) {
    return {
      status: "down",
      latency_ms: null,
      last_checked: new Date().toISOString(),
      error_message: error.message || "Unknown error",
    };
  }
}

export default monitoring;
