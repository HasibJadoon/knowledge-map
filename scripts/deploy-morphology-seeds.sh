#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# K-MAPS  —  Push morphology seed files to remote D1
# Run from repo root:  bash scripts/deploy-morphology-seeds.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SEEDS="$REPO/database/seeds"
MIGRATIONS="$REPO/database/migrations/km-quran"
WR="$REPO/node_modules/.bin/wrangler"

AL_CFG="$REPO/workers/ar-linguistics/wrangler.toml"
QR_CFG="$REPO/workers/quran/wrangler.toml"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   K-MAPS  Morphology Seed Deploy                     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Repo : $REPO"
echo "Seeds: $SEEDS"
echo ""

# ── km_arabic_linguistics ─────────────────────────────────────
echo "━━━ km_arabic_linguistics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "[1/5] ar_ling_roots  (1,642 rows) …"
"$WR" d1 execute km_arabic_linguistic \
  --file="$SEEDS/seed-al-roots.sql" \
  --remote \
  --config="$AL_CFG"
echo "      ✓ done"
echo ""

echo "[2/5] ar_ling_lemmas  (4,817 rows) …"
"$WR" d1 execute km_arabic_linguistic \
  --file="$SEEDS/seed-al-lemmas.sql" \
  --remote \
  --config="$AL_CFG"
echo "      ✓ done"
echo ""

# ── km_quran ──────────────────────────────────────────────────
echo "━━━ km_quran ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "[schema] qr_word_occurrences.morphology_tag_json …"
if "$WR" d1 execute km_quran \
  --command="SELECT morphology_tag_json FROM qr_word_occurrences LIMIT 0;" \
  --remote \
  --config="$QR_CFG" >/dev/null 2>&1; then
  echo "      ✓ already present"
else
  "$WR" d1 execute km_quran \
    --file="$MIGRATIONS/008_word_occurrence_morphology_tag_json.sql" \
    --remote \
    --config="$QR_CFG"
fi
echo "      ✓ done"
echo ""

if ! "$WR" d1 execute km_quran \
  --command="SELECT COUNT(*) AS is_json FROM pragma_table_info('qr_word_occurrences') WHERE name = 'morphology_tag_json' AND upper(type) = 'JSON';" \
  --remote \
  --config="$QR_CFG" | grep -q '"is_json": 1'; then
  echo "[schema] convert morphology_tag_json TEXT → JSON …"
  "$WR" d1 execute km_quran \
    --file="$MIGRATIONS/009_word_occurrence_morphology_tag_json_type.sql" \
    --remote \
    --config="$QR_CFG"
  echo "      ✓ done"
  echo ""
fi

echo "[3/5] qr_word_occurrences  (77,427 rows) …"
"$WR" d1 execute km_quran \
  --file="$SEEDS/seed-qr-word-occurrences.sql" \
  --remote \
  --config="$QR_CFG"
echo "      ✓ done"
echo ""

echo "[4/5] qr_lemmas  (4,817 rows) …"
"$WR" d1 execute km_quran \
  --file="$SEEDS/seed-qr-lemmas.sql" \
  --remote \
  --config="$QR_CFG"
echo "      ✓ done"
echo ""

echo "[5/5] qr_lemma_occurrences  (72,507 rows) …"
"$WR" d1 execute km_quran \
  --file="$SEEDS/seed-qr-lemma-occurrences.sql" \
  --remote \
  --config="$QR_CFG"
echo "      ✓ done"
echo ""

if [ -f "$SEEDS/backfill-qr-word-occurrences-morphology-tag-json.sql" ]; then
  echo "[backfill] qr_word_occurrences.morphology_tag_json …"
  "$WR" d1 execute km_quran \
    --file="$SEEDS/backfill-qr-word-occurrences-morphology-tag-json.sql" \
    --remote \
    --config="$QR_CFG"
  echo "      ✓ done"
  echo ""
fi

# ── Verification queries ──────────────────────────────────────
echo "━━━ Verification ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "ar_ling_roots count:"
"$WR" d1 execute km_arabic_linguistic \
  --command="SELECT COUNT(*) as root_count FROM ar_ling_roots;" \
  --remote --config="$AL_CFG"

echo "ar_ling_lemmas count:"
"$WR" d1 execute km_arabic_linguistic \
  --command="SELECT COUNT(*) as lemma_count FROM ar_ling_lemmas;" \
  --remote --config="$AL_CFG"

echo "qr_word_occurrences count:"
"$WR" d1 execute km_quran \
  --command="SELECT COUNT(*) as word_count FROM qr_word_occurrences;" \
  --remote --config="$QR_CFG"

echo "Sample — Surah Al-Fatiha words:"
"$WR" d1 execute km_quran \
  --command="SELECT surah, ayah, word_index, word_text, root, pos FROM qr_word_occurrences WHERE surah=1 ORDER BY ayah, word_index;" \
  --remote --config="$QR_CFG"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   All seeds deployed successfully.                   ║"
echo "╚══════════════════════════════════════════════════════╝"
