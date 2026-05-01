#!/bin/bash
cd /Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map

echo "=== Near-synonym D1 push ==="
echo "Trying Cloudflare HTTP API (reads wrangler login token automatically)..."
echo ""

python3 km_arabic_linguistic/ingestion/near_synonyms/output/push_via_api.py 2>&1 | tee /tmp/d1_push_progress.log

echo ""
echo "=== Done. Press any key to close ==="
read -n 1
