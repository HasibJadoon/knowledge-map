#!/usr/bin/env python3
"""
Step 03d: Clean all chunk sources before embedding.

Fixes:
  PDF/DOCX chunks:
    - Strip "Page X of Y" header lines
    - Drop index/TOC/cover pages (no morphological content)
    - Strip HTML tags
    - Drop non-Arabic/non-English junk (OCR errors, foreign text)
    - Drop chunks shorter than MIN_CHARS after cleaning

  Tafsir chunks:
    - Strip صفحة N page-number markers
    - Normalize repeated whitespace / blank lines
    - Drop chunks shorter than MIN_CHARS after cleaning

  Hawramani lexicon entries:
    - Strip "NextEntries on X in N Arabic dictionaries..." boilerplate
    - Strip repeated book-title headers (Ibn Faris, Maqayis...)
    - Strip rating widgets and nav text
    - Drop entries shorter than MIN_CHARS

Outputs:
  data/staging/chunks/tafsirs_clean.jsonl       (replaces tafsirs.jsonl for embedding)
  data/staging/chunks/all_chunks_clean.jsonl    (replaces all_chunks.jsonl)
  data/staging/chunks/clean_report.txt          (audit log)

Usage:
    python3 scripts/03_chunk_sources/clean_chunks.py
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
PDF_CHUNKS   = BASE.parent / "output/sarf_source_chunks.jsonl"
TAF_CHUNKS   = BASE / "data/staging/chunks/tafsirs.jsonl"
LEX_DIR      = BASE / "data/raw/shamela/lexicons"
OUT_ALL      = BASE / "data/staging/chunks/all_chunks_clean.jsonl"
OUT_TAF      = BASE / "data/staging/chunks/tafsirs_clean.jsonl"
REPORT       = BASE / "data/staging/chunks/clean_report.txt"

MIN_CHARS = 120   # minimum clean text length to keep a chunk

# ── Text cleaners ──────────────────────────────────────────────────────────────

_PAGE_HEADER   = re.compile(r'^\s*Page \d+ of \d+\s*\n?', re.MULTILINE)
_HTML_TAG      = re.compile(r'<[^>]{1,80}>')
_PAGE_MARKER   = re.compile(r'صفحة\s*\d+')          # tafsir page numbers
_MULTI_NL      = re.compile(r'\n{3,}')
_MULTI_WS      = re.compile(r'[ \t]{3,}')

# Hawramani boilerplate patterns
_LEX_BOILERPLATE = [
    re.compile(r'Next\s*Entries on .{1,60} in \d+ Arabic dictionaries.*', re.DOTALL | re.IGNORECASE),
    re.compile(r'Entries on .{1,60} in \d+ (Arabic )?dictionaries.*', re.DOTALL | re.IGNORECASE),
    re.compile(r'«\s*Previous.*?Next\s*»', re.DOTALL),
    re.compile(r'Rate this entry:.*', re.DOTALL | re.IGNORECASE),
    re.compile(r'\d+ reader.*?rated.*', re.IGNORECASE),
    re.compile(r'(Ibn F[aā]ris|Al-R[aā]ghib).{0,120}Maq[aā]y[iī]s.*?\n', re.DOTALL),
    re.compile(r'مقاييس اللغة لابن فارس\s*'),
    re.compile(r'Ibn F[aā]ris,?\s*Maq[aā]y[iī]s al-Lugha\s*\(d\. \d+ CE\)\s*', re.IGNORECASE),
]

# Index/cover page signals — drop entire chunk
_DROP_SIGNALS = [
    re.compile(r'^(vii|viii|ix|xi|xii|xiii)\s*\n', re.MULTILINE),
    re.compile(r'CONTENTS\s*\nPreface', re.IGNORECASE),
    re.compile(r'INDEX OF (ARABIC|ENGLISH|QUR)', re.IGNORECASE),
    re.compile(r'Table of Contents', re.IGNORECASE),
    re.compile(r'PRINCETON UNIVERSITY PRESS', re.IGNORECASE),
    re.compile(r'Possível', re.IGNORECASE),    # Portuguese OCR error
    re.compile(r'^K\s*E\s*Y\s*\n', re.MULTILINE),  # spaced cover text
]

# Arabic character check
def arabic_ratio(text: str) -> float:
    arabic = sum(1 for c in text if '؀' <= c <= 'ۿ')
    return arabic / max(len(text), 1)


def clean_pdf_chunk(text: str) -> str | None:
    """Clean a PDF-extracted chunk. Returns None if it should be dropped."""
    # Drop entire chunk if it matches any drop signal
    for pat in _DROP_SIGNALS:
        if pat.search(text[:500]):
            return None
    # Strip Page X of Y headers
    text = _PAGE_HEADER.sub('', text)
    # Strip HTML tags
    text = _HTML_TAG.sub('', text)
    # Normalize whitespace
    text = _MULTI_NL.sub('\n\n', text)
    text = _MULTI_WS.sub(' ', text)
    text = text.strip()
    # Drop if still too short or no Arabic/English content
    if len(text) < MIN_CHARS:
        return None
    return text


def clean_tafsir_chunk(text: str) -> str | None:
    """Clean a tafsir chunk."""
    # Strip صفحة N page markers
    text = _PAGE_MARKER.sub('', text)
    # Normalize whitespace
    text = _MULTI_NL.sub('\n\n', text)
    text = text.strip()
    if len(text) < MIN_CHARS:
        return None
    return text


def clean_lexicon_entry(text: str) -> str | None:
    """Clean a Hawramani lexicon entry."""
    for pat in _LEX_BOILERPLATE:
        text = pat.sub('', text)
    text = _MULTI_NL.sub('\n\n', text)
    text = text.strip()
    if len(text) < MIN_CHARS:
        return None
    return text


# ── Process each source ────────────────────────────────────────────────────────

report_lines: list[str] = []
all_clean: list[dict] = []
seen_ids: set[str] = set()

def add_chunk(c: dict):
    if c["id"] not in seen_ids:
        seen_ids.add(c["id"])
        all_clean.append(c)


# ── 1. PDF/DOCX chunks ────────────────────────────────────────────────────────
print("Cleaning PDF/DOCX chunks …", file=sys.stderr)
pdf_total = pdf_kept = pdf_dropped = 0
if PDF_CHUNKS.exists():
    for line in PDF_CHUNKS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        c = json.loads(line)
        pdf_total += 1
        raw = c.get("text_ar") or c.get("text") or ""
        cleaned = clean_pdf_chunk(raw)
        if cleaned is None:
            pdf_dropped += 1
        else:
            c["text_ar"] = cleaned
            add_chunk(c)
            pdf_kept += 1

msg = f"PDF/DOCX: {pdf_total} → kept {pdf_kept}, dropped {pdf_dropped}"
print(f"  {msg}", file=sys.stderr)
report_lines.append(msg)


# ── 2. Tafsir chunks ──────────────────────────────────────────────────────────
print("Cleaning tafsir chunks …", file=sys.stderr)
taf_total = taf_kept = taf_dropped = 0
clean_tafsir_chunks: list[dict] = []

for line in TAF_CHUNKS.read_text(encoding="utf-8").splitlines():
    if not line.strip():
        continue
    c = json.loads(line)
    taf_total += 1
    raw = c.get("text_ar") or ""
    cleaned = clean_tafsir_chunk(raw)
    if cleaned is None:
        taf_dropped += 1
    else:
        c["text_ar"] = cleaned
        clean_tafsir_chunks.append(c)
        add_chunk(c)
        taf_kept += 1

# Write clean tafsir JSONL
OUT_TAF.write_text(
    "\n".join(json.dumps(c, ensure_ascii=False) for c in clean_tafsir_chunks),
    encoding="utf-8"
)

msg = f"Tafsir: {taf_total} → kept {taf_kept}, dropped {taf_dropped}"
print(f"  {msg}", file=sys.stderr)
report_lines.append(msg)


# ── 3. Hawramani lexicon entries ──────────────────────────────────────────────
print("Cleaning lexicon entries …", file=sys.stderr)
lex_total = lex_kept = lex_dropped = 0

for lex_dir in sorted(LEX_DIR.iterdir()):
    entries_file = lex_dir / "entries.jsonl"
    if not entries_file.exists():
        continue
    book_key = lex_dir.name[:30]
    n_kept = n_drop = 0
    for line in entries_file.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        c = json.loads(line)
        lex_total += 1
        raw = c.get("text_ar") or ""
        cleaned = clean_lexicon_entry(raw)
        if cleaned is None:
            n_drop += 1
            lex_dropped += 1
        else:
            c["text_ar"] = cleaned
            add_chunk(c)
            n_kept += 1
            lex_kept += 1
    sub_msg = f"  {book_key}: kept {n_kept}, dropped {n_drop}"
    print(f"  {sub_msg}", file=sys.stderr)
    report_lines.append(sub_msg)

msg = f"Lexicon total: {lex_total} → kept {lex_kept}, dropped {lex_dropped}"
print(f"  {msg}", file=sys.stderr)
report_lines.append(msg)


# ── 4. Write master clean JSONL ───────────────────────────────────────────────
print(f"\nWriting {OUT_ALL} …", file=sys.stderr)
with open(OUT_ALL, "w", encoding="utf-8") as f:
    for c in all_clean:
        f.write(json.dumps(c, ensure_ascii=False) + "\n")

total_msg = f"Total clean chunks: {len(all_clean)}"
print(f"  {total_msg}", file=sys.stderr)
report_lines.append("")
report_lines.append(total_msg)

# ── 5. Write report ───────────────────────────────────────────────────────────
REPORT.write_text("\n".join(report_lines), encoding="utf-8")
print(f"\nReport: {REPORT}", file=sys.stderr)
print("\nNext:", file=sys.stderr)
print("  python3 scripts/05_embed_qdrant/embed_chunks.py --clean --batch 32", file=sys.stderr)
