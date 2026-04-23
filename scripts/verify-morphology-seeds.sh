#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# K-MAPS  —  Verify morphology seed data in remote D1
# Run from repo root:  bash scripts/verify-morphology-seeds.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

WR="$(pwd)/node_modules/.bin/wrangler"
AL_CFG="workers/ar-linguistics/wrangler.toml"
QR_CFG="workers/quran/wrangler.toml"

run_al() { "$WR" d1 execute km_arabic_linguistic --command="$1" --remote --config="$AL_CFG"; }
run_qr() { "$WR" d1 execute km_quran            --command="$1" --remote --config="$QR_CFG"; }

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   K-MAPS  Morphology Verification                    ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── km_arabic_linguistics ─────────────────────────────────────
echo ""
echo "━━━ km_arabic_linguistic ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "[1] Row counts"
run_al "SELECT 'ar_ling_roots' as tbl, COUNT(*) as n FROM ar_ling_roots
        UNION ALL
        SELECT 'ar_ling_lemmas', COUNT(*) FROM ar_ling_lemmas;"

echo "[2] Weak-pattern distribution"
run_al "SELECT weak_pattern, COUNT(*) as n FROM ar_ling_roots GROUP BY weak_pattern ORDER BY n DESC;"

echo "[3] POS distribution for lemmas"
run_al "SELECT part_of_speech, COUNT(*) as n FROM ar_ling_lemmas GROUP BY part_of_speech ORDER BY n DESC;"

echo "[4] Lemmas with no root (particles/pronouns — expected ~177)"
run_al "SELECT COUNT(*) as null_root_lemmas FROM ar_ling_lemmas WHERE root_id IS NULL;"

echo "[5] Sample roots — high frequency"
run_al "SELECT root_text, weak_pattern, frequency_quran FROM ar_ling_roots ORDER BY frequency_quran DESC LIMIT 10;"

echo "[6] Sample lemma cross-ref — قال"
run_al "SELECT l.lemma_text, l.part_of_speech, l.frequency_quran, r.root_text
        FROM ar_ling_lemmas l
        LEFT JOIN ar_ling_roots r ON r.id = l.root_id
        WHERE r.root_text = 'قول'
        LIMIT 5;"

# ── km_quran ──────────────────────────────────────────────────
echo ""
echo "━━━ km_quran ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "[7] Row counts"
run_qr "SELECT 'qr_word_occurrences' as tbl, COUNT(*) as n FROM qr_word_occurrences
        UNION ALL
        SELECT 'qr_lemmas', COUNT(*) FROM qr_lemmas
        UNION ALL
        SELECT 'qr_lemma_occurrences', COUNT(*) FROM qr_lemma_occurrences;"

echo "[8] Surah Al-Fatiha (1) — all words"
run_qr "SELECT ayah, word_index, word_text, root, lemma, pos
        FROM qr_word_occurrences WHERE surah=1 ORDER BY ayah, word_index;"

echo "[9] Surah Al-Ikhlas (112) — all words"
run_qr "SELECT ayah, word_index, word_text, root, lemma, pos
        FROM qr_word_occurrences WHERE surah=112 ORDER BY ayah, word_index;"

echo "[10] Top 10 most frequent roots in Quran"
run_qr "SELECT root, COUNT(*) as n FROM qr_word_occurrences
        WHERE root IS NOT NULL GROUP BY root ORDER BY n DESC LIMIT 10;"

echo "[11] Top 10 most frequent lemmas"
run_qr "SELECT lemma_text, total_occurrences FROM qr_lemmas
        ORDER BY total_occurrences DESC LIMIT 10;"

echo "[12] POS distribution across all Quran words"
run_qr "SELECT pos, COUNT(*) as n FROM qr_word_occurrences
        WHERE pos IS NOT NULL GROUP BY pos ORDER BY n DESC LIMIT 15;"

echo "[13] FK integrity — lemma_occurrences with missing lemma_id"
run_qr "SELECT COUNT(*) as broken_lemma_fk
        FROM qr_lemma_occurrences lo
        LEFT JOIN qr_lemmas ql ON ql.id = lo.lemma_id
        WHERE ql.id IS NULL;"

echo "[14] FK integrity — lemma_occurrences with missing word_occurrence_id"
run_qr "SELECT COUNT(*) as broken_wo_fk
        FROM qr_lemma_occurrences lo
        LEFT JOIN qr_word_occurrences wo ON wo.id = lo.word_occurrence_id
        WHERE wo.id IS NULL;"

echo "[15] Sample — lemma occurrences for الله"
run_qr "SELECT lo.surah, lo.ayah, lo.word_index, wo.word_text
        FROM qr_lemma_occurrences lo
        JOIN qr_lemmas ql ON ql.id = lo.lemma_id
        JOIN qr_word_occurrences wo ON wo.id = lo.word_occurrence_id
        WHERE ql.lemma_text = 'اللَّه'
        ORDER BY lo.surah, lo.ayah LIMIT 10;"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Verification complete.                             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
