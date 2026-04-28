#!/usr/bin/env python3
"""
Step 03b (irab/balagha): Chunk archive.org djvu OCR text into RAG-ready chunks.

Reads:  data/raw/archive_org/<slug>/pages.jsonl  (one big text blob per book)
        data/raw/archive_org/<slug>/metadata.json
Writes: data/staging/chunks/archive_org_chunks.jsonl

Each output chunk has the same shape as kmaps-sarf chunks:
  { id, source_id, source_title_en, chunk_kind, chunk_seq,
    heading_norm, text_ar, page_no, meta_json }

Strategy:
  1. Split the big text by paragraphs (double newlines)
  2. Drop OCR junk (URLs, "Internet Archive" lines, single-character lines, very short)
  3. Pack paragraphs into ~1200-char chunks (target), max 2000
  4. Tag chunk_kind with the work's type (balagha_theory or irab_classical)
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[2]
RAW_BASE   = SCRIPT_DIR / "data/raw/archive_org"
OUT_FILE   = SCRIPT_DIR / "data/staging/chunks/archive_org_chunks.jsonl"
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

TARGET_CHARS = 1200
MAX_CHARS    = 2000
MIN_CHARS    = 200

# OCR junk filters
_JUNK_PATTERNS = [
    re.compile(r'^https?://', re.IGNORECASE),
    re.compile(r'Internet\s*Archive', re.IGNORECASE),
    re.compile(r'^Free Download', re.IGNORECASE),
    re.compile(r'^<.*>$'),                     # HTML-only line
    re.compile(r'^\s*\d+\s*$'),                # standalone page number
    re.compile(r'^[\s\W_]{1,5}$'),             # all-punctuation/short line
]

def is_junk(line: str) -> bool:
    s = line.strip()
    if len(s) < 3: return True
    if any(p.search(s) for p in _JUNK_PATTERNS): return True
    # Mostly Latin/English line (less than 20% Arabic) — likely OCR drift
    arabic = sum(1 for c in s if '؀' <= c <= 'ۿ')
    if len(s) > 50 and arabic / len(s) < 0.2:
        return True
    return False


def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def pack_chunks(paragraphs: list[str]) -> list[str]:
    """Greedy pack paragraphs into ~TARGET_CHARS chunks."""
    chunks: list[str] = []
    cur: list[str] = []
    cur_size = 0
    for p in paragraphs:
        size = len(p) + 1
        if cur and cur_size + size > MAX_CHARS:
            chunks.append("\n".join(cur))
            cur = [p]
            cur_size = size
        else:
            cur.append(p)
            cur_size += size
            if cur_size >= TARGET_CHARS:
                chunks.append("\n".join(cur))
                cur = []
                cur_size = 0
    if cur:
        text = "\n".join(cur)
        if len(text) >= MIN_CHARS:
            chunks.append(text)
    return chunks


def main():
    if not RAW_BASE.exists():
        print(f"No raw data at {RAW_BASE}", file=sys.stderr)
        sys.exit(1)

    out_records: list[dict] = []

    for work_dir in sorted(RAW_BASE.iterdir()):
        if not work_dir.is_dir(): continue
        meta_file = work_dir / "metadata.json"
        pages_file = work_dir / "pages.jsonl"
        if not (meta_file.exists() and pages_file.exists()):
            continue

        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        slug = meta["slug"]
        source_id_slug = f"SRC:ARCHIVE:{slug.upper()}"
        source_id = stable_id("AL:SRC:", source_id_slug)
        source_title_en = meta["title_en"]
        source_title_ar = meta["title_ar"]
        chunk_kind = "balagha_theory" if meta["type"] == "balagha" else "irab_classical"

        # Concatenate all pages (usually one big blob anyway)
        full_text = ""
        with open(pages_file, encoding="utf-8") as f:
            for line in f:
                rec = json.loads(line)
                full_text += rec.get("text_ar", "") + "\n"

        # Split into paragraphs
        raw_paras = re.split(r'\n\s*\n+', full_text)
        clean_paras = []
        for p in raw_paras:
            # Collapse internal whitespace
            p = re.sub(r'\s+', ' ', p).strip()
            if not p or is_junk(p):
                continue
            clean_paras.append(p)

        # Pack into chunks
        chunks = pack_chunks(clean_paras)

        print(f"  {slug:30s}  {len(clean_paras):>5d} paras → {len(chunks):>4d} chunks",
              file=sys.stderr)

        for i, chunk_text in enumerate(chunks):
            chunk_id = stable_id("AL:CHUNK:", source_id, i)
            rec = {
                "id":               chunk_id,
                "source_id":        source_id,
                "source_title_en":  source_title_en,
                "chunk_kind":       chunk_kind,
                "chunk_seq":        i,
                "heading_norm":     f"{source_title_en} chunk {i+1}",
                "text_ar":          chunk_text,
                "page_no":          None,
                "meta_json": {
                    "title_ar":  source_title_ar,
                    "author":    meta["author"],
                    "year":      meta["year"],
                    "ident":     meta["ident"],
                    "type":      meta["type"],
                },
            }
            out_records.append(rec)

    # Write all to one staging file
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for rec in out_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"\nTotal: {len(out_records):,} chunks → {OUT_FILE}", file=sys.stderr)
    print("\nNext step: re-run `clean_chunks.py` (which now picks these up) "
          "and `embed_chunks.py --rebuild`", file=sys.stderr)


if __name__ == "__main__":
    main()
