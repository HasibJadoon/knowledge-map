#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INGEST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$INGEST_DIR/../../.." && pwd)"
WRANGLER_CONFIG="${WRANGLER_CONFIG:-$REPO_ROOT/workers/ar-linguistics/wrangler.toml}"
DB_NAME="${KM_AL_D1_DATABASE_NAME:-km_arabic_linguistic}"
REMOTE_FLAG="${KM_AL_D1_REMOTE:-1}"

REMOTE_ARGS=()
if [[ "$REMOTE_FLAG" != "0" ]]; then
  REMOTE_ARGS+=(--remote)
fi

SCHEMA_STATE="$(wrangler d1 execute "$DB_NAME" --config "$WRANGLER_CONFIG" "${REMOTE_ARGS[@]}" --command "SELECT EXISTS(SELECT 1 FROM pragma_table_info('ar_ling_near_synonym_sets') WHERE name = 'slug') AS sets_slug, EXISTS(SELECT 1 FROM pragma_table_info('ar_ling_near_synonym_members') WHERE name = 'arabic_display') AS members_arabic_display, EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'ar_ling_near_synonym_evidence') AS evidence_table;")"
if [[ "$SCHEMA_STATE" != *'"sets_slug": 1'* || "$SCHEMA_STATE" != *'"members_arabic_display": 1'* || "$SCHEMA_STATE" != *'"evidence_table": 1'* ]]; then
  wrangler d1 execute "$DB_NAME" --config "$WRANGLER_CONFIG" "${REMOTE_ARGS[@]}" --file="$INGEST_DIR/schema/001_near_synonyms_migration.sql"
fi

URDU_SCHEMA_STATE="$(wrangler d1 execute "$DB_NAME" --config "$WRANGLER_CONFIG" "${REMOTE_ARGS[@]}" --command "SELECT EXISTS(SELECT 1 FROM pragma_table_info('ar_ling_near_synonym_sets') WHERE name = 'canonical_ur') AS sets_canonical_ur, EXISTS(SELECT 1 FROM pragma_table_info('ar_ling_near_synonym_members') WHERE name = 'basic_gloss_ur') AS members_basic_gloss_ur;")"
if [[ "$URDU_SCHEMA_STATE" != *'"sets_canonical_ur": 1'* ]]; then
  wrangler d1 execute "$DB_NAME" --config "$WRANGLER_CONFIG" "${REMOTE_ARGS[@]}" --command "ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN canonical_ur TEXT;"
fi

for column in basic_gloss_ur contrast_note_ur usage_rule_ur quran_usage_pattern_ur nuance_note_ur; do
  COLUMN_STATE="$(wrangler d1 execute "$DB_NAME" --config "$WRANGLER_CONFIG" "${REMOTE_ARGS[@]}" --command "SELECT EXISTS(SELECT 1 FROM pragma_table_info('ar_ling_near_synonym_members') WHERE name = '$column') AS column_exists;")"
  if [[ "$COLUMN_STATE" != *'"column_exists": 1'* ]]; then
    wrangler d1 execute "$DB_NAME" --config "$WRANGLER_CONFIG" "${REMOTE_ARGS[@]}" --command "ALTER TABLE ar_ling_near_synonym_members ADD COLUMN $column TEXT;"
  fi
done

wrangler d1 execute "$DB_NAME" --config "$WRANGLER_CONFIG" "${REMOTE_ARGS[@]}" --file="$INGEST_DIR/output/d1_import_near_synonyms.sql"
