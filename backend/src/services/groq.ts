import Groq from "groq-sdk";
import { config } from "@/lib/config";
import type { RAGResponse } from "@/types";

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
): Promise<RAGResponse> {
  const startTime = Date.now();
  const hasContext = context.length > 0;

  try {
    const systemPrompt = getSystemPrompt(language, hasContext);
    const userPrompt = hasContext
      ? buildUserPrompt(question, context, userRegion)
      : `QUESTION: ${question}\n\nRéponds de manière amicale et encourage l'utilisateur à poser des questions sur l'agriculture ivoirienne.`;
    const selectedModel = model || GROQ_MODELS.LLAMA_70B;

    const response = await groq.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Low creativity (factual answers)
      max_tokens: 300,
      top_p: 0.9,
    });

    const answer = response.choices[0]?.message?.content || "Je n'ai pas pu générer de réponse.";
    const reasoning = reasoningEnabled && response.choices[0]?.message?.reasoning ?
      response.choices[0].message.reasoning : undefined;
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

    return smallTalkPrompts[language] || smallTalkPrompts.fr;
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

  return prompts[language] || prompts.fr;
}

/**
 * Build user prompt with context and question
 */
function buildUserPrompt(question: string, context: string, userRegion: string): string {
  return `CONTEXTE DOCUMENTAIRE:
${context}

RÉGION DE L'UTILISATEUR: ${userRegion}

QUESTION: ${question}

Réponds en te basant UNIQUEMENT sur le contexte ci-dessus. Adapte ta réponse à la région ${userRegion}.`;
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

/**
 * Generate text embedding using Groq (if available)
 * Note: Groq doesn't have embedding models yet, use sentence-transformers via Supabase Edge Function
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // TODO: Implement via Supabase Edge Function or external embedding service
  // For now, return mock (replace in production)

  console.warn("Mock embedding used - implement real embedding service");
  return new Array(768).fill(0).map(() => Math.random());
}
