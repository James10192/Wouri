#!/usr/bin/env bun

/**
 * Pipeline ETL pour collecter et importer des documents agricoles
 * dans la base vectorielle de Wouri Bot
 *
 * Usage: bun run scripts/etl-pipeline.ts
 */

import { adminFetch } from "../backend/src/lib/admin-api";

// Configuration
const CONFIG = {
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_ADMIN_API_KEY,
  API_BASE_URL: process.env.API_BASE_URL || "https://wouribot-backend.onrender.com",
  BATCH_SIZE: 10,
  DELAY_MS: 200,
};

if (!CONFIG.ADMIN_API_KEY) {
  console.error("❌ ADMIN_API_KEY not found in environment variables");
  process.exit(1);
}

interface RawDocument {
  source: string;
  url?: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

interface ImportStats {
  total: number;
  success: number;
  errors: number;
  duplicates: number;
  startTime: Date;
}

// =============================================================================
// EXTRACT: Collecter depuis multiples sources
// =============================================================================

async function extractFromSemanticScholar(query: string, limit: number = 20): Promise<RawDocument[]> {
  console.log(`   📚 Searching Semantic Scholar: "${query}"`);

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&fields=title,abstract,year,authors,url&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    const documents: RawDocument[] = data.data
      .filter((paper: any) => paper.abstract && paper.abstract.length > 100)
      .map((paper: any) => ({
        source: `Semantic Scholar - ${paper.authors?.[0]?.name || "Unknown"} (${paper.year || "N/A"})`,
        url: paper.url,
        title: paper.title,
        content: paper.abstract,
        metadata: {
          publication_year: paper.year,
          authors: paper.authors?.map((a: any) => a.name).join(", "),
        },
      }));

    console.log(`      Found ${documents.length} papers`);
    return documents;
  } catch (error) {
    console.error(`      ❌ Error:`, error);
    return [];
  }
}

async function extractFromLocalFiles(dirPath: string): Promise<RawDocument[]> {
  console.log(`   📂 Reading local files from: ${dirPath}`);

  const documents: RawDocument[] = [];

  // TODO: Implémenter lecture de fichiers locaux (TXT, PDF, DOCX)
  // Utiliser pdf-parse pour PDFs
  // Utiliser mammoth pour DOCX

  return documents;
}

