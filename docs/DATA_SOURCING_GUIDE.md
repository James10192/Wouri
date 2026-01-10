# Guide de Collecte de Données pour Wouri Bot

Guide complet pour remplir la base de données vectorielle avec des documents agricoles pour la Côte d'Ivoire.

---

## 📊 Vue d'ensemble

**Objectif**: Collecter 10,000+ documents agricoles vérifiés pour alimenter le RAG

**Sources ciblées**:
- 🏛️ Sites gouvernementaux (Ministère de l'Agriculture CI)
- 🌍 Organisations internationales (FAO, IFAD, AGRA)
- 🎓 Instituts de recherche (CNRA, Université Felix Houphouët-Boigny)
- 👨‍🌾 Connaissances terrain (agriculteurs, coopératives)
- 📚 Publications académiques et rapports techniques

---

## 🎯 Stratégie de Collecte

### Phase 1: Sources Officielles (Priorité HAUTE)

#### 1.1 Ministère de l'Agriculture et du Développement Rural (Côte d'Ivoire)

**Site**: http://www.agriculture.gouv.ci

**Documents à collecter**:
- Guides techniques de cultures (maïs, manioc, cacao, riz, etc.)
- Calendriers agricoles par région
- Bulletins météo agricoles
- Fiches techniques des variétés améliorées
- Rapports de campagne agricole

**Script de scraping**:

```typescript
// scripts/scrape-minagri-ci.ts
import * as cheerio from "cheerio";
import { adminFetch } from "@/lib/admin-api";

const BASE_URL = "http://www.agriculture.gouv.ci";

interface ScrapedDocument {
  title: string;
  content: string;
  url: string;
  category: string;
}

async function scrapeMinAgriCI(): Promise<ScrapedDocument[]> {
  const documents: ScrapedDocument[] = [];

  // Liste des pages à scraper
  const pages = [
    "/guides-techniques",
    "/calendrier-agricole",
    "/varietes-ameliorees",
    "/bulletins-meteo",
  ];

  for (const page of pages) {
    try {
      const response = await fetch(`${BASE_URL}${page}`);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extraire les documents PDF et pages
      $("a[href$='.pdf'], article").each((_, element) => {
        const title = $(element).find("h2, h3").text().trim();
        const content = $(element).find("p").text().trim();
        const url = $(element).attr("href") || page;

        if (content.length > 50) {
          documents.push({
            title,
            content,
            url: `${BASE_URL}${url}`,
            category: getCategoryFromUrl(page),
          });
        }
      });

      console.log(`✅ Scraped ${page}: ${documents.length} documents`);
    } catch (error) {
      console.error(`❌ Failed to scrape ${page}:`, error);
    }
  }

  return documents;
}

function getCategoryFromUrl(url: string): string {
  if (url.includes("calendrier")) return "plantation";
  if (url.includes("meteo")) return "weather";
  if (url.includes("varietes")) return "plantation";
  return "general";
}

// Importer dans Wouri Bot
async function importDocuments(documents: ScrapedDocument[]) {
  for (const doc of documents) {
    try {
      await adminFetch("/admin/knowledge", {
        method: "POST",
        body: JSON.stringify({
          content: `${doc.title}\n\n${doc.content}`,
          metadata: {
            source: `Ministère de l'Agriculture CI - ${doc.url}`,
            category: doc.category,
            verified: true,
            language: "fr",
          },
        }),
      });

      console.log(`✅ Imported: ${doc.title}`);
    } catch (error) {
      console.error(`❌ Failed to import ${doc.title}:`, error);
    }

    // Délai pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Exécution
const docs = await scrapeMinAgriCI();
await importDocuments(docs);
```

**Installation dépendances**:
```bash
bun add cheerio
bun add pdf-parse  # Pour extraire texte des PDFs
```

#### 1.2 FAO (Organisation des Nations Unies pour l'alimentation et l'agriculture)

**Site**: https://www.fao.org/countries/cote-divoire/fr

**Documents ciblés**:
- Rapports nationaux sur la sécurité alimentaire
- Guides de bonnes pratiques agricoles
- Études de cas sur l'agriculture en CI

**API FAO**:
```typescript
// scripts/scrape-fao.ts
const FAO_API = "https://data.apps.fao.org/api/v1";

