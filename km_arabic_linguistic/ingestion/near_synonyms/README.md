# Near Synonym Ingestion

This module mines Quranic near-synonym data into `km_arabic_linguistic` from:

- `qurandev/synonyms`
- `nqcm/synonyms-in-quran`
- `مترادفات القرآن` by عبد الرحمٰن کیلانی, from `database/data/synonyms/*.pdf`

It stores the near-synonym knowledge in `ar_ling_*` tables and uses `km_quran` only for validation against `qr_ayah`, `qr_word_occurrences`, `qr_lemmas`, `qr_lemma_occurrences`, and `qr_surah_study_tasks`.

## What Is Mined

- source rows for the two upstream repositories
- source edition rows for the cloned branches
- source chunk rows for Qurandev data bundles, Qurandev HTML pages, and NQCM markdown articles
- merged near-synonym sets and members
- set/member source provenance rows
- Quran evidence rows
- AL evidence items and AL Quran links
- review queue rows for ambiguous or weak claims

## Why Both Sources Are Used

- `qurandev/synonyms` gives broad topic coverage, term lists, and many direct Quran references.
- `nqcm/synonyms-in-quran` gives cleaner prose explanations and nuance discussion that improves passage-study usefulness.
- عبد الرحمٰن کیلانی's Urdu book gives Urdu concept labels and fine-grained Urdu meaning differences for Quranic near-synonyms.
- The merge step keeps semantic domains separate, so identical Arabic forms can remain in different sets when the usage domain changes.

## Directory Layout

- `sources/` cloned upstream repositories
- `scripts/` runnable ingestion stages plus shared helpers
- `schema/001_near_synonyms_migration.sql` additive AL migration
- `output/raw_chunks.json` normalized source chunks for extraction
- `output/extracted/near_synonym_extractions.json` AI or heuristic extraction payloads
- `output/merged_near_synonym_sets.json` merged set rows with provenance
- `output/merged_near_synonym_members.json` merged member rows with provenance
- `output/near_synonym_evidence.json` Quran evidence rows
- `output/review_queue.json` manual review items
- `output/d1_import_near_synonyms.sql` final D1 import SQL

## Required Environment Variables

- `OPENAI_API_KEY`
  Required only for live AI extraction in `06_ai_extract_near_synonyms.py`.
- `OPENAI_MODEL`
  Optional. Defaults to `gpt-5-mini`.
- `OPENAI_BASE_URL`
  Optional for OpenAI-compatible gateways.
- `OPENAI_TIMEOUT_SECONDS`
  Optional. Defaults to `120`.
- `KELANI_START_PAGE`, `KELANI_END_PAGE`, `KELANI_PAGES_PER_CHUNK`
  Optional OCR controls for the local Kilani PDF source. Defaults to all pages in 2-page chunks.
- `KELANI_OCR_LANG`, `KELANI_OCR_PSM`, `KELANI_OCR_DPI_SCALE`
  Optional Tesseract OCR controls. Defaults to `urd+ara+eng`, `6`, and `2.5`.
- `KM_QURAN_DB_PATH`
  Optional local SQLite export of `km_quran` for validation.
- `KM_ARABIC_LINGUISTIC_DB_PATH`
  Optional local SQLite export of `km_arabic_linguistic` so existing semantic field, root, and lemma IDs can be reused in SQL generation.

The scripts also auto-load local `.dev.vars`, `.dev.vars.local`, `.env`, and `.env.local` files from this module directory upward to the repo root. That works for local Wrangler-style env files, but it does not read back remote Wrangler secrets.
If local SQLite exports are not provided and Wrangler is available, `08_validate_against_quran.py` and `09_generate_d1_sql.py` fall back to the configured remote D1 databases (`km_quran` and `km_arabic_linguistic`) to reuse existing Quran/lemma data.

## Run Order

From this directory:

```bash
cd km_arabic_linguistic/ingestion/near_synonyms

python scripts/01_clone_sources.py
python scripts/02_collect_source_chunks.py
python scripts/03_parse_qurandev_data.py
python scripts/04_parse_qurandev_html.py
python scripts/04_parse_kelani_structured_data.py
python scripts/05_parse_nqcm_markdown.py
python scripts/06_extract_kelani_pdf_ocr.py
python scripts/06_ai_extract_near_synonyms.py
python scripts/07_merge_clusters.py
python scripts/08_validate_against_quran.py
python scripts/09_generate_d1_sql.py
bash scripts/10_push_to_d1.sh
```

If your shell does not provide `python`, use `python3` for the same scripts.

## AI Extraction

- The extractor reads `output/raw_chunks.json`.
- With `OPENAI_API_KEY` set, it sends each chunk to an OpenAI-compatible chat-completions endpoint and expects JSON only.
- Without an API key, it falls back to deterministic heuristics and marks the output `needs_review`.
- Output is written to `output/extracted/near_synonym_extractions.json`.

## Quran Validation

- If `KM_QURAN_DB_PATH` points to a local SQLite export, `08_validate_against_quran.py` checks:
  - ayah existence in `qr_ayah`
  - approximate quote matching against `text_bare` / `text_uthmani_clean`
  - term occurrence matching in `qr_word_occurrences`
  - lemma occurrence matching in `qr_lemma_occurrences` via `qr_lemmas.lx_lemma_ref`
- If no local SQLite is provided, the script falls back to remote D1 lookups through Wrangler when available.
- If neither a local DB export nor Wrangler D1 access is available, evidence stays `pending`.

## Push To D1

The push script runs:

```bash
wrangler d1 execute km_arabic_linguistic --config ../../../wrangler.toml --remote --file=schema/001_near_synonyms_migration.sql
wrangler d1 execute km_arabic_linguistic --config ../../../wrangler.toml --remote --file=output/d1_import_near_synonyms.sql
```

The provided push script checks the live schema first and skips the migration step when the near-synonym columns and tables already exist.

It does not push anything into `km_quran`.

## Manual Review Focus

Check `output/review_queue.json` for:

- `ambiguous_term_link`
- `quote_mismatch`
- `term_not_found_in_ayah`
- `missing_surah_number`
- `duplicate_cluster_possible`
- `same_word_different_domain`
- `unsupported_root`
- `ai_inferred_claim`
- `needs_scholar_review`

These are the rows to clear before treating a set as scholar-approved for passage study.
