#!/bin/bash

# Diagnostics script for Vercel timeouts and streaming behavior
# Usage:
#   API_BASE_URL="https://wouri-ashen.vercel.app" ADMIN_API_KEY="..." bash scripts/test-vercel-diagnostics.sh
# Optional:
#   FRONTEND_URL="https://<frontend>.vercel.app" to test /api/chat edge proxy

set -u

API_BASE_URL="${API_BASE_URL:-}"
ADMIN_API_KEY="${ADMIN_API_KEY:-}"
FRONTEND_URL="${FRONTEND_URL:-}"
MAX_TIME="${MAX_TIME:-70}"
OUTPUT_JSON="${OUTPUT_JSON:-0}"
JSON_OUTPUT_PATH="${JSON_OUTPUT_PATH:-/tmp/wouri-diagnostics.jsonl}"

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
YELLOW='\033[1;33m'
NC='\033[0m'

test_count=0
pass_count=0
fail_count=0

if [ "$OUTPUT_JSON" = "1" ]; then
  : > "$JSON_OUTPUT_PATH"
fi

record_json() {
  if [ "$OUTPUT_JSON" != "1" ]; then
    return
  fi

  local name="$1"
  local method="$2"
  local url="$3"
  local status="$4"
  local http_code="$5"
  local time_total="$6"
  local body_preview="$7"

  local entry
  entry=$(printf '{"name":%q,"method":%q,"url":%q,"status":%q,"http_code":%q,"time_total":%q,"body_preview":%q}\n' \
    "$name" "$method" "$url" "$status" "$http_code" "$time_total" "$body_preview")
  echo "$entry" >> "$JSON_OUTPUT_PATH"
}

run_test() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="${4:-}"
  local headers=("${@:5}")
  local curl_args=(
    "-s"
    "--max-time" "$MAX_TIME"
    "-w" "\n%{http_code}\n%{time_total}"
    "-X" "$method"
  )

  test_count=$((test_count + 1))
  echo "Test $test_count: $name"
  echo "  $method $url"

  if [ -n "$data" ]; then
    curl_args+=("-H" "Content-Type: application/json" "-d" "$data")
  fi

  for header in "${headers[@]}"; do
    curl_args+=("-H" "$header")
  done

  response=$(curl "${curl_args[@]}" "$url")
  http_code=$(echo "$response" | tail -n2 | head -n1)
  time_total=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-2)

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code, ${time_total}s)"
    pass_count=$((pass_count + 1))
    if [ -n "$body" ]; then
      echo "  Response: $(echo "$body" | tr '\n' ' ' | head -c 200)"
    fi
    record_json "$name" "$method" "$url" "pass" "$http_code" "$time_total" "$(echo "$body" | tr '\n' ' ' | head -c 200)"
  else
    echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code, ${time_total}s)"
    fail_count=$((fail_count + 1))
    if [ -n "$body" ]; then
      echo "  Error: $(echo "$body" | tr '\n' ' ' | head -c 200)"
    fi
    record_json "$name" "$method" "$url" "fail" "$http_code" "$time_total" "$(echo "$body" | tr '\n' ' ' | head -c 200)"
  fi
  echo ""
}

run_sse_test() {
  local name="$1"
  local url="$2"
  local data="${3:-}"
  local max_time="${4:-15}"
  local headers=("${@:5}")

  test_count=$((test_count + 1))
  echo "Test $test_count: $name (SSE, max ${max_time}s)"
  echo "  POST $url"

  curl_args=(
    "-N"
    "-s"
    "--max-time" "$max_time"
    "-w" "\n%{http_code}\n%{time_total}"
    "-H" "Accept: text/event-stream"
    "-H" "Content-Type: application/json"
    "-X" "POST"
  )

  for header in "${headers[@]}"; do
    curl_args+=("-H" "$header")
  done

  if [ -n "$data" ]; then
    curl_args+=("-d" "$data")
  fi

  response=$(curl "${curl_args[@]}" "$url")
  http_code=$(echo "$response" | tail -n2 | head -n1)
  time_total=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-2)

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code, ${time_total}s)"
    pass_count=$((pass_count + 1))
    if [ -n "$body" ]; then
      echo "  Stream (first 10 lines):"
      echo "$body" | head -n 10
    fi
    record_json "$name" "POST" "$url" "pass" "$http_code" "$time_total" "$(echo "$body" | head -n 10 | tr '\n' ' ' | head -c 200)"
  else
    echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code, ${time_total}s)"
    fail_count=$((fail_count + 1))
    if [ -n "$body" ]; then
      echo "  Error: $(echo "$body" | tr '\n' ' ' | head -c 200)"
    fi
    record_json "$name" "POST" "$url" "fail" "$http_code" "$time_total" "$(echo "$body" | tr '\n' ' ' | head -c 200)"
  fi
  echo ""
}

