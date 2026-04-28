#!/usr/bin/env python3
"""
Chunk Tibyan (al-ʿUkbarī) pages by ayah anchors.

Tibyan structure: each ayah's irab starts with `قَوْلُهُ تَعَالَى` or `قَالَ تَعَالَى`
followed by the Quran text and analysis. We split chunks at these anchors.

Reads:
  data/raw/tibyan/pages.jsonl

Writes:
  data/staging/chunks/tibyan_chunks.jsonl

Each chunk:
  { id, source_id, source_title_en, chunk_kind: 'irab',
    chunk_seq, heading_norm, text_ar, page_no,
    meta_json: { surah, ayah_from, ayah_to, anchor_phrase, page_no } }
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[2]
PAGES_FILE = SCRIPT_DIR / "data/raw/tibyan/pages.jsonl"
OUT_FILE   = SCRIPT_DIR / "data/staging/chunks/tibyan_chunks.jsonl"
OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

SOURCE_ID_SLUG  = "SRC:TIBYAN_AKBARI"
SOURCE_TITLE_EN = "al-Tibyan fi I'rab al-Qur'an"
SOURCE_TITLE_AR = "التبيان في إعراب القرآن"

# Ayah anchor patterns. Tibyan uses several variants.
ANCHOR_PATTERNS = [
    re.compile(r'قَوْلُهُ\s*(?:تَعَالَى|عَزَّ\s*وَجَلَّ|ـُ)?\s*[:؛]?'),
    re.compile(r'قَالَ\s*تَعَالَى\s*[:؛]?'),
    re.compile(r'قَوْلُهُ\s*[:؛]'),
    re.compile(r'إِعْرَابُ\s+(?:قَوْلِهِ|الِاسْتِعَاذَةِ|التَّسْمِيَةِ)'),
]

# Combined regex for splitting
ANCHOR_RE = re.compile(
    r'(قَوْلُهُ\s*(?:تَعَالَى|عَزَّ\s*وَجَلَّ)?\s*[:؛]'
    r'|قَالَ\s*تَعَالَى\s*[:؛]'
    r'|إِعْرَابُ\s+(?:قَوْلِهِ|الِاسْتِعَاذَةِ|التَّسْمِيَةِ|سُورَةِ))'
)

# Surah heading detection
SURAH_HEADING_RE = re.compile(r'سُورَةُ\s*([؀-ۿ\s]+?)(?:\s|$)')

# Quran citation patterns to extract surah:ayah from anchor area
# Often the anchor is followed by the Arabic Quran text in braces or brackets
QURAN_CITATION_RE = re.compile(r'\{([^}]+)\}')


def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


# Surah name → number lookup (114 surah names)
SURAH_NAMES = {
    "الفاتحة": 1, "البقرة": 2, "آل عمران": 3, "النساء": 4, "المائدة": 5,
    "الأنعام": 6, "الأعراف": 7, "الأنفال": 8, "التوبة": 9, "يونس": 10,
    "هود": 11, "يوسف": 12, "الرعد": 13, "إبراهيم": 14, "الحجر": 15,
    "النحل": 16, "الإسراء": 17, "الكهف": 18, "مريم": 19, "طه": 20,
    "الأنبياء": 21, "الحج": 22, "المؤمنون": 23, "النور": 24, "الفرقان": 25,
    "الشعراء": 26, "النمل": 27, "القصص": 28, "العنكبوت": 29, "الروم": 30,
    "لقمان": 31, "السجدة": 32, "الأحزاب": 33, "سبأ": 34, "فاطر": 35,
    "يس": 36, "الصافات": 37, "ص": 38, "الزمر": 39, "غافر": 40,
    "فصلت": 41, "الشورى": 42, "الزخرف": 43, "الدخان": 44, "الجاثية": 45,
    "الأحقاف": 46, "محمد": 47, "الفتح": 48, "الحجرات": 49, "ق": 50,
    "الذاريات": 51, "الطور": 52, "النجم": 53, "القمر": 54, "الرحمن": 55,
    "الواقعة": 56, "الحديد": 57, "المجادلة": 58, "الحشر": 59, "الممتحنة": 60,
    "الصف": 61, "الجمعة": 62, "المنافقون": 63, "التغابن": 64, "الطلاق": 65,
    "التحريم": 66, "الملك": 67, "القلم": 68, "الحاقة": 69, "المعارج": 70,
    "نوح": 71, "الجن": 72, "المزمل": 73, "المدثر": 74, "القيامة": 75,
    "الإنسان": 76, "المرسلات": 77, "النبأ": 78, "النازعات": 79, "عبس": 80,
    "التكوير": 81, "الانفطار": 82, "المطففين": 83, "الانشقاق": 84, "البروج": 85,
    "الطارق": 86, "الأعلى": 87, "الغاشية": 88, "الفجر": 89, "البلد": 90,
    "الشمس": 91, "الليل": 92, "الضحى": 93, "الشرح": 94, "التين": 95,
    "العلق": 96, "القدر": 97, "البينة": 98, "الزلزلة": 99, "العاديات": 100,
    "القارعة": 101, "التكاثر": 102, "العصر": 103, "الهمزة": 104, "الفيل": 105,
    "قريش": 106, "الماعون": 107, "الكوثر": 108, "الكافرون": 109, "النصر": 110,
    "المسد": 111, "الإخلاص": 112, "الفلق": 113, "الناس": 114,
}


def normalize_arabic(s: str) -> str:
    """Strip diacritics for surah-name matching."""
    return re.sub(r'[ً-ٰٟۖ-ۭ]', '', s)


def detect_surah(text: str) -> int | None:
    """Find surah number from heading or context."""
    norm = normalize_arabic(text[:500])
    for name, num in SURAH_NAMES.items():
        if name in norm:
            return num
    return None


def extract_ayah_range(chunk_text: str, current_ayah: int | None) -> tuple[int | None, int | None]:
    """Extract ayah numbers near the chunk start, if any. Otherwise return current."""
    # Look for explicit ayah numbers in citations
    m = re.search(r'الآي(?:ة|ات)\s*[:\(]?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?', chunk_text[:300])
    if m:
        a_from = int(m.group(1))
        a_to   = int(m.group(2)) if m.group(2) else a_from
        return a_from, a_to
    return current_ayah, current_ayah


def main():
    if not PAGES_FILE.exists():
        print(f"No pages file at {PAGES_FILE}", file=sys.stderr); sys.exit(1)

    source_id = stable_id("AL:SRC:", SOURCE_ID_SLUG)

    # Load all pages
    pages = []
    with open(PAGES_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                pages.append(json.loads(line))
    pages.sort(key=lambda p: p["page_no"])
    print(f"Loaded {len(pages)} Tibyan pages", file=sys.stderr)

    chunks_out: list[dict] = []
    current_surah: int | None = None
    current_ayah: int | None = None
    chunk_seq = 0

    for page in pages:
        text = page["text_ar"]
        page_no = page["page_no"]

        # Update surah tracking
        detected = detect_surah(text)
        if detected:
            current_surah = detected
            current_ayah = 1  # reset to ayah 1 when entering new surah

        # Split page text by anchor patterns
        # Find all anchor positions
        anchor_positions = [m.start() for m in ANCHOR_RE.finditer(text)]

        if not anchor_positions:
            # No anchor — treat whole page as one chunk continuing prior surah/ayah
            if len(text.strip()) >= 200 and current_surah:
                chunk_id = stable_id("AL:CHUNK:", source_id, page_no, 0)
                chunks_out.append({
                    "id":              chunk_id,
                    "source_id":       source_id,
                    "source_title_en": SOURCE_TITLE_EN,
                    "chunk_kind":      "irab",
                    "chunk_seq":       chunk_seq,
                    "heading_norm":    f"Tibyan p.{page_no} — Surah {current_surah}:{current_ayah}",
                    "text_ar":         text,
                    "page_no":         page_no,
                    "meta_json": {
                        "surah":     current_surah,
                        "ayah":      current_ayah,
                        "ayah_from": current_ayah,
                        "ayah_to":   current_ayah,
                        "page_no":   page_no,
                        "title_ar":  SOURCE_TITLE_AR,
                        "anchor":    None,
                    },
                })
                chunk_seq += 1
            continue

        # Slice page at anchor positions
        positions = [0] + anchor_positions + [len(text)]
        for i in range(len(positions) - 1):
            seg_start = positions[i]
            seg_end   = positions[i + 1]
            seg = text[seg_start:seg_end].strip()
            if len(seg) < 100:
                continue

            # Try to extract ayah range from this segment
            seg_ayah_from, seg_ayah_to = extract_ayah_range(seg, current_ayah)
            if seg_ayah_from:
                current_ayah = seg_ayah_from

            anchor_text = None
            if seg_start > 0:
                anchor_match = ANCHOR_RE.search(text[seg_start-2:seg_start+50])
                if anchor_match:
                    anchor_text = anchor_match.group(0)[:60]

            chunk_id = stable_id("AL:CHUNK:", source_id, page_no, i)
            chunks_out.append({
                "id":              chunk_id,
                "source_id":       source_id,
                "source_title_en": SOURCE_TITLE_EN,
                "chunk_kind":      "irab",
                "chunk_seq":       chunk_seq,
                "heading_norm":    f"Tibyan p.{page_no} — Surah {current_surah or '?'}:{seg_ayah_from or '?'}",
                "text_ar":         seg,
                "page_no":         page_no,
                "meta_json": {
                    "surah":     current_surah,
                    "ayah":      seg_ayah_from,
                    "ayah_from": seg_ayah_from,
                    "ayah_to":   seg_ayah_to,
                    "page_no":   page_no,
                    "title_ar":  SOURCE_TITLE_AR,
                    "anchor":    anchor_text,
                },
            })
            chunk_seq += 1

    # Write output
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for c in chunks_out:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    # Stats
    by_surah = {}
    for c in chunks_out:
        s = c["meta_json"].get("surah")
        if s: by_surah[s] = by_surah.get(s, 0) + 1

    print(f"\nGenerated {len(chunks_out):,} Tibyan chunks → {OUT_FILE}", file=sys.stderr)
    print(f"Surah coverage: {len(by_surah)} surahs", file=sys.stderr)
    if by_surah:
        for s, n in sorted(by_surah.items())[:10]:
            print(f"  Surah {s}: {n} chunks", file=sys.stderr)
        if len(by_surah) > 10:
            print(f"  ... and {len(by_surah)-10} more surahs", file=sys.stderr)


if __name__ == "__main__":
    main()
