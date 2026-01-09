# Questionnaire PRD - Wouri Bot (Réponses Complètes)

**Date**: 12 Décembre 2025
**Version**: 1.0
**Basé sur**: PRD_REFINED_v2.md

---

## Phase 1: Vision Produit

### 1.1 Contexte Business

```markdown
Q1: Quel est le nom du produit/projet ?
R: Wouri Bot - Assistant WhatsApp RAG Agriculture pour Côte d'Ivoire

Q2: Quelle est la proposition de valeur unique (en 1 phrase) ?
R: Premier assistant agricole WhatsApp multilingue (Français, Dioula, Baoulé) utilisant RAG pour fournir des conseils validés par le Ministère de l'Agriculture CI, accessible par audio/texte/photos pour les agriculteurs illettrés ou lettrés.

Q3: Quel problème métier résout-il ?
R: Les agriculteurs ivoiriens ont des difficultés à accéder à des informations techniques fiables sur les périodes de plantation, maladies des cultures et pratiques agricoles adaptées à leur région, avec des barrières d'illettrisme et de langue (langues locales Baoulé/Dioula).

Q4: Quelle est l'industrie/domaine cible ?
R: Agriculture - Afrique de l'Ouest (Côte d'Ivoire)

Q5: Le projet est-il :
[ ] SaaS B2B
[x] SaaS B2C (Freemium: 20 questions audio/mois gratuit, Premium illimité 500 FCFA/mois)
[ ] Produit interne
[ ] Open source
[ ] Autre: _______________________
```

### 1.2 Personas Utilisateurs

```markdown
Q6: Qui sont les utilisateurs finaux ?

Persona 1:
- Nom: Kofi l'Agriculteur
- Rôle: Agriculteur rural (35-50 ans), région Bouaké
- Besoin principal: Savoir quand planter (maïs, cacao, café, manioc) selon climat et recevoir conseils en Baoulé/Français par audio (illettrisme)
- Point de douleur: Ne sait pas lire les guides agricoles, n'a pas accès à un agent agricole proche, climat changeant rend les périodes de plantation incertaines

Persona 2:
- Nom: Aya la Jeune Agricultrice
- Rôle: Agricultrice péri-urbaine (25-35 ans), région Abidjan, maraîchage
- Besoin principal: Identifier rapidement les maladies des plantes (photos) et obtenir traitements recommandés
- Point de douleur: Perte de récoltes à cause de maladies non détectées à temps, coût des consultations agents agricoles

Persona 3:
- Nom: Agent Agricole ANADER
- Rôle: Conseiller agricole gouvernemental
- Besoin principal: Diffuser les recommandations officielles du Ministère à grande échelle sans déplacements constants
- Point de douleur: Impossible de couvrir toutes les zones rurales, surcharge de demandes individuelles

Persona 4 (Secondaire):
- Nom: Distributeur d'Intrants (SIFCA, Yara CI)
- Rôle: Vendeur d'engrais/semences
- Besoin principal: Recommander ses produits de manière ciblée aux agriculteurs (partenariat B2B)
- Point de douleur: Difficulté à atteindre les petits agriculteurs ruraux
```

### 1.3 Architecture & Stack Technique

