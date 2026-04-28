#!/usr/bin/env python3
"""
Chunk Itqan (al-Suyūṭī, ed. Abū al-Faḍl Ibrāhīm) pages scraped from islamweb.net.

Itqan structure: 80 نوع (chapter/type) covering all areas of Quranic sciences.
All 4 volumes are present in data/raw/islamweb/itqan/pages.jsonl (590 real pages,
page_ids 1-599; JS-noise pages beyond 599 are filtered by Arabic character count).

Reads:  data/raw/islamweb/itqan/pages.jsonl
Writes: data/staging/chunks/itqan_chunks.jsonl
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[2]
PAGES_FILE = SCRIPT_DIR / "data/raw/islamweb/itqan/pages.jsonl"
OUT_FILE   = SCRIPT_DIR / "data/staging/chunks/itqan_chunks.jsonl"
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

SOURCE_ID_SLUG  = "SRC:ITQAN_SUYUTI_ABU_FADL"
SOURCE_TITLE_EN = "al-Suyuti - al-Itqan fi Ulum al-Qur'an (ed. Abu al-Fadl Ibrahim)"
SOURCE_TITLE_AR = "الإتقان في علوم القرآن"

# Minimum Arabic character density to filter out JS-noise pages
MIN_ARABIC_CHARS = 20

# Printed page marker pattern in extracted text: [ ص: NNN ]
PRINTED_PAGE_RE = re.compile(r'\[\s*ص\s*:\s*(\d+)\s*\]')

# Naw (type) detection in text
NAW_RE = re.compile(
    r'النوع\s+'
    r'((?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر'
    r'|الحادي|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع'
    r'|العشرون|الثلاثون|الأربعون|الخمسون|الستون|السبعون|الثمانون'
    r'|[ا-ي]+(?:\s+و?[ا-ي]+){0,3})'
    r')'
)

# Balagha trigger words
BALAGHA_TRIGGERS = [
    'تقديم وتأخير', 'الالتفات', 'الحصر', 'القصر', 'إنما',
    'تشبيه', 'استعارة', 'مجاز', 'كناية', 'جناس', 'طباق',
    'إيجاز', 'إطناب', 'إعجاز', 'البلاغة', 'فصاحة',
    'النكتة', 'أسلوب الحكيم', 'المقابلة', 'التورية',
]

# Irab trigger words
IRAB_TRIGGERS = [
    'إعراب', 'مبتدأ', 'خبر', 'فاعل', 'مفعول', 'نصب', 'رفع', 'جر', 'جزم',
    'منصوب', 'مرفوع', 'مجرور', 'مجزوم', 'ظرف', 'حال', 'تمييز', 'بدل',
    'صفة', 'نعت', 'توكيد', 'عطف', 'مضاف', 'مضاف إليه',
]

ARABIC_RE = re.compile(r'[؀-ۿ]')


def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def detect_chunk_kind(text: str) -> str:
    """Classify chunk as 'irab', 'balagha', or 'ulum_quran'."""
    bal_hits = sum(1 for t in BALAGHA_TRIGGERS if t in text)
    irab_hits = sum(1 for t in IRAB_TRIGGERS if t in text)
    if bal_hits >= 2:
        return "balagha"
    if irab_hits >= 3:
        return "irab"
    return "ulum_quran"


def extract_printed_page(text: str) -> int | None:
    """Extract the first printed page number from [ ص: NNN ] markers."""
    m = PRINTED_PAGE_RE.search(text)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


def extract_naw(text: str) -> str | None:
    """Extract النوع label from beginning of text."""
    m = NAW_RE.search(text[:500])
    if m:
        return m.group(1).strip()
    return None


def is_real_arabic_page(text: str) -> bool:
    """Return True if page has sufficient Arabic content (not JS noise)."""
    return len(ARABIC_RE.findall(text)) >= MIN_ARABIC_CHARS


def main():
    if not PAGES_FILE.exists():
        print(f"No pages file at {PAGES_FILE}", file=sys.stderr)
        sys.exit(1)

    source_id = stable_id("AL:SRC:", SOURCE_ID_SLUG)

    # Load all pages
    raw_pages = []
    with open(PAGES_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                raw_pages.append(json.loads(line))

    print(f"Loaded {len(raw_pages)} raw Itqan pages from islamweb scrape", file=sys.stderr)

    # Filter to real Arabic pages and sort by page_id
    pages = [p for p in raw_pages if is_real_arabic_page(p["text_ar"])]
    pages.sort(key=lambda p: p["page_id"])
    print(f"Real Arabic pages after filter: {len(pages)}", file=sys.stderr)

    chunks_out: list[dict] = []
    current_naw: str | None = None
    naw_seq: int = 0          # monotonic seq within naws for ordering
    chunk_seq = 0

    for page in pages:
        text = page["text_ar"].strip()
        if len(text) < 100:
            continue

        page_id = page["page_id"]

        # Update current Naw
        naw = extract_naw(text) or page.get("naw")
        if naw and naw != current_naw:
            current_naw = naw
            naw_seq += 1

        # Extract printed page number from text
        printed_page = extract_printed_page(text) or page.get("printed_page")

        kind = detect_chunk_kind(text)

        chunk_id = stable_id("AL:CHUNK:", source_id, str(page_id))

        heading = f"الإتقان"
        if current_naw:
            heading += f" — النوع {current_naw}"
        if printed_page:
            heading += f" ص{printed_page}"

        chunks_out.append({
            "id":              chunk_id,
            "source_id":       source_id,
            "source_title_en": SOURCE_TITLE_EN,
            "chunk_kind":      kind,
            "chunk_seq":       chunk_seq,
            "heading_norm":    heading,
            "text_ar":         text,
            "page_no":         printed_page,
            "meta_json": {
                "title_ar":   SOURCE_TITLE_AR,
                "author":     "جلال الدين السيوطي",
                "edition":    "تحقيق أبو الفضل إبراهيم",
                "naw":        current_naw,
                "naw_seq":    naw_seq,
                "page_id":    page_id,
                "page_no":    printed_page,
                "url":        page.get("url", ""),
            },
        })
        chunk_seq += 1

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for c in chunks_out:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    n_irab    = sum(1 for c in chunks_out if c["chunk_kind"] == "irab")
    n_balagha = sum(1 for c in chunks_out if c["chunk_kind"] == "balagha")
    n_ulum    = sum(1 for c in chunks_out if c["chunk_kind"] == "ulum_quran")

    print(f"\nGenerated {len(chunks_out):,} Itqan chunks → {OUT_FILE}", file=sys.stderr)
    print(f"  irab:        {n_irab}", file=sys.stderr)
    print(f"  balagha:     {n_balagha}", file=sys.stderr)
    print(f"  ulum_quran:  {n_ulum}", file=sys.stderr)


if __name__ == "__main__":
    main()
