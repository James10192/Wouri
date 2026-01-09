#!/bin/bash

# ============================================================================
# Wouri Bot - Script de Test API Local
# ============================================================================

BASE_URL="http://localhost:3000"

echo "🌾 Wouri Bot - Test API Script"
echo "================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4

    echo -n "Testing $name... "

    if [ "$method" == "GET" ]; then
        response=$(curl -s "$BASE_URL$endpoint")
    else
        response=$(curl -s -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    if echo "$response" | grep -q '"success":true\|"status":"ok"\|"status":"healthy"'; then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "   Response: $response" | head -c 100
        echo "..."
        echo ""
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Response: $response"
        echo ""
    fi
}

# Check if server is running
echo "Checking if server is running..."
if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
    echo ""
else
    echo -e "${RED}❌ Server is not running${NC}"
    echo ""
    echo "Please start the server first:"
    echo "  cd backend && bun run dev"
    echo ""
    exit 1
fi

# Run tests
echo "Running tests..."
echo "================"
echo ""

test_endpoint "Health Check" "GET" "/health"
test_endpoint "Groq API" "GET" "/test/groq"
test_endpoint "Supabase Connection" "GET" "/test/supabase"
test_endpoint "RAG - Simple Salut" "POST" "/test/chat" '{"question": "Salut", "region": "Abidjan"}'
test_endpoint "RAG - Question Maïs" "POST" "/test/chat" '{"question": "Quand planter le maïs?", "region": "Bouaké"}'

# Optional: Weather test
echo -n "Testing OpenWeatherMap (optional)... "
weather_response=$(curl -s "$BASE_URL/test/weather?region=Abidjan")
if echo "$weather_response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  SKIP (not configured)${NC}"
fi
echo ""

echo "================================"
echo "Tests completed!"
echo ""
echo "💡 Tip: To see full responses, use:"
echo "   curl http://localhost:3000/test/chat -X POST -H 'Content-Type: application/json' -d '{\"question\": \"Salut\"}' | jq"
