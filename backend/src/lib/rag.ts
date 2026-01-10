import { generateRAGResponse } from "@/services/groq";
import {
  searchSimilarDocuments,
  searchDocumentsByKeyword,
  getTextEmbedding,
} from "@/services/supabase";
import { getWeatherData } from "@/services/weather";
import type { RAGResponse } from "@/types";
import { config } from "@/lib/config";

/**
 * Main RAG Pipeline
 * Flow: Question → Embedding → Vector Search → Context Building → LLM Generation
 */
export async function ragPipeline(
  question: string,
  userRegion: string,
  language: string = "fr",
  model?: string,
  reasoningEnabled?: boolean,
  history: Array<{ role: string; content: string }> = [],
): Promise<RAGResponse> {
  console.log(`[RAG] Processing question for region: ${userRegion}, language: ${language}`);

  try {
    const regionFilter = shouldFilterRegion(userRegion)
      ? { region: userRegion }
      : undefined;
    const conversationContext = buildConversationContext(history);
    const toolInvocations: Array<{
      toolName: string;
      args?: Record<string, unknown>;
      result?: Record<string, unknown>;
      errorText?: string;
      state?: string;
    }> = [];

    // Step 1: Generate embedding for the question
    const augmentedQuery = conversationContext
      ? `${conversationContext}\n\n${question}`
      : question;
    const embedding = await getTextEmbedding(augmentedQuery);

    // Step 2: Search similar documents in Supabase pgvector
    const similarDocs = await searchSimilarDocuments(
      embedding,
      0.7, // Similarity threshold (70%)
      5, // Top 5 most relevant documents
      regionFilter, // Filter by user's region when specific
    );

    // Log vector search for Tool visualization (dev only)
    if (config.NODE_ENV === "development") {
      const { setLastVectorSearch } = await import("@/routes/debug");
      setLastVectorSearch({
        query: question,
        embedding_preview: embedding.slice(0, 5).concat(["...", `(${embedding.length} total)`]),
        results: similarDocs.map(d => ({
          id: (d as any).id || "unknown",
          similarity: d.similarity,
          content: d.content.slice(0, 150) + "...",
          metadata: d.metadata,
        })),
        timestamp: new Date().toISOString(),
      });
    }
    toolInvocations.push({
      toolName: "vector_search",
      state: "output-available",
      args: {
        query: question,
        context: conversationContext || undefined,
        match_threshold: 0.7,
        match_count: 5,
        filter: regionFilter || {},
      },
      result: {
        embedding_preview: embedding.slice(0, 5).concat(["...", `(${embedding.length} total)`]),
        results: similarDocs.map(d => ({
          id: (d as any).id || "unknown",
          similarity: d.similarity,
          content: d.content.slice(0, 150) + "...",
          metadata: d.metadata,
        })),
      },
    });

    let relevantDocs = similarDocs;
    const topSimilarity = relevantDocs[0]?.similarity ?? 0;
    const invalidSimilarity = Number.isNaN(topSimilarity);

    // Step 3: Check if we found relevant documents
    if (relevantDocs.length === 0 || invalidSimilarity || topSimilarity < 0.7) {
      const keywordDocs = await searchDocumentsByKeyword(
        augmentedQuery,
        5,
        regionFilter,
      );
      if (keywordDocs.length > 0) {
        console.log("[RAG] ⚡ Vector search empty, using keyword fallback");
        relevantDocs = keywordDocs;
        toolInvocations.push({
          toolName: "keyword_search",
          state: "output-available",
          args: {
            query: question,
            context: conversationContext || undefined,
            match_count: 5,
            filter: regionFilter || {},
          },
          result: {
            results: keywordDocs.map(d => ({
              id: (d as any).id || "unknown",
              similarity: d.similarity,
              content: d.content.slice(0, 150) + "...",
              metadata: d.metadata,
            })),
          },
        });
      } else {
        // No relevant documents: respond without RAG context but keep conversation memory
        console.log("[RAG] ⚠️ No relevant documents found, using general response");
        const smallTalkResponse = await generateRAGResponse(
          question,
          "", // No context for small-talk
          userRegion,
          language,
          model,
          reasoningEnabled,
          conversationContext,
        );
        return {
          ...smallTalkResponse,
          sources: [],
          debug: {
            toolInvocations,
          },
        };
      }
    }

    // Step 4: Build context from retrieved documents
    let context = buildContext(relevantDocs);

    // Step 4.5: Add weather data (if available)
    console.log(`[RAG] 🌦️ Fetching weather for region: ${userRegion}`);
    const weather = await getWeatherData(userRegion);
    if (weather) {
      toolInvocations.push({
        toolName: "weather_lookup",
        state: "output-available",
        args: {
          region: userRegion,
          units: "metric",
        },
        result: {
          region: weather.region,
          temperature: weather.temperature,
          feels_like: weather.feels_like,
          humidity: weather.humidity,
          description: weather.description,
          wind_speed: weather.wind_speed,
          rain_mm: weather.rain_mm ?? 0,
        },
      });
      context += `\n\n[DONNÉES MÉTÉO ACTUELLES]\n${formatWeatherContext(weather)}\n`;
    }

    // Step 5: Generate answer using Groq (FREE & FAST!)
    const response = await generateRAGResponse(
      question,
      context,
      userRegion,
      language,
      model,
      reasoningEnabled,
      conversationContext,
    );

    // Step 6: Add weather advice if relevant
    const weatherAdvice = weather ? buildWeatherAdvice(weather) : "";
    if (weatherAdvice && response.answer) {
      response.answer += weatherAdvice;
    }

    console.log(`[RAG] ✅ Response generated in ${response.metadata.response_time_ms}ms`);

    return {
      ...response,
      debug: {
        toolInvocations,
      },
    };
  } catch (error) {
    console.error("[RAG] Pipeline error:", error);
    throw new Error(`RAG pipeline failed: ${error}`);
  }
}