async function fetchFAOData() {
  const response = await fetch(
    `${FAO_API}/publications?country=CIV&topic=agriculture`
  );
  const data = await response.json();

  for (const pub of data.publications) {
    // Télécharger et extraire texte du PDF
    const pdfText = await extractPDFText(pub.pdf_url);

    await adminFetch("/admin/knowledge", {
      method: "POST",
      body: JSON.stringify({
        content: pdfText,
        metadata: {
          source: `FAO - ${pub.title}`,
          verified: true,
          publication_date: pub.date,
        },
      }),
    });
  }
}
```

#### 1.3 CNRA (Centre National de Recherche Agronomique - CI)

**Site**: http://www.cnra.ci

**Documents**:
- Résultats de recherche sur variétés locales
- Fiches techniques de cultures
- Bulletins d'information agricole

---

### Phase 2: Organisations Internationales

#### 2.1 AGRA (Alliance for a Green Revolution in Africa)

**Site**: https://agra.org

**Focus**: Technologies agricoles pour l'Afrique de l'Ouest

#### 2.2 IFAD (Fonds international de développement agricole)

**Site**: https://www.ifad.org/fr/web/operations/w/pays/cote-d-ivoire

**Documents**: Rapports de projets agricoles en CI

#### 2.3 CORAF (Conseil Ouest et Centre Africain pour la Recherche et le Développement Agricoles)

**Site**: https://www.coraf.org

**Documents**: Recherches agricoles pour l'Afrique de l'Ouest

---

### Phase 3: Publications Académiques (Google Scholar, ResearchGate)

**Script de scraping Google Scholar**:

```typescript
// scripts/scrape-google-scholar.ts
import { adminFetch } from "@/lib/admin-api";

const SEARCH_QUERIES = [
  "agriculture Côte d'Ivoire maïs",
  "agriculture Côte d'Ivoire manioc",
  "agriculture Côte d'Ivoire cacao",
  "calendrier agricole Côte d'Ivoire",
  "variétés améliorées Côte d'Ivoire",
];

