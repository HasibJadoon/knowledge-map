#!/usr/bin/env python3
"""
Filter existing tafsir + theory chunks for balagha-relevant content.

Reads:
  ../../صرف/kmaps-sarf/data/staging/chunks/all_chunks_clean.jsonl
  ../../اعراب/kmaps-irab/data/staging/chunks/archive_org_chunks.jsonl

Writes:
  data/staging/chunks/balagha_chunks.jsonl

Strategy:
  Mark chunks as balagha-relevant if they contain ≥2 balagha trigger words
  OR are from a known balagha-theory source (Jurjani, Sakkaki, Baqillani, Qazwini).

Trigger words span the three classical branches (معاني، بيان، بديع) plus
modern terms used by Ibn Ashur and Alusi.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR  = Path(__file__).resolve().parents[2]
SARF_BASE   = SCRIPT_DIR.parent.parent / "صرف/kmaps-sarf/data/staging/chunks"
IRAB_BASE   = SCRIPT_DIR.parent.parent / "اعراب/kmaps-irab/data/staging/chunks"
OUT_FILE    = SCRIPT_DIR / "data/staging/chunks/balagha_chunks.jsonl"
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

ALL_CHUNKS  = SARF_BASE / "all_chunks_clean.jsonl"
ARCHIVE_CHUNKS = IRAB_BASE / "archive_org_chunks.jsonl"

# Balagha trigger words (spanning maani, bayan, badi, ijaz)
TRIGGERS = {
    # معاني (meaning)
    'تقديم وتأخير', 'التقديم والتأخير', 'تقديم', 'تأخير',
    'الحصر', 'القصر', 'إنما', 'حصر',
    'الالتفات', 'الْتِفَات',
    'الإيجاز', 'الإطناب', 'المساواة',
    'الفصل والوصل', 'الفصل', 'الوصل',
    'إنشاء', 'خبر',
    'تعريف', 'تنكير',
    'التعريف', 'التنكير',
    # بيان
    'تشبيه', 'استعارة', 'مجاز', 'كناية',
    'الاستعارة', 'الكناية', 'المجاز',
    'تمثيل', 'تشخيص',
    # بديع
    'جناس', 'طباق', 'مقابلة',
    'الجناس', 'الطباق', 'المقابلة',
    'سجع', 'تكرار', 'التكرار',
    # إعجاز
    'إعجاز', 'البلاغة', 'بلاغة',
    'فصاحة', 'الفصاحة',
    # Quran-specific balagha discourse markers
    'أسلوب الحكيم',
    'النكتة', 'لطيفة',
    'الذوق البياني',
    'المناسبة',
    'انسجام', 'مقاصد',
    'ملاحظ', 'بيان',
}

# Sources that are 100% balagha (always include)
BALAGHA_THEORY_SOURCES = {
    "Asrar al-Balagha", "Asrar al-Balāgha",
    "Dalail al-I'jaz", "Dalāʾil al-Iʿjāz",
    "Miftah al-Ulum", "Miftāḥ al-ʿUlūm",
    "I'jaz al-Qur'an", "Iʿjāz al-Qurʾān",
    "al-Jurjani", "al-Sakkaki", "al-Baqillani",
}


def is_balagha_relevant(chunk: dict) -> tuple[bool, int]:
    """Return (is_relevant, trigger_count)."""
    title = chunk.get("source_title_en", "") or ""
    if any(s in title for s in BALAGHA_THEORY_SOURCES):
        return True, 99
    if chunk.get("chunk_kind") == "balagha_theory":
        return True, 99

    text = chunk.get("text_ar", "")
    hits = sum(1 for trig in TRIGGERS if trig in text)
    return hits >= 2, hits


def main():
    if not ALL_CHUNKS.exists():
        print(f"Missing: {ALL_CHUNKS}", file=sys.stderr); sys.exit(1)

    n_in = n_kept = 0
    by_source: dict[str, int] = {}

    with open(OUT_FILE, "w", encoding="utf-8") as out_fh:

        # 1) Pull from sarf master (tafsirs + PDFs already processed)
        print("Scanning all_chunks_clean.jsonl …", file=sys.stderr)
        with open(ALL_CHUNKS, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line: continue
                c = json.loads(line)
                n_in += 1
                relevant, hits = is_balagha_relevant(c)
                if relevant:
                    # Tag for balagha collection
                    c2 = dict(c)
                    c2["chunk_kind"] = "balagha"
                    c2.setdefault("meta_json", {})["balagha_trigger_count"] = hits
                    out_fh.write(json.dumps(c2, ensure_ascii=False) + "\n")
                    n_kept += 1
                    src = c.get("source_title_en", "?")[:40]
                    by_source[src] = by_source.get(src, 0) + 1

        # 2) Pull from archive_org chunks (Jurjani et al — already balagha)
        if ARCHIVE_CHUNKS.exists():
            print("Including archive_org_chunks.jsonl …", file=sys.stderr)
            with open(ARCHIVE_CHUNKS, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line: continue
                    c = json.loads(line)
                    n_in += 1
                    if c.get("chunk_kind") == "balagha_theory":
                        c2 = dict(c)
                        c2["chunk_kind"] = "balagha"
                        out_fh.write(json.dumps(c2, ensure_ascii=False) + "\n")
                        n_kept += 1
                        src = c.get("source_title_en", "?")[:40]
                        by_source[src] = by_source.get(src, 0) + 1

    print(f"\nTotal scanned: {n_in:,}", file=sys.stderr)
    print(f"Balagha-relevant: {n_kept:,}", file=sys.stderr)
    print(f"\nBy source:", file=sys.stderr)
    for src, n in sorted(by_source.items(), key=lambda x: -x[1]):
        print(f"  {n:>5d}  {src}", file=sys.stderr)
    print(f"\nOutput: {OUT_FILE}", file=sys.stderr)


if __name__ == "__main__":
    main()
