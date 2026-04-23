# Quran Data Architecture

This document summarizes how the Quran dataset is stored, where it comes from, and how to rebuild or extend it using the new single-source design.

## Tables

-- `ar_quran_surahs` – registry of each surah with Arabic/English names, ayah count, and `meta_json` holding discovery data (`nameSimple`, revelation order/place, `description`, `shortText`, etc.).
-- `ar_quran_ayah` – the single source-of-truth for every verse. It stores Uthmani text plus simplified/normalized variants, derived counts, verse markers, and optional surah names for quick UI joins.
-- `ar_quran_surah_ayah_meta` – the enrichment layer that keeps themes, keyword lists, and matching metadata linked by `surah_ayah`. JSON columns (`theme_json`, `matching_json`, `extra_json`) are validated per-row.

All three tables can be regenerated from the raw sources listed below. The shell script `scripts/gen-quran-text-seed.js` loads those sources, enriches the base records with normalized text plus surah metadata, and writes out the `database/seeds/seed-*.sql` files that are applied to D1.

## Data sources

1. `database/data/tarteel.ai/quran-meta/quran_text_inserts.sql` – base diacritic text with verse metadata.
2. `database/data/tarteel.ai/quran-meta/quran-simple-clean.sql` – simplified (non-diacritic) text.
3. `database/data/tarteel.ai/quran-meta/quran-metadata-ayah.sqlite` – supplemental verse text and counts.
4. `database/data/tarteel.ai/quran-meta/quran-metadata-surah-name.sqlite` plus `surah-info-en.db` – surah names, revelation data, descriptions, and `short_text` summaries.
5. `database/data/tarteel.ai/quran-meta/quran-metadata-juz.sqlite`, `quran-metadata-hizb.sqlite`, `quran-metadata-ruku.sqlite` – partition maps used to populate the `juz`, `hizb`, and `ruku` columns.
6. `database/data/tarteel.ai/quran-meta/ayah-themes.db` and `matching-ayah.db` – thematic metadata and similarity links that feed `ar_quran_surah_ayah_meta.theme_json` and `matching_json`.

## Ingestion flow

1. Run `node scripts/gen-quran-text-seed.js`. It:
   - builds a temporary SQLite database by running the raw insert SQL,
   - reads the supplemental datasets listed above (e.g., metadata SQLite files, JSON partitions, theme/matching DBs),
   - normalizes/merges text variants and adds derived columns (normalized text, diacritics vs non-diacritics, verse_full, surah/ayah keys, `juz/hizb/ruku`, thematics/match maps),
   - writes the `database/seeds/seed-ar_quran_surahs.sql`, `seed-ar_quran_ayah.sql`, and `seed-ar_quran_surah_ayah_meta.sql` files (without explicit SQL transactions so they can be applied to D1 via `wrangler d1 execute`).
2. Apply `database/migrations/2026-02-02_refine_quran_tables.sql` to recreate the schema if needed.
3. Run the three generated seed files against the D1 database (`npx wrangler d1 execute DB --remote --file ...`).

## Notes

- `ar_quran_text.text_diacritics` preserves the original script while `text_non_diacritics` carries the simplified spelling. `text_normalized` removes tashkeel and collapses whitespace so token matching is faster.
- Every verse now references surah metadata (`surah_short_text`, `surah_name_en`, `verse_full`) to avoid joining external tables for UI summaries.
- `ar_quran_surah_ayah_meta.extra_json` currently holds counts for themes and matching, enabling ranking (pinning) in the future.
- Regeneration is deterministic: rerun the script whenever any raw data file changes, then redeploy the migrations and seed files.

Use `wrangler d1 execute ... --remote` to push the result; the remote D1 instance now contains all 6,236 verses plus 114 surahs and themed ayah records.