async function scrapeGoogleScholar() {
  for (const query of SEARCH_QUERIES) {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://scholar.google.com/scholar?q=${encodedQuery}&hl=fr`;

    // Note: Google Scholar bloque le scraping direct
    // Alternative: Utiliser Semantic Scholar API (gratuit)
    const semanticScholarUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&fields=title,abstract,year,authors&limit=20`;

    const response = await fetch(semanticScholarUrl);
    const data = await response.json();

    for (const paper of data.data) {
      if (paper.abstract && paper.abstract.length > 100) {
        await adminFetch("/admin/knowledge", {
          method: "POST",
          body: JSON.stringify({
            content: `${paper.title}\n\n${paper.abstract}`,
            metadata: {
              source: `Semantic Scholar - ${paper.authors?.[0]?.name || "Unknown"} (${paper.year})`,
              verified: false, // Nécessite vérification
              language: "fr",
            },
          }),
        });
      }
    }
  }
}
```

---

### Phase 4: Collecte Terrain (Connaissances Locales)

#### 4.1 Partenariats avec Coopératives Agricoles

**Approche**:
1. Identifier les coopératives agricoles majeures en CI:
   - COOPAMACI (Coopérative des Producteurs de Maïs)
   - COOPABU (Coopérative Agricole de Bouaké)
   - Coopératives de cacao (ECOOKIM, CAYAT)

2. Proposer un partenariat gagnant-gagnant:
   - **Pour eux**: Outil gratuit pour leurs membres
   - **Pour nous**: Accès à leurs guides et connaissances terrain

3. Organiser des sessions de collecte:
   - Interviews avec agriculteurs expérimentés
   - Enregistrement audio → Transcription (Groq Whisper)
   - Documentation des pratiques locales

**Template de formulaire de collecte**:

```typescript
// Interface pour collecte terrain
interface LocalKnowledge {
  farmer_name: string;
  region: string;
  crop: string;
  practice: string; // "plantation", "récolte", "traitement maladies"
  description: string;
  best_period?: string;
  verified_by?: string; // Agronome qui a vérifié
}

// Exemple de données collectées
const localKnowledge: LocalKnowledge = {
  farmer_name: "Kouadio Jean",
  region: "Bouaké",
  crop: "maïs",
  practice: "plantation",
  description: "À Bouaké, nous plantons le maïs entre avril et juin. Le sol doit être bien labouré 2 semaines avant. Nous utilisons la variété Early Thaï qui résiste mieux à la sécheresse. Espacement: 75cm entre rangs, 40cm entre plants.",
  best_period: "avril-juin",
  verified_by: "Agronome ANADER Bouaké",
};
```

#### 4.2 Formulaire Web pour Agriculteurs

**Créer un formulaire public**: `https://wouribot.com/contribute`

```typescript
// app/contribute/page.tsx
export default function ContributePage() {
  const [formData, setFormData] = useState({
    region: "",
    crop: "",
    practice: "",
    description: "",
    contact: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Soumettre à endpoint de modération
    await fetch("/api/contributions", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    alert("Merci pour votre contribution ! Elle sera vérifiée avant publication.");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Partagez vos connaissances agricoles</h1>
      <select name="region" value={formData.region} onChange={handleChange}>
        <option value="">Sélectionnez votre région</option>
        <option value="Bouaké">Bouaké</option>
        <option value="Abidjan">Abidjan</option>
        <option value="Daloa">Daloa</option>
        {/* ... autres régions */}
      </select>

      <select name="crop" value={formData.crop} onChange={handleChange}>
        <option value="">Sélectionnez la culture</option>
        <option value="maïs">Maïs</option>
        <option value="manioc">Manioc</option>
        <option value="cacao">Cacao</option>
        {/* ... autres cultures */}
      </select>

      <textarea
        name="description"
        placeholder="Décrivez votre pratique agricole en détail..."
        rows={10}
        value={formData.description}
        onChange={handleChange}
      />

      <button type="submit">Soumettre</button>
    </form>
  );
}
```

#### 4.3 Sessions d'Enregistrement Audio sur le Terrain

**Matériel nécessaire**:
- Smartphone avec app d'enregistrement
- Groq Whisper API pour transcription (GRATUIT!)

**Workflow**:
1. Enregistrer interview agriculteur (WhatsApp Voice Message ou app dédiée)
2. Transcrire avec Groq Whisper
3. Valider avec agronome local
4. Importer dans base vectorielle

```typescript
// scripts/transcribe-audio.ts
import Groq from "groq-sdk";
import fs from "fs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function transcribeAudio(audioFilePath: string) {
  const audioFile = fs.createReadStream(audioFilePath);

  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3",
    language: "fr", // Français
  });

  return transcription.text;
}

// Utilisation
const text = await transcribeAudio("./interviews/agriculteur-bouake-1.mp3");

await adminFetch("/admin/knowledge", {
  method: "POST",
  body: JSON.stringify({
    content: text,
    metadata: {
      source: "Interview terrain - Agriculteur Bouaké",
      region: "Bouaké",
      verified: false, // Nécessite validation
      language: "fr",
    },
  }),
});
```

---

### Phase 5: Pipeline d'Ingestion Automatisé

#### 5.1 Architecture ETL (Extract, Transform, Load)

```typescript
// scripts/etl-pipeline.ts
import { adminFetch } from "@/lib/admin-api";

interface RawDocument {
  source: string;
  url?: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

// 1. EXTRACT: Collecter depuis multiples sources
async function extract(): Promise<RawDocument[]> {
  const documents: RawDocument[] = [];

  // Source 1: MinAgri CI
  const minagriDocs = await scrapeMinAgriCI();
  documents.push(...minagriDocs);

  // Source 2: FAO
  const faoDocs = await fetchFAOData();
  documents.push(...faoDocs);

  // Source 3: Google Scholar / Semantic Scholar
  const scholarDocs = await scrapeGoogleScholar();
  documents.push(...scholarDocs);

  // Source 4: Contributions locales (database)
  const localDocs = await fetchLocalContributions();
  documents.push(...localDocs);

  return documents;
}

// 2. TRANSFORM: Nettoyer et standardiser
async function transform(docs: RawDocument[]): Promise<RawDocument[]> {
  return docs.map(doc => ({
    ...doc,
    // Nettoyer le contenu
    content: cleanText(doc.content),
    // Extraire métadonnées automatiquement
    metadata: {
      ...doc.metadata,
      crop: extractCropName(doc.content),
      region: extractRegion(doc.content),
      category: classifyDocument(doc.content),
    },
  }));
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normaliser espaces
    .replace(/\n{3,}/g, "\n\n") // Max 2 sauts de ligne
    .trim()
    .substring(0, 5000); // Max 5000 chars
}

function extractCropName(text: string): string | undefined {
  const crops = ["maïs", "manioc", "cacao", "riz", "igname", "banane"];
  const lowerText = text.toLowerCase();

  for (const crop of crops) {
    if (lowerText.includes(crop)) return crop;
  }
  return undefined;
}

function extractRegion(text: string): string | undefined {
  const regions = ["Bouaké", "Abidjan", "Daloa", "Yamoussoukro", "Korhogo", "San-Pédro"];
  for (const region of regions) {
    if (text.includes(region)) return region;
  }
  return undefined;
}

function classifyDocument(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("planter") || lowerText.includes("semis")) return "plantation";
  if (lowerText.includes("récolte") || lowerText.includes("rendement")) return "harvest";
  if (lowerText.includes("maladie") || lowerText.includes("parasite")) return "disease";
  if (lowerText.includes("météo") || lowerText.includes("climat")) return "weather";

  return "general";
}

// 3. LOAD: Importer dans base vectorielle
async function load(docs: RawDocument[]) {
  let successCount = 0;
  let errorCount = 0;

  for (const doc of docs) {
    try {
      await adminFetch("/admin/knowledge", {
        method: "POST",
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

      successCount++;
      console.log(`✅ [${successCount}] Imported: ${doc.title}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ [${errorCount}] Failed: ${doc.title}`, error);
    }

    // Délai pour éviter rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

// Exécution complète du pipeline
async function runETLPipeline() {
  console.log("🚀 Starting ETL pipeline...\n");

  console.log("1️⃣ EXTRACT: Collecting documents...");
  const rawDocs = await extract();
  console.log(`   Collected: ${rawDocs.length} documents\n`);

  console.log("2️⃣ TRANSFORM: Cleaning and standardizing...");
  const cleanedDocs = await transform(rawDocs);
  console.log(`   Cleaned: ${cleanedDocs.length} documents\n`);

  console.log("3️⃣ LOAD: Importing to vector database...");
  await load(cleanedDocs);

  console.log("\n✅ ETL pipeline completed!");
}

// Exécuter
runETLPipeline();
```

**Exécution**:
```bash
bun run scripts/etl-pipeline.ts
```

#### 5.2 Cron Job Automatique

**GitHub Actions** pour collecter automatiquement chaque semaine:

```yaml
# .github/workflows/data-collection.yml
name: Weekly Data Collection

on:
  schedule:
    - cron: "0 0 * * 0" # Chaque dimanche à minuit
  workflow_dispatch: # Déclenchement manuel

jobs:
  collect-data:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run ETL pipeline
        env:
          NEXT_PUBLIC_ADMIN_API_KEY: ${{ secrets.ADMIN_API_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: bun run scripts/etl-pipeline.ts

      - name: Notify on completion
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{"text":"✅ Weekly data collection completed!"}'
```

---

### Phase 6: Validation et Qualité des Données

#### 6.1 Workflow de Modération

```typescript
// Système de modération pour contributions
interface Contribution {
  id: string;
  content: string;
  metadata: Record<string, any>;
  status: "pending" | "approved" | "rejected";
  submitted_by?: string;
  reviewed_by?: string;
  created_at: string;
}

// Queue de modération
const moderationQueue: Contribution[] = [];

async function submitForModeration(doc: RawDocument) {
  moderationQueue.push({
    id: crypto.randomUUID(),
    content: doc.content,
    metadata: doc.metadata,
    status: "pending",
    submitted_by: doc.metadata?.contributor,
    created_at: new Date().toISOString(),
  });
}

// Interface admin pour modération
async function approveContribution(contributionId: string, reviewerId: string) {
  const contribution = moderationQueue.find(c => c.id === contributionId);
  if (!contribution) throw new Error("Contribution not found");

  // Importer dans base vectorielle
  await adminFetch("/admin/knowledge", {
    method: "POST",
    body: JSON.stringify({
      content: contribution.content,
      metadata: {
        ...contribution.metadata,
        verified: true,
        reviewed_by: reviewerId,
      },
    }),
  });

  contribution.status = "approved";
  contribution.reviewed_by = reviewerId;
}
```

#### 6.2 Détection de Duplicatas

```typescript
// Vérifier si document existe déjà
async function checkDuplicate(content: string): Promise<boolean> {
  const results = await adminFetch(`/admin/knowledge?query=${encodeURIComponent(content.substring(0, 100))}&limit=5`);

  // Si similarité > 0.95, c'est probablement un duplicata
  return results.results.some((doc: any) => doc.similarity > 0.95);
}

// Utilisation dans pipeline
async function load(docs: RawDocument[]) {
  for (const doc of docs) {
    const isDuplicate = await checkDuplicate(doc.content);

    if (isDuplicate) {
      console.log(`⚠️ Skipping duplicate: ${doc.title}`);
      continue;
    }

    // Importer...
  }
}
```

---

## 📋 Checklist de Collecte

### Sources Gouvernementales
- [ ] Ministère de l'Agriculture CI
- [ ] ANADER (Agence Nationale d'Appui au Développement Rural)
- [ ] CNRA (Centre National de Recherche Agronomique)
- [ ] FIRCA (Fonds Interprofessionnel pour la Recherche et le Conseil Agricoles)

### Organisations Internationales
- [ ] FAO Côte d'Ivoire
- [ ] IFAD projets CI
- [ ] AGRA
- [ ] CORAF
- [ ] IITA (International Institute of Tropical Agriculture)

### Académique
- [ ] Google Scholar (Semantic Scholar API)
- [ ] ResearchGate
- [ ] Université Felix Houphouët-Boigny
- [ ] INP-HB (Institut National Polytechnique)

### Terrain
- [ ] Interviews agriculteurs (Bouaké, Daloa, Korhogo)
- [ ] Coopératives agricoles
- [ ] ANADER agents de terrain
- [ ] Agronomes indépendants

---

## 🎯 Objectifs de Collecte

### Court terme (1 mois)
- ✅ 1,000 documents de sources officielles (MinAgri, FAO)
- ✅ 500 documents académiques (Semantic Scholar)
- ✅ 200 contributions terrain validées

### Moyen terme (3 mois)
- ✅ 5,000 documents au total
- ✅ Couverture complète: maïs, manioc, cacao, riz
- ✅ Données pour 10+ régions de CI

### Long terme (6 mois)
- ✅ 10,000+ documents
- ✅ Support multilingue (Dioula, Baoulé)
- ✅ Base de connaissances communautaire active

---

## 🚀 Démarrage Rapide

```bash
# 1. Installer dépendances
bun add cheerio pdf-parse

# 2. Créer dossier scripts
mkdir scripts

# 3. Copier les scripts de ce guide

# 4. Exécuter pipeline ETL
bun run scripts/etl-pipeline.ts

# 5. Vérifier import
curl -X GET "https://wouribot-backend.onrender.com/admin/knowledge?query=maïs&limit=10" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

---

## ⚖️ Considérations Légales et Éthiques

### Respect du Copyright
- ✅ Privilégier sources ouvertes (Open Access)
- ✅ Respecter licences Creative Commons
- ✅ Citer sources systématiquement
- ❌ Ne pas scraper sites avec `robots.txt` interdisant

### RGPD et Protection des Données
- ✅ Anonymiser contributions personnelles
- ✅ Demander consentement pour interviews
- ✅ Permettre suppression sur demande

### Vérification de la Qualité
- ✅ Toujours vérifier avec agronome avant publication
- ✅ Marquer `verified: false` pour contributions non validées
- ✅ Système de modération actif

---

## 📞 Contacts Partenaires Potentiels

### Gouvernement
- **ANADER**: info@anader.ci
- **CNRA**: contact@cnra.ci
- **Ministère Agriculture**: info@agriculture.gouv.ci

### Coopératives
- **COOPAMACI** (Maïs): Bouaké
- **ECOOKIM** (Cacao): Daloa
- **Union des Coopératives Agricoles**: Yamoussoukro

### Universités
- **Université Felix Houphouët-Boigny**: Abidjan
- **INP-HB**: Yamoussoukro

---

**Prochaines étapes**: Choisir 2-3 sources prioritaires et lancer le premier pipeline ETL !
