#!/bin/bash

# ============================================================================
# Wouri Bot - Setup Supabase + Prisma
# ============================================================================

set -e  # Exit on error

echo "🌾 Wouri Bot - Supabase Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Step 1: Check if .env exists
# ============================================================================

if [ ! -f .env ]; then
  echo -e "${RED}❌ Erreur: Fichier .env introuvable${NC}"
  echo ""
  echo "Créez le fichier .env d'abord:"
  echo "  cp .env.example .env"
  echo ""
  exit 1
fi

# ============================================================================
# Step 2: Check if DATABASE_URL is configured
# ============================================================================

echo "Vérification de la configuration..."

if grep -q "your-project.supabase.co" .env; then
  echo -e "${RED}❌ DATABASE_URL n'est pas configuré${NC}"
  echo ""
  echo "📖 Suivez ce guide pour obtenir vos clés Supabase:"
  echo "   backend/SUPABASE_SETUP.md"
  echo ""
  echo "Vous devez remplir dans .env:"
  echo "  - SUPABASE_URL"
  echo "  - SUPABASE_ANON_KEY"
  echo "  - DATABASE_URL"
  echo "  - DIRECT_URL"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Configuration trouvée${NC}"
echo ""

# ============================================================================
# Step 3: Generate Prisma Client
# ============================================================================

echo "Génération du client Prisma..."
bunx prisma generate

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Client Prisma généré${NC}"
else
  echo -e "${RED}❌ Échec génération Prisma client${NC}"
  exit 1
fi

echo ""

# ============================================================================
# Step 4: Apply Migration (via SQL direct)
# ============================================================================

echo "Application de la migration pgvector..."
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "Cette migration va créer:"
echo "  - Extension pgvector"
echo "  - Tables: users, documents, conversations"
echo "  - Index HNSW pour recherche vectorielle"
echo "  - Fonctions: match_documents(), increment_quota()"
echo "  - Données de test (3 documents + 1 utilisateur)"
echo ""

read -p "Continuer? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Migration annulée"
  exit 0
fi

# Apply migration via psql or Prisma
echo "Application via Supabase..."

# Option 1: Via Prisma (ne fonctionne pas bien avec pgvector)
# bunx prisma db push --skip-generate

# Option 2: Via SQL direct (recommandé)
echo ""
echo "📝 Étapes pour appliquer la migration:"
echo ""
echo "1. Ouvrir Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/wouribot-dev/sql"
echo ""
echo "2. Copier le contenu de:"
echo "   prisma/migrations/00_init_pgvector/migration.sql"
echo ""
echo "3. Coller dans 'SQL Editor' → Exécuter"
echo ""
echo "4. Vérifier: 'Success. No rows returned'"
echo ""

# Try to open the file for copying
if command -v cat &> /dev/null; then
  echo "📋 Contenu de la migration (copier-coller):"
  echo "============================================"
  cat prisma/migrations/00_init_pgvector/migration.sql
  echo ""
  echo "============================================"
fi

# ============================================================================
# Step 5: Test Connection
# ============================================================================

echo ""
echo "Une fois la migration appliquée, testez la connexion:"
echo ""
echo "  bun run dev"
echo ""
echo "Puis dans un autre terminal:"
echo "  curl http://localhost:4456/test/supabase"
echo "  curl -X POST http://localhost:4456/test/chat \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"question\":\"Quand planter le maïs?\",\"region\":\"Bouaké\"}'"
echo ""
echo -e "${GREEN}✅ Setup complet!${NC}"