echo "🌐 API_BASE_URL: $API_BASE_URL"
if [ -n "$FRONTEND_URL" ]; then
  echo "🌐 FRONTEND_URL: $FRONTEND_URL"
fi
echo ""

echo "======================"
echo "Core health checks"
echo "======================"
run_test "Health" "GET" "$API_BASE_URL/health" "" "x-admin-key: $ADMIN_API_KEY"
run_test "Admin monitoring" "GET" "$API_BASE_URL/admin/monitoring" "" "x-admin-key: $ADMIN_API_KEY"

echo "======================"
echo "Chat SSE checks"
echo "======================"
run_test "Chat ping (SSE GET)" "GET" "$API_BASE_URL/chat/ping"
run_sse_test "Chat fast" "$API_BASE_URL/chat" '{"question":"Ping","fast":true}' 15
run_sse_test "Chat normal" "$API_BASE_URL/chat" '{"question":"Quand planter le maïs à Bouaké?","region":"Côte d’Ivoire","language":"fr"}' 70

echo "======================"
echo "Admin write checks"
echo "======================"
run_test "Feedback (no comment)" "POST" "$API_BASE_URL/admin/feedback" \
  '{"wa_id":"test-user","rating":5}' \
  "x-admin-key: $ADMIN_API_KEY"

run_test "Feedback (with comment)" "POST" "$API_BASE_URL/admin/feedback" \
  '{"wa_id":"test-user","rating":5,"comment":"Diagnostic feedback entry"}' \
  "x-admin-key: $ADMIN_API_KEY"

run_test "Knowledge insert" "POST" "$API_BASE_URL/admin/knowledge" \
  '{"content":"Diagnostic knowledge entry","metadata":{"source":"diagnostics","region":"Abidjan"}}' \
  "x-admin-key: $ADMIN_API_KEY"

run_test "Translations insert" "POST" "$API_BASE_URL/admin/translations" \
  '{"source_text":"Bonjour","source_language":"fr","target_language":"dioula","translated_text":"I ni ce","context":"diagnostics","verified":false,"created_by":"diagnostics"}' \
  "x-admin-key: $ADMIN_API_KEY"

run_test "ETL dry-run" "POST" "$API_BASE_URL/admin/etl" \
  '{"documents":[{"content":"ETL dry run entry","metadata":{"source":"diagnostics"}}],"dry_run":true}' \
  "x-admin-key: $ADMIN_API_KEY"

run_test "ETL small batch" "POST" "$API_BASE_URL/admin/etl" \
  '{"documents":[{"content":"ETL small 1","metadata":{"source":"diagnostics"}},{"content":"ETL small 2","metadata":{"source":"diagnostics"}}],"dry_run":false}' \
  "x-admin-key: $ADMIN_API_KEY"

run_test "Embeddings process (limit 3)" "POST" "$API_BASE_URL/admin/embeddings/process?limit=3" "" \
  "x-admin-key: $ADMIN_API_KEY"

if [ -n "$FRONTEND_URL" ]; then
  echo "======================"
  echo "Frontend edge proxy checks"
  echo "======================"
  run_test "Frontend /api/models" "GET" "$FRONTEND_URL/api/models"
  run_sse_test "Frontend /api/chat" "$FRONTEND_URL/api/chat" \
    '{"messages":[{"role":"user","parts":[{"type":"text","text":"Test"}]}]}' 30
fi

echo "======================"
echo "SUMMARY"
echo "======================"
echo -e "Total tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}✅ All diagnostics passed${NC}"
  if [ "$OUTPUT_JSON" = "1" ]; then
    if command -v jq >/dev/null 2>&1; then
      jq -s '.' "$JSON_OUTPUT_PATH" > "${JSON_OUTPUT_PATH%.jsonl}.json"
      echo "JSON report: ${JSON_OUTPUT_PATH%.jsonl}.json"
    else
      echo "JSONL report: $JSON_OUTPUT_PATH (install jq to produce a JSON array)"
    fi
  fi
  exit 0
else
  echo -e "${YELLOW}⚠️  Some diagnostics failed${NC}"
  if [ "$OUTPUT_JSON" = "1" ]; then
    if command -v jq >/dev/null 2>&1; then
      jq -s '.' "$JSON_OUTPUT_PATH" > "${JSON_OUTPUT_PATH%.jsonl}.json"
      echo "JSON report: ${JSON_OUTPUT_PATH%.jsonl}.json"
    else
      echo "JSONL report: $JSON_OUTPUT_PATH (install jq to produce a JSON array)"
    fi
  fi
  exit 1
fi
