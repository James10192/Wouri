/**
 * Supabase Edge Function: Text Embedding Service
 *
 * Generates 384-dimensional embeddings using Hugging Face Inference API
 * Model: sentence-transformers/all-MiniLM-L6-v2
 *
 * Usage:
 *   POST /functions/v1/embed
 *   Body: { "text": "your text here" }
 *   Response: { "embedding": [384 numbers] }
 *
 * Deploy:
 *   supabase functions deploy embed --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const HUGGINGFACE_API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction";
const EMBEDDING_DIMENSION = 384; // all-MiniLM-L6-v2 produces 384-dim embeddings

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or empty text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Embed] Generating embedding for text (${text.trim().length} chars)`);

    // Call Hugging Face Inference API with authentication
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_TOKEN");
    if (!HF_TOKEN) {
      throw new Error("HUGGINGFACE_TOKEN not configured");
    }

    const hfResponse = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({
        inputs: [text.trim()], // API expects array of strings
      }),
    });

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      throw new Error(`HF API error (${hfResponse.status}): ${errorText}`);
    }

    const response = await hfResponse.json();

    // Hugging Face returns array of embeddings [[emb1], [emb2], ...]
    // We sent single text, so take first embedding
    if (!Array.isArray(response) || !Array.isArray(response[0])) {
      throw new Error(`Invalid response format: expected array of arrays, got ${typeof response}`);
    }

    const embedding = response[0]; // Get first (and only) embedding

    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(`Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`);
    }

    console.log(`[Embed] Successfully generated ${EMBEDDING_DIMENSION}-dim embedding`);

    return new Response(
      JSON.stringify({
        embedding,
        model: "sentence-transformers/all-MiniLM-L6-v2",
        dimension: EMBEDDING_DIMENSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Embed] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Failed to generate embedding", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
