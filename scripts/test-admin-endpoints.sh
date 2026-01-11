#!/bin/bash

# Script de test complet des endpoints Admin API
# Usage: bash scripts/test-admin-endpoints.sh

set -e

# Check if required environment variables are set
if [ -z "$API_BASE_URL" ]; then
    echo "❌ ERROR: API_BASE_URL environment variable is not set"
    echo "Please set it to your backend URL (e.g., https://wouri-ashen.vercel.app)"
    exit 1
fi

if [ -z "$ADMIN_API_KEY" ]; then
    echo "❌ ERROR: ADMIN_API_KEY environment variable is not set"
    echo "Please set your admin API key in GitHub Secrets or environment"
    exit 1
fi

echo "🌐 Testing backend at: $API_BASE_URL"
echo ""

echo "=========================================="
echo "🧪 WOURI BOT - ADMIN API TESTS"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# Test helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4

    test_count=$((test_count + 1))
    echo -n "Test $test_count: $description ... "

    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$API_BASE_URL$endpoint" \
            -H "x-admin-key: $ADMIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\n%{http_code}")
    else
        response=$(curl -s -X $method "$API_BASE_URL$endpoint" \
            -H "x-admin-key: $ADMIN_API_KEY" \
            -w "\n%{http_code}")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        pass_count=$((pass_count + 1))
        echo "   Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body | head -c 100)"
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        fail_count=$((fail_count + 1))
        echo "   Error: $body"
    fi
    echo ""
}

echo "🔍 Testing Health & Monitoring"
echo "=========================================="
test_endpoint "GET" "/health" "Backend health check"
test_endpoint "GET" "/admin/monitoring" "Admin monitoring endpoint"

echo ""
echo "📊 Testing Conversations Endpoints"
echo "=========================================="
test_endpoint "GET" "/admin/conversations?limit=5" "List conversations (paginated)"
test_endpoint "GET" "/admin/messages?limit=5" "List messages (formatted)"

echo ""
echo "💬 Testing Feedback Endpoints"
echo "=========================================="
test_endpoint "GET" "/admin/feedback?limit=5" "List feedback"

feedback_data='{
  "wa_id": "test-user-123",
  "rating": 5,
  "comment": "Excellent test feedback from automated script"
}'
test_endpoint "POST" "/admin/feedback" "Create feedback with comment" "$feedback_data"

echo ""
echo "📚 Testing Knowledge Base Endpoints"
echo "=========================================="
test_endpoint "GET" "/admin/knowledge?limit=5" "List knowledge base documents"

knowledge_data='{
  "content": "Test document: Le maïs se plante pendant la saison des pluies en Côte d'\''Ivoire.",
  "metadata": {
    "source": "Test Script",
    "region": "Bouaké",
    "category": "plantation",
    "language": "fr"
  }
}'
test_endpoint "POST" "/admin/knowledge" "Add document to knowledge base" "$knowledge_data"

test_endpoint "GET" "/admin/knowledge?query=maïs&limit=3" "Search knowledge base (vector search)"

echo ""
echo "🌍 Testing Translations Endpoints"
echo "=========================================="
test_endpoint "GET" "/admin/translations?limit=5" "List translations"

translation_data='{
  "source_text": "Bonjour",
  "source_language": "fr",
  "target_language": "dioula",
  "translated_text": "I ni ce",
  "context": "greeting",
  "verified": false,
  "created_by": "test-script"
}'
test_endpoint "POST" "/admin/translations" "Add translation" "$translation_data"

test_endpoint "GET" "/admin/translations?query=Bonjour&source_language=fr" "Search translations"

echo ""
echo "🔧 Testing ETL Endpoint"
echo "=========================================="
etl_data='{
  "documents": [
    {
      "content": "ETL Test 1: Culture du manioc à Daloa.",
      "metadata": {"source": "ETL Test", "region": "Daloa"}
    },
    {
      "content": "ETL Test 2: Plantation du cacao à Yamoussoukro.",
      "metadata": {"source": "ETL Test", "region": "Yamoussoukro"}
    }
  ],
  "dry_run": false
}'
test_endpoint "POST" "/admin/etl" "Batch ingest documents (ETL)" "$etl_data"

echo ""
echo "=========================================="
echo "📈 TEST SUMMARY"
echo "=========================================="
echo -e "Total tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