```markdown
Q7: Type d'architecture ?
[ ] Monorepo (Turborepo, Nx, etc.)
[ ] Monolithe
[ ] Microservices
[x] Serverless (Google Cloud Run - auto-scaling)
[ ] Autre: _______________________

Q8: Framework frontend principal ?
[ ] Next.js
[ ] React (Vite)
[ ] Vue.js
[ ] Svelte
[ ] Angular
[x] Autre: Aucun (API backend only - interface WhatsApp)

Note: Dashboard admin optionnel en Phase 5 (Next.js/React possible)

Q9: Framework backend/API ?
[ ] Next.js API Routes
[ ] Express.js
[ ] NestJS
[x] FastAPI (Python) - version 0.115.0+
[ ] Spring Boot (Java)
[ ] Autre: _______________________

Q10: Base de données ?
[x] PostgreSQL (via Supabase)
[ ] MySQL
[ ] MongoDB
[x] Supabase (PostgreSQL managed)
[ ] Firebase
[ ] PlanetScale
[ ] Autre: _______________________

Q11: ORM/Query Builder ?
[ ] Prisma
[ ] Drizzle
[ ] TypeORM
[ ] Sequelize
[ ] Mongoose
[x] Aucun (SQL brut via Supabase Python client)
[ ] Autre: SQLAlchemy possible si besoin

Note: Pour Python, on utilisera supabase-py client avec queries SQL directes ou SQLAlchemy si complexité augmente.

Q12: Authentification ?
[x] Supabase Auth (pour admin dashboard Phase 5)
[ ] NextAuth.js / Auth.js
[ ] Clerk
[ ] Firebase Auth
[ ] Custom JWT
[ ] Auth0
[x] Autre: Pas d'auth pour users WhatsApp (identification via wa_id)

Q13: Styling ?
[ ] Tailwind CSS
[ ] CSS Modules
[ ] Styled Components
[ ] Emotion
[ ] Sass/SCSS
[x] Autre: N/A (pas de frontend web pour MVP)

Q14: UI Component Library ?
[ ] shadcn/ui
[ ] Radix UI
[ ] Headless UI
[ ] Material UI
[ ] Chakra UI
[ ] Mantine
[ ] Custom
[x] Aucune (backend API only)
[ ] Autre: _______________________

Q15: State Management ?
[ ] React Context + useState/useReducer
[ ] Zustand
[ ] Redux Toolkit
[ ] Jotai
[ ] Recoil
[ ] MobX
[x] Aucun (Server State only - pas de frontend)
[ ] Autre: _______________________

Q16: Data Fetching ?
[ ] React Server Components (RSC)
[ ] TanStack Query (React Query)
[ ] SWR
[ ] Apollo Client (GraphQL)
[ ] tRPC
[x] Fetch API (WhatsApp webhook HTTP POST)
[x] Autre: httpx (Python async HTTP client)

Q17: Validation ?
[x] Zod (via Python équivalent: Pydantic)
[ ] Yup
[ ] Joi
[ ] class-validator
[ ] AJV
[x] Autre: Pydantic (standard FastAPI pour validation)

Q18: Testing ?
[x] Vitest (équivalent Python: pytest)
[ ] Jest
[x] Playwright (tests E2E WhatsApp workflow)
[ ] Cypress
[ ] Testing Library
[x] Autre: pytest (unit tests), pytest-asyncio (async tests)

Q19: Deployment ?
[ ] Vercel
[ ] Netlify
[ ] Railway
[ ] AWS (EC2, ECS, Lambda, etc.)
[x] Google Cloud (Cloud Run - serverless containers)
[ ] Azure
[ ] DigitalOcean
[x] Autre: Alternative considérée: Railway.app (plus simple mais un peu plus cher)

Q20: CI/CD ?
[x] GitHub Actions (build, test, deploy to Cloud Run)
[ ] GitLab CI
[ ] CircleCI
[ ] Jenkins
[ ] Aucun
[ ] Autre: _______________________

Q21: Monitoring/Analytics ?
[x] Sentry (errors)
[ ] Vercel Analytics
[ ] PostHog
[ ] Google Analytics
[ ] Mixpanel
[x] Autre: LangSmith (monitoring LLM prompts, latence, coûts)
[x] Autre: Google Cloud Monitoring (infra)

Q22: Caching ?
[ ] Upstash Redis
[ ] Vercel KV
[x] Redis (potentiel pour cache RAG queries Phase 4)
[x] In-memory (dict Python pour cache simple)
[ ] Aucun
[ ] Autre: _______________________
```

### 1.4 Versioning & Package Management

```markdown
Q23: Package Manager ?
[ ] npm
[ ] pnpm
[ ] yarn
[ ] bun
[x] Autre: pip (Python) + poetry ou uv (recommandé 2025)

Note: poetry pour gestion dépendances Python (équivalent npm pour Python)

Q24: Python version minimale requise ?
[x] Python 3.11+ (recommandé 3.12 pour performance)
[ ] Python 3.10
[ ] Autre: _______________________

Q25: FastAPI version ?
[x] 0.115.0+ (latest stable 2025)
[ ] Autre: _______________________

Q26: Versions exactes des dépendances critiques :

Framework principal:
- Nom: FastAPI
- Version: 0.115.0

LLM & AI:
- Nom: google-generativeai (Gemini SDK)
- Version: 0.8.0+

- Nom: openai (fallback si besoin)
- Version: 1.54.0+

Vector Database:
- Nom: pinecone-client
- Version: 5.0.0+

Database:
- Nom: supabase-py
- Version: 2.9.0+

WhatsApp:
- Nom: httpx (HTTP client async)
- Version: 0.27.0+

Validation:
- Nom: pydantic
- Version: 2.9.0+ (v2 obligatoire pour FastAPI 0.115+)

STT/TTS:
- Nom: google-cloud-speech
- Version: 2.28.0+

- Nom: google-cloud-texttospeech
- Version: 2.18.0+

Translation:
- Nom: google-cloud-translate
- Version: 3.17.0+

Paiement:
- Nom: fedapay (SDK Python si existe, sinon httpx direct)
- Version: TBD (vérifier sur PyPI)

Autres critiques:
- Nom: python-dotenv
- Version: 1.0.0+ (env vars)

- Nom: uvicorn
- Version: 0.32.0+ (ASGI server)

- Nom: langchain
- Version: 0.3.0+ (orchestration RAG)

- Nom: langsmith
- Version: 0.2.0+ (observability)
```

