#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAFSIR_OUT="$ROOT_DIR/km_arabic_linguistic/ingestion/tafsir/output"
SARF_OUT="$ROOT_DIR/km_arabic_linguistic/ingestion/_pipeline/sarf/output"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is required for remote D1 writes." >&2
  exit 1
fi

echo "Pushing Sarf source registry into km_arabic_linguistic..."
for file in "$SARF_OUT"/chunks/sarf-resources-*.sql; do
  echo "  $file"
  npx wrangler d1 execute km_arabic_linguistic \
    --config "$ROOT_DIR/workers/ar-linguistics/wrangler.toml" \
    --remote \
    --file "$file"
done
if compgen -G "$SARF_OUT/ai_chunks/sarf-ai-*.sql" > /dev/null; then
  echo "Pushing Sarf AI enrichment into km_arabic_linguistic..."
  for file in "$SARF_OUT"/ai_chunks/sarf-ai-*.sql; do
    echo "  $file"
    npx wrangler d1 execute km_arabic_linguistic \
      --config "$ROOT_DIR/workers/ar-linguistics/wrangler.toml" \
      --remote \
      --file "$file"
  done
fi

echo "Pushing Tafsir registry and entries into km_quran..."
for file in "$TAFSIR_OUT"/tafsir-import-*.sql; do
  echo "  $file"
  npx wrangler d1 execute km_quran \
    --config "$ROOT_DIR/workers/quran/wrangler.toml" \
    --remote \
    --file "$file"
done

echo "Pushing surface/morphology seed data into km_quran..."
for file in "$ROOT_DIR"/database/seeds/chunks/surface/seed-qr-word-occurrences-*.sql; do
  echo "  $file"
  npx wrangler d1 execute km_quran \
    --config "$ROOT_DIR/workers/quran/wrangler.toml" \
    --remote \
    --file "$file"
done
for file in "$ROOT_DIR"/database/seeds/chunks/surface/backfill-qr-word-occurrences-morphology-tag-json-*.sql; do
  echo "  $file"
  npx wrangler d1 execute km_quran \
    --config "$ROOT_DIR/workers/quran/wrangler.toml" \
    --remote \
    --file "$file"
done

echo "Done."
