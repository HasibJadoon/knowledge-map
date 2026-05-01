#!/usr/bin/env bash
# Push all near-synonym SQL batches to km_arabic_linguistic D1 (remote)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BATCHES_DIR="$SCRIPT_DIR/sql_batches"
DB_NAME="km_arabic_linguistic"

# Resolve wrangler command
if command -v wrangler &>/dev/null; then
  WR="wrangler"
elif command -v npx &>/dev/null; then
  WR="npx wrangler"
else
  echo "ERROR: wrangler not found. Install with: npm install -g wrangler"
  exit 1
fi

echo "=== Near-synonym D1 push ==="
echo "DB:      $DB_NAME"
echo "Batches: $BATCHES_DIR"
echo "Tool:    $WR"
echo ""

TOTAL=$(ls "$BATCHES_DIR"/batch_*.sql | wc -l | tr -d ' ')
COUNT=0
FAILED=0

for batch in $(ls "$BATCHES_DIR"/batch_*.sql | sort); do
  COUNT=$((COUNT + 1))
  SIZE=$(du -h "$batch" | cut -f1)
  echo -n "[$COUNT/$TOTAL] $(basename $batch) ($SIZE)... "
  if $WR d1 execute "$DB_NAME" --remote --file "$batch" > /tmp/d1_last_batch.log 2>&1; then
    echo "OK"
  else
    echo "FAILED"
    cat /tmp/d1_last_batch.log
    FAILED=$((FAILED + 1))
    # Continue on error rather than aborting
  fi
done

echo ""
echo "=== Done: $COUNT batches processed, $FAILED failed ==="
if [ "$FAILED" -eq 0 ]; then
  echo "All batches pushed successfully."
else
  echo "Some batches failed — check output above."
fi
