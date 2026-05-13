#!/usr/bin/env python3
"""
Second deep pass — stratified 1000-root sample to catch what the random
sample missed. We deliberately pull from each of Lisan's 15 volumes so
the analysis covers the full corpus, then drill into the EDGE CASES the
first pass flagged:

  ▸ 27 footer footnote rows with NO matching body marker
  ▸ 1  body marker with NO matching footer text
  ▸ 16 pages where the marker is a bare digit (no `(( ))` wrapper)
  ▸ Poetry-block typing accuracy gap (only 18% had a cue in pass 1)
  ▸ Quran cue density across the whole corpus

Output: structured findings + concrete fix recommendations.
"""

import sqlite3, re
from collections import defaultdict, Counter
from pathlib import Path

STAGE = Path('/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map'
             '/km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline'
             '/ibn_manzur_lisan_al_arab/stage.sqlite')

asciiD = {0x660+i: 48+i for i in range(10)}
def d2int(s): return int(s.translate(asciiD))
DIACR_RX = re.compile(r'[ً-ٰٟـۖ-ࣰۭ-ࣿ]')
def strip_diac(s): return DIACR_RX.sub('', s or '')


def main():
    con = sqlite3.connect(STAGE)
    cur = con.cursor()

    # ── Stratified sample: 67 roots per "volume window" (page range / 15) ──
    cur.execute("SELECT MAX(page_end) FROM lex_root")
    max_page = cur.fetchone()[0] or 8101
    window = max_page // 15
    print(f'=== Stratified 1000-root sample across {max_page} pages (window={window}) ===\n')
    sample = []
    for v in range(15):
        lo, hi = v*window, (v+1)*window
        rows = cur.execute(
            "SELECT root_norm, page_start, page_end FROM lex_root "
            "WHERE page_start BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 67",
            (lo, hi)
        ).fetchall()
        sample.extend(rows)
    print(f'Got {len(sample)} roots, spanning pages {sample[0][1]} – {sample[-1][2]}')

    pages = set()
    for (_, ps, pe) in sample:
        for p in range(ps, (pe or ps)+1):
            pages.add(p)

    # ── 1. Marker pattern audit — what variants exist in body? ─────────
    print('\n─── 1. ALL DIGIT PATTERNS IN BODY (full corpus) ───')
    patterns = {
        'paren_double':  re.compile(r'\(\(\s*([٠-٩0-9]+)\s*\)\)'),
        'paren_single':  re.compile(r'(?<!\()\(\s*([٠-٩0-9]+)\s*\)(?!\))'),
        'guill':         re.compile(r'«\s*([٠-٩0-9]+)\s*»'),
        'bracket':       re.compile(r'\[\s*([٠-٩0-9]+)\s*\]'),
        'asterisk':      re.compile(r'\*\s*([٠-٩0-9]+)'),
        'bare_word':     re.compile(r'(?:^|\s)([٠-٩]+)(?=\s+[ء-ي])'),
    }
    pattern_counts = Counter()
    body_rows = cur.execute("SELECT page_no, text_ar FROM page_segments WHERE segment_type='body'").fetchall()
    print(f'Total body pages: {len(body_rows)}')
    for _, txt in body_rows:
        for name, rx in patterns.items():
            pattern_counts[name] += len(rx.findall(txt or ''))
    print('Marker pattern occurrence counts (full corpus):')
    for name, n in pattern_counts.most_common():
        print(f'  {name:18s} {n}')

    # ── 2. The 27 unmatched footer rows — what are they? ──────────────
    print('\n─── 2. UNMATCHED FOOTER FOOTNOTES (whole corpus) ───')
    fn_by_page = defaultdict(dict)
    for p, num, txt in con.execute(
        "SELECT page_no, footnote_no, text_ar FROM page_segments WHERE segment_type='footnote'"
    ):
        if p is None or num is None: continue
        try: fn_by_page[p][d2int(str(num))] = txt
        except: pass

    paren_rx = re.compile(r'\(\(\s*([٠-٩0-9]+)\s*\)\)')
    body_markers = defaultdict(set)
    for p, txt in body_rows:
        for h in paren_rx.findall(txt or ''):
            body_markers[p].add(d2int(h))

    orphan_rows = []
    for p, fns in fn_by_page.items():
        body = body_markers.get(p, set())
        for n, txt in fns.items():
            if n not in body:
                orphan_rows.append((p, n, txt[:120] if txt else ''))

    print(f'Total orphan footer rows (no matching body marker): {len(orphan_rows)}')
    print('First 10 orphans:')
    for p, n, preview in orphan_rows[:10]:
        print(f'  p={p:5d} fn={n}  → {preview!r}')

    # Check: are these on pages where the body text contains DIFFERENT marker forms?
    print()
    print('Inspecting orphan pages for alternative marker forms...')
    for p, n, _ in orphan_rows[:5]:
        body = next((t for pp, t in body_rows if pp == p), '')
        digits = re.findall(r'[٠-٩]+', body)
        print(f'  page {p}: all digit groups in body = {digits}')

    # ── 3. Body marker without footer (the 1 case) ────────────────────
    print('\n─── 3. BODY MARKERS WITHOUT FOOTER ───')
    misses = []
    for p, markers in body_markers.items():
        foot = set(fn_by_page.get(p, {}).keys())
        for n in markers - foot:
            misses.append((p, n))
    print(f'Total: {len(misses)}')
    for p, n in misses[:10]:
        print(f'  p={p} body marker {n}')

    # ── 4. Poetry typing accuracy across full corpus ──────────────────
    print('\n─── 4. POETRY BLOCK TYPING (full corpus) ───')
    cur.execute("SELECT text_plain FROM lex_block WHERE block_type='poetry_quote' AND text_plain IS NOT NULL")
    poetry_all = [r[0] for r in cur.fetchall()]
    print(f'Total poetry_quote blocks: {len(poetry_all)}')
    cues = [strip_diac(c) for c in (
        'قال الشاعر','وأنشد','قول الشاعر','قال الراجز','قال الفرزدق',
        'أنشد', 'قال جرير', 'قال امرؤ', 'قال ذو الرمة',
    )]
    with_cue   = 0
    has_hemi   = 0  # contains hemistich separator
    looks_prose= 0  # short, no ellipsis, no break — likely mis-tagged
    for t in poetry_all:
        tu = strip_diac(t)
        is_cue = any(c in tu for c in cues)
        is_hemi = '...' in t or '،' in t and '\n' in t
        if is_cue: with_cue += 1
        if is_hemi: has_hemi += 1
        if not is_cue and not is_hemi and len(t) < 80:
            looks_prose += 1
    print(f'  with explicit cue:          {with_cue}  ({100*with_cue/len(poetry_all):.0f}%)')
    print(f'  has hemistich/line break:   {has_hemi}  ({100*has_hemi/len(poetry_all):.0f}%)')
    print(f'  short + no cue + no break:  {looks_prose}  ({100*looks_prose/len(poetry_all):.0f}%)  ← likely mis-tagged')

    # ── 5. Quran cue density (full corpus, diacritic-stripped) ────────
    print('\n─── 5. QURAN CUE DENSITY (full corpus, normalized) ───')
    # Strip diacritics ONCE on whole corpus body text — slow but thorough
    sample_pages_for_quran = list(pages)[:300]
    cue_total = Counter()
    star_terminator = 0
    holy_word_pages = 0
    raw_html_dir = STAGE.parent / 'raw_html'
    pages_with_g_holy = set()
    cues = ['قوله تعالى','قال الله تعالى','قوله عز وجل','قال تعالى',
            'قوله سبحانه','قول الله عز وجل','يقول الله تعالى',
            'في قوله تعالى','عز وجل','تبارك وتعالى']
    for p in sample_pages_for_quran:
        body = next((t for pp,t in body_rows if pp == p), None)
        if not body: continue
        body_ud = strip_diac(body)
        for c in cues:
            cue_total[c] += body_ud.count(c)
        # Star terminator after Arabic word
        star_terminator += len(re.findall(r'[ء-ي]\*', body))
        f = raw_html_dir / f'page_{p:04d}_001.html'
        if f.exists():
            h = f.read_text()
            if 'class="g-holy-word"' in h:
                pages_with_g_holy.add(p)
    print(f'Sampled {len(sample_pages_for_quran)} pages')
    for c, n in cue_total.most_common():
        print(f'  cue {c!r:30s} {n}')
    print(f'  asterisk-terminator hits:  {star_terminator}')
    print(f'  pages with g-holy-word:    {len(pages_with_g_holy)}')

    # ── 6. Authority over-counts — boundary check ─────────────────────
    print('\n─── 6. AUTHORITY OVER-COUNT CHECK ───')
    cur.execute("SELECT text_plain FROM lex_block WHERE text_plain IS NOT NULL LIMIT 50000")
    blob_ud = strip_diac('\n'.join(r[0] for r in cur.fetchall()))
    short_names = {
        'أبي':   'Ubayy (bare kunyah, false-positive prone)',
        'علي':   'Ali (collides with عليه/عليك/علينا/عالي)',
        'عمر':   'Umar (collides with عمران/عمارة/عمر- prefixes)',
        'حمزة':  'Hamza (proper-noun, mostly unique)',
        'نافع':  'Nafi (could be adjective)',
        'عاصم':  'Asim (could be epithet)',
    }
    # Compare bare count vs boundary-anchored count
    print('Name          | bare-substring | word-anchored | safe?')
    for n, label in short_names.items():
        nu = strip_diac(n)
        bare = blob_ud.count(nu)
        # require whitespace or line-start before, whitespace/punct after
        anchored = len(re.findall(rf'(?:^|\s){re.escape(nu)}(?=\s|[\.،؛:!?])', blob_ud, flags=re.MULTILINE))
        verdict = '✓ safe' if anchored / max(1,bare) > 0.7 else '⚠ filter required'
        print(f'  {nu:8s}    {bare:6d}        {anchored:6d}        {verdict}   ({label})')

    # ── 7. Section/block ratio — multi-section roots (rare?) ──────────
    print('\n─── 7. SECTION DISTRIBUTION ───')
    cur.execute("SELECT COUNT(*) FROM lex_section")
    print(f'Total sections: {cur.fetchone()[0]}')
    cur.execute("""
      SELECT n_sec, COUNT(*) FROM (
        SELECT root_norm, COUNT(*) AS n_sec FROM lex_section GROUP BY root_norm
      ) GROUP BY n_sec ORDER BY n_sec
    """)
    print('Roots by section count:')
    for nsec, nroots in cur.fetchall():
        print(f'  {nsec} sections: {nroots} roots')

    # ── 8. Volume distribution (any obvious data gaps?) ──────────────
    print('\n─── 8. PAGE COUNT BY 1000-PAGE BAND ───')
    cur.execute("""
      SELECT (page_start / 1000) * 1000 AS band, COUNT(*) AS n_roots
      FROM lex_root WHERE page_start IS NOT NULL
      GROUP BY band ORDER BY band
    """)
    for band, n in cur.fetchall():
        print(f'  pages {band:5d}–{band+999:5d}: {n:5d} roots')

    print('\n=== ANALYSIS COMPLETE ===')


if __name__ == '__main__':
    main()