/**
 * Build context string from similar documents
 */
function buildContext(
  docs: Array<{ content: string; similarity: number; metadata: any }>,
): string {
  return docs
    .map((doc, index) => {
      const source = doc.metadata?.source || "Source inconnue";
      const page = doc.metadata?.page || "N/A";
      const similarity = (doc.similarity * 100).toFixed(1);

      return `[Document ${index + 1}]
[Source: ${source}, page ${page}, similarity: ${similarity}%]

${doc.content}

---
`;
    })
    .join("\n");
}

function formatWeatherContext(weather: {
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  wind_speed: number;
  rain_mm?: number;
  region: string;
}): string {
  return `Météo actuelle à ${weather.region}:
- Température: ${weather.temperature}°C (ressenti ${weather.feels_like}°C)
- Humidité: ${weather.humidity}%
- Conditions: ${weather.description}
- Vent: ${weather.wind_speed} m/s
${weather.rain_mm ? `- Pluie: ${weather.rain_mm}mm` : ""}`;
}

function buildWeatherAdvice(weather: {
  temperature: number;
  humidity: number;
  wind_speed: number;
  rain_mm?: number;
}): string {
  const advice: string[] = [];

  if (weather.temperature > 35) {
    advice.push("⚠️ Chaleur excessive: Irriguer vos cultures le matin ou le soir.");
  } else if (weather.temperature < 15) {
    advice.push("⚠️ Température basse: Protéger les jeunes plants.");
  }

  if (weather.rain_mm && weather.rain_mm > 10) {
    advice.push("🌧️ Fortes pluies: Éviter de travailler le sol. Vérifier le drainage.");
  } else if (weather.humidity < 40) {
    advice.push("☀️ Faible humidité: Prévoir l'irrigation.");
  }

  if (weather.wind_speed > 10) {
    advice.push("💨 Vent fort: Éviter les traitements phytosanitaires.");
  }

  return advice.length > 0 ? `\n\nConseils météo:\n${advice.join("\n")}` : "";
}

function buildConversationContext(
  history: Array<{ role: string; content: string }>,
): string {
  if (!history.length) {
    return "";
  }

  const trimmed = history
    .filter((entry) => entry.content)
    .map((entry) => {
      const role = entry.role === "assistant" ? "Assistant" : "Utilisateur";
      return `${role}: ${entry.content}`;
    })
    .join("\n");

  return trimmed ? `Contexte conversationnel:\n${trimmed}` : "";
}

function shouldFilterRegion(region: string): boolean {
  if (!region) {
    return false;
  }
  const normalized = region
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const genericRegions = new Set([
    "cote d ivoire",
    "cote divoire",
    "ivory coast",
  ]);

  return !genericRegions.has(normalized);
}

/**
 * Get "no results" message in user's language
 */
function getNoResultsMessage(language: string): string {
  const messages: Record<string, string> = {
    fr: `Je ne trouve pas cette information dans mes sources officielles du Ministère de l'Agriculture.

Je recommande de consulter un agent agricole près de chez vous pour des conseils personnalisés.

📞 ANADER (Agence Nationale d'Appui au Développement Rural)
   Hotline: +225 27 20 21 59 23`,

    dioula: `Ne tɛ nin kunnafoni sɔrɔ n ka gafew kɔnɔ.

I ka kan ka senekelabaga ɲininka i ka duguw kɔnɔ.

📞 ANADER
   Telefɔni: +225 27 20 21 59 23`,

    baoulé: `Manfue ti kɔ̀ information yi manfue sources.

N'gbo consulter agent agriculture n'gbo région manfue.

📞 ANADER
   Téléphone: +225 27 20 21 59 23`,
  };

  return messages[language] || messages.fr;
}

/**
 * Get payment reminder message
 */
export function getPaymentReminderMessage(language: string = "fr"): string {
  const messages: Record<string, string> = {
    fr: `🌾 Votre quota gratuit (20 questions/mois) est épuisé.

Pour continuer à bénéficier de conseils agricoles illimités:

💳 **Abonnement Premium**
   • 500 FCFA/mois
   • Questions illimitées
   • Support prioritaire
   • Conseils personnalisés

👉 Payez maintenant: [Lien FedaPay]

Ou envoyez PREMIUM au +225 XX XX XX XX`,

    dioula: `🌾 I ka sɔrɔ 20 ɲininka banna.

Walasa ka taa ɲɛ:

💳 **Premium**
   • 500 FCFA/kalo kelen
   • Ɲininka caman

👉 Sara sisan`,

    baoulé: `🌾 N'gbo quota gratuit (20 questions/mois) fini.

Pour continuer:

💳 **Premium**
   • 500 FCFA/mois
   • Questions illimitées

👉 Payer maintenant`,
  };

  return messages[language] || messages.fr;
}
