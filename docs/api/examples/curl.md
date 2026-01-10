# curl Examples

Complete curl command examples for testing the Wouri Bot Admin API.

---

## Setup

### Environment Variables

```bash
# Set your API key
export ADMIN_API_KEY="your_admin_api_key_here"
export API_BASE_URL="https://wouribot-backend.onrender.com"
```

### Base curl Command

```bash
curl -X GET "${API_BASE_URL}/endpoint" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json"
```

---

## Conversations

### List Conversations

```bash
# Get recent conversations (default: 50)
curl -X GET "${API_BASE_URL}/admin/conversations" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# With limit
curl -X GET "${API_BASE_URL}/admin/conversations?limit=20" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Filter by language
curl -X GET "${API_BASE_URL}/admin/conversations?language=fr&limit=20" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Filter by user (WhatsApp ID)
curl -X GET "${API_BASE_URL}/admin/conversations?wa_id=1234567890" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# With pagination cursor
curl -X GET "${API_BASE_URL}/admin/conversations?limit=50&cursor=660e8400-e29b-41d4-a716-446655440000" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Multiple filters
curl -X GET "${API_BASE_URL}/admin/conversations?language=fr&wa_id=1234567890&limit=100" \
  -H "x-admin-key: ${ADMIN_API_KEY}"
```

### Get Conversation Details

```bash
# Get conversation with feedback
curl -X GET "${API_BASE_URL}/admin/conversations/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-admin-key: ${ADMIN_API_KEY}"
```

### Pretty Print JSON Output

```bash
# Use jq for pretty output (install: brew install jq)
curl -X GET "${API_BASE_URL}/admin/conversations?limit=5" \
  -H "x-admin-key: ${ADMIN_API_KEY}" | jq .

# Extract specific fields
curl -X GET "${API_BASE_URL}/admin/conversations?limit=10" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.conversations[] | {id, user_message, average_rating}'
```

---

## Feedback

### Submit Feedback

```bash
# Submit with rating and comment
curl -X POST "${API_BASE_URL}/admin/feedback" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 5,
    "comment": "Excellent advice on maize planting periods!",
    "embed_immediately": true
  }'

# Submit rating only
curl -X POST "${API_BASE_URL}/admin/feedback" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 4
  }'

# Submit without immediate embedding
curl -X POST "${API_BASE_URL}/admin/feedback" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 5,
    "comment": "Great response!",
    "embed_immediately": false
  }'
```

### List Feedback

```bash
# Get all feedback
curl -X GET "${API_BASE_URL}/admin/feedback?limit=100" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Filter by minimum rating
curl -X GET "${API_BASE_URL}/admin/feedback?min_rating=4&limit=50" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Filter by user (WhatsApp ID)
curl -X GET "${API_BASE_URL}/admin/feedback?wa_id=1234567890" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# High-rated feedback only
curl -X GET "${API_BASE_URL}/admin/feedback?min_rating=5&limit=20" \
  -H "x-admin-key: ${ADMIN_API_KEY}"
```

### Batch Submit Feedback (Shell Script)

```bash
#!/bin/bash

# feedback-batch.sh
FEEDBACK_LIST=(
  '{"conversation_id":"conv-1","rating":5,"comment":"Excellent!"}'
  '{"conversation_id":"conv-2","rating":4,"comment":"Very helpful."}'
  '{"conversation_id":"conv-3","rating":3,"comment":"Needs improvement."}'
)

for feedback in "${FEEDBACK_LIST[@]}"; do
  echo "Submitting feedback: $feedback"
  curl -X POST "${API_BASE_URL}/admin/feedback" \
    -H "x-admin-key: ${ADMIN_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$feedback"
  echo ""
  sleep 0.1  # Small delay to avoid rate limiting
done
```

---

## Knowledge Base

### Add Document

```bash
# Add document with full metadata
curl -X POST "${API_BASE_URL}/admin/knowledge" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Le manioc nécessite un sol bien drainé et une température entre 25-29°C. La plantation se fait avec des boutures de 20-25cm.",
    "metadata": {
      "source": "Ministère de l'\''Agriculture - Guide Manioc 2025",
      "page": 15,
      "region": "Bouaké",
      "category": "plantation",
      "crop": "manioc",
      "language": "fr",
      "verified": true
    }
  }'

# Add document with minimal metadata
curl -X POST "${API_BASE_URL}/admin/knowledge" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Le maïs se plante entre avril et juin pendant la saison des pluies.",
    "metadata": {
      "source": "Guide Maïs 2025"
    }
  }'
```

### Search Knowledge Base

```bash
# Basic search
curl -X GET "${API_BASE_URL}/admin/knowledge?query=plantation%20manioc&limit=5" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Region-specific search
curl -X GET "${API_BASE_URL}/admin/knowledge?query=maïs&region=Bouaké&limit=10" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Search with URL encoding (for spaces and special chars)
QUERY=$(echo "Quand planter le maïs?" | jq -sRr @uri)
curl -X GET "${API_BASE_URL}/admin/knowledge?query=${QUERY}&limit=5" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Pretty print results with similarity scores
curl -X GET "${API_BASE_URL}/admin/knowledge?query=manioc&limit=10" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.results[] | {similarity, content: .content[0:100], source: .metadata.source}'
```

