#!/usr/bin/env bun

import { adminFetch } from "../backend/src/lib/admin-api";

async function seed() {
  console.log("Seeding admin data...");

  await adminFetch("/admin/knowledge", {
    method: "POST",
    body: JSON.stringify({
      content: "Le maïs se plante au début de la saison des pluies en Côte d'Ivoire.",
      metadata: {
        source: "Seed Data",
        region: "Bouaké",
        category: "plantation",
        language: "fr",
      },
    }),
  });

  await adminFetch("/admin/translations", {
    method: "POST",
    body: JSON.stringify({
      source_text: "Quand planter le maïs?",
      source_language: "fr",
      target_language: "dioula",
      translated_text: "Den tulu ka maïs bɔ?",
      context: "Agriculture",
      verified: false,
      created_by: "seed",
    }),
  });

  await adminFetch("/admin/feedback", {
    method: "POST",
    body: JSON.stringify({
      wa_id: "seed-user",
      rating: 5,
      comment: "La réponse est correcte et claire.",
    }),
  });

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
