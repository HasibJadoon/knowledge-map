#!/usr/bin/env python3
"""
Parse the 5 downloaded qira'at variants into per-(surah,ayah) text rows.

Source format (from Ishaksmail/QuranJSON):
    سُورَةُ اُ۬لْفَاتِحَةِ            ← surah header (no number)
    <verse text> ١ <verse text> ٢ <verse text> ٣ …

We walk the file, count surah headers (#1 = al-Fatiha, #2 = al-Baqara…)
and tokenize each surah body on Arabic-Indic numerals as verse delimiters.

Output: `.qiraat-corpus.json` with rows
    { qiraa, surah, ayah, text }   (text is normalized text_bare style)
"""
from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
QIRA_DIR = HERE / 'qiraat'
OUT = HERE / '.qiraat-corpus.json'

QIRAA_NAMES = ['Warsh', 'Qaloun', 'Douri', 'Sousi', 'Shuba']

# Surah header always starts with `سُورَةُ` and may include vowel marks.
SURAH_HEADER_RX = re.compile(r'^\s*سُو?رَ?ةُ?\s+.*$', re.UNICODE | re.MULTILINE)
# Verse-end marker = consecutive Arabic-Indic digits surrounded by spaces
# or string boundaries.
VERSE_MARKER_RX = re.compile(r'([٠-٩]+)')

DIACR_RX = re.compile(r'[ً-ٰٟۖ-ۭـ]')
PUNCT_RX = re.compile(r'[\.,،؛:!؟\?\(\)\[\]«»"\'\-—\*]')

def normalize(s: str) -> str:
    s = DIACR_RX.sub('', s or '')
    s = PUNCT_RX.sub(' ', s)
    s = s.translate(str.maketrans({
        'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
        'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي', 'ة': 'ه',
    }))
    return re.sub(r'\s+', ' ', s).strip()


def parse_qiraa(path: Path, qiraa: str) -> list[dict]:
    text = path.read_text()
    # Split into surah blocks. Each block starts AT a surah header line.
    # `re.split` with MULTILINE on `^سُورَةُ …$` slices on each header line.
    parts = SURAH_HEADER_RX.split(text)
    # parts[0] is preamble (empty for these files); parts[1..] are surah bodies
    rows: list[dict] = []
    for surah_idx, body in enumerate(parts[1:], start=1):
        # Split surah body on Arabic-Indic numeric markers (each marker
        # closes the preceding ayah). The split yields alternating
        # [text, marker, text, marker, …]
        pieces = VERSE_MARKER_RX.split(body)
        ayah_no = 0
        # The structure: text₁, marker₁, text₂, marker₂, …, trailing_text
        for i in range(0, len(pieces), 2):
            piece_text = pieces[i].strip()
            if not piece_text: continue
            ayah_no += 1
            norm = normalize(piece_text)
            if norm and len(norm) > 3:
                rows.append({
                    'qiraa': qiraa, 'surah': surah_idx, 'ayah': ayah_no,
                    'text': norm,
                })
    return rows


def main():
    out_rows: list[dict] = []
    for qiraa in QIRAA_NAMES:
        path = QIRA_DIR / f'{qiraa}.txt'
        if not path.exists():
            print(f'SKIP: {path} missing'); continue
        rows = parse_qiraa(path, qiraa)
        # Verify: ayah_count per surah
        from collections import Counter
        per_surah = Counter(r['surah'] for r in rows)
        total = len(rows)
        max_surah = max(per_surah)
        print(f'{qiraa:8s}  total_ayahs={total:6d}  surahs={max_surah}  '
              f'(target=6236 across 114 surahs)')
        out_rows.extend(rows)
    json.dump(out_rows, open(OUT, 'w'), ensure_ascii=False)
    print(f'\nWrote {len(out_rows)} rows → {OUT.name}')


if __name__ == '__main__':
    main()