### Bulk Import Documents (Shell Script)

```bash
#!/bin/bash

# documents-import.sh
cat > documents.json << 'EOF'
[
  {
    "content": "Le maïs se plante entre avril et juin...",
    "metadata": {
      "source": "Guide Maïs 2025",
      "region": "Bouaké",
      "category": "plantation",
      "crop": "maïs"
    }
  },
  {
    "content": "Le cacao nécessite de l'ombre...",
    "metadata": {
      "source": "Guide Cacao 2025",
      "region": "Daloa",
      "category": "plantation",
      "crop": "cacao"
    }
  }
]
EOF

# Import each document
jq -c '.[]' documents.json | while read doc; do
  echo "Adding document..."
  curl -X POST "${API_BASE_URL}/admin/knowledge" \
    -H "x-admin-key: ${ADMIN_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$doc"
  echo ""
  sleep 0.1
done
```

---

## Translations

### Add Translation

```bash
# Add French to Dioula translation
curl -X POST "${API_BASE_URL}/admin/translations" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "maïs",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "kaba",
    "context": "crop name",
    "verified": true
  }'

# Add with question/answer format
curl -X POST "${API_BASE_URL}/admin/translations" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "Quand planter le maïs?",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "Kaba suman ka sɔrɔ?",
    "context": "agriculture question",
    "verified": true
  }'

# Add unverified translation (needs review)
curl -X POST "${API_BASE_URL}/admin/translations" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "cacao",
    "source_language": "fr",
    "target_language": "baoulé",
    "translated_text": "kakao",
    "context": "crop",
    "verified": false
  }'
```

### Search Translations

```bash
# Full-text search
curl -X GET "${API_BASE_URL}/admin/translations?query=maïs&limit=10" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Get all French to Dioula translations
curl -X GET "${API_BASE_URL}/admin/translations?source_language=fr&target_language=dioula&limit=100" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Get verified translations only
curl -X GET "${API_BASE_URL}/admin/translations?verified_only=true&limit=50" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Combined filters
curl -X GET "${API_BASE_URL}/admin/translations?source_language=fr&target_language=dioula&verified_only=true&limit=100" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Pretty print with jq
curl -X GET "${API_BASE_URL}/admin/translations?query=maïs" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.translations[] | {source: .source_text, target: .translated_text, verified: .verified}'
```

### Bulk Import Translations (Shell Script)

```bash
#!/bin/bash

# translations-import.sh
cat > translations.json << 'EOF'
[
  {
    "source_text": "maïs",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "kaba",
    "context": "crop",
    "verified": true
  },
  {
    "source_text": "manioc",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "banan",
    "context": "crop",
    "verified": true
  },
  {
    "source_text": "cacao",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "kakao",
    "context": "crop",
    "verified": true
  }
]
EOF

# Import each translation
jq -c '.[]' translations.json | while read trans; do
  echo "Adding translation..."
  curl -X POST "${API_BASE_URL}/admin/translations" \
    -H "x-admin-key: ${ADMIN_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$trans"
  echo ""
  sleep 0.1
done
```

---

## Monitoring

### Check Service Status

```bash
# Get service health status
curl -X GET "${API_BASE_URL}/admin/monitoring" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# Pretty print with jq
curl -X GET "${API_BASE_URL}/admin/monitoring" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq .

# Check specific service status
curl -X GET "${API_BASE_URL}/admin/monitoring" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.services.supabase'

# List unhealthy services
curl -X GET "${API_BASE_URL}/admin/monitoring" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.services | to_entries | .[] | select(.value.status != "healthy") | {service: .key, error: .value.error_message}'

# Display latencies
curl -X GET "${API_BASE_URL}/admin/monitoring" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.services | to_entries | .[] | {service: .key, latency_ms: .value.latency_ms}'
```

### Continuous Monitoring (Shell Script)

```bash
#!/bin/bash

# monitor.sh - Poll monitoring endpoint every 30 seconds
while true; do
  echo "Checking services... $(date)"

  # Check status
  STATUS=$(curl -s -X GET "${API_BASE_URL}/admin/monitoring" \
    -H "x-admin-key: ${ADMIN_API_KEY}")

  # Count unhealthy services
  UNHEALTHY=$(echo "$STATUS" | jq '.services | to_entries | .[] | select(.value.status != "healthy") | .key' | wc -l)

  if [ "$UNHEALTHY" -eq 0 ]; then
    echo "✅ All services healthy"
  else
    echo "⚠️ $UNHEALTHY service(s) unhealthy:"
    echo "$STATUS" | jq '.services | to_entries | .[] | select(.value.status != "healthy") | {service: .key, error: .value.error_message}'
  fi

  echo ""
  sleep 30
done
```

---

## Error Handling

### Test Error Responses

