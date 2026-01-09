# Versions Capturées - Wouri Bot

**Date de capture**: 12 Décembre 2025
**Environnement**: WSL2 Ubuntu (Linux 5.15.167.4-microsoft-standard-WSL2)

---

## 🔧 Versions Système Disponibles

| Outil | Version Actuelle | Version Cible Projet | Status |
|-------|------------------|---------------------|--------|
| **Python** | 3.12.3 | 3.11+ (recommandé 3.12) | ✅ **PARFAIT** |
| **pip** | 24.0 | Latest | ✅ OK |
| **Poetry** | Not installed | 1.8.0+ | ⏳ À installer |
| **Git** | (à vérifier) | Latest | ⏳ À vérifier |

---

## 📦 Dépendances Projet (À Installer)

### Core Framework

```toml
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.115.0"
uvicorn = {extras = ["standard"], version = "^0.32.0"}
pydantic = "^2.9.0"
pydantic-settings = "^2.6.0"
python-dotenv = "^1.0.0"
```

### LLM & AI Stack

```toml
google-generativeai = "^0.8.0"         # Gemini SDK
openai = "^1.54.0"                      # Fallback/Whisper
pinecone-client = "^5.0.0"              # Vector DB
langchain = "^0.3.0"                    # RAG orchestration
langsmith = "^0.2.0"                    # Observability
```

### Google Cloud Services

```toml
google-cloud-speech = "^2.28.0"         # STT
google-cloud-texttospeech = "^2.18.0"   # TTS
google-cloud-translate = "^3.17.0"      # Translation
google-cloud-secret-manager = "^2.20.0" # Secrets
```

### Database & Storage

```toml
supabase = "^2.9.0"                     # Supabase client
sqlalchemy = "^2.0.0"                   # ORM (optionnel)
asyncpg = "^0.29.0"                     # PostgreSQL async driver
```

### HTTP & Async

```toml
httpx = "^0.27.0"                       # HTTP client async
aiofiles = "^24.1.0"                    # File I/O async
python-multipart = "^0.0.9"             # File uploads
```

### Validation & Serialization

```toml
pydantic = "^2.9.0"                     # Validation (déjà listé)
pydantic-settings = "^2.6.0"            # Env validation
```

### Dev Tools

```toml
[tool.poetry.group.dev.dependencies]
ruff = "^0.7.0"                         # Linter + Formatter
mypy = "^1.13.0"                        # Type checker
pytest = "^8.3.0"                       # Testing
pytest-asyncio = "^0.24.0"              # Async tests
pytest-cov = "^6.0.0"                   # Coverage
pre-commit = "^4.0.0"                   # Git hooks
commitizen = "^3.29.0"                  # Conventional commits
```

---

## 📋 Installation Initiale Recommandée

### 1. Installer Poetry (Package Manager)

```bash
curl -sSL https://install.python-poetry.org | python3 -

# Ajouter au PATH (si nécessaire)
export PATH="$HOME/.local/bin:$PATH"

# Vérifier installation
poetry --version
```

### 2. Initialiser Projet Poetry

```bash
cd /home/levraimd/workspace/Wouribot

# Créer pyproject.toml
poetry init

# Ou copier le pyproject.toml pré-configuré (à créer après)
```

### 3. Installer Dépendances

```bash
# Installer toutes les dépendances
poetry install

# Activer l'environnement virtuel
poetry shell
```

### 4. Vérifier Versions Installées

```bash
# FastAPI
poetry run python -c "import fastapi; print(fastapi.__version__)"

# Gemini SDK
poetry run python -c "import google.generativeai as genai; print(genai.__version__)"

# Pydantic
poetry run python -c "import pydantic; print(pydantic.__version__)"

# Pinecone
poetry run python -c "import pinecone; print(pinecone.__version__)"
```

---

## 🔒 Version Pinning Strategy

### Dépendances SANS `^` (version exacte)

**Raison**: Éviter breaking changes sur dépendances critiques.

```toml
[tool.poetry.dependencies]
fastapi = "0.115.0"                     # Breaking changes fréquents
pydantic = "2.9.0"                      # v2 vs v1 incompatible
google-generativeai = "0.8.0"           # API changes possibles
```

### Dépendances AVEC `^` (minor updates autorisés)

```toml
httpx = "^0.27.0"                       # Stable API
pytest = "^8.3.0"                       # Dev dependency
ruff = "^0.7.0"                         # Outil dev
```

---

## 🐍 Python Environment Management

### Option 1: Poetry (Recommandé)

```bash
# Créer virtualenv automatiquement
poetry install

# Activer
poetry shell

# Lancer commandes
poetry run python main.py
poetry run pytest
```

### Option 2: venv (Standard Python)

```bash
# Créer virtualenv
python3 -m venv venv

# Activer
source venv/bin/activate

# Installer dépendances
pip install -r requirements.txt
```

### Option 3: uv (Ultra rapide - 2025)

```bash
# Installer uv (alternative à pip/poetry, 10-100x plus rapide)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Créer projet
uv init

# Installer dépendances
uv pip install -r requirements.txt
```

**Recommandation**: **Poetry** pour ce projet (standard Python 2025, gestion deps + virtualenv intégré).

---

## 📝 .python-version (pyenv)

Créer `.python-version` pour fixer version Python:

```
3.12.3
```

Avec pyenv:

```bash
# Installer pyenv (si pas installé)
curl https://pyenv.run | bash

# Installer Python 3.12.3
pyenv install 3.12.3

# Activer pour le projet
pyenv local 3.12.3
```

---

## ✅ Checklist Pre-Dev

```markdown
- [x] Python 3.12.3 installé
- [x] pip 24.0 disponible
- [ ] Poetry installé (1.8.0+)
- [ ] pyproject.toml créé
- [ ] Dependencies installées
- [ ] .python-version créé
- [ ] virtualenv activé
- [ ] Versions vérifiées (poetry run python -c "import fastapi; print(fastapi.__version__)")
- [ ] Git configuré (git config user.name, user.email)
- [ ] Pre-commit hooks installés (pre-commit install)
```

---

## 📚 Ressources

- [Poetry Docs](https://python-poetry.org/docs/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Pydantic V2 Docs](https://docs.pydantic.dev/latest/)
- [Ruff Docs](https://docs.astral.sh/ruff/)
- [pytest Docs](https://docs.pytest.org/)

---

**Prochaine étape**: Installer Poetry et initialiser pyproject.toml avec dépendances listées.

*Dernière mise à jour: 12 Décembre 2025*
