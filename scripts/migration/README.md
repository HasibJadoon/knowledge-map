# K-MAPS Migration Scripts

## migrate_qr_data.py

Migrates all Quran corpus data from the legacy `knowledgemap` D1 database
into the new `km_quran` D1 database.

### What it migrates

| Step | Flag | Rows (approx) | Source → Target |
|------|------|---------------|-----------------|
| 1 | `ayah` | 6,236 | `ar_quran_ayah` → `qr_ayah` |
| 2 | `meta` | 6,236 | `ar_quran_ayah` (juz/hizb/ruku) → `qr_surah_ayah_meta` |
| 3 | `sources` | 4 | hardcoded canonical → `qr_translation_sources` |
| 4 | `translations` | ~6,236+ | `ar_quran_ayah.translation` or `ar_quran_translations` → `qr_translations` |
| 5 | `words` | ~77,432 | `ar_quran_word_occurrences` → `qr_word_occurrences` |
| 6 | `pages` | ~9,046 | `ar_quran_page_layout_lines` → `qr_page_layout_lines` |
| 7 | `passages` | varies | `ar_quran_surah_passage` → `qr_surah_passages` |

All 114 surahs in `qr_surahs` were already migrated with full canonical enrichment
(revelation order, juz_start, page_start, name_transliteration) in the prior session.

### Setup

```bash
# From the project root
cd scripts/migration

# Option A — reuse the pipeline venv
source ../pipeline/.venv/bin/activate

# Option B — fresh venv
python3 -m venv .venv
source .venv/bin/activate
pip install httpx python-dotenv
```

Credentials are read from `scripts/pipeline/.env`:
```env
CLOUDFLARE_ACCOUNT_ID=<your account id>
CLOUDFLARE_API_TOKEN=<your API token>
```

### Usage

```bash
# 1. Discover what tables exist in the legacy DB (safe, read-only)
python migrate_qr_data.py --discover

# 2. Dry run — prints what would happen, writes nothing
python migrate_qr_data.py --dry-run

# 3. Full migration (idempotent — uses INSERT OR IGNORE, safe to re-run)
python migrate_qr_data.py

# 4. Selective — run only specific steps
python migrate_qr_data.py --tables ayah,meta,sources,translations
python migrate_qr_data.py --tables words
python migrate_qr_data.py --tables pages,passages
```

### Notes

- **Idempotent**: all inserts use `INSERT OR IGNORE` — safe to re-run after failures
- **Resumable**: each table starts at `OFFSET = existing_row_count` so partial runs continue where they left off
- **Rate limiting**: 0.1–0.15s sleep between D1 API batches to avoid 429s
- **Batch size**: 50–150 rows per insert to stay within D1 request limits
- **Word occurrences**: the largest table (~77k rows) will take ~10 minutes at 150 rows/batch
- **No triggers**: the km_quran schema was deployed without triggers (D1 REST API limitation) — timestamps default to `datetime('now')` at insert time
