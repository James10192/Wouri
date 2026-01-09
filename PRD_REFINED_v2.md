# 📄 Product Requirements Document (PRD) - RAFFINÉ v2.0

**Nom du Projet** : Wouri Bot - Assistant WhatsApp RAG Agriculture pour Côte d'Ivoire
**Date** : 12 Décembre 2025
**Version** : 2.0 (RAFFINÉ après recherches approfondies)
**Stack Optimisée** : FastAPI, Pinecone, Google Gemini 2.5, FedaPay, LAfricaMobile

---

## 📋 CHANGELOG - Ce qui a changé vs PRD v1.0

### ❌ Éléments RETIRÉS (non viables)
- ~~Paystack~~ → Remplacé par **FedaPay** (supporte tous les providers CI)
- ~~GPT-4o-mini~~ → Remplacé par **Gemini 2.5 Flash-Lite** (83% moins cher)
- ~~OpenAI Whisper/TTS~~ → **100% Google Ecosystem** + LAfricaMobile pour langues locales
- ~~Supabase pgvector~~ → **Pinecone** (scalable pour 20k+ users dès le départ)

### ✅ Éléments AJOUTÉS (basés sur best practices)
- **LAfricaMobile** pour STT/TTS Dioula
- **Workflow de traduction** pour support multilingual
- **Modèle freemium adapté** aux agriculteurs illettrés
- **Knowledge base validée** (Manuel Ministère Agriculture CI)
- **Données climatiques temps réel** (API météo)
- **Support multimodal** (photos cultures + audio)

---

## 1. Résumé Exécutif

### Le Problème
Les agriculteurs ivoiriens ont des difficultés à accéder à des informations techniques fiables sur:
- Les meilleures périodes de plantation selon le climat
- Les maladies des cultures et leurs traitements
- Les pratiques agricoles adaptées à leur région

**Barrières identifiées**:
- Illettrisme dans les zones rurales (audio obligatoire)
- Langues locales (Baoulé, Dioula) dominantes
- Absence d'outils numériques accessibles via mobile

### La Solution
Un **assistant conversationnel intelligent WhatsApp** utilisant le RAG (Retrieval Augmented Generation) pour fournir des conseils agricoles basés sur:
- Le manuel officiel du Ministère de l'Agriculture de Côte d'Ivoire
- Des données climatiques temps réel par région
- Les savoirs agricoles locaux validés

**Différenciation vs Farmer.Chat/UlangiziAI**:
- Support des langues locales ivoiriennes (Dioula, Baoulé)
- Intégration données climatiques CI spécifiques
- Multimodal: reconnaissance photos maladies cultures

### Modèle Économique
**Freemium adapté aux agriculteurs**:
- **Gratuit**: 20 questions audio/texte par mois (essentiel pour adoption)
- **Premium** (500 FCFA/mois ~$0.80): Illimité + photos cultures + données météo temps réel + vidéos pédagogiques

**Paiement**: Mobile Money via FedaPay (Orange, MTN, Moov, Wave)

---

## 2. Personas & Marché Cible

### Persona Principal: Kofi l'Agriculteur
- **Âge**: 35-50 ans
- **Localisation**: Zone rurale, région de Bouaké (Baoulé) ou Korhogo (Dioula)
- **Langue**: Baoulé/Dioula + Français basique
- **Alphabétisation**: Limitée (audio indispensable)
- **Équipement**: Feature phone ou smartphone bas de gamme, WhatsApp
- **Cultures**: Cacao, café, maïs, manioc
- **Problème**: "Je ne sais pas quand planter mon maïs cette année avec la pluie qui change"

### Persona Secondaire: Aya la Jeune Agricultrice
- **Âge**: 25-35 ans
- **Localisation**: Péri-urbain, région d'Abidjan
- **Langue**: Français + Baoulé
- **Alphabétisation**: Bonne (préfère texte mais utilise audio)
- **Équipement**: Smartphone Android
- **Cultures**: Maraîchage (tomates, piments, légumes)
- **Problème**: "Comment identifier cette maladie sur mes plants de tomates?"

### Taille du Marché
- **Côte d'Ivoire**: 6.7M agriculteurs (60% de la population active)
- **Pénétration WhatsApp**: ~8M utilisateurs (35% population)
- **Marché adressable**: ~2M agriculteurs avec WhatsApp
- **Objectif 12 mois**: 10,000 utilisateurs (0.5% du marché)

---

## 3. Fonctionnalités Clés (Requirements)

### 3.1. Gestion des Messages (Core Loop)

#### Réception Multilingue
**Langues supportées** (par ordre de priorité):
1. **Français** (officiel, STT/TTS natif Google)
2. **Dioula** (via LAfricaMobile STT/TTS + Google Translate)
3. **Baoulé** (Phase 2: via Whisper fine-tuné + Google Translate)
4. **Anglais** (Phase 3: expansion régionale)

**Formats acceptés**:
- ✅ Texte (toutes langues)
- ✅ Audio/Vocal (fichiers .ogg, .mp3, .m4a < 2min)
- ✅ Images (photos cultures/maladies, .jpg, .png)
- ✅ Documents (PDF guides agricoles partagés par users)

#### Traitement Speech-to-Text (STT)

**Workflow pour Français**:
```
Audio FR → Google Speech-to-Text → Texte FR → RAG Pipeline
```

**Workflow pour Dioula** (via traduction):
```
Audio Dioula → LAfricaMobile STT → Texte Dioula
→ Google Translate API → Texte FR → RAG Pipeline
```

**Latence cible**: < 5 secondes pour STT + traduction

#### Traitement Multimodal (Images)

**Use case**: Agriculteur envoie photo de plante malade
```
Photo WhatsApp → Gemini 2.5 Flash (vision) → Identification maladie
→ RAG (recherche solutions) → Réponse avec traitement recommandé
```

**Précision attendue**: 80%+ (basé sur benchmarks Gemini 2.5 Flash vision)

#### Réponse Adaptative

**Règle stricte basée sur Farmer.Chat best practices**:
- Si entrée = **Texte** → Réponse = **Texte**
- Si entrée = **Audio** → Réponse = **Audio** (Text-to-Speech)
- Si entrée = **Image** → Réponse = **Texte + Image annotée** (optionnel)

**Text-to-Speech (TTS) Workflow**:

Pour **Français** (tous users):
```
Texte FR → Google Text-to-Speech (voix WaveNet) → Audio FR → WhatsApp
```

Pour **Dioula** (premium users Phase 1):
```
Texte FR → Google Translate → Texte Dioula
→ LAfricaMobile TTS → Audio Dioula → WhatsApp
```

#### Mémoire Conversationnelle

**Contexte persistant** (inspiré Farmer.Chat):
- Stockage des **10 derniers échanges** par utilisateur
- Informations extraites: localisation, cultures, saison, problèmes récurrents
- **Personnalisation**: "Bonjour Kofi, comment vont tes plants de maïs depuis la semaine dernière?"

**Implémentation technique**:
- Table `conversation_history` dans Supabase
- Format JSON: `{"user_id": "wa_id", "messages": [...], "context": {...}}`

### 3.2. Cerveau & RAG (Retrieval Augmented Generation)

#### Base de Connaissances (Knowledge Base)

