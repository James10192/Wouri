import Groq from "groq-sdk";
import { config } from "../lib/config";
import type { RAGResponse } from "../types";

/**
 * Groq client (100% FREE API with ultra-fast inference)
 * Models: Llama 3.3 70B, Mixtral 8x7B, Gemma 2 9B
 * Speed: 300+ tokens/second (10x faster than OpenAI!)
 * Limits: 14,400 requests/day, 6,000 requests/minute
 */
export const groq = new Groq({
  apiKey: config.GROQ_API_KEY,
});

/**
 * Available Groq models
 */
export const GROQ_MODELS = {
  // Best for RAG (balanced speed + quality)
  LLAMA_70B: "llama-3.3-70b-versatile",

  // Fastest (good for simple queries)
  LLAMA_8B: "llama-3.1-8b-instant",

  // Best for multilingual (Dioula, Baoulé)
  MIXTRAL: "mixtral-8x7b-32768",
} as const;

/**
 * Generate RAG response using Groq
 */
export async function generateRAGResponse(
  question: string,
  context: string,
  userRegion: string,
  language: string = "fr",
  model?: string,
  reasoningEnabled?: boolean,
  conversationContext?: string,
): Promise<RAGResponse> {
  const startTime = Date.now();
  const hasContext = context.length > 0;

  try {
    const systemPrompt = getSystemPrompt(language, hasContext);
    const userPrompt = hasContext
      ? buildUserPrompt(question, context, userRegion, conversationContext)
      : buildNoContextPrompt(question, conversationContext);
    const selectedModel = model || GROQ_MODELS.LLAMA_70B;
    const shouldExtractReasoning =
      Boolean(reasoningEnabled) && isReasoningModel(selectedModel);
    const promptSuffix = shouldExtractReasoning
      ? `\n\nIMPORTANT: Réponds UNIQUEMENT en JSON strict au format suivant:\n` +
        `{"reasoning":"...","answer":"..."}\n` +
        `Le champ "reasoning" doit etre bref (1-3 phrases). ` +
        `N'ajoute aucun texte en dehors du JSON.`
      : "";

    const requestBody: any = {
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${userPrompt}${promptSuffix}` },
      ],
      temperature: 0.3, // Low creativity (factual answers)
      max_tokens: shouldExtractReasoning ? 600 : 300,
      top_p: 0.9,
    };

    if (shouldExtractReasoning) {
      requestBody.response_format = { type: "json_object" };
    }

    const timeoutMs = parseInt(config.GROQ_TIMEOUT_MS || "30000", 10);
    let response: any;
    try {
      response = await withTimeout(
        groq.chat.completions.create(requestBody),
        timeoutMs,
        "Groq",
      );
    } catch (error) {
      if (!shouldExtractReasoning) {
        throw error;
      }
      const fallbackRequest = { ...requestBody };
      delete fallbackRequest.response_format;
      response = await withTimeout(
        groq.chat.completions.create(fallbackRequest),
        timeoutMs,
        "Groq fallback",
      );
    }

    const rawContent =
      response.choices[0]?.message?.content ||
      "Je n'ai pas pu générer de réponse.";
    const parsed = shouldExtractReasoning
      ? extractReasoningPayload(rawContent)
      : null;
    const answer = parsed
      ? parsed.answer || "Je n'ai pas pu generer de reponse."
      : rawContent;
    const reasoning =
      (reasoningEnabled && response.choices[0]?.message?.reasoning) ||
      parsed?.reasoning ||
      undefined;
    const tokensUsed = response.usage?.total_tokens || 0;
    const responseTime = Date.now() - startTime;

    return {
      answer,
      reasoning,
      sources: extractSources(context),
      metadata: {
        model: selectedModel,
        tokens_used: tokensUsed,
        response_time_ms: responseTime,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          reasoningTokens: reasoning ? 50 : 0,
        },
      },
    };
  } catch (error) {
    console.error("Groq API error:", error);
    throw new Error(`Failed to generate response: ${error}`);
  }
}

/**
 * Get system prompt based on language
 */
function getSystemPrompt(language: string, hasContext: boolean = true): string {
  if (!hasContext) {
    // Small-talk mode: garde-fous activés
    const smallTalkPrompts: Record<string, string> = {
      fr: `Tu es Wouri Bot, un assistant agricole pour la Côte d'Ivoire.

RÈGLES STRICTES (Garde-fous):
1. Tu peux répondre aux salutations et questions générales de manière amicale
2. RESTE TOUJOURS dans le contexte agricole ivoirien
3. Si on te pose une question hors agriculture (politique, religion, etc.), réponds poliment:
   "Je suis spécialisé en agriculture ivoirienne. Pour cette question, je te recommande de consulter un spécialiste approprié."
4. Sois bref (maximum 100 mots)
5. Encourage les utilisateurs à poser des questions sur: cultures, maladies, plantation, récolte, météo agricole
6. Ne génère JAMAIS de contenu inapproprié, violent ou offensant`,

      dioula: `I bɛ Wouri Bot ye, senekɛla dɛmɛbaga ye Kotidivuwari la.

SARIYAW:
1. I bɛ se ka jaabi di forobaliw ma ani ɲininkaliw ma
2. I ka kan ka to senekɛ baara kɔnɔ dɔɔnin
3. Ni mɔgɔ ye ɲininkali wɛrɛ kɛ, fɔ: "Ne bɛ senekɛ baara la dɔɔnin"`,

      baoulé: `N'gbo Wouri Bot, assistant agriculture Côte d'Ivoire.

RÈGLES:
1. Répondre salutations gentiment
2. Rester agriculture seulement
3. Questions autres: dire "Manfue spécialiste agriculture"`,
    };

    return smallTalkPrompts[language] || smallTalkPrompts["fr"];
  }

  // RAG mode avec documents
  const prompts: Record<string, string> = {
    fr: `Tu es un conseiller agricole expert pour la Côte d'Ivoire.

RÈGLES STRICTES:
1. Réponds UNIQUEMENT en te basant sur les documents fournis
2. Quand tu cites un document, utilise ce format EXACT: [Source: nom_source, page X]
3. Exemple: "Le maïs se plante en mars [Source: Manuel MINAGRI, page 45] selon les conditions."
4. Place la citation JUSTE après l'information citée
5. Si la réponse n'est PAS dans les documents, dis: "Je ne trouve pas cette information dans mes sources officielles."
6. Utilise un langage simple et accessible aux agriculteurs
7. Sois concis (maximum 180 mots)
8. Adapte tes conseils à la région mentionnée`,

    dioula: `I bɛ jatigi ye senekɛla la Kotidivuwari kɔnɔ.

SARIYAW:
1. Jaabi kɛ ni gafe minw dira kosɔbɛ
2. Ni jaabi tɛ gafe kɔnɔ, fɔ: "Ne tɛ nin kunnafoni sɔrɔ n ka gafew kɔnɔ"
3. Baara kɛ ni kan nɔgɔman ye
4. Ka surun (kumasen 150 caman)`,

    baoulé: `N'gbo ɛ yɛ konsɛi n'gban agriculture manfue Côte d'Ivoire.

RÈGLES:
1. Réponds avec documents seulement
2. Si pas dans documents, dis: "Manfue ti information yi sources manfue"
3. Utilise langue simple
4. Maximum 150 mots`,
  };

  return prompts[language] || prompts["fr"];
}

/**
 * Build user prompt with context and question
 */
function buildUserPrompt(
  question: string,
  context: string,
  userRegion: string,
  conversationContext?: string,
): string {
  return `CONTEXTE DOCUMENTAIRE:
${context}

${conversationContext ? `${conversationContext}\n\n` : ""}RÉGION DE L'UTILISATEUR: ${userRegion}

QUESTION: ${question}

Réponds en te basant UNIQUEMENT sur le contexte ci-dessus. Adapte ta réponse à la région ${userRegion}.`;
}

function buildNoContextPrompt(
  question: string,
  conversationContext?: string,
): string {
  return `${conversationContext ? `${conversationContext}\n\n` : ""}QUESTION: ${question}

Réponds de manière amicale et encourage l'utilisateur à poser des questions sur l'agriculture ivoirienne.`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Extract sources from context
 */
function extractSources(context: string): Array<{ source: string; page?: number; similarity: number }> {
  // Parse context to extract source metadata
  // Format expected: [Source: <name>, page <number>, similarity: <score>]

  const sourceRegex = /\[Source: (.+?), page (\d+), similarity: ([\d.]+)\]/g;
  const sources = [];
  let match;

  while ((match = sourceRegex.exec(context)) !== null) {
    sources.push({
      source: match[1],
      page: parseInt(match[2], 10),
      similarity: parseFloat(match[3]),
    });
  }

  return sources;
}

/**
 * Check if a model supports reasoning
 */
export function isReasoningModel(modelId: string): boolean {
  const reasoningModels = ["qwen/qwen3-32b", "qwen-32b", "deepseek-r1"];
  return reasoningModels.some((model) => modelId.toLowerCase().includes(model));
}

type ParsedReasoningPayload = {
  reasoning?: string;
  answer?: string;
};

function extractReasoningPayload(content: string): ParsedReasoningPayload | null {
  const trimmed = content.trim();
  const located = extractJsonPayloadWithSlice(trimmed);
  if (located?.payload) {
    const prefix = trimmed.slice(0, located.start).trim();
    const suffix = trimmed.slice(located.end + 1).trim();
    const normalized = normalizePayload(located.payload);
    if (!normalized) {
      return null;
    }
    const reasoning =
      normalized.reasoning || (prefix ? prefix : undefined);
    const answer =
      normalized.answer ||
      (suffix ? suffix : undefined);
    return normalizePayload({ reasoning, answer });
  }

  const reasoning = extractJsonStringValue(trimmed, "reasoning");
  const answer = extractJsonStringValue(trimmed, "answer");
  if (!reasoning && !answer) {
    return null;
  }

  return normalizePayload({ reasoning, answer });
}

type JsonSliceResult = {
  payload: any;
  start: number;
  end: number;
};

function extractJsonPayloadWithSlice(content: string): JsonSliceResult | null {
  const trimmed = content.trim();
  const direct = safeJsonParse(trimmed);
  if (direct) {
    return { payload: direct, start: 0, end: trimmed.length - 1 };
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = safeJsonParse(fencedMatch[1].trim());
    if (fenced) {
      const start = trimmed.indexOf(fencedMatch[0]);
      const end = start + fencedMatch[0].length - 1;
      return { payload: fenced, start, end };
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = trimmed.slice(firstBrace, lastBrace + 1);
    const sliced = safeJsonParse(slice);
    if (sliced) {
      return { payload: sliced, start: firstBrace, end: lastBrace };
    }
  }

  return null;
}

function safeJsonParse(value: string): any | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizePayload(payload: any): ParsedReasoningPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const reasoning =
    typeof payload.reasoning === "string" ? payload.reasoning : undefined;
  const answer =
    typeof payload.answer === "string" ? payload.answer : undefined;

  if (!reasoning && !answer) {
    return null;
  }

  return { reasoning, answer };
}

function extractJsonStringValue(content: string, key: string): string | undefined {
  const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`, "i");
  const match = keyPattern.exec(content);
  if (!match) {
    return undefined;
  }

  let index = match.index + match[0].length;
  let escaped = false;
  let value = "";

  while (index < content.length) {
    const char = content[index];
    if (!escaped && char === "\"") {
      break;
    }
    if (!escaped && char === "\\") {
      escaped = true;
      value += char;
      index += 1;
      continue;
    }
    escaped = false;
    value += char;
    index += 1;
  }

  if (!value) {
    return undefined;
  }

  const normalized = maybeUnescapeJsonString(value.trim());
  return normalized || value.trim();
}

function maybeUnescapeJsonString(value: string): string | null {
  try {
    return JSON.parse(`"${value.replace(/\n/g, "\\n")}"`);
  } catch {
    return null;
  }
}

/**
 * Generate text embedding using Groq (if available)
 * Note: Groq doesn't have embedding models yet, use sentence-transformers via Supabase Edge Function
 */
export async function generateEmbedding(_text: string): Promise<number[]> {
  // TODO: Implement via Supabase Edge Function or external embedding service
  // For now, return mock (replace in production)

  console.warn("Mock embedding used - implement real embedding service");
  return new Array(768).fill(0).map(() => Math.random());
}
