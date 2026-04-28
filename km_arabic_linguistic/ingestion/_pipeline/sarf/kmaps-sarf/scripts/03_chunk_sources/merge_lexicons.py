#!/usr/bin/env python3
"""
Step 03c: Merge scraped Hawramani lexicon chunks into master JSONL + generate SQL.

Run this AFTER scripts/01_download/scrape_hawramani.py has completed all 4 books.

Sources:
  data/raw/shamela/lexicons/*/entries.jsonl  (scraped by scrape_hawramani.py)

Outputs:
  data/staging/chunks/all_chunks.jsonl         (appends new lexicon chunks)
  data/staging/chunks/lexicons_sources.sql     (INSERT OR IGNORE source rows)
  data/staging/chunks/lexicon_sql/             (chunk SQL split at 4MB)

Usage:
    python3 scripts/03_chunk_sources/merge_lexicons.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).resolve().parents[2]
RAW_LEX_DIR = SCRIPT_DIR / "data/raw/shamela/lexicons"
OUT_ALL     = SCRIPT_DIR / "data/staging/chunks/all_chunks.jsonl"
OUT_SRC_SQL = SCRIPT_DIR / "data/staging/chunks/lexicons_sources.sql"
OUT_CHK_DIR = SCRIPT_DIR / "data/staging/chunks/lexicon_sql"
OUT_CHK_DIR.mkdir(parents=True, exist_ok=True)

# ── Book metadata (mirrors scrape_hawramani.py) ────────────────────────────────
BOOKS = {
    "mufradat": {
        "slug":          "al-raghib-al-isfahani-al-mufradat-fi-gharib-al-quran",
        "title_ar":      "المفردات في غريب القرآن",
        "title_en":      "Raghib al-Isfahani - Mufradat fi Gharib al-Quran",
        "author":        "الراغب الأصفهاني",
        "source_id_slug": "SRC:HAWRAMANI:MUFRADAT",
        "source_type":   "lexicon",
    },
    "maqayis": {
        "slug":          "ibn-faris-maqayis-al-lugha",
        "title_ar":      "مقاييس اللغة",
        "title_en":      "Ibn Faris - Maqayis al-Lugha",
        "author":        "ابن فارس",
        "source_id_slug": "SRC:HAWRAMANI:MAQAYIS",
        "source_type":   "lexicon",
    },
    "lisan": {
        "slug":          "ibn-manzur-lisan-al-arab",
        "title_ar":      "لسان العرب",
        "title_en":      "Ibn Manzur - Lisan al-Arab",
        "author":        "ابن منظور",
        "source_id_slug": "SRC:HAWRAMANI:LISAN",
        "source_type":   "lexicon",
    },
    "lane": {
        "slug":          "edward-william-lane-arabic-english-lexicon",
        "title_ar":      "المعجم العربي الإنجليزي",
        "title_en":      "Edward William Lane - Arabic-English Lexicon",
        "author":        "Edward William Lane",
        "source_id_slug": "SRC:HAWRAMANI:LANE",
        "source_type":   "lexicon",
    },
}

# ── Helpers ────────────────────────────────────────────────────────────────────
def sql_val(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(v).replace("'", "''") + "'"


# ── 1. Load existing IDs to avoid duplicates ──────────────────────────────────
print("Loading existing chunk IDs from all_chunks.jsonl …", file=sys.stderr)
existing_ids: set[str] = set()
if OUT_ALL.exists():
    with open(OUT_ALL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    existing_ids.add(json.loads(line)["id"])
                except Exception:
                    pass
print(f"  Existing: {len(existing_ids):,} chunks", file=sys.stderr)

# ── 2. Read all lexicon entries ────────────────────────────────────────────────
print("\nReading lexicon JSONL files …", file=sys.stderr)
all_lex_chunks: list[dict] = []
book_counts: dict[str, int] = {}

for book_key, meta in BOOKS.items():
    entries_file = RAW_LEX_DIR / meta["slug"] / "entries.jsonl"
    if not entries_file.exists():
        print(f"  SKIP {book_key}: {entries_file} not found", file=sys.stderr)
        continue
    n = 0
    with open(entries_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    c = json.loads(line)
                    if c["id"] not in existing_ids:
                        all_lex_chunks.append(c)
                        n += 1
                except Exception as exc:
                    print(f"  WARN parse error: {exc}", file=sys.stderr)
    print(f"  {book_key}: {n:,} new chunks", file=sys.stderr)
    book_counts[book_key] = n

print(f"\n  Total new lexicon chunks: {len(all_lex_chunks):,}", file=sys.stderr)

if not all_lex_chunks:
    print("\nNothing to merge. Exiting.", file=sys.stderr)
    sys.exit(0)

# ── 3. Append to all_chunks.jsonl ─────────────────────────────────────────────
print("\nAppending to all_chunks.jsonl …", file=sys.stderr)
with open(OUT_ALL, "a", encoding="utf-8") as fout:
    for c in all_lex_chunks:
        fout.write(json.dumps(c, ensure_ascii=False) + "\n")
print(f"  Appended {len(all_lex_chunks):,} chunks", file=sys.stderr)

# ── 4. Generate source SQL ────────────────────────────────────────────────────
print("\nWriting lexicons_sources.sql …", file=sys.stderr)
with open(OUT_SRC_SQL, "w", encoding="utf-8") as f:
    f.write("-- Hawramani lexicon source registrations\n")
    f.write("-- Generated by merge_lexicons.py\n\n")
    for book_key, meta in BOOKS.items():
        entries_file = RAW_LEX_DIR / meta["slug"] / "entries.jsonl"
        if not entries_file.exists():
            continue
        # Reconstruct source_id the same way scrape_hawramani.py does
        # (stable_id uses sha1 of the source_id_slug)
        import hashlib
        slug_key = meta["source_id_slug"]
        raw = slug_key  # stable_id("AL:SRC:", slug) = "AL:SRC:" + sha1(slug)[:24]
        sid = "AL:SRC:" + hashlib.sha1(slug_key.encode()).hexdigest()[:24]

        note = json.dumps({
            "family": "lexicon",
            "url": f"https://arabiclexicon.hawramani.com/{meta['slug']}/",
            "book_key": book_key,
            "source_id_slug": slug_key,
        }, ensure_ascii=False)
        f.write(
            f"INSERT INTO ar_ling_sources (id, title_ar, title_en, source_type, author_name, note_md) "
            f"VALUES ({sql_val(sid)}, {sql_val(meta['title_ar'])}, {sql_val(meta['title_en'])}, "
            f"{sql_val(meta['source_type'])}, {sql_val(meta['author'])}, {sql_val(note)}) "
            f"ON CONFLICT(id) DO UPDATE SET title_ar=excluded.title_ar, title_en=excluded.title_en, "
            f"source_type=excluded.source_type, author_name=excluded.author_name;\n"
        )
print(f"  Written {OUT_SRC_SQL}", file=sys.stderr)

# ── 5. Generate chunk SQL (split at 4MB) ──────────────────────────────────────
print("\nWriting lexicon chunk SQL …", file=sys.stderr)
MAX_BYTES = 4_000_000
state = {"buf": [], "buf_bytes": 0, "file_idx": 1}
sql_files: list[Path] = []

def flush_buf():
    if not state["buf"]:
        return
    p = OUT_CHK_DIR / f"lexicon-chunks-{state['file_idx']:03d}.sql"
    p.write_text("".join(state["buf"]), encoding="utf-8")
    sql_files.append(p)
    state["file_idx"] += 1
    state["buf"] = []
    state["buf_bytes"] = 0

for c in all_lex_chunks:
    meta_json = c.get("meta_json") or {}
    text = c.get("text_ar") or ""
    tokens = max(1, len(text.split()))
    stmt = (
        f"INSERT INTO ar_ling_source_chunks "
        f"(id, source_id, chunk_kind, chunk_seq, heading_norm, text_ar, page_no, tokens_approx, meta_json) "
        f"VALUES ({sql_val(c['id'])}, {sql_val(c['source_id'])}, {sql_val(c.get('chunk_kind','lexicon'))}, "
        f"{sql_val(c.get('chunk_seq', 0))}, {sql_val(c.get('heading_norm'))}, "
        f"{sql_val(text)}, NULL, {sql_val(tokens)}, {sql_val(meta_json)}) "
        f"ON CONFLICT(id) DO UPDATE SET text_ar=excluded.text_ar, meta_json=excluded.meta_json;\n"
    )
    size = len(stmt.encode("utf-8"))
    if state["buf"] and state["buf_bytes"] + size > MAX_BYTES:
        flush_buf()
    state["buf"].append(stmt)
    state["buf_bytes"] += size

flush_buf()
print(f"  {len(sql_files)} SQL files in {OUT_CHK_DIR}", file=sys.stderr)

print(f"\n=== Done ===", file=sys.stderr)
print(f"  Lexicon chunks added: {len(all_lex_chunks):,}", file=sys.stderr)
print(f"  SQL files: {len(sql_files)}", file=sys.stderr)
print(f"\nNext steps:", file=sys.stderr)
print(f"  1. Re-run embed_chunks.py to embed the new lexicon chunks:", file=sys.stderr)
print(f"     python3 scripts/05_embed_qdrant/embed_chunks.py --batch 32", file=sys.stderr)
print(f"  2. Set OPENAI_API_KEY in .env, then run LLM extraction:", file=sys.stderr)
print(f"     python3 scripts/07_llm_extract_claims/extract_claims.py", file=sys.stderr)
