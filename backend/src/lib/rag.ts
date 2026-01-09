import { generateRAGResponse } from "@/services/groq";
import { searchSimilarDocuments, getTextEmbedding } from "@/services/supabase";
import type { RAGResponse } from "@/types";

/**
 * Main RAG Pipeline
 * Flow: Question → Embedding → Vector Search → Context Building → LLM Generation
 */
export async function ragPipeline(
  question: string,
  userRegion: string,
  language: string = "fr",
): Promise<RAGResponse> {
  console.log(`[RAG] Processing question for region: ${userRegion}, language: ${language}`);

  try {
    // Step 1: Generate embedding for the question
    const embedding = await getTextEmbedding(question);

    // Step 2: Search similar documents in Supabase pgvector
    const similarDocs = await searchSimilarDocuments(
      embedding,
      0.7, // Similarity threshold (70%)
      5, // Top 5 most relevant documents
      { region: userRegion }, // Filter by user's region
    );

    // Step 3: Check if we found relevant documents
    if (similarDocs.length === 0 || similarDocs[0].similarity < 0.7) {
      return {
        answer: getNoResultsMessage(language),
        sources: [],
        metadata: {
          model: "none",
          tokens_used: 0,
          response_time_ms: 0,
        },
      };
    }

    // Step 4: Build context from retrieved documents
    const context = buildContext(similarDocs);

    // Step 5: Generate answer using Groq (FREE & FAST!)
    const response = await generateRAGResponse(question, context, userRegion, language);

    console.log(`[RAG] ✅ Response generated in ${response.metadata.response_time_ms}ms`);

    return response;
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
