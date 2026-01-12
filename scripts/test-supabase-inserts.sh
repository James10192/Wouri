#!/bin/bash

# Isolate Supabase writes via admin endpoints
# Usage:
#   API_BASE_URL="https://wouri-ashen.vercel.app" ADMIN_API_KEY="..." bash scripts/test-supabase-inserts.sh
#
# Optional:
#   REPEAT=3 to repeat each test multiple times

set -u

API_BASE_URL="${API_BASE_URL:-}"
ADMIN_API_KEY="${ADMIN_API_KEY:-}"
REPEAT="${REPEAT:-1}"
MAX_TIME="${MAX_TIME:-70}"

if [ -z "$API_BASE_URL" ]; then
  echo "❌ ERROR: API_BASE_URL is required"
  echo "Example: API_BASE_URL=https://wouri-ashen.vercel.app"
  exit 1
fi

if [ -z "$ADMIN_API_KEY" ]; then
  echo "❌ ERROR: ADMIN_API_KEY is required"
  echo "Example: ADMIN_API_KEY=your_admin_key"
  exit 1
fi

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

run_post() {
  local name="$1"
  local endpoint="$2"
  local data="$3"

  for i in $(seq 1 "$REPEAT"); do
    echo "Test: $name (run $i/$REPEAT)"
    response=$(curl -s --max-time "$MAX_TIME" -X POST "$API_BASE_URL$endpoint" \
      -H "x-admin-key: $ADMIN_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$data" \
      -w "\n%{http_code}\n%{time_total}")

    http_code=$(echo "$response" | tail -n2 | head -n1)
    time_total=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-2)

    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
      echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code, ${time_total}s)"
      if [ -n "$body" ]; then
        echo "  Response: $(echo "$body" | tr '\n' ' ' | head -c 200)"
      fi
    else
      echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code, ${time_total}s)"
      if [ -n "$body" ]; then
        echo "  Error: $(echo "$body" | tr '\n' ' ' | head -c 200)"
      fi
    fi
    echo ""
  done
}

echo "=========================================="
echo "🧪 WOURI BOT - SUPABASE INSERT DIAGNOSTICS"
echo "=========================================="
echo "API_BASE_URL: $API_BASE_URL"
echo "REPEAT: $REPEAT"
echo ""

run_post "Feedback (no comment)" "/admin/feedback" \
  '{"wa_id":"diagnostic-user","rating":5}'

run_post "Feedback (with comment)" "/admin/feedback" \
  '{"wa_id":"diagnostic-user","rating":5,"comment":"Diagnostic insert test"}'

run_post "Knowledge insert" "/admin/knowledge" \
  '{"content":"Diagnostic knowledge insert","metadata":{"source":"diagnostics","region":"Abidjan"}}'

run_post "Translation insert" "/admin/translations" \
  '{"source_text":"Salut","source_language":"fr","target_language":"dioula","translated_text":"I ni ce","context":"diagnostics","verified":false,"created_by":"diagnostics"}'

run_post "ETL dry-run" "/admin/etl" \
  '{"documents":[{"content":"ETL dry run entry","metadata":{"source":"diagnostics"}}],"dry_run":true}'

run_post "ETL small batch" "/admin/etl" \
  '{"documents":[{"content":"ETL insert 1","metadata":{"source":"diagnostics"}},{"content":"ETL insert 2","metadata":{"source":"diagnostics"}}],"dry_run":false}'

echo "✅ Supabase insert diagnostics completed"
