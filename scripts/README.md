# Wouri Bot - Scripts de Collecte de Données

Scripts pour collecter et importer des documents agricoles dans la base vectorielle.

---

## 📋 Scripts Disponibles

### 1. ETL Pipeline (Collecte Automatisée)

**Fichier**: `etl-pipeline.ts`

**Description**: Pipeline complet Extract-Transform-Load pour collecter des documents depuis:
- Semantic Scholar API (publications académiques)
- Sources web (à implémenter)
- Fichiers locaux (à implémenter)

**Usage**:
```bash
bun run scripts/etl-pipeline.ts
```

**Variables d'environnement requises**:
```bash
ADMIN_API_KEY=your_admin_api_key
API_BASE_URL=https://wouribot-backend.onrender.com
```

**Exemple de sortie**:
```
============================================================
🚀 WOURI BOT - ETL PIPELINE
============================================================
API URL: https://wouribot-backend.onrender.com
Batch size: 10
Delay: 200ms
============================================================

1️⃣ EXTRACT: Collecting documents...

   📚 Searching Semantic Scholar: "agriculture Côte d'Ivoire maïs"
      Found 8 papers
   📚 Searching Semantic Scholar: "agriculture Côte d'Ivoire manioc cassava"
      Found 12 papers

   ✅ Total collected: 45 documents

2️⃣ TRANSFORM: Cleaning and standardizing...

   Processed 10/45 documents
   Processed 20/45 documents
   ...

   ✅ Cleaned: 45 documents

3️⃣ LOAD: Importing to vector database...

   ✅ [1/45] Imported: Maize production in Côte d'Ivoire: Climate...
   ⚠️  [2/45] Skipping duplicate: Cassava farming practices...
   ✅ [3/45] Imported: Cocoa cultivation techniques...

============================================================
📊 IMPORT SUMMARY
============================================================
Total documents:     45
✅ Successfully imported: 38
⚠️  Duplicates skipped:   5
❌ Errors:               2
⏱️  Duration:             24.3s
📈 Import rate:          1.6 docs/sec
============================================================
```

---

### 2. Transcription Audio (Collecte Terrain)

**Fichier**: `transcribe-audio.ts`

**Description**: Transcrit des interviews audio d'agriculteurs avec Groq Whisper (GRATUIT!) et les importe dans la base vectorielle.

**Usage**:
```bash
bun run scripts/transcribe-audio.ts <audio-file-path>
```

**Exemple**:
```bash
bun run scripts/transcribe-audio.ts ./interviews/agriculteur-bouake-mais-2026-01-10.mp3
```

**Format de nom de fichier recommandé**:
```
agriculteur-<region>-<culture>-<date>.mp3

Exemples:
- agriculteur-bouake-mais-2026-01-10.mp3
- interview-daloa-cacao-2026-01-15.mp3
- terrain-korhogo-manioc-2026-01-20.mp3
```

**Variables d'environnement requises**:
```bash
GROQ_API_KEY=gsk_...
ADMIN_API_KEY=your_admin_api_key
API_BASE_URL=https://wouribot-backend.onrender.com
```

**Exemple de sortie**:
```
============================================================
🎙️  WOURI BOT - AUDIO TRANSCRIPTION
============================================================

🎤 Transcribing audio file: ./interviews/agriculteur-bouake-mais.mp3
✅ Transcription completed (142.5s of audio)

------------------------------------------------------------
📝 TRANSCRIPTION:
------------------------------------------------------------
À Bouaké, nous plantons le maïs entre avril et juin. Le sol doit être
bien labouré 2 semaines avant. Nous utilisons la variété Early Thaï qui
résiste mieux à la sécheresse. Espacement: 75cm entre rangs, 40cm entre
plants. La récolte se fait après 90 à 100 jours.
------------------------------------------------------------

📊 Metadata extracted:
   Region: Bouaké
   Crop: maïs
   Date: 2026-01-10

💾 Transcription saved to: ./interviews/agriculteur-bouake-mais.txt
📤 Importing transcription to knowledge base...
✅ Transcription imported: 990e8400-e29b-41d4-a716-446655440000

✅ Audio transcription and import completed successfully!

Document ID: 990e8400-e29b-41d4-a716-446655440000
Review at: https://wouribot-backend.onrender.com/admin/conversations
```