### 1.5 Règles de Développement

```markdown
Q27: Python type hints strict mode obligatoire ?
[x] Oui (mypy strict, ruff)
[ ] Non

Q28: Convention de nommage fichiers ?
[x] snake_case (standard Python)
[ ] kebab-case
[ ] camelCase
[ ] PascalCase

Q29: Convention de nommage classes/models ?
[x] PascalCase (standard Python pour classes)
[ ] Autre: _______________________

Q30: Pattern commit messages ?
[x] Conventional Commits
[ ] Angular Commit Guidelines
[ ] Custom
[ ] Aucun standard

Q31: Linter ?
[x] Ruff (linter + formatter Python ultra-rapide, remplace Flake8+Black)
[ ] ESLint
[ ] Biome
[ ] Custom
[ ] Aucun

Alternative: pylint (plus strict mais plus lent)

Q32: Formatter ?
[x] Ruff (integrated formatter)
[ ] Prettier
[ ] Biome
[x] Autre: Black (alternative si pas Ruff)

Q33: Git hooks (Husky équivalent Python) ?
[x] Oui - pre-commit (ruff, mypy, tests)
[x] Oui - commit-msg (conventional commits via commitizen)
[ ] Oui - pre-push (tests)
[ ] Non

Outil: pre-commit (standard Python pour git hooks)
```

### 1.6 Sécurité

```markdown
Q34: Variables d'environnement validées au build ?
[x] Oui - Pydantic Settings (équivalent t3-env pour Python)
[ ] Oui - envalid
[ ] Oui - custom Zod
[ ] Non

Pattern:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GOOGLE_AI_API_KEY: str
    SUPABASE_URL: str
    # ...

    class Config:
        env_file = ".env"
```

Q35: Rate limiting ?
[x] Oui - 20 messages/jour par wa_id (anti-spam)
[ ] Non

Implémentation: slowapi (FastAPI rate limiting) ou Redis

Q36: CORS configuration ?
[x] Whitelist domaines (Meta webhooks uniquement)
[ ] Allow all (dev only)
[ ] Custom

Note: Uniquement webhook Meta + dashboard admin (si Phase 5)

Q37: Gestion secrets en production ?
[x] Google Cloud Secret Manager
[ ] Vercel Env Vars
[ ] AWS Secrets Manager
[ ] .env.local (danger !)
[ ] Autre: _______________________
```

### 1.7 Architecture Modulaire

```markdown
Q38: Structure projet ?