async function extract(): Promise<RawDocument[]> {
  console.log("\n1️⃣ EXTRACT: Collecting documents...\n");

  const documents: RawDocument[] = [];

  // Source 1: Semantic Scholar (Agriculture Côte d'Ivoire)
  const queries = [
    "agriculture Côte d'Ivoire maïs",
    "agriculture Côte d'Ivoire manioc cassava",
    "agriculture Côte d'Ivoire cacao",
    "calendrier agricole Côte d'Ivoire",
    "variétés améliorées Côte d'Ivoire",
  ];

  for (const query of queries) {
    const papers = await extractFromSemanticScholar(query, 10);
    documents.push(...papers);

    // Délai pour respecter rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Source 2: Fichiers locaux (si disponibles)
  // const localDocs = await extractFromLocalFiles("./data/raw");
  // documents.push(...localDocs);

  console.log(`\n   ✅ Total collected: ${documents.length} documents\n`);
  return documents;
}

// =============================================================================
// TRANSFORM: Nettoyer et standardiser
// =============================================================================

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normaliser espaces
    .replace(/\n{3,}/g, "\n\n") // Max 2 sauts de ligne
    .replace(/[^\w\s\u00C0-\u024F.,;:!?()'"éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ-]/g, "") // Caractères valides
    .trim()
    .substring(0, 5000); // Max 5000 chars
}

function extractCropName(text: string): string | undefined {
  const crops = [
    { name: "maïs", keywords: ["maïs", "mais", "corn", "zea mays"] },
    { name: "manioc", keywords: ["manioc", "cassava", "manihot"] },
    { name: "cacao", keywords: ["cacao", "cocoa", "theobroma"] },
    { name: "riz", keywords: ["riz", "rice", "oryza"] },
    { name: "igname", keywords: ["igname", "yam", "dioscorea"] },
    { name: "banane", keywords: ["banane", "banana", "plantain"] },
  ];

  const lowerText = text.toLowerCase();

  for (const crop of crops) {
    if (crop.keywords.some(keyword => lowerText.includes(keyword))) {
      return crop.name;
    }
  }
  return undefined;
}

function extractRegion(text: string): string | undefined {
  const regions = [
    "Bouaké", "Abidjan", "Daloa", "Yamoussoukro",
    "Korhogo", "San-Pédro", "Man", "Gagnoa",
  ];

  for (const region of regions) {
    if (text.includes(region)) return region;
  }
  return undefined;
}

function classifyDocument(text: string): string {
  const lowerText = text.toLowerCase();

  const categories = [
    { name: "plantation", keywords: ["planter", "semis", "semer", "plant", "sow"] },
    { name: "harvest", keywords: ["récolte", "rendement", "harvest", "yield"] },
    { name: "disease", keywords: ["maladie", "parasite", "disease", "pest", "ravageur"] },
    { name: "weather", keywords: ["météo", "climat", "pluie", "weather", "climate"] },
  ];

  for (const category of categories) {
    if (category.keywords.some(keyword => lowerText.includes(keyword))) {
      return category.name;
    }
  }

  return "general";
}

async function transform(docs: RawDocument[]): Promise<RawDocument[]> {
  console.log("2️⃣ TRANSFORM: Cleaning and standardizing...\n");

  const transformedDocs = docs.map((doc, index) => {
    const cleanedContent = cleanText(doc.content);

    const transformed = {
      ...doc,
      content: cleanedContent,
      metadata: {
        ...doc.metadata,
        crop: extractCropName(cleanedContent),
        region: extractRegion(cleanedContent),
        category: classifyDocument(cleanedContent),
      },
    };

    if ((index + 1) % 10 === 0) {
      console.log(`   Processed ${index + 1}/${docs.length} documents`);
    }

    return transformed;
  });

  console.log(`\n   ✅ Cleaned: ${transformedDocs.length} documents\n`);
  return transformedDocs;
}

// =============================================================================
// LOAD: Importer dans base vectorielle
// =============================================================================

async function checkDuplicate(content: string): Promise<boolean> {
  try {
    const query = encodeURIComponent(content.substring(0, 100));
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/admin/knowledge?query=${query}&limit=3`,
      {
        headers: {
          "x-admin-key": CONFIG.ADMIN_API_KEY!,
        },
      }
    );

    if (!response.ok) return false;

    const data = await response.json();

    // Si similarité > 0.95, c'est probablement un duplicata
    return data.results.some((doc: any) => doc.similarity > 0.95);
  } catch (error) {
    return false; // En cas d'erreur, considérer comme non-duplicata
  }
}

async function importDocument(doc: RawDocument): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/admin/knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": CONFIG.ADMIN_API_KEY!,
      },
      body: JSON.stringify({
        content: `${doc.title}\n\n${doc.content}`,
        metadata: {
          source: doc.source,
          ...(doc.url && { url: doc.url }),
          ...doc.metadata,
          verified: doc.source.includes("Ministère") || doc.source.includes("FAO"),
          language: "fr",
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error(`      Error: ${(error as Error).message}`);
    return false;
  }
}

async function load(docs: RawDocument[]): Promise<ImportStats> {
  console.log("3️⃣ LOAD: Importing to vector database...\n");

  const stats: ImportStats = {
    total: docs.length,
    success: 0,
    errors: 0,
    duplicates: 0,
    startTime: new Date(),
  };

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const progress = `[${i + 1}/${docs.length}]`;

    // Vérifier duplicatas
    const isDuplicate = await checkDuplicate(doc.content);
    if (isDuplicate) {
      stats.duplicates++;
      console.log(`   ⚠️  ${progress} Skipping duplicate: ${doc.title.substring(0, 50)}...`);
      continue;
    }

    // Importer
    const success = await importDocument(doc);

    if (success) {
      stats.success++;
      console.log(`   ✅ ${progress} Imported: ${doc.title.substring(0, 60)}...`);
    } else {
      stats.errors++;
      console.log(`   ❌ ${progress} Failed: ${doc.title.substring(0, 60)}...`);
    }

    // Délai pour éviter rate limiting
    if ((i + 1) % CONFIG.BATCH_SIZE === 0) {
      console.log(`      💤 Pausing for ${CONFIG.DELAY_MS}ms to avoid rate limiting...\n`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_MS));
    }
  }

  return stats;
}

// =============================================================================
// MAIN: Exécution du pipeline
// =============================================================================

function printStats(stats: ImportStats) {
  const duration = (new Date().getTime() - stats.startTime.getTime()) / 1000;

  console.log("\n" + "=".repeat(60));
  console.log("📊 IMPORT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total documents:     ${stats.total}`);
  console.log(`✅ Successfully imported: ${stats.success}`);
  console.log(`⚠️  Duplicates skipped:   ${stats.duplicates}`);
  console.log(`❌ Errors:               ${stats.errors}`);
  console.log(`⏱️  Duration:             ${duration.toFixed(1)}s`);
  console.log(`📈 Import rate:          ${(stats.success / duration).toFixed(1)} docs/sec`);
  console.log("=".repeat(60) + "\n");
}

async function runETLPipeline() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 WOURI BOT - ETL PIPELINE");
  console.log("=".repeat(60));
  console.log(`API URL: ${CONFIG.API_BASE_URL}`);
  console.log(`Batch size: ${CONFIG.BATCH_SIZE}`);
  console.log(`Delay: ${CONFIG.DELAY_MS}ms`);
  console.log("=".repeat(60));

  try {
    // 1. Extract
    const rawDocs = await extract();

    if (rawDocs.length === 0) {
      console.log("\n⚠️  No documents collected. Exiting.\n");
      return;
    }

    // 2. Transform
    const cleanedDocs = await transform(rawDocs);

    // 3. Load
    const stats = await load(cleanedDocs);

    // 4. Stats
    printStats(stats);

    console.log("✅ ETL pipeline completed successfully!\n");
  } catch (error) {
    console.error("\n❌ ETL pipeline failed:", error);
    process.exit(1);
  }
}

// Exécuter le pipeline
runETLPipeline();
