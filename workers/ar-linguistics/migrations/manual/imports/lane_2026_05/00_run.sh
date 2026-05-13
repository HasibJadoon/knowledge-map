#!/usr/bin/env bash
# 00_run.sh — orchestrator for the Lane 2026_05 import.
#
# Usage:
#   bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh [phase]
#
# Phases (run them in order; each is idempotent):
#   audit      - drop the unused iraab/tafsir display block tables
#   cleanup    - wipe Lane rows from existing AL tables
#   schema     - create book_pages, blocks, block_links, block_annotations,
#                block_tags, quran_refs, plus indexes on the bridge
#   stage      - run lane_root_stage.py to build local stage.sqlite
#   bundle     - run lane_make_sql_bundle.py to emit the SQL files (this dir)
#   push       - execute all 01..09 SQL files against remote D1
#   validate   - run the validation checks and print JSON
#   all        - run every phase above in order
#
# Pre-reqs:
#   - npx wrangler authenticated against your Cloudflare account
#   - python3 with stdlib only (no extra packages required)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"
AL_CFG="$ROOT/workers/ar-linguistics/wrangler.toml"
DB_NAME="km_arabic_linguistic"

# Load CLOUDFLARE_API_TOKEN from .env if present (safe parse — never sourced)
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -f "$ROOT/.env" ]; then
  cf_token=$(awk -F= '/^CLOUDFLARE_API_TOKEN=/ {
    sub(/^CLOUDFLARE_API_TOKEN=/, "");
    gsub(/^["'"'"']|["'"'"']$/, "");
    gsub(/[[:space:]]+$/, "");
    print; exit
  }' "$ROOT/.env")
  if [ -n "$cf_token" ]; then
    export CLOUDFLARE_API_TOKEN="$cf_token"
    echo "loaded CLOUDFLARE_API_TOKEN from .env (${#cf_token} chars)"
  fi
fi

MANUAL="$ROOT/workers/ar-linguistics/migrations/manual"
BUNDLE_DIR="$MANUAL/imports/lane_2026_05"
LEX_INGEST="$ROOT/km_arabic_linguistic/ingestion/Lexicon"

run_sql() {
  local file="$1"
  echo "==> wrangler d1 execute --remote --file ${file#$ROOT/}"
  npx --no-install wrangler d1 execute "$DB_NAME" --remote \
    --config "$AL_CFG" --file "$file"
}

phase_audit() {
  run_sql "$MANUAL/2026_05_audit_drop_iraab_tafsir.sql"
}

phase_cleanup() {
  # _ops variant omits the compound-SELECT audit queries that exceed D1's
  # remote-execution limit. Run 2026_05_lane_cleanup.sql manually for counts.
  run_sql "$MANUAL/2026_05_lane_cleanup_ops.sql"
}

phase_schema() {
  run_sql "$MANUAL/2026_05_lexicon_book_pages.sql"
  run_sql "$MANUAL/2026_05_lexicon_block_model.sql"
  run_sql "$MANUAL/2026_05_lexicon_quran_refs.sql"
  run_sql "$MANUAL/2026_05_quran_links_indexes.sql"
}

phase_stage() {
  echo "==> python3 lane_root_stage.py"
  cd "$LEX_INGEST"
  python3 scripts/lane_root_stage.py
}

phase_bundle() {
  echo "==> python3 lane_make_sql_bundle.py"
  cd "$LEX_INGEST"
  python3 scripts/lane_make_sql_bundle.py
}

phase_push() {
  echo "==> pushing bundle files in order"
  for f in "$BUNDLE_DIR"/0?_*.sql; do
    [ -f "$f" ] || continue
    run_sql "$f"
  done
}

phase_link() {
  # Fill ar_ling_lexicon_root_entries.root_id from canonical ar_ling_roots.
  run_sql "$MANUAL/2026_05_lane_link_root_id.sql"
}

phase_validate() {
  echo "==> validate"
  npx --no-install wrangler d1 execute "$DB_NAME" --remote \
    --config "$AL_CFG" --json \
    --file "$MANUAL/validate_lane_root_level.sql"
}

phase="${1:-all}"
case "$phase" in
  audit)    phase_audit ;;
  cleanup)  phase_cleanup ;;
  schema)   phase_schema ;;
  stage)    phase_stage ;;
  bundle)   phase_bundle ;;
  push)     phase_push ;;
  link)     phase_link ;;
  validate) phase_validate ;;
  all)
    phase_audit
    phase_cleanup
    phase_schema
    phase_stage
    phase_bundle
    phase_push
    phase_link
    phase_validate
    ;;
  *)
    echo "unknown phase: $phase" >&2
    echo "use one of: audit cleanup schema stage bundle push link validate all" >&2
    exit 2 ;;
esac

echo "phase '$phase' done."
