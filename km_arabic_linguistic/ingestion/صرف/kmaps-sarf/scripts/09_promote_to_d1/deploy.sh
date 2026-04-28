#!/usr/bin/env bash
# Step 09: Deploy all generated SQL to Cloudflare D1.
#
# Run from the repo root: km_arabic_linguistic/ingestion/صرف/kmaps-sarf/
# Requires CLOUDFLARE_API_TOKEN or a logged-in wrangler session.
#
# Order:
#   1. AL migration 004 (sarf tables)
#   2. Tafsir source registrations
#   3. Tafsir chunk SQL (75 files)
#   4. Existing PDF/DOCX sources + chunks (sarf_resources_import.sql, sarf-resources-001/002.sql)
#   5. Hawramani lexicon sources + chunks (from merge_lexicons.py)
#   6. LLM claim SQL (data/staging/claims/sql/*.sql)

set -e

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo "/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map")"
AL_CONFIG="$REPO_ROOT/workers/ar-linguistics/wrangler.toml"
KMAPS_SARF="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== [1/6] AL Migration 004: sarf tables ==="
wrangler d1 migrations apply km_arabic_linguistics --remote \
  --config "$AL_CONFIG" || echo "WARN: migration may already be applied"

echo ""
echo "=== [2/6] Tafsir source registrations ==="
wrangler d1 execute km_arabic_linguistics --remote \
  --file="$KMAPS_SARF/data/staging/chunks/tafsirs_sources.sql" \
  --config "$AL_CONFIG"

echo ""
echo "=== [3/6] Tafsir chunks (75 SQL files) ==="
for f in "$KMAPS_SARF/data/staging/chunks/tafsir_sql"/tafsir-chunks-*.sql; do
  echo "  → $(basename "$f")"
  wrangler d1 execute km_arabic_linguistics --remote \
    --file="$f" --config "$AL_CONFIG"
done

echo ""
echo "=== [4/6] Existing PDF/DOCX sources + chunks ==="
LEGACY_OUT="$KMAPS_SARF/../output"
wrangler d1 execute km_arabic_linguistics --remote \
  --file="$LEGACY_OUT/sarf_resources_import.sql" \
  --config "$AL_CONFIG"
for f in "$LEGACY_OUT/chunks"/sarf-resources-*.sql; do
  echo "  → $(basename "$f")"
  wrangler d1 execute km_arabic_linguistics --remote \
    --file="$f" --config "$AL_CONFIG"
done

echo ""
echo "=== [5/5] Hawramani lexicon sources + chunks ==="
LEX_SRC="$KMAPS_SARF/data/staging/chunks/lexicons_sources.sql"
if [ -f "$LEX_SRC" ]; then
  echo "  → lexicons_sources.sql"
  wrangler d1 execute km_arabic_linguistics --remote \
    --file="$LEX_SRC" --config "$AL_CONFIG"
  for f in "$KMAPS_SARF/data/staging/chunks/lexicon_sql"/lexicon-chunks-*.sql; do
    [ -f "$f" ] || continue
    echo "  → $(basename "$f")"
    wrangler d1 execute km_arabic_linguistics --remote \
      --file="$f" --config "$AL_CONFIG"
  done
else
  echo "  No lexicon SQL yet (run scrape_hawramani.py --book all, then merge_lexicons.py)"
fi

echo ""
echo "=== [6/6] LLM claim SQL ==="
CLAIM_SQL="$KMAPS_SARF/data/staging/claims/sql"
if [ -d "$CLAIM_SQL" ]; then
  for f in "$CLAIM_SQL"/sarf-claims-*.sql; do
    [ -f "$f" ] || continue
    echo "  → $(basename "$f")"
    wrangler d1 execute km_arabic_linguistics --remote \
      --file="$f" --config "$AL_CONFIG"
  done
else
  echo "  No claim SQL yet (run extract_claims.py first)"
fi

echo ""
echo "=== Deploy complete ==="
