#!/usr/bin/env bun

/**
 * Import en masse de documents locaux (TXT, PDF, MD)
 *
 * Usage: bun run scripts/bulk-import.ts <directory-path>
 * Example: bun run scripts/bulk-import.ts ./data/guides-agricoles
 */

import fs from "fs";
import path from "path";
import { adminFetch } from "../backend/src/lib/admin-api";

// Pour support PDF (à installer: bun add pdf-parse)
// import pdfParse from "pdf-parse";

interface ImportOptions {
  source: string;
  region?: string;
  category?: string;
  crop?: string;
  verified?: boolean;
}

interface ImportResult {
  success: number;
  errors: number;
  skipped: number;
  files: string[];
}

async function readTextFile(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, "utf-8");
}

async function readPDFFile(filePath: string): Promise<string> {
  // TODO: Implémenter avec pdf-parse
  // const dataBuffer = fs.readFileSync(filePath);
  // const data = await pdfParse(dataBuffer);
  // return data.text;

  throw new Error("PDF parsing not implemented. Install pdf-parse: bun add pdf-parse");
}

async function readFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".txt":
    case ".md":
      return readTextFile(filePath);

    case ".pdf":
      return readPDFFile(filePath);

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

function getOptionsFromPath(filePath: string, baseSource: string): ImportOptions {
  const filename = path.basename(filePath, path.extname(filePath));
  const dirname = path.dirname(filePath);

  const options: ImportOptions = {
    source: `${baseSource} - ${filename}`,
    verified: false, // Par défaut, nécessite validation
  };

  // Extraire région du chemin
  const regions = ["bouake", "abidjan", "daloa", "yamoussoukro", "korhogo"];
  regions.forEach(region => {
    if (dirname.toLowerCase().includes(region) || filename.toLowerCase().includes(region)) {
      options.region = region.charAt(0).toUpperCase() + region.slice(1);
    }
  });

  // Extraire culture du nom de fichier
  const crops = ["mais", "manioc", "cacao", "riz", "igname", "banane"];
  crops.forEach(crop => {
    if (filename.toLowerCase().includes(crop)) {
      options.crop = crop === "mais" ? "maïs" : crop;
    }
  });

  // Extraire catégorie
  const categories = ["plantation", "harvest", "disease", "weather"];
  categories.forEach(cat => {
    if (filename.toLowerCase().includes(cat) || dirname.toLowerCase().includes(cat)) {
      options.category = cat;
    }
  });

  // Si le chemin contient "verified" ou "official", marquer comme vérifié
  if (dirname.includes("verified") || dirname.includes("official")) {
    options.verified = true;
  }

  return options;
}

async function importDocument(content: string, options: ImportOptions): Promise<boolean> {
  try {
    await adminFetch("/admin/knowledge", {
      method: "POST",
      body: JSON.stringify({
        content,
        metadata: {
          source: options.source,
          region: options.region,
          category: options.category || "general",
          crop: options.crop,
          verified: options.verified,
          language: "fr",
        },
      }),
    });

    return true;
  } catch (error) {
    console.error(`   Error: ${(error as Error).message}`);
    return false;
  }
}

async function processFile(
  filePath: string,
  baseSource: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Lire le fichier
    const content = await readFile(filePath);

    // Vérifier longueur minimale
    if (content.length < 50) {
      return { success: false, error: "Content too short (< 50 chars)" };
    }

    if (content.length > 5000) {
      console.warn(`   ⚠️  Content truncated to 5000 chars`);
    }

    // 2. Extraire options depuis le chemin
    const options = getOptionsFromPath(filePath, baseSource);

    // 3. Importer
    const success = await importDocument(content.substring(0, 5000), options);

    return { success };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function scanDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  function scan(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath); // Récursif
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if ([".txt", ".md", ".pdf"].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(dirPath);
  return files;
}

async function bulkImport(dirPath: string, baseSource: string): Promise<ImportResult> {
  console.log(`📂 Scanning directory: ${dirPath}\n`);

  const files = await scanDirectory(dirPath);

  console.log(`Found ${files.length} files\n`);

  const result: ImportResult = {
    success: 0,
    errors: 0,
    skipped: 0,
    files: [],
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = path.basename(file);
    const progress = `[${i + 1}/${files.length}]`;

    console.log(`${progress} Processing: ${filename}`);

    const { success, error } = await processFile(file, baseSource);

    if (success) {
      result.success++;
      result.files.push(file);
      console.log(`   ✅ Imported successfully`);
    } else {
      if (error?.includes("too short")) {
        result.skipped++;
        console.log(`   ⚠️  Skipped: ${error}`);
      } else {
        result.errors++;
        console.log(`   ❌ Failed: ${error}`);
      }
    }

    // Délai pour éviter rate limiting
    if ((i + 1) % 10 === 0) {
      console.log(`   💤 Pausing...\n`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return result;
}

function printResults(result: ImportResult, duration: number) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 BULK IMPORT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total files:          ${result.success + result.errors + result.skipped}`);
  console.log(`✅ Successfully imported: ${result.success}`);
  console.log(`⚠️  Skipped:              ${result.skipped}`);
  console.log(`❌ Errors:               ${result.errors}`);
  console.log(`⏱️  Duration:             ${duration.toFixed(1)}s`);
  console.log(`📈 Import rate:          ${(result.success / duration).toFixed(1)} files/sec`);
  console.log("=".repeat(60) + "\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("\n❌ Usage: bun run scripts/bulk-import.ts <directory-path> [source-name]\n");
    console.error("Example: bun run scripts/bulk-import.ts ./data/guides \"Ministère Agriculture CI\"\n");
    process.exit(1);
  }

  const dirPath = args[0];
  const baseSource = args[1] || "Bulk Import";

  if (!fs.existsSync(dirPath)) {
    console.error(`\n❌ Directory not found: ${dirPath}\n`);
    process.exit(1);
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    console.error(`\n❌ Not a directory: ${dirPath}\n`);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📦 WOURI BOT - BULK IMPORT");
  console.log("=".repeat(60));
  console.log(`Directory: ${dirPath}`);
  console.log(`Source: ${baseSource}`);
  console.log("=".repeat(60) + "\n");

  const startTime = Date.now();

  try {
    const result = await bulkImport(dirPath, baseSource);

    const duration = (Date.now() - startTime) / 1000;
    printResults(result, duration);

    console.log("✅ Bulk import completed!\n");
  } catch (error) {
    console.error("\n❌ Bulk import failed:", (error as Error).message);
    process.exit(1);
  }
}

main();
