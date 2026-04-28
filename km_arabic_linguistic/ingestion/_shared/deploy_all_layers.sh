#!/usr/bin/env bash
# Deploy all 3 layers (sarf/irab/balagha) to Cloudflare D1.
#
# Order:
#   1. Migrations 005, 006, 007 (staging + irab + balagha schemas)
#   2. Source registrations for all new sources
#   3. Source chunks SQL (per layer)
#   4. LLM claim SQL (per layer)
#
# Run from anywhere; uses absolute paths.

set -e

ROOT="/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map"
ING="$ROOT/km_arabic_linguistic/ingestion"
AL_CONFIG="$ROOT/workers/ar-linguistics/wrangler.toml"

DRY_RUN=${DRY_RUN:-0}
deploy() {
    if [ "$DRY_RUN" = "1" ]; then
        echo "  [DRY] would run: wrangler d1 execute km_arabic_linguistics --remote --file=$1"
    else
        wrangler d1 execute km_arabic_linguistics --remote \
            --file="$1" --config "$AL_CONFIG"
    fi
}

echo "=== [1/6] Apply migrations ==="
if [ "$DRY_RUN" = "1" ]; then
    echo "  [DRY] would run: wrangler d1 migrations apply km_arabic_linguistics --remote"
else
    wrangler d1 migrations apply km_arabic_linguistics --remote --config "$AL_CONFIG" \
        || echo "  WARN: migrations may already be applied"
fi

echo ""
echo "=== [2/6] Sarf SQL (existing) ==="
deploy "$ING/_pipeline/sarf/kmaps-sarf/data/staging/chunks/tafsirs_sources.sql"
for f in "$ING/_pipeline/sarf/kmaps-sarf/data/staging/chunks/tafsir_sql"/tafsir-chunks-*.sql; do
    echo "  → $(basename "$f")"; deploy "$f"
done
LEX_SRC="$ING/_pipeline/sarf/kmaps-sarf/data/staging/chunks/lexicons_sources.sql"
[ -f "$LEX_SRC" ] && deploy "$LEX_SRC"
for f in "$ING/_pipeline/sarf/kmaps-sarf/data/staging/chunks/lexicon_sql"/lexicon-chunks-*.sql; do
    [ -f "$f" ] || continue
    echo "  → $(basename "$f")"; deploy "$f"
done

echo ""
echo "=== [3/6] Existing PDF/DOCX sources + chunks ==="
LEGACY="$ING/_pipeline/sarf/output"
[ -f "$LEGACY/sarf_resources_import.sql" ] && deploy "$LEGACY/sarf_resources_import.sql"
for f in "$LEGACY/chunks"/sarf-resources-*.sql; do
    [ -f "$f" ] || continue
    echo "  → $(basename "$f")"; deploy "$f"
done

echo ""
echo "=== [4/6] Irab sources + chunks (Tibyan + Itqan) ==="
IRAB_SRC_SQL="$ING/_pipeline/irab/kmaps-irab/data/staging/chunks/irab_sources.sql"
if [ -f "$IRAB_SRC_SQL" ]; then
    deploy "$IRAB_SRC_SQL"
fi
for f in "$ING/_pipeline/irab/kmaps-irab/data/staging/chunks/irab_sql"/irab-chunks-*.sql; do
    [ -f "$f" ] || continue
    echo "  → $(basename "$f")"; deploy "$f"
done

echo ""
echo "=== [5/6] Balagha sources + chunks ==="
BAL_SRC_SQL="$ING/_pipeline/balagha/kmaps-balagha/data/staging/chunks/balagha_sources.sql"
if [ -f "$BAL_SRC_SQL" ]; then
    deploy "$BAL_SRC_SQL"
fi
for f in "$ING/_pipeline/balagha/kmaps-balagha/data/staging/chunks/balagha_sql"/balagha-chunks-*.sql; do
    [ -f "$f" ] || continue
    echo "  → $(basename "$f")"; deploy "$f"
done

echo ""
echo "=== [6/6] LLM claim SQL (sarf + irab + balagha) ==="
for layer_dir in "$ING/_pipeline/sarf/kmaps-sarf" "$ING/_pipeline/irab/kmaps-irab" "$ING/_pipeline/balagha/kmaps-balagha"; do
    layer=$(basename "$layer_dir" | sed 's/kmaps-//')
    SQL_DIR="$layer_dir/data/staging/claims/sql"
    if [ -d "$SQL_DIR" ]; then
        for f in "$SQL_DIR"/${layer}-claims*.sql "$SQL_DIR"/sarf-claims*.sql; do
            [ -f "$f" ] || continue
            echo "  → ${layer}/$(basename "$f")"; deploy "$f"
        done
    fi
done

echo ""
echo "=== Deploy complete ==="
