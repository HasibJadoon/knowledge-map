# K-Maps Sarf Ingestion Pipeline

## Overview

Ingests Quranic morphology data from 10 tafsir DBs, 4 Arabic lexicons, and existing
PDF/DOCX sources into a spine + Qdrant vector store + D1 database.

```
01_download/scrape_hawramani.py   → data/raw/shamela/lexicons/*/entries.jsonl
02_import_spine/build_spine_from_local.py → data/raw/spine/spine.sqlite (77,435 words)
03_chunk_sources/chunk_tafsirs.py → data/staging/chunks/tafsirs.jsonl (28,783 chunks)
03_chunk_sources/merge_chunks.py  → data/staging/chunks/all_chunks.jsonl (31,025 chunks)
03_chunk_sources/merge_lexicons.py → appends lexicon chunks to all_chunks.jsonl
05_embed_qdrant/embed_chunks.py   → Qdrant (kmaps_sarf_source_chunks collection)
07_llm_extract_claims/extract_claims.py → data/staging/claims/sql/sarf-claims-*.sql
09_promote_to_d1/deploy.sh        → Cloudflare D1 (km_arabic_linguistics)
```

---

## Step-by-Step

### Step 01 — Scrape Hawramani Lexicons

```bash
python3 scripts/01_download/scrape_hawramani.py --book all --workers 1 --sleep 2.5
```

- Books: Mufradat (1,608) · Maqayis (4,814) · Lane (4,953) · Lisan (9,245) = 20,620 total
- **Use 1 worker, 2.5s sleep** to avoid 429 rate-limits from Hawramani
- State-aware: resumes from `data/staging/lexicon_progress/<book>.txt`
- Raw output: `data/raw/shamela/lexicons/<slug>/entries.jsonl`
- Errors logged as `# ERROR ...` lines (retried on next run)

**Current status (2026-04-27):** Mufradat ✅ done. Maqayis ~20% done. Lane/Lisan pending.

### Step 02 — Build Spine

```bash
python3 scripts/02_import_spine/build_spine_from_local.py
```

- Reads: QUL word-root, word-lemma, word-stem SQLites + MASAQ + QAC morphology
- Output: `data/raw/spine/spine.sqlite` — table `qr_word_occurrences` (77,435 rows)
- **Status: ✅ Complete**

### Step 03a — Chunk Tafsirs

```bash
python3 scripts/03_chunk_sources/chunk_tafsirs.py
```

- Reads 10 tafsir SQLite DBs from `km_arabic_linguistic/Tafsirs/`
- Output: `data/staging/chunks/tafsirs.jsonl` (28,783 chunks)
- **Status: ✅ Complete**

### Step 03b — Merge Chunks

```bash
python3 scripts/03_chunk_sources/merge_chunks.py
```

- Merges: 2,242 PDF/DOCX chunks + 28,783 tafsir chunks
- Output: `data/staging/chunks/all_chunks.jsonl` (31,025 total)
- Also generates: `tafsirs_sources.sql` + 75 `tafsir_sql/tafsir-chunks-*.sql` files
- **Status: ✅ Complete**

### Step 03c — Merge Lexicons (run AFTER step 01 completes)

```bash
python3 scripts/03_chunk_sources/merge_lexicons.py
```

- Reads: `data/raw/shamela/lexicons/*/entries.jsonl`
- Appends new lexicon chunks to `data/staging/chunks/all_chunks.jsonl`
- Generates: `lexicons_sources.sql` + `lexicon_sql/lexicon-chunks-*.sql` files
- **Status: ⏳ Waiting for scraper to complete**

### Step 05 — Embed into Qdrant

```bash
python3 scripts/05_embed_qdrant/embed_chunks.py --batch 32
```

- Reads: `data/staging/chunks/all_chunks.jsonl`
- Backend: Ollama `nomic-embed-text` (768-dim), local Qdrant at `data/qdrant_storage/`
- Collection: `kmaps_sarf_source_chunks`
- State-aware: skips IDs in `data/staging/embeddings/embedded_ids.txt`
- **Run again after Step 03c to embed the new lexicon chunks**
- **Status: ✅ ~98% complete (31,025 chunks)**

### Step 07 — LLM Claim Extraction

```bash
# Set your OpenAI key first:
# Edit .env → OPENAI_API_KEY=sk-...

python3 scripts/07_llm_extract_claims/extract_claims.py --scope ALL
```

- For each of 77,427 Quran words:
  1. Embeds query (word + root + lemma + morphology_tag)
  2. Retrieves top-12 chunks from Qdrant
  3. Calls `gpt-4o-mini` (structured JSON output, sarf claim schema)
  4. Saves raw result to `data/staging/claims/<s>_<a>_<w>.json`
  5. Emits SQL to `data/staging/claims/sql/sarf-claims-*.sql`
