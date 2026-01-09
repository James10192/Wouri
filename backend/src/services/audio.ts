import { groq } from "./groq";
import { config } from "@/lib/config";

/**
 * Speech-to-Text (STT) using Groq Whisper
 * Gratuit avec Groq API!
 */
export async function transcribeAudio(
  audioFile: File | Blob,
  language: string = "fr"
): Promise<string> {
  try {
    // Groq Whisper supporte les formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-large-v3");
    formData.append("language", language); // fr, bm (bambara/dioula)
    formData.append("response_format", "text");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq Whisper error: ${error.error?.message || "Unknown error"}`);
    }

    const transcription = await response.text();
    return transcription.trim();
  } catch (error) {
    console.error("❌ Audio transcription failed:", error);
    throw new Error(`STT failed: ${error}`);
  }
}

/**
 * Text-to-Speech (TTS) using ElevenLabs or Google TTS
 * Note: Groq ne supporte pas TTS pour le moment
 *
 * Options:
 * 1. Google Cloud TTS (payant mais bon marché)
 * 2. ElevenLabs (10K chars/mois gratuit)
 * 3. OpenAI TTS (payant)
 *
 * Pour le moment, on retourne juste le texte
 * L'utilisateur peut implémenter TTS côté WhatsApp ou frontend
 */
export async function synthesizeSpeech(
  text: string,
  language: string = "fr"
): Promise<{ audioUrl: string | null; text: string }> {
  // TODO: Implémenter TTS
  // Pour l'instant, retourner le texte seulement
  console.log(`🔊 TTS requested for language: ${language}`);
  console.log(`   Text: ${text.substring(0, 50)}...`);

  return {
    audioUrl: null, // Pas de TTS pour le moment
    text,
  };
}

/**
 * Détecter la langue d'un audio
 */
export async function detectAudioLanguage(audioFile: File | Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "verbose_json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Language detection failed");
    }

    const result = await response.json();
    return result.language || "fr";
  } catch (error) {
    console.error("❌ Language detection failed:", error);
    return "fr"; // Default to French
  }
}

/**
 * Process audio message from WhatsApp
 * 1. Download audio from WhatsApp
 * 2. Transcribe with Groq Whisper
 * 3. Detect language
 */
export async function processWhatsAppAudio(
  audioUrl: string,
  whatsappToken: string
): Promise<{ text: string; language: string }> {
  try {
    // 1. Download audio from WhatsApp
    const response = await fetch(audioUrl, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download audio from WhatsApp");
    }

    const audioBlob = await response.blob();

    // 2. Transcribe
    const text = await transcribeAudio(audioBlob);

    // 3. Detect language
    const language = await detectAudioLanguage(audioBlob);

    console.log(`🎤 Audio transcription successful:`);
    console.log(`   Language: ${language}`);
    console.log(`   Text: ${text.substring(0, 100)}...`);

    return { text, language };
  } catch (error) {
    console.error("❌ WhatsApp audio processing failed:", error);
    throw error;
  }
}
