# Lane 2026-05 root-level import

Single-batch import that promotes Lane's *Arabic-English Lexicon* into the
root-level lexicon model with a Notion/Logseq-style block layer.

## What this directory contains

- `00_run.sh` — orchestrator (idempotent, per-phase invocation).
- `01_root_entries.sql` … `09_root_entry_sources.sql` — **generated** by
  `lane_make_sql_bundle.py`. Each file is a `BEGIN/COMMIT` block of
  `INSERT OR REPLACE` / `INSERT OR IGNORE` statements. Safe to re-run.
- `manifest.json` — generated alongside the bundle; records row counts and
  generation timestamp.

## End-to-end flow

```
sources/lane/lane/lexicon.sqlite          ┐
sources/lane/quranic_research/raw_html/   │  Phase A
sources/lane/quranic_research/raw_json/   │ (local)
sources/lane/quranic_research/clean_text/ ┘
                ↓ lane_root_stage.py
sources/lane/stage.sqlite                 (idempotent staging DB)
                ↓ lane_make_sql_bundle.py
this directory's 01..09 SQL files         (D1-runnable bundle)
                ↓ wrangler d1 execute --file
remote km_arabic_linguistic D1            (live)
                ↓ validate_lane_root_level.sql
audit JSON                                (checks A..L)
```

## Commands

Recommended: run phase by phase the first time so you can inspect output.

```bash
cd <repo root>

# 1. Audit: drop the unused iraab/tafsir display block tables in AL
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh audit

# 2. Cleanup: wipe Lane rows from the mixed legacy tables in AL
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh cleanup

# 3. Schema: create the new tables (book_pages, blocks, links, tags,
#    annotations, quran_refs) + bridge indexes
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh schema

# 4. Stage: build sources/lane/stage.sqlite from SQLite + HTML
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh stage

# 5. Bundle: emit 01..09 SQL files in this directory
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh bundle

# 6. Push: send the bundle to remote D1 (this is the long step)
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh push

# 7. Validate
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh validate
```

Or run everything at once after a sanity-check of phases 1–4:

```bash
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh all
```

## What each generated file does

| File | Target table | Rows | Notes |
|---|---|---|---|
| `01_root_entries.sql` | `ar_ling_lexicon_root_entries` | ~5,085 | One row per Lane root |
| `02_entry_sections_NNNN.sql` | `ar_ling_lexicon_entry_sections` | ~47,919 | One row per SQLite `entry`; ~500 rows per file |
| `03_book_pages.sql` | `ar_ling_lexicon_book_pages` | ~5,078 | One row per quranic_research HTML page; `clean_text` inline, `r2_key` references R2 |
| `04_blocks_NNNN.sql` | `ar_ling_lexicon_blocks` | ~1.3 M | Notion-style block tree; ~500 rows per file |
| `05_block_links_NNNN.sql` | `ar_ling_lexicon_block_links` | ~400 k | Backlink graph: root, ayah, authority |
| `06_block_tags_NNNN.sql` | `ar_ling_lexicon_block_tags` | ~3 M | Auto-tags only; skipped with `--no-tags` |
| `07_quran_refs.sql` | `ar_ling_lexicon_quran_refs` | ~30 k | Flat surah/ayah index |
| `08_quran_links_from_blocks.sql` | `ar_ling_quran_links` | ~30 k | AL ↔ QR bridge rows (the only AL table with `QR:` refs) |
| `09_root_entry_sources.sql` | `ar_ling_lexicon_root_entry_sources` | ~10 k | Provenance: SQLite root id + HTML file per root_entry |

## Re-running

The bundle is idempotent. After source changes, re-run `stage` then `bundle`
then `push`. New IDs are stable hashes of `(source_slug, root_norm, path)`,
so block annotations attached to those IDs survive re-imports.

## Resuming after a failure

`push` runs each file in lex order. If a file errors mid-way, fix and re-run
`push` — already-applied rows update via `INSERT OR REPLACE`, no duplicates.

## R2 setup (recommended after the import)

Lane's raw HTML (96 MB across 5,078 files) belongs in R2, not D1. Once the
push completes, upload:

```bash
for f in km_arabic_linguistic/ingestion/Lexicon/sources/lane/quranic_research/raw_html/data_*.html; do
  vol=$(basename "$f" | cut -d_ -f2-3)   # e.g. 18_E
  npx wrangler r2 object put "km-lexicon-raw/lane/$vol/$(basename "$f")" \
    --file "$f"
done
```

D1's `ar_ling_lexicon_book_pages.r2_key` already points at the right key, so
the worker can stream the HTML on demand.

## Rollback

```bash
bash workers/ar-linguistics/migrations/manual/imports/lane_2026_05/00_run.sh cleanup
```

This wipes only Lane rows. Non-Lane lexicons are untouched (verified by
`guard_before`/`guard_after` counts in `2026_05_lane_cleanup.sql`).
