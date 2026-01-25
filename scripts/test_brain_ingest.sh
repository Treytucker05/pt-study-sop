#!/bin/bash
# Test brain ingest endpoint
# Usage: bash scripts/test_brain_ingest.sh
# Set BASE_URL env var to test against different servers

BASE_URL="${BASE_URL:-http://localhost:5000}"

echo "=== Test 1: Empty content ==="
curl -s -X POST "$BASE_URL/api/brain/ingest" \
  -H "Content-Type: application/json" \
  -d '{"content": "", "filename": "test.md"}' | jq .

echo ""
echo "=== Test 2: Non-WRAP content ==="
curl -s -X POST "$BASE_URL/api/brain/ingest" \
  -H "Content-Type: application/json" \
  -d '{"content": "just plain text without any WRAP markers", "filename": "test.md"}' | jq .

echo ""
echo "=== Test 3: Valid WRAP ==="
# Note: is_wrap_format() uses scoring system - needs patterns like:
# - "Section A/B/C/D" headers (+2), "A: " markers (+2), "### A)" style (+2)
# - front:/back: for cards (+2), "WRAP" keyword (+1), ```json (+1)
# Score >= 2 required to pass
curl -s -X POST "$BASE_URL/api/brain/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "WRAP Session\n\nSection A: Obsidian Notes\nTest notes about anatomy\n\nSection B: Anki Cards\nfront: What is the origin of biceps?\nback: Supraglenoid tubercle\n\nSection C: Spaced Schedule\nR1=tomorrow\nR2=3d\n\nSection D: JSON Logs\n```json\n{\"merged\": {\"topic\": \"Anatomy\", \"mode\": \"Core\"}}\n```",
    "filename": "test_wrap.md"
  }' | jq .

echo ""
echo "=== Done ==="