---

### 3. Import en Masse (Fichiers Locaux)

**Fichier**: `bulk-import.ts`

**Description**: Importe en masse des documents locaux (TXT, MD, PDF) depuis un dossier.

**Usage**:
```bash
bun run scripts/bulk-import.ts <directory-path> [source-name]
```

**Exemples**:
```bash
# Import depuis dossier de guides
bun run scripts/bulk-import.ts ./data/guides-agricoles "Ministère Agriculture CI"

# Import depuis dossier de recherches
bun run scripts/bulk-import.ts ./data/recherches "Université FHB"
```

**Structure de dossier recommandée**:
```
data/
├── guides-agricoles/
│   ├── verified/              # Marqués comme verified: true
│   │   ├── bouake/
│   │   │   ├── mais-plantation.txt
│   │   │   └── manioc-recolte.txt
│   │   └── daloa/
│   │       └── cacao-traitement.txt
│   └── unverified/            # Marqués comme verified: false
│       ├── igname-bouake.md
│       └── riz-abidjan.pdf
└── recherches/
    ├── mais-cote-ivoire-2025.pdf
    └── manioc-rendements.txt
```

**Extraction automatique de métadonnées**:
- **Région**: Détectée depuis le chemin ou nom de fichier (bouake, abidjan, daloa, etc.)
- **Culture**: Détectée depuis le nom de fichier (mais, manioc, cacao, etc.)
- **Catégorie**: Détectée depuis le nom (plantation, harvest, disease, weather)
- **Verified**: `true` si le chemin contient "verified" ou "official"

**Variables d'environnement requises**:
```bash
ADMIN_API_KEY=your_admin_api_key
API_BASE_URL=https://wouribot-backend.onrender.com
```

**Exemple de sortie**:
```
============================================================
📦 WOURI BOT - BULK IMPORT
============================================================
Directory: ./data/guides-agricoles
Source: Ministère Agriculture CI
============================================================

📂 Scanning directory: ./data/guides-agricoles

Found 24 files

[1/24] Processing: mais-plantation-bouake.txt
   ✅ Imported successfully
[2/24] Processing: manioc-recolte.md
   ✅ Imported successfully
[3/24] Processing: test.txt
   ⚠️  Skipped: Content too short (< 50 chars)
...

============================================================
📊 BULK IMPORT SUMMARY
============================================================
Total files:          24
✅ Successfully imported: 20
⚠️  Skipped:              3
❌ Errors:               1
⏱️  Duration:             8.5s
📈 Import rate:          2.4 files/sec
============================================================

✅ Bulk import completed!
```

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances

```bash
# Dépendances de base (déjà installées)
cd backend
bun install

# Dépendances optionnelles pour PDF
bun add pdf-parse
```

### 2. Configuration des variables d'environnement

Créer `.env` dans le dossier racine:

```bash
# Admin API
ADMIN_API_KEY=your_admin_api_key_here

# Backend URL
API_BASE_URL=https://wouribot-backend.onrender.com

# Groq API (pour transcription audio)
GROQ_API_KEY=gsk_your_groq_api_key
```

### 3. Exécution des scripts

```bash
# ETL Pipeline automatique
bun run scripts/etl-pipeline.ts

# Transcription audio
bun run scripts/transcribe-audio.ts ./interviews/mon-audio.mp3

# Import en masse
bun run scripts/bulk-import.ts ./data/guides "Ministère Agriculture"
```

---

## 📁 Organisation des Données

### Structure recommandée

