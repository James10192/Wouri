/**
 * Admin API Types and Zod Schemas
 * Type-safe validation for admin dashboard endpoints
 *
 * @module types/admin
 */

import { z } from "zod";

// ============================================================================
// Feedback Schemas
// ============================================================================

export const feedbackCreateSchema = z.object({
  conversation_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
  embed_immediately: z.boolean().default(true),
});

export type FeedbackCreate = z.infer<typeof feedbackCreateSchema>;

export const feedbackSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid().nullable(),
  wa_id: z.string(),
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable(),
  is_embedded: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Feedback = z.infer<typeof feedbackSchema>;

// ============================================================================
// Knowledge Base Schemas
// ============================================================================

export const knowledgeMetadataSchema = z.object({
  source: z.string(),
  page: z.number().int().optional(),
  region: z.string().optional(),
  category: z.enum(["plantation", "harvest", "disease", "weather", "general"]).optional(),
  crop: z.string().optional(),
});

export type KnowledgeMetadata = z.infer<typeof knowledgeMetadataSchema>;

export const knowledgeCreateSchema = z.object({
  content: z.string().min(10).max(5000),
  metadata: knowledgeMetadataSchema,
});

export type KnowledgeCreate = z.infer<typeof knowledgeCreateSchema>;

export const documentSearchResultSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  similarity: z.number(),
  metadata: knowledgeMetadataSchema,
});

export type DocumentSearchResult = z.infer<typeof documentSearchResultSchema>;

// ============================================================================
// Translation Schemas
// ============================================================================

export const languageSchema = z.enum(["fr", "dioula", "baoulé", "en"]);
export type Language = z.infer<typeof languageSchema>;

export const translationCreateSchema = z.object({
  source_text: z.string().min(1).max(1000),
  source_language: languageSchema,
  target_language: languageSchema,
  translated_text: z.string().min(1).max(1000),
  context: z.string().max(500).optional(),
  verified: z.boolean().default(false),
});

export type TranslationCreate = z.infer<typeof translationCreateSchema>;

export const translationSchema = translationCreateSchema.extend({
  id: z.string().uuid(),
  created_by: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Translation = z.infer<typeof translationSchema>;

// ============================================================================
// Conversation Schemas (Extended)
// ============================================================================

export const conversationSchema = z.object({
  id: z.string().uuid(),
  wa_id: z.string(),
  message_id: z.string(),
  message_type: z.enum(["text", "audio", "image"]),
  user_message: z.string(),
  bot_response: z.string().nullable(),
  language: z.string(),
  region: z.string().nullable(),
  feedback_count: z.number().int().default(0),
  average_rating: z.number().nullable(),
  model_used: z.string().nullable(),
  tokens_used: z.number().int().nullable(),
  response_time_ms: z.number().int().nullable(),
  created_at: z.string().datetime(),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationDetailSchema = conversationSchema.extend({
  feedback: z.array(feedbackSchema).optional(),
});

export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

// ============================================================================
// Pagination Schemas
// ============================================================================

export const paginationQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default("50"),
  cursor: z.string().uuid().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().uuid().nullable(),
    hasMore: z.boolean(),
    total: z.number().int().optional(),
  });

// ============================================================================
// Monitoring Schemas
// ============================================================================

export const serviceStatusSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  latency_ms: z.number().nullable(),
  last_checked: z.string().datetime(),
  error_message: z.string().nullable(),
});

export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const monitoringResponseSchema = z.object({
  services: z.object({
    backend: serviceStatusSchema,
    supabase: serviceStatusSchema,
    groq: serviceStatusSchema,
    openweather: serviceStatusSchema,
    embeddings: serviceStatusSchema,
  }),
});

export type MonitoringResponse = z.infer<typeof monitoringResponseSchema>;

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const conversationsQuerySchema = paginationQuerySchema.extend({
  wa_id: z.string().optional(),
  language: z.enum(["fr", "dioula", "baoulé"]).optional(),
});

export type ConversationsQuery = z.infer<typeof conversationsQuerySchema>;

export const feedbackQuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default("50"),
  wa_id: z.string().optional(),
  min_rating: z.string().transform(Number).pipe(z.number().int().min(1).max(5)).optional(),
});

export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>;

export const knowledgeQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(50)).default("10"),
  region: z.string().optional(),
});

export type KnowledgeQuery = z.infer<typeof knowledgeQuerySchema>;

export const translationsQuerySchema = z.object({
  query: z.string().optional(),
  source_language: languageSchema.optional(),
  target_language: languageSchema.optional(),
  verified_only: z.string().transform((val) => val === "true").pipe(z.boolean()).default("false"),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default("20"),
});

export type TranslationsQuery = z.infer<typeof translationsQuerySchema>;

// ============================================================================
// Error Response Schema
// ============================================================================

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
