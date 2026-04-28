#!/bin/bash
# Deploy near-synonym sets to km_arabic_linguistic D1 remote
# Usage: bash deploy.sh [--from N]
set -euo pipefail
CFG=/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/workers/ar-linguistics/wrangler.toml
SQL_DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL=10
FROM=1
if [[ "${1:-}" == "--from" && -n "${2:-}" ]]; then FROM=$2; fi

echo "══ near-synonym deploy: $TOTAL files ══"
for i in $(seq 1 $TOTAL); do
  if [[ $i -lt $FROM ]]; then continue; fi
  FILE="$SQL_DIR/near-synonyms-$(printf '%04d' $i).sql"
  echo -n "  [$i/$TOTAL] $(basename "$FILE")... "
  wrangler d1 execute km_arabic_linguistic --remote --file "$FILE" --config "$CFG" 2>&1 | tail -1
done
echo "Done."
