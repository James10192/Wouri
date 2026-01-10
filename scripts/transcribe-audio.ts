#!/usr/bin/env bun

/**
 * Transcription d'interviews audio d'agriculteurs avec Groq Whisper
 *
 * Usage: bun run scripts/transcribe-audio.ts <audio-file-path>
 * Example: bun run scripts/transcribe-audio.ts ./interviews/agriculteur-bouake.mp3
 */

import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { adminFetch } from "../backend/src/lib/admin-api";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface TranscriptionMetadata {
  region?: string;
  crop?: string;
  farmer_name?: string;
  date?: string;
}

async function transcribeAudio(filePath: string): Promise<string> {
  console.log(`🎤 Transcribing audio file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const audioFile = fs.createReadStream(filePath);

  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3",
    language: "fr", // Français
    response_format: "verbose_json", // Inclut metadata
    temperature: 0.0, // Plus précis
  });

  console.log(`✅ Transcription completed (${transcription.duration}s of audio)`);

  return transcription.text;
}

function extractMetadataFromFilename(filePath: string): TranscriptionMetadata {
  const filename = path.basename(filePath, path.extname(filePath));
  const metadata: TranscriptionMetadata = {};

  // Format attendu: agriculteur-bouake-mais-2026-01-10.mp3
  const parts = filename.split("-");

  const regions = ["bouake", "abidjan", "daloa", "yamoussoukro", "korhogo"];
  const crops = ["mais", "manioc", "cacao", "riz", "igname"];

  parts.forEach(part => {
    const lowerPart = part.toLowerCase();

    if (regions.includes(lowerPart)) {
      metadata.region = lowerPart.charAt(0).toUpperCase() + lowerPart.slice(1);
    }

    if (crops.includes(lowerPart)) {
      metadata.crop = lowerPart === "mais" ? "maïs" : lowerPart;
    }

    // Date format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(part + "-" + parts[parts.indexOf(part) + 1] + "-" + parts[parts.indexOf(part) + 2])) {
      metadata.date = part + "-" + parts[parts.indexOf(part) + 1] + "-" + parts[parts.indexOf(part) + 2];
    }
  });

  return metadata;
}

async function importTranscription(text: string, metadata: TranscriptionMetadata, filePath: string) {
  console.log(`📤 Importing transcription to knowledge base...`);

  const response = await adminFetch("/admin/knowledge", {
    method: "POST",
    body: JSON.stringify({
      content: text,
      metadata: {
        source: `Interview terrain - ${path.basename(filePath)}`,
        region: metadata.region || "Côte d'Ivoire",
        crop: metadata.crop,
        category: "general",
        verified: false, // Nécessite validation par agronome
        language: "fr",
        interview_date: metadata.date || new Date().toISOString().split("T")[0],
      },
    }),
  });

  console.log(`✅ Transcription imported: ${response.id}`);
  return response;
}

async function saveTranscriptionToFile(text: string, filePath: string) {
  const outputPath = filePath.replace(path.extname(filePath), ".txt");

  fs.writeFileSync(outputPath, text, "utf-8");

  console.log(`💾 Transcription saved to: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("\n❌ Usage: bun run scripts/transcribe-audio.ts <audio-file-path>\n");
    console.error("Example: bun run scripts/transcribe-audio.ts ./interviews/agriculteur-bouake-mais.mp3\n");
    process.exit(1);
  }

  const filePath = args[0];

  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎙️  WOURI BOT - AUDIO TRANSCRIPTION");
    console.log("=".repeat(60) + "\n");

    // 1. Transcrire l'audio
    const transcription = await transcribeAudio(filePath);

    console.log("\n" + "-".repeat(60));
    console.log("📝 TRANSCRIPTION:");
    console.log("-".repeat(60));
    console.log(transcription);
    console.log("-".repeat(60) + "\n");

    // 2. Extraire métadonnées du nom de fichier
    const metadata = extractMetadataFromFilename(filePath);
    console.log("📊 Metadata extracted:");
    console.log(`   Region: ${metadata.region || "N/A"}`);
    console.log(`   Crop: ${metadata.crop || "N/A"}`);
    console.log(`   Date: ${metadata.date || "N/A"}\n`);

    // 3. Sauvegarder transcription en fichier texte
    await saveTranscriptionToFile(transcription, filePath);

    // 4. Demander confirmation avant import
    console.log("⚠️  This transcription will be imported with verified: false");
    console.log("   It will need validation by an agronomist before appearing in bot responses.\n");

    // 5. Importer dans la base vectorielle
    const result = await importTranscription(transcription, metadata, filePath);

    console.log("\n✅ Audio transcription and import completed successfully!\n");
    console.log(`Document ID: ${result.id}`);
    console.log(`Review at: ${process.env.API_BASE_URL}/admin/conversations\n`);
  } catch (error) {
    console.error("\n❌ Error:", (error as Error).message);
    process.exit(1);
  }
}

main();