- State-aware: skips `surah:ayah:word_index` keys in `data/staging/claims/done.txt`
- **Status: ⏳ Waiting for OPENAI_API_KEY**

Test with first 10 words:
```bash
python3 scripts/07_llm_extract_claims/extract_claims.py --scope S1 --limit 10
```

### Step 09 — Deploy to D1

```bash
cd /path/to/kmaps-sarf/
bash scripts/09_promote_to_d1/deploy.sh
```

Requires: `wrangler` CLI authenticated (`wrangler login` or `CLOUDFLARE_API_TOKEN` env var)

Deploy order:
1. Migration 004 (sarf tables → `km_arabic_linguistics`)
2. Tafsir source rows
3. 75× tafsir chunk SQL files
4. PDF/DOCX sources + chunks
5. Lexicon sources + chunks (skip if not yet available)
6. LLM claim SQL

**Status: ⏳ Waiting for Steps 07 and/or 01+03c to complete**

---

## Current State Summary (2026-04-27 ~15:00)

| Step | What | Status | Notes |
|------|------|--------|-------|
| 01 | Hawramani scrape | 🔄 In progress | 1 worker, 2.5s sleep, PID 5177. 100% success rate now. |
| 02 | Spine build | ✅ Done | 77,435 words |
| 03a | Tafsir chunking | ✅ Done | 28,783 chunks |
| 03b | Merge chunks | ✅ Done | 31,025 total |
| 03c | Merge lexicons | ⏳ Pending | Run after Step 01 finishes (~19 hrs) |
| 05 | Embedding | ✅ Done | 31,025/31,025 in Qdrant. Re-run after Step 03c. |
| 07 | LLM extraction | ⏳ **Needs OPENAI_API_KEY in .env** | Run `run_parallel.sh 5` |
| 09 | D1 deploy | ⏳ Pending | Run after Step 07 |

### Lexicon scrape detail
| Book | Entries | Target | Status |
|------|---------|--------|--------|
| Mufradat (Raghib) | 1,608 | 1,608 | ✅ Done |
| Maqayis (Ibn Faris) | 1,588 | 4,814 | 🔄 33% (~4 hrs remaining) |
| Lane (Arabic-English) | 0 | 4,953 | ⏳ Queued |
| Lisan al-Arab | 0 | 9,245 | ⏳ Queued |
| **Total** | **3,196** | **20,620** | ~19 hrs remaining |

_Note: 914 earlier 429-errors will be retried automatically on the next pass of maqayis._

---

## Sequence for Resuming

### When lexicon scraping completes:
```bash
# 1. Merge lexicons into master JSONL + generate SQL
python3 scripts/03_chunk_sources/merge_lexicons.py

# 2. Re-embed the new chunks (skips already-embedded)
python3 scripts/05_embed_qdrant/embed_chunks.py --batch 32
```

### When OpenAI key is ready:
```bash
# In .env: OPENAI_API_KEY=sk-...

# Test run (Surah 1, first 10 words)
python3 scripts/07_llm_extract_claims/extract_claims.py --scope S1 --limit 10

# Full run (77,427 words — long-running, ~hours)
python3 scripts/07_llm_extract_claims/extract_claims.py --scope ALL
```

### After LLM extraction completes:
```bash
bash scripts/09_promote_to_d1/deploy.sh
```

---

## Environment (.env)

```
OPENAI_API_KEY=sk-...       ← SET THIS before Step 07
OPENAI_MODEL=gpt-4o-mini
EMBED_BACKEND=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
QDRANT_PATH=./data/qdrant_storage
SARF_SCOPE=ALL
```

---

## Key Data Paths

```
data/raw/spine/spine.sqlite                   ← word occurrences (77,435 rows)
data/raw/shamela/lexicons/*/entries.jsonl     ← scraped Hawramani entries
data/staging/chunks/all_chunks.jsonl          ← master chunk file
data/staging/chunks/tafsirs_sources.sql       ← tafsir source SQL
data/staging/chunks/tafsir_sql/               ← 75 chunk SQL files
data/staging/chunks/lexicons_sources.sql      ← lexicon source SQL (after 03c)
data/staging/chunks/lexicon_sql/              ← lexicon chunk SQL (after 03c)
data/staging/embeddings/embedded_ids.txt      ← embedded chunk IDs
data/staging/claims/done.txt                  ← processed word keys
data/staging/claims/sql/sarf-claims-*.sql     ← LLM claim SQL output
data/qdrant_storage/                          ← local Qdrant DB
```
