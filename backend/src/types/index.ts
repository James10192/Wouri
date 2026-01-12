import { z } from "zod";

// ============================================================================
// Environment Variables Schema
// ============================================================================
export const envSchema = z.object({
  // Server
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_URL_TRANSACTION: z.string().url().optional(),

  // Groq API (FREE)
  GROQ_API_KEY: z.string().startsWith("gsk_"),

  // WhatsApp (optional for now - configure later)
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_APP_SECRET: z.string().min(1).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1).optional(),

  // FedaPay (optional for now - configure later)
  FEDAPAY_SECRET_KEY: z.string().min(1).optional(),
  FEDAPAY_PUBLIC_KEY: z.string().min(1).optional(),

  // OpenWeatherMap
  OPENWEATHER_API_KEY: z.string().min(1),

  // Admin API
  ADMIN_API_KEY: z.string().min(32).optional(), // Minimum 32 characters for security

  // Timeout configuration (optional)
  VERCEL_FUNCTION_TIMEOUT: z.string().optional().default("60000"),
  EMBEDDING_TIMEOUT_MS: z.string().optional().default("8000"),
  SEARCH_TIMEOUT_MS: z.string().optional().default("10000"),
  GROQ_TIMEOUT_MS: z.string().optional().default("30000"),
  WEATHER_TIMEOUT_MS: z.string().optional().default("3000"),
  RAG_PIPELINE_TIMEOUT_MS: z.string().optional().default("45000"),
  ADMIN_WRITE_TIMEOUT_MS: z.string().optional().default("15000"),
});

export type Env = z.infer<typeof envSchema>;

// ============================================================================
// WhatsApp Types
// ============================================================================
export const messageTypeSchema = z.enum(["text", "audio", "image"]);
export type MessageType = z.infer<typeof messageTypeSchema>;

export const whatsappMessageSchema = z.object({
  wa_id: z.string().min(10),
  phone_number: z.string().regex(/^\+\d{10,15}$/),
  message: z.string().max(4096),
  message_type: messageTypeSchema,
  timestamp: z.string().datetime(),
});

export type WhatsAppMessage = z.infer<typeof whatsappMessageSchema>;

// ============================================================================
// User Types
// ============================================================================
export const userLanguageSchema = z.enum(["fr", "dioula", "baoulé"]);
export type UserLanguage = z.infer<typeof userLanguageSchema>;

export const subscriptionStatusSchema = z.enum(["freemium", "premium", "blocked"]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export interface User {
  id: string;
  wa_id: string;
  phone_number: string;
  preferred_language: UserLanguage;
  region: string | null;
  subscription_status: SubscriptionStatus;
  subscription_end_date: string | null;
  monthly_quota_used: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// RAG Types
// ============================================================================
export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
    region?: string;
    category?: string;
  };
  embedding?: number[];
}

export interface RAGResponse {
  answer: string;
  reasoning?: string;
  sources: Array<{
    source: string;
    page?: number;
    similarity: number;
  }>;
  metadata: {
    model: string;
    tokens_used: number;
    response_time_ms: number;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      reasoningTokens?: number;
    };
  };
  debug?: {
    toolInvocations?: Array<{
      toolName: string;
      args?: Record<string, unknown>;
      result?: Record<string, unknown>;
      errorText?: string;
      state?: string;
    }>;
  };
}

// ============================================================================
// Error Types
// ============================================================================
export class WouribotError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "WouribotError";
  }
}

export class SubscriptionExpiredError extends WouribotError {
  constructor(wa_id: string) {
    super(`Subscription expired for user ${wa_id}`, 402, "SUBSCRIPTION_EXPIRED");
    this.name = "SubscriptionExpiredError";
  }
}

export class RAGRetrievalError extends WouribotError {
  constructor(message: string) {
    super(message, 500, "RAG_RETRIEVAL_FAILED");
    this.name = "RAGRetrievalError";
  }
}
