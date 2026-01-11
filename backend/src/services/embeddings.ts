/**
 * Production Embedding Service
 * Generates vector embeddings via Supabase Edge Function
 *
 * @module services/embeddings
 */

import { config } from "../lib/config";

// Supabase Edge Function URL for embeddings
// Deploy with: supabase functions deploy embed --no-verify-jwt
const EMBEDDING_FUNCTION_URL = `${config.SUPABASE_URL}/functions/v1/embed`;

/**
 * Generate text embedding using Supabase Edge Function
 * Uses all-MiniLM-L6-v2 model (384 dimensions)
 *
 * @param text - Text to embed
 * @returns 384-dimensional embedding vector
 * @throws Error if embedding generation fails
 *
 * @example
 * ```typescript
 * const embedding = await getTextEmbedding("Le maïs nécessite un sol bien drainé");
 * console.log(embedding.length); // 384
 * ```
 */
export async function getTextEmbedding(
  text: string,
  options: { timeoutMs?: number } = {}
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  try {
    const defaultTimeout = parseInt(config.EMBEDDING_TIMEOUT_MS || "8000", 10);
    const timeoutMs = options.timeoutMs ?? defaultTimeout;
    let attempts = 2;

    while (attempts > 0) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(EMBEDDING_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ text: text.trim() }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Embedding API error (${response.status}): ${errorText}`);
        }

        const data = (await response.json()) as any;

        if (!data.embedding || !Array.isArray(data.embedding)) {
          throw new Error("Invalid embedding response format");
        }

        // Validate embedding dimension (should be 384 for all-MiniLM-L6-v2)
        if (data.embedding.length !== 384) {
          throw new Error(
            `Invalid embedding dimension: expected 384, got ${data.embedding.length}`
          );
        }

        clearTimeout(timeoutId);
        return data.embedding as number[];
      } catch (error: any) {
        clearTimeout(timeoutId);
        attempts -= 1;

        if (error?.name !== "AbortError" || attempts === 0) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error("Embedding retry attempts exhausted");
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Embedding request timed out");
    }
    console.error("[Embeddings] Failed to generate embedding:", error.message);

    // If Supabase Edge Function is not available, provide helpful error
    if (error.message.includes("404")) {
      throw new Error(
        "Embedding service not deployed. Run: supabase functions deploy embed --no-verify-jwt"
      );
    }

    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * Processes in batches to avoid rate limits
 *
 * @param texts - Array of texts to embed
 * @param batchSize - Number of texts to process per batch (default: 10)
 * @returns Array of 384-dimensional embedding vectors
 *
 * @example
 * ```typescript
 * const texts = ["text1", "text2", "text3"];
 * const embeddings = await batchEmbeddings(texts);
 * console.log(embeddings.length); // 3
 * ```
 */
export async function batchEmbeddings(
  texts: string[],
  batchSize: number = 10
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    console.log(`[Embeddings] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

    const batchEmbeddings = await Promise.all(
      batch.map((text) => getTextEmbedding(text))
    );

    embeddings.push(...batchEmbeddings);

    // Small delay to avoid rate limiting
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}

/**
 * Check if embedding service is available
 * Useful for health checks and monitoring
 *
 * @returns true if service is healthy, false otherwise
 */
export async function isEmbeddingServiceHealthy(): Promise<boolean> {
  try {
    const testEmbedding = await getTextEmbedding("test");
    return testEmbedding.length === 384;
  } catch (error) {
    console.error("[Embeddings] Health check failed:", error);
    return false;
  }
}

/**
 * Format embedding for PostgreSQL vector storage
 * Converts number[] to PostgreSQL array format
 *
 * @param embedding - Embedding vector
 * @returns PostgreSQL-formatted array string
 *
 * @example
 * ```typescript
 * const embedding = [0.1, 0.2, 0.3];
 * const formatted = formatEmbeddingForPostgres(embedding);
 * console.log(formatted); // "[0.1,0.2,0.3]"
 * ```
 */
export function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Parse embedding from PostgreSQL vector storage
 * Converts PostgreSQL array format to number[]
 *
 * @param pgArray - PostgreSQL array string
 * @returns Embedding vector as number[]
 *
 * @example
 * ```typescript
 * const pgArray = "[0.1,0.2,0.3]";
 * const embedding = parseEmbeddingFromPostgres(pgArray);
 * console.log(embedding); // [0.1, 0.2, 0.3]
 * ```
 */
export function parseEmbeddingFromPostgres(pgArray: string): number[] {
  // Remove brackets and split by comma
  const cleaned = pgArray.replace(/^\[|\]$/g, "");
  return cleaned.split(",").map((val) => parseFloat(val));
}
