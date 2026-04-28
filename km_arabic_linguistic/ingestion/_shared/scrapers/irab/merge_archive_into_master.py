#!/usr/bin/env python3
"""
Merge archive.org balagha-theory chunks into the master clean chunks file
used by sarf embedder. Drops first 8 chunks of each work (OCR'd title pages).

Reads:
  data/staging/chunks/archive_org_chunks.jsonl

Appends to:
  ../../../صرف/kmaps-sarf/data/staging/chunks/all_chunks_clean.jsonl
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from collections import defaultdict

SCRIPT_DIR = Path(__file__).resolve().parents[2]
SRC_FILE   = SCRIPT_DIR / "data/staging/chunks/archive_org_chunks.jsonl"

# Append into the existing sarf master clean file (Qdrant collection lives there)
SARF_BASE = SCRIPT_DIR.parent.parent / "صرف/kmaps-sarf/data/staging/chunks"
MASTER    = SARF_BASE / "all_chunks_clean.jsonl"

DROP_FIRST_N = 8     # cover pages, title page OCR junk
MIN_ARABIC_RATIO = 0.50

def arabic_ratio(text: str) -> float:
    arabic = sum(1 for c in text if '؀' <= c <= 'ۿ')
    return arabic / max(len(text), 1)


def main():
    if not SRC_FILE.exists():
        print(f"Source not found: {SRC_FILE}", file=sys.stderr); sys.exit(1)
    if not MASTER.exists():
        print(f"Master not found: {MASTER}", file=sys.stderr); sys.exit(1)

    # Load existing IDs in master to avoid duplicates
    existing: set[str] = set()
    with open(MASTER, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                existing.add(json.loads(line)["id"])
    print(f"Master has {len(existing):,} chunks", file=sys.stderr)

    # Load archive chunks grouped by source
    by_source: dict[str, list[dict]] = defaultdict(list)
    with open(SRC_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            c = json.loads(line)
            by_source[c["source_id"]].append(c)

    appended = 0
    dropped_low_quality = 0
    dropped_existing = 0
    with open(MASTER, "a", encoding="utf-8") as out:
        for sid, chunks in by_source.items():
            chunks_sorted = sorted(chunks, key=lambda c: c["chunk_seq"])
            title = chunks_sorted[0].get("source_title_en", sid)
            kept_for_book = 0
            for i, c in enumerate(chunks_sorted):
                if i < DROP_FIRST_N:
                    continue
                if c["id"] in existing:
                    dropped_existing += 1
                    continue
                ratio = arabic_ratio(c["text_ar"])
                if ratio < MIN_ARABIC_RATIO:
                    dropped_low_quality += 1
                    continue
                out.write(json.dumps(c, ensure_ascii=False) + "\n")
                kept_for_book += 1
                appended += 1
            print(f"  {title[:50]:50s}  {len(chunks_sorted):4d} → kept {kept_for_book}",
                  file=sys.stderr)

    print(f"\nAppended {appended:,} new chunks to {MASTER}", file=sys.stderr)
    print(f"Dropped: {dropped_low_quality} low-Arabic, {dropped_existing} duplicates",
          file=sys.stderr)


if __name__ == "__main__":
    main()