```
Wouribot/
├── data/                              # Données sources (gitignored)
│   ├── raw/                           # Données brutes
│   │   ├── pdfs/                      # PDFs à extraire
│   │   ├── interviews/                # Audios à transcrire
│   │   └── guides/                    # Documents texte
│   ├── processed/                     # Données nettoyées
│   └── archives/                      # Données importées
├── scripts/                           # Scripts de collecte
│   ├── etl-pipeline.ts
│   ├── transcribe-audio.ts
│   ├── bulk-import.ts
│   └── README.md
└── .env                              # Configuration
```

### Gitignore

Ajouter à `.gitignore`:
```
# Data files
data/
interviews/
*.mp3
*.wav
*.pdf
```

---

## 🔧 Personnalisation

### Ajouter une nouvelle source de données

Modifier `etl-pipeline.ts` dans la fonction `extract()`:

```typescript
async function extract(): Promise<RawDocument[]> {
  const documents: RawDocument[] = [];

  // Votre nouvelle source
  const customDocs = await extractFromCustomSource();
  documents.push(...customDocs);

  return documents;
}

async function extractFromCustomSource(): Promise<RawDocument[]> {
  // Votre logique de collecte
  return [];
}
```

### Modifier les critères de classification

Modifier `transform()` dans `etl-pipeline.ts`:

```typescript
function classifyDocument(text: string): string {
  const lowerText = text.toLowerCase();

  // Ajouter vos propres mots-clés
  if (lowerText.includes("irrigation")) return "water_management";
  if (lowerText.includes("fertilisant")) return "fertilization";

  return "general";
}
```

---

## 🐛 Dépannage

### Erreur: "ADMIN_API_KEY not found"

**Solution**: Vérifier que `.env` contient `ADMIN_API_KEY=...`

```bash
# Vérifier variables
echo $ADMIN_API_KEY

# Si vide, charger .env
export $(cat .env | xargs)
```

### Erreur: "Rate limit exceeded"

**Solution**: Augmenter le délai entre requêtes dans `etl-pipeline.ts`:

```typescript
const CONFIG = {
  DELAY_MS: 500, // Augmenter à 500ms ou 1000ms
};
```

### Erreur: "PDF parsing not implemented"

**Solution**: Installer pdf-parse:

```bash
bun add pdf-parse
```

Puis décommenter le code dans `bulk-import.ts`:

```typescript
import pdfParse from "pdf-parse";

async function readPDFFile(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}
```

### Erreur: "Groq API key invalid"

**Solution**: Vérifier format de la clé (doit commencer par `gsk_`):

```bash
# Obtenir une clé gratuite sur:
https://console.groq.com
```

---

## 📊 Monitoring

### Vérifier les imports

```bash
# Chercher documents importés
curl -X GET "https://wouribot-backend.onrender.com/admin/knowledge?query=maïs&limit=10" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

### Statistiques d'import

Créer un script de statistiques:

```bash
# scripts/stats.sh
#!/bin/bash

TOTAL=$(curl -s -X GET "$API_BASE_URL/admin/knowledge?query=agriculture&limit=1000" \
  -H "x-admin-key: $ADMIN_API_KEY" | jq '.results | length')

echo "Total documents: $TOTAL"
```

---

## 🎯 Prochaines Étapes

1. ✅ Exécuter ETL pipeline initial
2. ✅ Collecter interviews terrain (5-10 agriculteurs)
3. ✅ Importer guides officiels (MinAgri CI, ANADER)
4. ✅ Configurer cron job hebdomadaire (GitHub Actions)
5. ✅ Mettre en place workflow de validation (agronomes)

---

## 📚 Ressources

- [Semantic Scholar API](https://api.semanticscholar.org/)
- [Groq Whisper API](https://console.groq.com/docs/audio)
- [Admin API Documentation](../docs/ADMIN_DASHBOARD_API.md)
- [Guide de Collecte de Données](../docs/DATA_SOURCING_GUIDE.md)