```bash
# 401 Unauthorized (missing API key)
curl -X GET "${API_BASE_URL}/admin/conversations"

# 403 Forbidden (invalid API key)
curl -X GET "${API_BASE_URL}/admin/conversations" \
  -H "x-admin-key: invalid_key"

# 404 Not Found (conversation doesn't exist)
curl -X GET "${API_BASE_URL}/admin/conversations/00000000-0000-0000-0000-000000000000" \
  -H "x-admin-key: ${ADMIN_API_KEY}"

# 400 Bad Request (invalid rating)
curl -X POST "${API_BASE_URL}/admin/feedback" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "rating": 10
  }'

# 409 Conflict (duplicate translation)
curl -X POST "${API_BASE_URL}/admin/translations" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "source_text": "maïs",
    "source_language": "fr",
    "target_language": "dioula",
    "translated_text": "kaba"
  }'
# Run twice to trigger 409
```

---

## Performance Testing

### Load Test with curl

```bash
#!/bin/bash

# load-test.sh - Send 100 concurrent requests
NUM_REQUESTS=100

echo "Sending $NUM_REQUESTS requests..."

for i in $(seq 1 $NUM_REQUESTS); do
  curl -s -X GET "${API_BASE_URL}/admin/conversations?limit=10" \
    -H "x-admin-key: ${ADMIN_API_KEY}" \
    -o /dev/null \
    -w "Request $i: %{http_code} - %{time_total}s\n" &
done

wait
echo "Done!"
```

### Measure Response Time

```bash
# Single request timing
curl -X GET "${API_BASE_URL}/admin/conversations?limit=10" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -o /dev/null \
  -w "Status: %{http_code}\nTime: %{time_total}s\n"

# Detailed timing
curl -X GET "${API_BASE_URL}/admin/conversations" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -o /dev/null \
  -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nStart Transfer: %{time_starttransfer}s\nTotal: %{time_total}s\n"
```

---

## Helper Scripts

### Save Response to File

```bash
# Save JSON response
curl -X GET "${API_BASE_URL}/admin/conversations?limit=100" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  -o conversations.json

# Pretty save with jq
curl -X GET "${API_BASE_URL}/admin/conversations?limit=100" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq . > conversations-pretty.json
```

### Extract CSV from JSON

```bash
# Export conversations to CSV
curl -X GET "${API_BASE_URL}/admin/conversations?limit=1000" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq -r '.conversations[] | [.id, .wa_id, .language, .average_rating, .created_at] | @csv' \
  > conversations.csv
```

### Complete Test Suite

```bash
#!/bin/bash

# test-suite.sh - Complete API test
echo "Testing Wouri Bot Admin API..."

# 1. Test monitoring
echo "1. Testing monitoring..."
curl -s -X GET "${API_BASE_URL}/admin/monitoring" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.services | keys'

# 2. Test conversations
echo "2. Testing conversations..."
CONV_COUNT=$(curl -s -X GET "${API_BASE_URL}/admin/conversations?limit=1" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.total')
echo "Found $CONV_COUNT conversations"

# 3. Test feedback
echo "3. Testing feedback..."
FB_COUNT=$(curl -s -X GET "${API_BASE_URL}/admin/feedback?limit=1000" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.feedback | length')
echo "Found $FB_COUNT feedback entries"

# 4. Test knowledge
echo "4. Testing knowledge search..."
RESULTS=$(curl -s -X GET "${API_BASE_URL}/admin/knowledge?query=maïs&limit=5" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.results | length')
echo "Found $RESULTS documents"

# 5. Test translations
echo "5. Testing translations..."
TRANS_COUNT=$(curl -s -X GET "${API_BASE_URL}/admin/translations?limit=1000" \
  -H "x-admin-key: ${ADMIN_API_KEY}" \
  | jq '.translations | length')
echo "Found $TRANS_COUNT translations"

echo "✅ All tests completed!"
```

---

## Tips and Best Practices

### Use Environment Variables

```bash
# .env file
export ADMIN_API_KEY="your_key_here"
export API_BASE_URL="https://wouribot-backend.onrender.com"

# Load in shell
source .env
```

### Pretty Print JSON

```bash
# Install jq
brew install jq  # macOS
apt-get install jq  # Ubuntu/Debian

# Use jq for formatting
curl ... | jq .
```

### Handle Large Responses

```bash
# Use pagination
curl ... | jq '.conversations | length'  # Check count
curl ... | jq '.nextCursor'  # Get next cursor
```

### Debug with Verbose Output

```bash
# Show request/response headers
curl -v -X GET "${API_BASE_URL}/admin/conversations" \
  -H "x-admin-key: ${ADMIN_API_KEY}"
```

### Save curl Commands as Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias wb-conversations='curl -X GET "${API_BASE_URL}/admin/conversations" -H "x-admin-key: ${ADMIN_API_KEY}" | jq .'
alias wb-monitoring='curl -X GET "${API_BASE_URL}/admin/monitoring" -H "x-admin-key: ${ADMIN_API_KEY}" | jq .'

# Usage
wb-conversations
wb-monitoring
```
