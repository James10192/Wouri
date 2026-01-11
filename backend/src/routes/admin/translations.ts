/**
 * Admin Translations Endpoints
 * Manage multilingual translation database (FR, Dioula, Baoulé)
 *
 * @module routes/admin/translations
 */

import { Hono } from "hono";
import { supabase } from "../../services/supabase";
import { translationCreateSchema, translationsQuerySchema, translationSchema } from "../../types/admin";

const translations = new Hono();

/**
 * POST /admin/translations
 * Add translation entry
 *
 * Body:
 * - source_text: string
 * - source_language: fr | dioula | baoulé | en
 * - target_language: fr | dioula | baoulé | en
 * - translated_text: string
 * - context?: string (agricultural context)
 * - verified?: boolean (default: false)
 */
translations.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = translationCreateSchema.parse(body);

    // Check if translation already exists (handled by unique constraint)
    const { data, error } = await supabase
      .from("translations")
      .insert({
        source_text: validated.source_text,
        source_language: validated.source_language,
        target_language: validated.target_language,
        translated_text: validated.translated_text,
        context: validated.context,
        verified: validated.verified,
        created_by: "admin", // TODO: Get from JWT when auth is implemented
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return c.json(
          {
            error: "Translation already exists",
            message: `Translation from ${validated.source_language} to ${validated.target_language} already exists for this text`,
          },
          409
        );
      }

      throw new Error(error.message);
    }

    console.log(`[Admin API] Translation added: ${data.id} (${validated.source_language} → ${validated.target_language})`);

    return c.json(translationSchema.parse(data), 201);
  } catch (error: any) {
    console.error("[Admin API] Error creating translation:", error);
    return c.json({ error: error.message || "Failed to create translation" }, 400);
  }
});

/**
 * GET /admin/translations
 * Query translations
 *
 * Query params:
 * - query: string (optional, full-text search)
 * - source_language: fr | dioula | baoulé | en
 * - target_language: fr | dioula | baoulé | en
 * - verified_only: boolean (default: false)
 * - limit: number (default: 20, max: 100)
 */
translations.get("/", async (c) => {
  try {
    const params = translationsQuerySchema.parse({
      query: c.req.query("query"),
      source_language: c.req.query("source_language"),
      target_language: c.req.query("target_language"),
      verified_only: c.req.query("verified_only") || "false",
      limit: c.req.query("limit") || "20",
    });

    // If query is provided, use full-text search function
    if (params.query) {
      const { data, error } = await supabase.rpc("search_translations", {
        search_query: params.query,
        source_lang: params.source_language || null,
        target_lang: params.target_language || null,
        verified_only: params.verified_only,
        max_results: params.limit,
      });

      if (error) {
        throw new Error(error.message);
      }

      return c.json({ translations: data || [] });
    }

    // Otherwise, use simple query
    let query = supabase
      .from("translations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit);

    if (params.source_language) {
      query = query.eq("source_language", params.source_language);
    }

    if (params.target_language) {
      query = query.eq("target_language", params.target_language);
    }

    if (params.verified_only) {
      query = query.eq("verified", true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return c.json({ translations: data || [] });
  } catch (error: any) {
    console.error("[Admin API] Error fetching translations:", error);
    return c.json({ error: error.message || "Failed to fetch translations" }, 400);
  }
});

export default translations;
