#!/usr/bin/env python3
"""
Weak-supervision NER: discover authority names cited in Lisan al-Arab
that the hand-curated registry doesn't already have.

Approach
────────
Lisan citations follow a tight syntactic pattern:
    قَالَ <NAME>:  …    OR    عَنْ <NAME>  …    OR    رَوَى <NAME>  …
We:
  1. Strip diacritics from every block.
  2. Match `قال X:` / `عن X` / `روى X` with a length-bounded NAME slot.
  3. Discard candidates that match known stopwords (verbs, pronouns,
     "الله", common phrases).
  4. Filter by frequency — a real authority is cited ≥ MIN_HITS times.
  5. Drop candidates already covered by the existing AUTHORITIES registry
     (loaded from the worker source).

Output: ranked TSV of new candidates → human reviewer picks which to
promote into the worker's registry.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

HERE   = Path(__file__).resolve().parent
INPUT  = HERE / '.lisan_qala_corpus.json'
WORKER = HERE.parents[1] / 'workers/ar-linguistics/src/routes/lexicon_lisan.ts'
OUT    = HERE / 'mined-authorities.tsv'

MIN_HITS = 5      # below this, treat as noise

DIACR_RX = re.compile(r'[ً-ٰٟۖ-ۭـ]')
def strip_diac(s: str) -> str: return DIACR_RX.sub('', s or '')

# Stopword fragments that often appear in `قال X:` but aren't authorities:
#   - religious phrases / titles
#   - pronouns / particles
#   - generic verbs in passive voice
STOPWORDS = {
    'الله', 'الرسول', 'النبي', 'له', 'لها', 'لنا', 'لكم', 'لهم',
    'الراوي', 'الكاتب', 'القائل', 'بعضهم', 'الرجل', 'الناس',
    'صاحبه', 'أبوه', 'أبي', 'أمه', 'ابنه', 'أخوه',
    'بعض', 'كل', 'ذلك', 'ذاك', 'الذي', 'الذين', 'هذا', 'هذه',
    'بعضكم', 'بعضنا',
}

# Patterns that introduce an authority.
# We capture 1–4 token names. The name must NOT contain ':' or end with
# certain function words.
NAME_TOKEN = r'(?:[ء-ي]{2,15})'
NAME_SLOT  = rf'({NAME_TOKEN}(?:\s+{NAME_TOKEN}){{0,3}})'

PATTERNS = [
    re.compile(rf'قال\s+{NAME_SLOT}\s*:'),
    re.compile(rf'وقال\s+{NAME_SLOT}\s*:'),
    re.compile(rf'عن\s+{NAME_SLOT}\s*:'),
    re.compile(rf'روى\s+{NAME_SLOT}\s*:'),
    re.compile(rf'حدثنا\s+{NAME_SLOT}\s*:'),
    re.compile(rf'أنشد\s+{NAME_SLOT}\s*:'),
    re.compile(rf'سألت\s+{NAME_SLOT}'),
]


def load_existing_variants() -> set[str]:
    """Pull all `variants:` strings from the worker source so we can
    de-duplicate against the human-curated registry."""
    src = WORKER.read_text()
    # variants: ['الفلاني', 'أبو الفلاني']
    rx = re.compile(r"variants:\s*\[([^\]]*)\]")
    out: set[str] = set()
    for m in rx.finditer(src):
        for v in re.findall(r"'([^']+)'", m.group(1)):
            out.add(strip_diac(v))
    return out


def main():
    blocks = json.load(open(INPUT))[0]['results']
    print(f'Scanning {len(blocks)} blocks…')

    counter: Counter[str] = Counter()
    for b in blocks:
        text = strip_diac(b['text_plain'] or '')
        for rx in PATTERNS:
            for m in rx.finditer(text):
                name = m.group(1).strip()
                # Reject if too short, contains stopword, looks like a verb
                if len(name) < 3: continue
                first = name.split()[0]
                if first in STOPWORDS: continue
                if any(w in STOPWORDS for w in name.split()): continue
                # Reject names that start with common verbs
                if first in {'كان', 'كانت', 'يقول', 'تقول', 'يكون', 'لما', 'إذا'}: continue
                counter[name] += 1

    known = load_existing_variants()
    new   = [(n, c) for n, c in counter.most_common()
             if c >= MIN_HITS and n not in known
             # also drop if any known variant is a substring of this (e.g.,
             # "الازهري النحوي" — we already have "الازهري")
             and not any(k in n for k in known if len(k) >= 6)]

    print(f'Distinct candidates ≥{MIN_HITS} hits and NOT in registry: {len(new)}')
    print('\nTop 40 new candidates:\n')
    print(f'  hits   name')
    print(f'  -----  ----------------------------------------')
    for name, hits in new[:40]:
        print(f'  {hits:5d}  {name}')

    with OUT.open('w') as f:
        f.write('hits\tcandidate\n')
        for name, hits in new:
            f.write(f'{hits}\t{name}\n')
    print(f'\nWrote {len(new)} candidates → {OUT}')


if __name__ == '__main__':
    main()