Décrire l'arborescence principale:
```
wouribot/
├── app/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── whatsapp.py       # Webhook Meta (POST /webhooks/whatsapp)
│   │   │   ├── payments.py       # Webhook FedaPay (POST /webhooks/fedapay)
│   │   │   └── health.py         # Health check (GET /health)
│   │   └── middleware/
│   │       ├── subscription.py   # Gatekeeper (quota/premium check)
│   │       └── rate_limit.py     # Rate limiting
│   ├── core/
│   │   ├── config.py             # Settings (Pydantic env validation)
│   │   ├── rag.py                # RAG pipeline (Pinecone + Gemini)
│   │   ├── multimodal.py         # Image processing (Gemini vision)
│   │   └── translation.py        # Workflows multilingual (Dioula ↔ FR)
│   ├── models/
│   │   ├── user.py               # User Pydantic model
│   │   ├── conversation.py       # Message Pydantic model
│   │   └── schemas.py            # API request/response schemas
│   ├── services/
│   │   ├── stt.py                # Speech-to-Text (Google + LAfricaMobile)
│   │   ├── tts.py                # Text-to-Speech (Google + LAfricaMobile)
│   │   ├── llm.py                # Gemini 2.5 Flash-Lite client
│   │   ├── vector_db.py          # Pinecone client
│   │   ├── weather.py            # OpenWeatherMap API
│   │   ├── whatsapp.py           # WhatsApp Business API client
│   │   └── payment.py            # FedaPay API client
│   └── db/
│       ├── supabase.py           # Supabase client
│       └── queries.py            # SQL queries (users, conversations, payments)
├── scripts/
│   ├── ingest_knowledge.py       # Ingestion PDF → Pinecone (one-time)
│   └── migrate_db.py             # DB migrations (si besoin)
├── tests/
│   ├── unit/
│   │   ├── test_rag.py
│   │   ├── test_translation.py
│   │   └── test_subscription.py
│   ├── integration/
│   │   ├── test_whatsapp_webhook.py
│   │   └── test_payment_webhook.py
│   └── e2e/
│       └── test_full_workflow.py  # Playwright WhatsApp simulation
├── docs/
│   ├── DOCUMENTATION_GUIDE.md     # Ce fichier guide
│   ├── PRD_QUESTIONNAIRE_ANSWERS.md  # Ce fichier
│   ├── BEST_PRACTICES.md          # À créer (Python/FastAPI 2025)
│   └── architecture/
│       └── diagrams/              # Diagrammes architecture (Mermaid)
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Tests + lint
│       └── deploy.yml             # Deploy to Cloud Run
├── pyproject.toml                 # Poetry dependencies
├── .env.example                   # Template variables env
├── .pre-commit-config.yaml        # Git hooks config
├── ruff.toml                      # Ruff linter config
├── mypy.ini                       # MyPy type checker config
├── Dockerfile                     # Container pour Cloud Run
├── cloudbuild.yaml                # Google Cloud Build config
├── CLAUDE.md                      # À créer (instructions LLM)
├── README.md                      # Documentation principale projet
└── main.py                        # FastAPI app entry point
```

Q39: Quels dossiers auront un README.md ?
[x] /app/core (RAG, multimodal, translation)
[x] /app/services (STT, TTS, LLM, WhatsApp, Payment)
[x] /app/db (Supabase queries)
[x] /app/api/endpoints (Webhooks patterns)
[x] /scripts (Ingestion, migrations)
[x] /tests (Testing strategy)
[x] /docs (Documentation projet)
[ ] Autre: _______________________
```

---

## Résumé Décisions Techniques

### Stack Core
- **Backend**: FastAPI 0.115.0+ (Python 3.11+)
- **LLM**: Google Gemini 2.5 Flash-Lite
- **Vector DB**: Pinecone (Serverless)
- **Database**: Supabase (PostgreSQL)
- **STT**: Google Cloud Speech + LAfricaMobile (Dioula)
- **TTS**: Google Cloud TTS + LAfricaMobile (Dioula)
- **Translation**: Google Cloud Translate API
- **WhatsApp**: Meta Cloud API (direct, pas Twilio)
- **Paiement**: FedaPay (Mobile Money CI)
- **Météo**: OpenWeatherMap API
- **Observability**: LangSmith + Sentry + Google Cloud Monitoring

### Architecture
- **Type**: Serverless (Google Cloud Run)
- **Auto-scaling**: 1-20 instances
- **Region**: europe-west1 (Belgique, proche Afrique)

### DevOps
- **CI/CD**: GitHub Actions
- **Deployment**: Google Cloud Run
- **Secrets**: Google Cloud Secret Manager
- **Monitoring**: LangSmith (LLM) + Sentry (errors) + Cloud Monitoring (infra)

### Standards Code
- **Linting**: Ruff (remplace Flake8 + Black)
- **Type Checking**: MyPy strict
- **Testing**: pytest + pytest-asyncio + Playwright
- **Git Hooks**: pre-commit (ruff, mypy, tests)
- **Commits**: Conventional Commits (via commitizen)
- **Naming**: snake_case (files/functions), PascalCase (classes)

### Sécurité
- **Env Validation**: Pydantic Settings (build-time)
- **Webhook Verification**: X-Hub-Signature-256 (Meta), FedaPay signature
- **Rate Limiting**: 20 messages/jour par wa_id
- **Input Validation**: Pydantic models (tous endpoints)
- **Secrets**: Google Cloud Secret Manager (production)

---

## Next Steps

1. ✅ Questionnaire PRD complété
2. ⏳ Capturer versions exactes (voir Section suivante)
3. ⏳ Créer CLAUDE.md
4. ⏳ Créer BEST_PRACTICES.md (Python/FastAPI 2025)
5. ⏳ Créer README.md modulaires
6. ⏳ Validation finale

---

**Document complété le**: 12 Décembre 2025
**Basé sur**: PRD_REFINED_v2.md (70+ pages de recherches)
**Prochaine étape**: Capturer versions exactes avec commandes