**Sources primaires** (par ordre d'autorité):

1. **Manuel Officiel Agriculture CI** (Ministère de l'Agriculture)
   - Format: PDF multipage (300-500 pages)
   - Contenu: Calendriers culturaux, pratiques recommandées, variétés
   - **Validation**: Contenu gouvernemental officiel (high trust)
   - **Mise à jour**: Annuelle

2. **Données Climatiques Temps Réel**
   - API météo: [OpenWeatherMap](https://openweathermap.org/api) ou [Meteomatics](https://www.meteomatics.com/)
   - Données: Précipitations, températures, prévisions 7 jours
   - **Régions couvertes**: Bouaké, Korhogo, Yamoussoukro, Abidjan, Man, Daloa
   - **Intégration**: Requête API lors de questions sur "quand planter"

3. **Savoirs Agriculteurs Locaux** (Phase 2)
   - Collecte via formulaires WhatsApp + validation experts
   - Format: Q&A curated ("En août à Bouaké, on plante le maïs après les premières grandes pluies")
   - **Qualité**: Review manuelle avant ajout à la KB

**Stockage vectoriel**:
- **Vector Database**: Pinecone (Serverless ou Standard $50/mois)
- **Embeddings**: `text-embedding-004` de Google (1536 dimensions, $0.00001/1k tokens)
- **Chunking**: 500 tokens par chunk avec overlap de 50 tokens
- **Metadata**: `{source: "manuel_officiel", page: 42, region: "Bouake", culture: "maïs"}`

#### Pipeline RAG

**Architecture**:
```
Question user (FR) → Embedding → Pinecone similarity search (top-k=5)
→ Context retrieval → Prompt engineering → Gemini 2.5 Flash-Lite
→ Réponse générée → Post-processing → User
```

**Prompt Template**:
```
Tu es un conseiller agricole expert pour la Côte d'Ivoire.
Réponds en te basant UNIQUEMENT sur les documents ci-dessous.

CONTEXTE:
{retrieved_documents}

DONNÉES MÉTÉO (si applicable):
{weather_data}

QUESTION: {user_question}

RÈGLES:
- Si la réponse n'est PAS dans les documents, dis: "Je ne trouve pas cette information dans mes sources. Je recommande de consulter un agent agricole près de chez vous."
- Adapte la réponse à la région de l'utilisateur: {user_region}
- Sois concis (max 100 mots pour audio, 200 pour texte)
- Utilise un langage simple pour des agriculteurs

RÉPONSE:
```

**Prévention Hallucination**:
- ✅ Température LLM = 0.3 (faible créativité)
- ✅ Score de similarité minimum = 0.7 (sinon → "information non trouvée")
- ✅ Citation des sources: "Selon le manuel du Ministère, page 42..."

#### Évaluation Continue

**Metrics** (inspiré Farmer.Chat feedback loops):
- Thumbs up/down après chaque réponse
- Logs détaillés: question → documents récupérés → réponse → feedback
- **Review hebdomadaire**: Analyser réponses mal notées → améliorer KB/prompts

### 3.3. Gestion des Abonnements (Monétisation)

#### Le "Gatekeeper" (Vigile)

**Middleware FastAPI** vérifiant AVANT chaque requête LLM:

```python
async def check_subscription(user_wa_id: str) -> SubscriptionStatus:
    user = await db.users.get(wa_id=user_wa_id)

    # Premium actif?
    if user.subscription_status and user.subscription_end_date > now():
        return SubscriptionStatus.PREMIUM

    # Quota freemium restant?
    if user.monthly_quota_used < 20:  # 20 questions/mois gratuit
        user.monthly_quota_used += 1
        await db.users.update(user)
        return SubscriptionStatus.FREEMIUM

    # Quota épuisé
    return SubscriptionStatus.BLOCKED
```

**Réponse si bloqué**:
```
🌾 Votre quota gratuit (20 questions/mois) est épuisé.

Pour continuer à recevoir des conseils agricoles illimités + reconnaissance photos de maladies + données météo temps réel:

👉 Abonnez-vous pour 500 FCFA/mois (~$0.80)
Paiement sécurisé par Mobile Money (Orange, MTN, Moov, Wave)

Cliquez ici: [Lien FedaPay personnalisé]
```

#### Flux de Paiement FedaPay

**Étape 1: Génération lien paiement**
```python
import fedapay

transaction = fedapay.Transaction.create({
    "amount": 500,  # FCFA
    "currency": {"iso": "XOF"},
    "description": f"Abonnement Wouri Bot - {user.phone_number}",
    "callback_url": "https://api.wouribot.com/webhooks/fedapay",
    "customer": {
        "firstname": user.name,
        "phone_number": user.phone_number
    }
})

payment_link = transaction.generate_token().url
# Envoi du lien via WhatsApp
```

**Étape 2: Webhook de confirmation**
```python
@app.post("/webhooks/fedapay")
async def fedapay_webhook(payload: dict):
    if payload["status"] == "approved":
        user = await db.users.get(phone=payload["customer"]["phone_number"])
        user.subscription_status = True
        user.subscription_end_date = now() + timedelta(days=30)
        user.monthly_quota_used = 0  # Reset quota
        await db.users.update(user)

        # Message de confirmation WhatsApp
        await whatsapp.send_message(
            to=user.wa_id,
            text="✅ Abonnement activé! Posez vos questions agricoles sans limite pendant 30 jours 🌾"
        )
```

**Renouvellement automatique**:
- Message rappel à J-3 avant expiration
- Lien de renouvellement one-click
- Si non renouvelé: retour au freemium (20 questions/mois)

---

## 4. Architecture Technique

### 4.1. Backend & API

**Framework**: Python FastAPI
- **Raison**: Performance, async/await natif, scalabilité prouvée
- **Alternative considérée**: n8n (rejetée car scalabilité limitée pour 20k+ users)

**Structure du projet**:
```
wouribot/
├── app/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── whatsapp.py       # Webhook Meta
│   │   │   ├── payments.py       # Webhook FedaPay
│   │   │   └── admin.py          # Dashboard admin
│   │   └── middleware/
│   │       └── subscription.py   # Gatekeeper
│   ├── core/
│   │   ├── config.py             # Settings (env vars)
│   │   ├── rag.py                # RAG pipeline
│   │   ├── multimodal.py         # Image processing
│   │   └── translation.py        # Workflows multilingual
│   ├── models/
│   │   ├── user.py               # User schema
│   │   └── conversation.py       # Message schema
│   └── services/
│       ├── stt.py                # Google STT + LAfricaMobile
│       ├── tts.py                # Google TTS + LAfricaMobile
│       ├── llm.py                # Gemini 2.5 Flash-Lite
│       ├── vector_db.py          # Pinecone client
│       └── weather.py            # API météo
├── scripts/
│   └── ingest_knowledge.py       # Ingestion PDF → Pinecone
├── tests/
└── main.py
```

**Hébergement**:
- **Recommandé**: Google Cloud Run (serverless, auto-scaling)
- **Alternative**: Railway.app ou Render (plus simple, un peu plus cher)
- **Région**: europe-west1 (Belgique, proche Afrique, faible latence)

**Configuration**:
- 2 vCPU, 4GB RAM (handle 100 req/sec)
- Auto-scaling: 1-20 instances selon charge
- Cold start: < 3s acceptable (utilisateurs mobiles)

### 4.2. Base de Données

**Supabase (PostgreSQL)**:
- **Usage**: Stockage relationnel classique (users, subscriptions, conversations)
- **Raison**: Gratuit jusqu'à 500MB, excellent admin UI, auth intégrée

**Tables principales**:

```sql
-- Users
CREATE TABLE users (
    wa_id TEXT PRIMARY KEY,              -- WhatsApp ID unique
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    preferred_language TEXT DEFAULT 'fr', -- fr, dioula, baoule
    region TEXT,                          -- Bouake, Korhogo, etc.
    crops TEXT[],                         -- [maïs, cacao, café]
    subscription_status BOOLEAN DEFAULT FALSE,
    subscription_end_date TIMESTAMP,
    monthly_quota_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wa_id TEXT REFERENCES users(wa_id),
    messages JSONB,                       -- Array of {role, content, timestamp}
    context JSONB,                        -- Extracted info (region, crops, etc.)
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Feedback (pour amélioration continue)
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wa_id TEXT REFERENCES users(wa_id),
    message_id TEXT,
    question TEXT,
    answer TEXT,
    retrieved_docs JSONB,
    rating INTEGER CHECK (rating IN (-1, 1)),  -- -1 = thumbs down, 1 = up
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wa_id TEXT REFERENCES users(wa_id),
    amount INTEGER,                       -- en FCFA
    currency TEXT DEFAULT 'XOF',
    provider TEXT,                        -- orange_money, mtn, wave, moov
    fedapay_transaction_id TEXT UNIQUE,
    status TEXT,                          -- pending, approved, failed
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Pinecone (Vector Database)**:
- **Index name**: `wouribot-agriculture-ci`
- **Dimensions**: 1536 (Google text-embedding-004)
- **Metric**: Cosine similarity
- **Pods**: Serverless (auto-scaling, pay-per-query)

**Metadata structure**:
```json
{
  "source": "manuel_ministere_agriculture",
  "page": 42,
  "section": "Calendrier cultural maïs",
  "region": "Centre (Bouaké, Yamoussoukro)",
  "culture": "maïs",
  "saison": "Avril-Juin",
  "language": "fr",
  "chunk_id": "doc_001_chunk_042"
}
```

### 4.3. Stack IA (100% Google Ecosystem + Extensions)

#### LLM: Google Gemini 2.5 Flash-Lite
- **Modèle**: `gemini-2.5-flash-lite` (plus économique que Flash standard)
- **Pricing**: $0.10/1M input tokens, $0.40/1M output tokens
- **Context window**: 1M tokens (parfait pour long contexte RAG)
- **Multimodal**: ✅ Texte + Images (vision)
- **API**: Google AI Studio (vertex_ai.GenerativeModel)

**Benchmark vs GPT-4o-mini**:
| Critère | Gemini 2.5 Flash-Lite | GPT-4o-mini |
|---------|----------------------|-------------|
| Prix input | $0.10/1M tokens | $0.15/1M tokens |
| Prix output | $0.40/1M tokens | $0.60/1M tokens |
| Multimodal | ✅ Native | ✅ Via GPT-4o |
| Langues africaines | Meilleur (Google Translate intégré) | Limité |
| **Verdict** | 🏆 **Gagnant pour ce use case** | Bon mais plus cher |

#### STT (Speech-to-Text): Hybride

**Pour Français**:
- **Service**: Google Cloud Speech-to-Text V2
- **Modèle**: `chirp` (optimisé multilingual)
- **Pricing**: $0.006 per 15 seconds
- **Latence**: 2-3 secondes pour 1min audio
- **Accuracy**: 95%+ pour français africain

**Pour Dioula**:
- **Service**: [LAfricaMobile STT API](https://lafricamobile.com/en/produit-stt/)
- **Pricing**: À vérifier (estim é $0.01-0.02/15s)
- **Workflow**: Audio Dioula → LAfricaMobile STT → Texte Dioula

**Pour Baoulé (Phase 2)**:
- **Service**: Whisper fine-tuné custom
- **Dataset**: [Baule speech dataset Zenodo](https://zenodo.org/record/6705861)
- **Effort**: 2-4 semaines de fine-tuning (optionnel pour MVP)

#### TTS (Text-to-Speech): Hybride

**Pour Français**:
- **Service**: Google Cloud Text-to-Speech
- **Voix**: `fr-FR-Wavenet-A` (féminine, naturelle)
- **Pricing**: $16 per 1M characters (WaveNet voices)
- **Qualité**: 85%+ naturalness

**Pour Dioula**:
- **Service**: [LAfricaMobile TTS API](https://lafricamobile.com/en/produit-tts/)
- **Workflow**: Texte Dioula → LAfricaMobile TTS → Audio Dioula

**Pour Baoulé (Phase 2)**:
- À développer (low priority pour MVP)

#### Traduction: Google Translate API

- **Service**: Cloud Translation API (Advanced)
- **Langues**: Français ↔ Dioula ↔ Baoulé
- **Pricing**: $20 per 1M characters
- **Latence**: < 500ms pour 200 mots

#### Embeddings: Google text-embedding-004

- **Dimensions**: 1536
- **Pricing**: $0.00001 per 1k tokens (ultra cheap!)
- **Performance**: SOTA pour retrieval multilingue

#### Observabilité: LangSmith

- **Usage**: Monitoring prompts, latence, coûts LLM
- **Pricing**: Free tier (1k traces/mois), puis $39/mois
- **Critical**: Debug hallucinations, optimiser prompts

### 4.4. WhatsApp Business API

**Provider**: Meta Cloud API (direct, pas via Twilio/360Dialog)
- **Raison**: Pas de markup, pricing direct Meta
- **Phone Number**: Numéro CI dédié (+225 XX XX XX XX XX)
- **Verification**: Business verification Meta (2-4 semaines)

**Pricing** (conversationnel, pas par message):
- **Service conversations** (user-initiated): $0.0160/conversation en Côte d'Ivoire
- **Marketing conversations** (business-initiated): $0.0800/conversation
- **Durée conversation**: 24h après dernier message

**Calcul coûts pour 5000 users actifs**:
- 5000 users × 20 messages/mois = 100k messages
- ~20k conversations (moyenne 5 messages/conversation)
- 20k × $0.016 = **$320/mois** pour WhatsApp API

**Webhook security**:
```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str) -> bool:
    expected_signature = hmac.new(
        key=WHATSAPP_APP_SECRET.encode(),
        msg=payload,
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected_signature}", signature)
```

### 4.5. Paiement: FedaPay

**Provider**: FedaPay (API REST)
- **Pays**: Côte d'Ivoire (HQ: Bénin, opère toute UEMOA)
- **Mobile Money supportés**: ✅ Orange Money, MTN Money, Moov Money, Wave
- **Frais**: 4% par transaction (ex: 500 FCFA → 480 FCFA reçus)

**API Integration**:
```python
import fedapay

fedapay.api_key = os.getenv("FEDAPAY_SECRET_KEY")
fedapay.environment = "production"  # ou "sandbox" pour tests

# Créer transaction
transaction = fedapay.Transaction.create({
    "amount": 500,
    "currency": {"iso": "XOF"},  # Franc CFA
    "description": "Abonnement Wouri Bot 1 mois",
    "callback_url": "https://api.wouribot.com/webhooks/fedapay",
    "customer": {
        "firstname": user.name,
        "lastname": user.lastname,
        "phone_number": user.phone_number,
        "email": user.email  # Optionnel
    }
})

# Récupérer lien paiement
payment_url = transaction.generate_token().url
# → https://checkout.fedapay.com/txn_abc123
```

**Webhook handling**:
```python
@app.post("/webhooks/fedapay")
async def handle_fedapay_webhook(request: Request):
    payload = await request.json()

    # Vérifier authenticité (signature FedaPay)
    # ...

    if payload["status"] == "approved":
        # Activer abonnement user
        await activate_subscription(
            phone=payload["customer"]["phone_number"],
            duration_days=30
        )

        # Envoyer confirmation WhatsApp
        await send_whatsapp_message(
            to=payload["customer"]["phone_number"],
            message="✅ Paiement reçu! Votre abonnement est actif pour 30 jours."
        )

    return {"status": "ok"}
```

### 4.6. Données Météo: OpenWeatherMap API

**API**: [OpenWeatherMap One Call API 3.0](https://openweathermap.org/api/one-call-3)
- **Pricing**: $0 (1000 calls/jour gratuit) puis $0.0015/call
- **Données**: Température, précipitations, humidité, prévisions 7 jours
- **Localités CI**: Coordonnées GPS des 20 principales villes agricoles

**Intégration RAG**:
```python
async def get_weather_context(region: str) -> str:
    """Récupère météo actuelle + prévisions pour enrichir le contexte RAG"""
    coords = REGIONS_COORDS[region]  # {"Bouake": (7.69, -5.03), ...}

    response = await httpx.get(
        "https://api.openweathermap.org/data/3.0/onecall",
        params={
            "lat": coords[0],
            "lon": coords[1],
            "exclude": "minutely,hourly",
            "units": "metric",
            "lang": "fr",
            "appid": OPENWEATHER_API_KEY
        }
    )
    data = response.json()

    return f"""
    MÉTÉO {region.upper()} (aujourd'hui):
    - Température: {data['current']['temp']}°C
    - Précipitations: {data['daily'][0]['rain']}mm
    - Prévisions 7 jours: {data['daily'][:7]}

    💡 Utilise ces données pour conseiller l'agriculteur sur les plantations.
    """
```

---

## 5. User Stories & Acceptance Criteria

### US-01: Communication Audio Multilingue
**En tant qu'** agriculteur parlant Dioula
**Je veux** envoyer une question vocale en Dioula et recevoir une réponse audio en Dioula
**Afin de** comprendre les conseils agricoles sans savoir lire

**Critères d'acceptation**:
- [ ] L'agriculteur envoie un audio Dioula < 2min
- [ ] Le bot transcrit avec LAfricaMobile STT (accuracy > 80%)
- [ ] La réponse est traduite et synthétisée en audio Dioula
- [ ] Le temps de réponse total est < 15 secondes
- [ ] La réponse audio est compréhensible (Quality Check manuelle sur 10 samples)

---

### US-02: Diagnostic Maladie via Photo
**En tant qu'** agricultrice ayant des plants malades
**Je veux** envoyer une photo de mes plants et recevoir un diagnostic
**Afin de** savoir quel traitement appliquer rapidement

**Critères d'acceptation**:
- [ ] L'agricultrice envoie une photo de plante malade via WhatsApp
- [ ] Gemini 2.5 Flash analyse l'image et identifie la maladie probable (accuracy > 75% sur dataset test)
- [ ] Le RAG récupère les traitements recommandés du manuel officiel
- [ ] La réponse inclut: nom maladie, symptômes, traitement, prévention
- [ ] (Bonus) Une image annotée montrant les symptômes est renvoyée

---

### US-03: Freemium Respecté pour Inclusion
**En tant qu'** agriculteur sans moyens
**Je veux** utiliser le bot gratuitement (20 questions/mois)
**Afin de** tester la valeur avant de payer

**Critères d'acceptation**:
- [ ] Nouvel utilisateur reçoit 20 questions gratuites automatiquement
- [ ] Le compteur décrémente après chaque question traitée
- [ ] À la 21ème question, le bot refuse et envoie le lien de paiement FedaPay
- [ ] Le quota se reset le 1er de chaque mois (ou 30j après inscription)
- [ ] Les users premium n'ont pas de limite

---

### US-04: Paiement Mobile Money Fluide
**En tant qu'** agriculteur souhaitant s'abonner
**Je veux** payer 500 FCFA avec mon Orange Money
**Afin de** débloquer toutes les fonctionnalités immédiatement

**Critères d'acceptation**:
- [ ] Le bot envoie un lien FedaPay personnalisé (nom + numéro)
- [ ] L'agriculteur clique et choisit Orange Money
- [ ] Le paiement est effectué sur son téléphone (USSD push)
- [ ] Dès validation, le webhook FedaPay est appelé (< 10 secondes)
- [ ] L'abonnement est activé en BDD (subscription_status=True, end_date=+30j)
- [ ] Un message de confirmation WhatsApp est envoyé (< 5 secondes après webhook)
- [ ] Le bot accepte immédiatement la prochaine question (pas de délai)

---

### US-05: Conseils Personnalisés par Région et Climat
**En tant qu'** agriculteur à Korhogo
**Je veux** que le bot connaisse ma région et la météo actuelle
**Afin de** recevoir des conseils adaptés (pas génériques)

**Critères d'acceptation**:
- [ ] Au premier usage, le bot demande "Dans quelle région cultivez-vous?" (onboarding)
- [ ] La région est stockée en BDD (user.region)
- [ ] Quand l'agriculteur demande "Quand planter le maïs?", le bot:
  - [ ] Récupère la météo de Korhogo (API OpenWeatherMap)
  - [ ] Récupère le calendrier cultural maïs pour région Nord (RAG)
  - [ ] Combine les deux: "Avec les pluies prévues cette semaine à Korhogo (15mm), c'est le bon moment pour planter votre maïs. Le manuel recommande fin avril pour votre région."

---

### US-06: Prévention des Hallucinations
**En tant qu'** Product Owner
**Je veux** que le bot ne donne JAMAIS de fausses informations
**Afin de** maintenir la confiance des agriculteurs (sécurité)

**Critères d'acceptation**:
- [ ] Si aucun document pertinent n'est trouvé (similarity < 0.7), le bot répond: "Je ne trouve pas cette information dans mes sources officielles. Je vous recommande de consulter un agent agricole."
- [ ] Le bot ne complète JAMAIS une réponse avec des informations inventées
- [ ] Température du LLM fixée à 0.3 (faible créativité)
- [ ] Chaque réponse cite la source: "Selon le manuel du Ministère, page 42..."
- [ ] Tests réguliers: poser 20 questions hors scope → 100% doivent déclencher le fallback

---

## 6. Contraintes Non-Fonctionnelles (NFR)

### Latence
| Scénario | Latence Cible | Latence Acceptable | Mesure |
|----------|---------------|-------------------|--------|
| Question texte FR → Réponse texte FR | < 3s | < 5s | P95 |
| Question audio FR → Réponse audio FR | < 10s | < 15s | P95 |
| Question texte Dioula → Réponse texte Dioula | < 5s | < 8s | P95 |
| Question audio Dioula → Réponse audio Dioula | < 15s | < 20s | P95 |
| Photo → Diagnostic texte | < 8s | < 12s | P95 |

**Stratégies d'optimisation**:
- Cache Pinecone queries fréquentes (ex: "quand planter maïs Bouaké")
- Pré-génération réponses communes (100 Q&A top)
- Compression audio (opus codec pour WhatsApp)

### Expérience Utilisateur WhatsApp

**Feedback temps réel** (crucial pour mobile lent):
- [ ] ✅ Marque le message comme "Lu" dès réception (WhatsApp API: mark as read)
- [ ] ✅ Affiche "En train d'écrire..." pendant traitement (WhatsApp API: typing indicator)
- [ ] ✅ Pour audio, affiche "En train d'enregistrer un audio..." (recording indicator)

**Gestion erreurs gracieuse**:
- Si erreur LLM → "Désolé, je rencontre un problème technique. Réessayez dans 1 minute."
- Si quota épuisé → Message clair avec lien paiement
- Si langue non supportée → "Je parle Français, Dioula et Anglais. Pouvez-vous reformuler?"

### Sécurité

**Webhooks**:
- [ ] Validation signature `X-Hub-Signature-256` (Meta webhook)
- [ ] Validation signature FedaPay webhook
- [ ] Rate limiting: 10 requêtes/minute par wa_id (anti-spam)

**Secrets Management**:
```bash
# .env (JAMAIS dans le code!)
GOOGLE_AI_API_KEY=
FEDAPAY_SECRET_KEY=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_APP_SECRET=
OPENWEATHER_API_KEY=
LAFRICAMOBILE_API_KEY=
PINECONE_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

**Privacy (RGPD/Loi 2013-450 CI sur Protection Données)**:
- [ ] Message d'onboarding: "Vos conversations sont privées et ne seront jamais partagées."
- [ ] Possibilité de supprimer toutes ses données: commande "/delete_my_data"
- [ ] Anonymisation des logs après 90 jours (garder seulement metrics agrégées)

### Disponibilité (SLA)

**Target**: 99.5% uptime (tolérance: 3.6h downtime/mois)

**Stratégies**:
- Health check endpoint: `/health` (monitoring UptimeRobot)
- Auto-restart Cloud Run si crash (built-in)
- Alertes PagerDuty si downtime > 5min

### Scalabilité

**Load testing** (avant lancement):
- Simuler 1000 utilisateurs concurrents (Locust.io)
- Vérifier latence < seuils avec 10k req/min
- Vérifier Pinecone supporte 100k queries/jour

**Auto-scaling Cloud Run**:
- Min instances: 1 (avoid cold start)
- Max instances: 20
- Target concurrency: 80 requêtes/container

---

## 7. Roadmap d'Implémentation (Phasing)

### Phase 1: MVP Français (Semaines 1-4)

**Objectif**: Prouver la valeur du RAG agriculture avec 100 beta testers

**Scope**:
- ✅ FastAPI + WhatsApp webhook
- ✅ Gemini 2.5 Flash-Lite (texte uniquement)
- ✅ RAG avec Manuel Ministère Agriculture
- ✅ Pinecone (1 index, 5k chunks)
- ✅ Freemium: 20 questions/mois
- ✅ Paiement FedaPay (subscription)
- ✅ Langue: **Français uniquement**
- ❌ Pas d'audio, pas de photos, pas de météo

**Livrables**:
- [ ] API déployée sur Cloud Run
- [ ] 1 numéro WhatsApp Business vérifié
- [ ] Knowledge base ingérée (Manuel Ministère)
- [ ] Dashboard admin Supabase
- [ ] 100 beta users recrutés (agriculteurs Bouaké)

**Metrics de succès**:
- 70%+ des beta users utilisent les 20 questions gratuites
- 20%+ convertissent en premium
- Rating moyen > 4/5 (thumbs up)
- < 10% hallucinations (réponses incorrectes)

---

### Phase 2: Audio + Multimodal (Semaines 5-8)

**Objectif**: Rendre le bot accessible aux agriculteurs illettrés

**Scope**:
- ✅ STT Google (Français)
- ✅ TTS Google (Français)
- ✅ Gemini 2.5 Flash vision (reconnaissance photos cultures)
- ✅ Données météo temps réel (OpenWeatherMap)
- ✅ Déploiement 500 utilisateurs (expansion Bouaké + Korhogo)

**Livrables**:
- [ ] Audio input/output fonctionnel
- [ ] Diagnostic maladies via photos (accuracy > 75%)
- [ ] Intégration météo dans RAG context
- [ ] Documentation utilisateurs (vidéos tutoriels WhatsApp)

**Metrics de succès**:
- 60%+ des questions sont en audio (vs texte)
- 30%+ des users envoient au moins 1 photo
- Latence audio < 15s (P95)
- Conversion premium: 25%+

---

### Phase 3: Multilingual Dioula (Semaines 9-12)

**Objectif**: Servir les agriculteurs du Nord (Korhogo, région Savanes)

**Scope**:
- ✅ Intégration LAfricaMobile STT/TTS Dioula
- ✅ Workflow traduction Dioula ↔ Français
- ✅ Expansion knowledge base (savoirs agricoles Nord)
- ✅ Déploiement 2000 utilisateurs (Korhogo, Ferkessédougou)

**Livrables**:
- [ ] Audio Dioula → Réponse audio Dioula fonctionnel
- [ ] Tests accuracy STT Dioula > 80%
- [ ] Campagne marketing radio locale (Korhogo)

**Metrics de succès**:
- 40%+ des users Korhogo utilisent le Dioula
- Retention 7 jours: > 50%
- NPS (Net Promoter Score): > 40

---

### Phase 4: Scale & Optimisation (Mois 4-6)

**Objectif**: Atteindre 5000-10 000 utilisateurs, optimiser coûts

**Scope**:
- ✅ Cache intelligent (réduire coûts LLM de 30%)
- ✅ Pré-génération top 100 Q&A
- ✅ Dashboard analytics avancé (Metabase)
- ✅ Support Baoulé (via Whisper fine-tuné)
- ✅ Partenariats distributeurs engrais (monétisation B2B)

**Livrables**:
- [ ] Infrastructure scalée (20 instances Cloud Run)
- [ ] Coûts optimisés: < $0.05 par utilisateur/mois
- [ ] Programme de référencement (agriculteur parraine → bonus)

**Metrics de succès**:
- 10 000 utilisateurs actifs
- CAC (Coût d'Acquisition Client) < $2
- LTV (Lifetime Value) > $10
- Profitable à 5000 users

---

### Phase 5: Expansion Régionale (Mois 7-12)

**Objectif**: Devenir le #1 chatbot agricole UEMOA

**Scope**:
- ✅ Expansion Bénin, Burkina Faso, Sénégal
- ✅ Support Wolof, Bambara, Mooré
- ✅ Partenariats gouvernements (Ministères Agriculture)
- ✅ API B2B pour ONG agricoles
- ✅ Modèle gratuit financé par partenaires (comme Farmer.Chat)

**Vision long-terme**:
- 100 000 agriculteurs utilisateurs
- Impact: +15% rendements grâce aux conseils
- Levée de fonds Série A ($500k-1M)

---

## 8. Budget Prévisionnel Détaillé

### 8.1. Coûts Infrastructure (par mois)

#### Mois 1-3 (500-1000 utilisateurs actifs)

| Service | Usage | Coût unitaire | Total |
|---------|-------|---------------|-------|
| **Google Cloud Run** | 2 vCPU, 4GB, 1M requests | $0.024/vCPU-hour + $0.0025/GB-hour | $50 |
| **Pinecone** | Standard plan, 1 pod | $70/pod/mois | $70 |
| **Supabase** | Free tier (< 500MB) | $0 | $0 |
| **Gemini 2.5 Flash-Lite** | 10M input, 5M output tokens | $0.10/1M input + $0.40/1M output | $3 |
| **Google STT** | 5000 min audio (500 users × 10 audio/mois) | $0.006/15s = $0.024/min | $120 |
| **Google TTS** | 500k caractères | $16/1M chars (WaveNet) | $8 |
| **Google Translate** | 1M caractères | $20/1M chars | $20 |
| **Google Embeddings** | 5M tokens (ingestion KB) | $0.00001/1k tokens | $0.05 |
| **LAfricaMobile STT/TTS** | 1000 min Dioula (estimé 10% users) | $0.02/min (estimé) | $20 |
| **OpenWeatherMap** | 1000 calls/jour (free tier) | $0 | $0 |
| **WhatsApp API** | 10k conversations (500 users × 20 msg) | $0.016/conversation | $160 |
| **FedaPay** | 100 abonnements × 500 FCFA | 4% fees = 20 FCFA/transaction | $3 |
| **LangSmith** | 1k traces (monitoring) | Free tier | $0 |
| **Domaine + SSL** | wouribot.com | $12/an ÷ 12 | $1 |

**Total Mois 1-3**: **$455/mois** ✅ **Dans le budget $500!**

---

#### Mois 4-6 (2000-3000 utilisateurs actifs)

| Service | Changement | Nouveau coût |
|---------|-----------|--------------|
| **Google Cloud Run** | 4 vCPU, 8GB, 5M requests | $120 |
| **Pinecone** | 2 pods (scaling) | $140 |
| **Gemini 2.5 Flash-Lite** | 50M input, 25M output | $15 |
| **Google STT** | 20k min audio | $480 |
| **Google TTS** | 2M caractères | $32 |
| **WhatsApp API** | 60k conversations | $960 |
| **FedaPay** | 500 abonnements | $15 |
| **Autres** | Inchangé | $43 |

**Total Mois 4-6**: **$1805/mois**

---

#### Mois 7-12 (5000-10000 utilisateurs actifs)

| Service | Changement | Nouveau coût |
|---------|-----------|--------------|
| **Google Cloud Run** | Auto-scaling (avg 8 vCPU) | $250 |
| **Pinecone** | 4 pods + réplicas | $300 |
| **Gemini 2.5 Flash-Lite** | 200M input, 100M output | $60 |
| **Google STT** | 80k min audio | $1920 |
| **Google TTS** | 8M caractères | $128 |
| **WhatsApp API** | 200k conversations | $3200 |
| **FedaPay** | 2000 abonnements | $60 |
| **LangSmith** | Pro plan (analytics avancés) | $39 |
| **Autres** | Inchangé | $43 |

**Total Mois 7-12**: **$6000/mois**

---

### 8.2. Revenus Prévisionnels

**Hypothèses**:
- Prix abonnement: 500 FCFA/mois (~$0.80)
- Taux de conversion freemium → premium: 25% (conservateur vs Farmer.Chat)
- Churn mensuel: 20% (renouvellement 80%)

#### Projection 12 Mois

| Mois | Users Actifs | Premium (25%) | Revenus Bruts | FedaPay Fees (4%) | **Revenus Nets** | Coûts Infra | **Profit/Perte** |
|------|-------------|---------------|---------------|-------------------|------------------|-------------|------------------|
| 1 | 500 | 125 | $100 | $4 | $96 | $455 | **-$359** |
| 2 | 800 | 200 | $160 | $6 | $154 | $455 | **-$301** |
| 3 | 1200 | 300 | $240 | $10 | $230 | $455 | **-$225** |
| 4 | 1800 | 450 | $360 | $14 | $346 | $1200 | **-$854** |
| 5 | 2500 | 625 | $500 | $20 | $480 | $1500 | **-$1020** |
| 6 | 3500 | 875 | $700 | $28 | $672 | $1805 | **-$1133** |
| 7 | 5000 | 1250 | $1000 | $40 | $960 | $3000 | **-$2040** |
| 8 | 6500 | 1625 | $1300 | $52 | $1248 | $4000 | **-$2752** |
| 9 | 8000 | 2000 | $1600 | $64 | $1536 | $5000 | **-$3464** |
| 10 | 9500 | 2375 | $1900 | $76 | $1824 | $5500 | **-$3676** |
| 11 | 11000 | 2750 | $2200 | $88 | $2112 | $6000 | **-$3888** |
| 12 | 13000 | 3250 | $2600 | $104 | $2496 | $6500 | **-$4004** |

**Total 12 mois**:
- Revenus nets cumulés: **$12,154**
- Coûts cumulés: **$36,870**
- **Perte nette Année 1: -$24,716**

---

### 8.3. Breakeven Analysis

**Pour atteindre la rentabilité (Profit = 0)**:

Avec coûts stabilisés à ~$6000/mois (10k users):
- Revenus nécessaires: $6000/mois
- Prix abonnement: $0.80/mois
- Users premium nécessaires: 6000 / 0.80 = **7500 premium**
- Users totaux nécessaires (si 25% conversion): **30 000 utilisateurs actifs**

**Timeline vers breakeven**: Mois 18-24 (si croissance maintenue)

---

### 8.4. Stratégies de Réduction Coûts

**Optimisations Phase 4** (réduction 30-40% des coûts):

1. **Cache intelligent**: Réduire requêtes LLM de 40%
   - Top 100 Q&A pré-générées
   - Cache Redis pour questions similaires
   - **Économie**: -$25/mois (Gemini) à 10k users

2. **Compression audio**: Réduire bandwidth WhatsApp
   - Opus codec (vs MP3)
   - **Économie**: -$50/mois (Cloud Run egress)

3. **Embeddings batch**: Réduire calls Pinecone
   - Batch queries (10 questions → 1 appel)
   - **Économie**: -$50/mois (Pinecone)

4. **TTS freemium = Google standard** (vs WaveNet premium)
   - Standard voices: $4/1M chars (vs $16)
   - WaveNet réservé aux premium
   - **Économie**: -$100/mois

5. **STT custom model fine-tuné** (Phase 5)
   - Whisper fine-tuné sur dataset CI (accent local)
   - Self-hosted sur Cloud Run GPU
   - **Économie**: -$500/mois vs Google STT

**Coûts optimisés Mois 12**: $6000 → **$4000/mois**

---

### 8.5. Monétisation Alternative (Phase 5)

**Modèle Farmer.Chat**: Gratuit pour agriculteurs, financé par partenaires

**Partenaires potentiels**:
1. **Distributeurs d'intrants** (engrais, semences)
   - Ex: SIFCA, Yara Côte d'Ivoire
   - Modèle: Le bot recommande leurs produits (avec disclaimer)
   - Revenus: $2000-5000/mois

2. **Assurances agricoles**
   - Ex: CNAAS (Compagnie Nationale d'Assurance Agricole et de Services)
   - Modèle: Collecte données climatiques → réduction primes
   - Revenus: $1000/mois

3. **ONG Développement**
   - Ex: USAID, FAO, Banque Mondiale projets CI
   - Modèle: Subvention pour accès gratuit zones spécifiques
   - Revenus: $5000-10000/mois (grants)

4. **Ministère de l'Agriculture CI**
   - Modèle: Contrat gouvernemental (diffusion conseils officiels)
   - Revenus: $10000-20000/mois

**Avec partenariats**: Breakeven possible dès **Mois 6** (vs Mois 18 sans)

---

## 9. Risques & Mitigations

### Risque 1: Accuracy STT Langues Locales < 80%

**Impact**: Frustration users, abandon

**Probabilité**: Moyenne (LAfricaMobile est récent, peu de reviews)

**Mitigation**:
- Tests exhaustifs avec 50 agriculteurs Dioula (beta Phase 3)
- Fallback: Si STT échoue 2× → Proposer de passer au français
- Long-terme: Fine-tuner Whisper custom (Phase 5)

---

### Risque 2: Hallucinations LLM sur Conseils Critiques

**Impact**: Perte de récolte, perte de confiance, risque légal

**Probabilité**: Faible (RAG + température 0.3)

**Mitigation**:
- Review manuelle mensuelle de 100 réponses aléatoires
- Blacklist de sujets sensibles (pesticides toxiques, dettes)
- Disclaimer légal: "Conseils informatifs. Consultez un expert pour décisions majeures."
- Tests adversarial: poser 50 questions pièges → 0 hallucinations tolérées

---

### Risque 3: Coûts WhatsApp API Explosent

**Impact**: Budget dépassé, non-rentabilité

**Probabilité**: Moyenne (si bots/spam)

**Mitigation**:
- Rate limiting strict: 20 messages/jour par user
- Détection spam: Si > 100 messages identiques/jour → ban
- Monitoring quotidien des coûts (alertes > $200/jour)

---

### Risque 4: FedaPay Downtime ou Blocages

**Impact**: Impossibilité de payer, churn users

**Probabilité**: Faible (FedaPay stable)

**Mitigation**:
- Provider backup: CinetPay (autre provider CI)
- Monitoring uptime FedaPay (StatusPage)
- Communication proactive si problème: "Paiement temporairement indisponible, réessayez dans 2h"

---

### Risque 5: Concurrence (BigTech ou Gouvernement)

**Impact**: Google/Meta lancent solution gratuite, ou gouvernement choisit autre provider

**Probabilité**: Faible court-terme, Moyenne long-terme

**Mitigation**:
- Focus sur hyper-localisation (Baoulé, Dioula, savoirs locaux)
- Partenariats exclusifs avec coopératives agricoles
- Open-source partiel (knowledge base) → goodwill communauté
- Pivot possible vers B2B (white-label pour gouvernements)

---

## 10. Metrics de Succès (KPIs)

### Product Metrics (Dashboard Metabase temps réel)

| Metric | Mois 1-3 | Mois 6 | Mois 12 | Mesure |
|--------|----------|--------|---------|--------|
| **MAU** (Monthly Active Users) | 500 | 3000 | 10000 | Users avec ≥1 message/mois |
| **Retention 7-day** | 40% | 50% | 60% | % users actifs J+7 après onboarding |
| **Conversion Freemium → Premium** | 20% | 25% | 30% | % users qui payent dans les 30j |
| **Churn mensuel Premium** | 25% | 20% | 15% | % premium qui ne renouvellent pas |
| **NPS** (Net Promoter Score) | 30 | 40 | 50 | "Recommanderiez-vous Wouri Bot?" (scale 0-10) |
| **Thumbs Up Rate** | 70% | 80% | 85% | % réponses notées positivement |

### Technical Metrics (LangSmith + Cloud Monitoring)

| Metric | Target | Alerte si |
|--------|--------|-----------|
| **Latence P95 texte** | < 5s | > 7s |
| **Latence P95 audio** | < 15s | > 20s |
| **Uptime API** | 99.5% | < 99% |
| **Hallucination rate** | < 5% | > 10% |
| **STT Accuracy** | > 85% | < 80% |
| **Cost per user/mois** | < $0.50 | > $0.70 |

### Business Metrics (Supabase + Metabase)

| Metric | Mois 3 | Mois 6 | Mois 12 |
|--------|--------|--------|---------|
| **MRR** (Monthly Recurring Revenue) | $230 | $670 | $2500 |
| **CAC** (Customer Acquisition Cost) | $5 | $3 | $2 |
| **LTV** (Lifetime Value, 12 mois) | $6 | $8 | $10 |
| **Burn Rate** | -$300/mois | -$1200/mois | -$4000/mois |

---

## 11. Go-to-Market Strategy

### Phase 1: Beta Privée (Mois 1-2, 100 users)

**Recrutement**:
- Partenariat avec 1 coopérative agricole Bouaké (UCOCAB)
- Sessions démo in-person (1 jour sur terrain avec tablette)
- Incentive: 3 mois premium gratuit pour beta testers

**Feedback Loop**:
- WhatsApp group "Beta Testers Wouri Bot" (support + feedback)
- Weekly call avec 5 power users
- Iterate rapidement sur bugs/features

---

### Phase 2: Launch Public (Mois 3-4, 500-1000 users)

**Canaux**:
1. **Radio locale** (Korhogo, Bouaké): Spots 30s en Français + Dioula
2. **Agents agricoles**: Partenariat ANADER (Agence Nationale d'Appui au Développement Rural)
3. **Bouche-à-oreille**: Programme référencement (parraine 5 amis → 1 mois premium gratuit)
4. **Facebook/Instagram**: Ads ciblés agriculteurs CI (budget $200/mois)

**Messaging**:
> "🌾 Wouri Bot, ton conseiller agricole par WhatsApp!
> Pose tes questions en Français ou Dioula, reçois des réponses audio.
> Gratuit pour commencer. Essaie maintenant: +225 XX XX XX XX XX"

---

### Phase 3: Scaling (Mois 5-12, 10k users)

**Stratégies avancées**:
1. **Partnerships avec distributeurs intrants** (placement in-store)
2. **Événements agricoles** (salons SARA, foires régionales)
3. **Content marketing**: Blog + vidéos YouTube "Conseils agriculture CI"
4. **Community building**: WhatsApp groups par région (modérés par nous)

**Flywheel**:
- Plus d'users → Plus de données feedback → Meilleure accuracy RAG → Meilleur NPS → Plus de referrals

---

## 12. Team & Ressources Nécessaires

### Équipe MVP (Mois 1-3)

| Rôle | Responsabilité | Temps | Profil |
|------|---------------|-------|--------|
| **Fullstack Dev** | FastAPI, intégrations (WhatsApp, Gemini, Pinecone) | Full-time | Python expert, cloud (vous?) |
| **ML Engineer** | RAG pipeline, prompt engineering, fine-tuning Whisper | Part-time (20h/semaine) | Expérience LLM/RAG |
| **Product Manager** | Specs, user research, priorités | Part-time (10h/semaine) | Compréhension agriculture |
| **Agronome Consultant** | Validation knowledge base, review réponses | 5h/semaine | Diplôme agronomie CI |
| **Designer UI/UX** | Messages WhatsApp templates, user onboarding | Part-time (5h/semaine) | Expérience chatbots |

**Coût équipe Mois 1-3**: ~$5000-8000 (si freelancers Côte d'Ivoire/remote)

---

### Équipe Scale (Mois 4-12)

Ajouter:
- **Community Manager** (gestion WhatsApp groups, support users)
- **Data Analyst** (Metabase dashboards, A/B tests)
- **Sales/Partnerships** (deals distributeurs, ONG, gouvernement)

---

## 13. Appendices

### Appendix A: Exemples de Conversations

**Exemple 1: Question Calendrier Cultural (Français)**

```
User (texte): Quand planter le maïs à Bouaké?

Bot (texte):
Bonjour! 🌾

Pour la région de Bouaké (Centre), le manuel du Ministère de l'Agriculture recommande
de planter le maïs pendant deux périodes:

📅 Saison 1: Mi-mars à fin avril (avec les premières pluies)
📅 Saison 2: Mi-août à début septembre

Actuellement, nous sommes en décembre. Les prochaines plantations seront possibles
à partir de mi-mars.

💡 Astuce: Attendez que le sol soit bien humide (3-4 jours de pluie consécutifs)
avant de semer.

Source: Manuel Agriculture CI, page 127

👍 Cette réponse vous aide? | 👎 Pas utile
```

---

**Exemple 2: Diagnostic Maladie via Photo (Multimodal)**

```
User (photo): [Image de feuilles de manioc avec taches]

Bot (texte):
D'après la photo envoyée, vos plants de manioc semblent affectés par la
**Mosaïque du Manioc** (Cassava Mosaic Disease).

🔍 Symptômes observés:
- Taches jaunes et vertes sur les feuilles
- Déformation des feuilles
- Réduction de la taille des feuilles

🛡️ Traitement recommandé:
1. Arracher et brûler les plants très infectés (éviter propagation)
2. Utiliser des boutures saines certifiées pour prochaines plantations
3. Contrôler les mouches blanches (vecteur du virus) avec insecticide bio

📖 Source: Manuel Ministère Agriculture CI, section Maladies du Manioc, page 89

⚠️ Pour un diagnostic certain, consultez un agent agricole ANADER près de chez vous.

Besoin de plus d'aide?
```

---

**Exemple 3: Audio Dioula (Workflow Complet)**

```
User (audio Dioula, 45s): "N be fe ka maana sɔrɔ... [Question sur quand planter l'arachide]"

[Backend workflow]
1. WhatsApp audio → LAfricaMobile STT → Texte Dioula: "Je veux savoir quand planter l'arachide à Korhogo"
2. Google Translate → Français: "Je veux savoir quand planter l'arachide à Korhogo"
3. RAG pipeline → Réponse FR: "Pour Korhogo (Nord), plantez l'arachide en juin-juillet..."
4. Google Translate → Dioula: "Korhogo (Nord) kɔnɔ, ka tiga sɔrɔ..."
5. LAfricaMobile TTS → Audio Dioula (30s)

Bot (audio Dioula, 30s):
[Voix féminine en Dioula expliquant la période de plantation arachide]

Bot (texte backup, si audio échoue):
"🥜 Korhogo kɔnɔ, ka tiga sɔrɔ tile Zuwɛn ni Zuluye (juin-juillet).
(Pour Korhogo, plantez l'arachide en juin-juillet)"
```

---

### Appendix B: Stack Decision Matrix

| Critère | FastAPI | n8n | Django | Flask | Score |
|---------|---------|-----|--------|-------|-------|
| **Performance (async)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | FastAPI |
| **Scalabilité 20k users** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | FastAPI |
| **Rapidité développement** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | n8n |
| **Documentation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | FastAPI/Django |
| **Écosystème AI/LLM** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | FastAPI |
| **Coût maintenance** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | FastAPI/Flask |

**Verdict**: FastAPI ✅ (meilleur compromis perf/scalabilité/écosystème AI)

---

### Appendix C: Competitor Analysis

| Competitor | Région | Langues | Modèle | Forces | Faiblesses |
|------------|--------|---------|--------|--------|------------|
| **Farmer.Chat** | Kenya, Éthiopie | Anglais, Swahili | Gratuit (financé ONG) | 565k users, excellent feedback loops | Pas en Afrique de l'Ouest |
| **UlangiziAI** | Malawi | Chichewa, Anglais | Gratuit | Bon modèle (Manuel Ministère) | Petit (quelques milliers users) |
| **WASHtsApp** | Ouganda | Anglais, Luganda | Gratuit (recherche) | Prouve faisabilité RAG WhatsApp | Niche (eau/santé, pas agriculture) |
| **Google Assistant** | Global | Français (pas langues CI) | Gratuit | Énorme ressources Google | Pas contextualisé CI, pas RAG agriculture |
| **Wouri Bot** | **Côte d'Ivoire** | **Français, Dioula, Baoulé** | **Freemium** | **Hyper-local, multimodal, données temps réel** | **Nouveau (pas de traction)** |

**Différenciation clé**:
1. ✅ Seul bot supportant Baoulé + Dioula
2. ✅ Données climatiques temps réel intégrées
3. ✅ Multimodal (photos maladies cultures)
4. ✅ Modèle freemium viable (vs dépendance ONG)

---

### Appendix D: Ressources & Liens

**Documentation Technique**:
- [Google Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Pinecone Quickstart](https://docs.pinecone.io/guides/get-started/quickstart)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [FedaPay API Reference](https://docs.fedapay.com/)
- [LAfricaMobile API](https://lafricamobile.com/)

**Research Papers**:
- [Farmer.Chat Paper (ArXiv)](https://arxiv.org/pdf/2409.08916)
- [Fine-tuning Whisper for Low-Resource Languages](https://arxiv.org/abs/2412.15726)
- [Baule Speech Dataset](https://zenodo.org/record/6705861)

**Best Practices RAG**:
- [RAG Best Practices 2025](https://developer.nvidia.com/blog/reducing-rag-pipeline-latency)
- [LangChain RAG Tutorial](https://python.langchain.com/docs/tutorials/rag/)

**Datasets Agriculture CI**:
- Manuel Ministère Agriculture (à obtenir via partenariat)
- [FAOSTAT Côte d'Ivoire](https://www.fao.org/faostat/en/#country/107)
- [OpenWeatherMap Historical Data](https://openweathermap.org/history)

---

## 14. Conclusion & Next Steps

Ce PRD raffiné présente un projet **ambitieux mais réalisable** pour créer le premier assistant agricole WhatsApp pour la Côte d'Ivoire supportant les langues locales.

### Décisions Clés Validées ✅

1. **Stack 100% Google** (Gemini 2.5 Flash-Lite, STT/TTS, Translate) + LAfricaMobile pour Dioula
2. **FastAPI** pour scalabilité 20k+ users
3. **Pinecone** pour vector database (vs pgvector)
4. **FedaPay** pour Mobile Money (vs Paystack)
5. **Freemium intelligent**: Audio gratuit (20 questions/mois) → Premium illimité + photos + météo
6. **Phased approach**: Français MVP → Audio → Dioula → Scale

### Budget Réaliste

- **Mois 1-3**: $455/mois (✅ sous les $500 visés)
- **Mois 6**: $1805/mois
- **Mois 12**: $6000/mois (10k users)
- **Breakeven**: Mois 18-24 (30k users) OU Mois 6 avec partenariats B2B

### Risques Principaux

- ⚠️ Accuracy STT Dioula < 80% → Mitigation: Tests beta + fallback français
- ⚠️ Coûts scaling plus rapides que revenus → Mitigation: Optimisations Phase 4 + partenariats

### Prochaines Étapes Immédiates (Semaine 1)

- [ ] Setup infrastructure de base (Cloud Run, Supabase, Pinecone)
- [ ] Obtenir accès WhatsApp Business API (démarrer verification Meta)
- [ ] Contacter LAfricaMobile pour demo API Dioula
- [ ] Obtenir Manuel Ministère Agriculture CI (via partenariat ou scan)
- [ ] Recruter beta testers Bouaké (coopérative UCOCAB)
- [ ] Développer MVP Phase 1 (Français uniquement, texte RAG)

---

**Contact Project Lead**:
📧 [votre email]
📱 WhatsApp: [votre numéro]
🌐 wouribot.com (à créer)

---

*Document vivant - Version 2.0 - Dernière mise à jour: 12 Décembre 2025*
*Basé sur recherches approfondies: 15+ sources académiques/industrielles, 10+ comparaisons stack*

**Sources Clés**:
- [Farmer.Chat Research](https://arxiv.org/pdf/2409.08916)
- [LAfricaMobile Platform](https://lafricamobile.com/en/produit-stt/)
- [Google Gemini 2.5 Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Pinecone vs Alternatives](https://www.zenml.io/blog/vector-databases-for-rag)
- [WhatsApp RAG Best Practices](https://n8n.io/workflows/4827-ai-powered-whatsapp-chatbot-for-text-voice-images-and-pdf-with-rag/)
- [FedaPay Mobile Money](https://me.fedapay.com/mobile-money)
