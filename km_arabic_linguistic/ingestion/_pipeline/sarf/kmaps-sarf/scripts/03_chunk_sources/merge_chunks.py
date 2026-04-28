#!/usr/bin/env python3
"""
Step 03b: Merge all chunk sources into one master JSONL + generate SQL.

Sources merged (in order):
  1. output/sarf_source_chunks.jsonl  (2,242 existing PDF/DOCX chunks)
  2. data/staging/chunks/tafsirs.jsonl (28,783 tafsir DB chunks)

Output:
  data/staging/chunks/all_chunks.jsonl    (master, deduplicated by id)
  data/staging/chunks/tafsirs_sources.sql (INSERT OR IGNORE source rows for tafsirs)
  data/staging/chunks/tafsirs_chunks.sql  (INSERT OR IGNORE chunk rows for tafsirs,
                                           split into 4MB files)
Usage:
    python3 scripts/03_chunk_sources/merge_chunks.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR    = Path(__file__).resolve().parents[2]
OLD_CHUNKS    = SCRIPT_DIR.parent / "output/sarf_source_chunks.jsonl"
TAFSIR_CHUNKS = SCRIPT_DIR / "data/staging/chunks/tafsirs.jsonl"
OUT_ALL       = SCRIPT_DIR / "data/staging/chunks/all_chunks.jsonl"
OUT_SRC_SQL   = SCRIPT_DIR / "data/staging/chunks/tafsirs_sources.sql"
OUT_CHK_SQL_DIR = SCRIPT_DIR / "data/staging/chunks/tafsir_sql"
OUT_CHK_SQL_DIR.mkdir(parents=True, exist_ok=True)

# ── Tafsir source registry (mirrors chunk_tafsirs.py) ─────────────────────────
import re
_SLUG_MAP = {
    "SRC:SHAMELA:IBN_ASHUR_TAHRIR": ("التحرير والتنوير", "Ibn Ashur - Tahrir wa Tanwir", "tafsir_linguistic"),
    "SRC:SHAMELA:RAZI":            ("مفاتيح الغيب",     "Razi - Mafatih al-Ghayb",       "tafsir_linguistic"),
    "SRC:SHAMELA:ALUSI":           ("روح المعاني",       "Alusi - Ruh al-Ma'ani",         "tafsir_linguistic"),
    "SRC:SHAMELA:TABARI":          ("جامع البيان",       "Tabari - Jami' al-Bayan",       "tafsir_linguistic"),
    "SRC:SHAMELA:IBN_KATHIR":      ("تفسير ابن كثير",    "Ibn Kathir - Tafsir",           "tafsir_linguistic"),
    "SRC:SHAMELA:KASHSHAF":        ("الكشاف",            "Zamakhshari - al-Kashshaf",     "tafsir_linguistic"),
    "SRC:SHAMELA:BAHR":            ("البحر المحيط",      "Abu Hayyan - al-Bahr al-Muhit", "tafsir_linguistic"),
    "SRC:SHAMELA:MUHARRAR":        ("المحرر الوجيز",     "Ibn Atiyya - al-Muharrar",      "tafsir_linguistic"),
    "SRC:SHAMELA:SAFI_JADWAL":     ("الجدول في إعراب القرآن", "Safi - al-Jadwal",        "tafsir_linguistic"),
    "SRC:SHAMELA:DARWISH":         ("إعراب القرآن وبيانه", "Darwish - I'rab",             "tafsir_linguistic"),
}

def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]

def sql_val(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(v).replace("'", "''") + "'"


# ── 1. Collect unique source IDs from tafsir chunks ───────────────────────────
print("Reading tafsir chunks …", file=sys.stderr)
tafsir_chunks: list[dict] = []
source_ids_seen: set[str] = set()

with open(TAFSIR_CHUNKS, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            c = json.loads(line)
            tafsir_chunks.append(c)
            source_ids_seen.add(c["source_id"])

print(f"  {len(tafsir_chunks):,} tafsir chunks | {len(source_ids_seen)} sources", file=sys.stderr)

# Build source → slug reverse map from chunk data
src_id_to_slug: dict[str, str] = {}
for chunk in tafsir_chunks:
    sid = chunk["source_id"]
    if sid in src_id_to_slug:
        continue
    # Find matching slug by hashing
    for slug in _SLUG_MAP:
        if stable_id("AL:SRC:", slug) == sid:
            src_id_to_slug[sid] = slug
            break

# ── 2. Write sources SQL ───────────────────────────────────────────────────────
print("Writing tafsir sources SQL …", file=sys.stderr)
shamela_url_map = {
    "SRC:SHAMELA:IBN_ASHUR_TAHRIR": "https://shamela.ws/book/9776",
    "SRC:SHAMELA:RAZI":            "https://shamela.ws/book/23635",
    "SRC:SHAMELA:ALUSI":           "https://shamela.ws/book/22835",
    "SRC:SHAMELA:TABARI":          "https://shamela.ws/book/7798",
    "SRC:SHAMELA:IBN_KATHIR":      "https://shamela.ws/book/8473",
    "SRC:SHAMELA:KASHSHAF":        "https://shamela.ws/book/23627",
    "SRC:SHAMELA:BAHR":            "https://shamela.ws/book/23591",
    "SRC:SHAMELA:MUHARRAR":        "https://shamela.ws/book/23632",
    "SRC:SHAMELA:SAFI_JADWAL":     "https://shamela.ws/book/22916",
    "SRC:SHAMELA:DARWISH":         "https://shamela.ws/book/2163",
}

with open(OUT_SRC_SQL, "w", encoding="utf-8") as f:
    f.write("-- Tafsir source registrations (from local SQLite DBs)\n")
    for sid, slug in src_id_to_slug.items():
        meta = _SLUG_MAP[slug]
        title_ar, title_en, src_type = meta
        url = shamela_url_map.get(slug, "")
        note = json.dumps({"family": "tafsir", "url": url, "local_db": True}, ensure_ascii=False)
        f.write(
            f"INSERT INTO ar_ling_sources (id, title_ar, title_en, source_type, author_name, period_label, note_md) "
            f"VALUES ({sql_val(sid)}, {sql_val(title_ar)}, {sql_val(title_en)}, {sql_val(src_type)}, "
            f"NULL, NULL, {sql_val(note)}) "
            f"ON CONFLICT(id) DO UPDATE SET title_ar=excluded.title_ar, title_en=excluded.title_en, "
            f"source_type=excluded.source_type, note_md=excluded.note_md;\n"
        )
print(f"  Written {OUT_SRC_SQL}", file=sys.stderr)

# ── 3. Write chunk SQL (split at 4MB) ─────────────────────────────────────────
print("Writing tafsir chunk SQL …", file=sys.stderr)
MAX_BYTES = 4_000_000
sql_files: list[Path] = []
buf: list[str] = []
buf_bytes = 0
file_idx = 1

state = {"buf": [], "buf_bytes": 0, "file_idx": 1}

def flush_buf():
    if not state["buf"]:
        return
    p = OUT_CHK_SQL_DIR / f"tafsir-chunks-{state['file_idx']:03d}.sql"
    p.write_text("".join(state["buf"]), encoding="utf-8")
    sql_files.append(p)
    state["file_idx"] += 1
    state["buf"] = []
    state["buf_bytes"] = 0

for c in tafsir_chunks:
    meta = c.get("meta_json") or {}
    stmt = (
        f"INSERT INTO ar_ling_source_chunks "
        f"(id, source_id, chunk_kind, chunk_seq, heading_norm, text_ar, page_no, tokens_approx, meta_json) "
        f"VALUES ({sql_val(c['id'])}, {sql_val(c['source_id'])}, {sql_val(c.get('chunk_kind','tafsir'))}, "
        f"{sql_val(c.get('chunk_seq',0))}, {sql_val(c.get('heading_norm'))}, "
        f"{sql_val(c.get('text_ar',''))}, NULL, "
        f"{sql_val(max(1, len(str(c.get('text_ar','')).split())))}, "
        f"{sql_val(meta)}) "
        f"ON CONFLICT(id) DO UPDATE SET text_ar=excluded.text_ar, meta_json=excluded.meta_json;\n"
    )
    size = len(stmt.encode("utf-8"))
    if state["buf"] and state["buf_bytes"] + size > MAX_BYTES:
        flush_buf()
    state["buf"].append(stmt)
    state["buf_bytes"] += size

flush_buf()
print(f"  {len(sql_files)} SQL files in {OUT_CHK_SQL_DIR}", file=sys.stderr)

# ── 4. Merge all chunks into master JSONL ─────────────────────────────────────
print("Merging all chunks into master JSONL …", file=sys.stderr)
seen_ids: set[str] = set()
total = 0

with open(OUT_ALL, "w", encoding="utf-8") as fout:
    # Existing PDF/DOCX chunks first
    if OLD_CHUNKS.exists():
        with open(OLD_CHUNKS, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    c = json.loads(line)
                    if c["id"] not in seen_ids:
                        seen_ids.add(c["id"])
                        fout.write(json.dumps(c, ensure_ascii=False) + "\n")
                        total += 1
        print(f"  Existing chunks: {total:,}", file=sys.stderr)

    # Tafsir chunks
    n_tafsir = 0
    for c in tafsir_chunks:
        if c["id"] not in seen_ids:
            seen_ids.add(c["id"])
            fout.write(json.dumps(c, ensure_ascii=False) + "\n")
            total += 1
            n_tafsir += 1
    print(f"  Tafsir chunks added: {n_tafsir:,}", file=sys.stderr)

print(f"\nDone. {total:,} total chunks → {OUT_ALL}", file=sys.stderr)
