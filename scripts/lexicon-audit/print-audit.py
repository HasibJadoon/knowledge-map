#!/usr/bin/env python3
"""Consolidate the per-table audit JSON dumps into a single matrix."""
import json
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).resolve().parent

def load(name):
    return json.load(open(HERE / f'.{name}.json'))[0]['results']

roots      = {r['source_slug']: r['n'] for r in load('roots')}
qrefs      = {r['source_slug']: r['n'] for r in load('qrefs')}
links      = {r['source_slug']: r['n'] for r in load('links')}
sec_inline = {r['source_slug']: r for r in load('sec_inline')}
# Block-type matrix
btypes: dict[str, dict[str, int]] = defaultdict(dict)
for r in load('blocks'):
    btypes[r['source_slug']][r['block_type']] = r['n']

types = ['definition', 'root_header', 'hadith_quote', 'quran_quote',
         'poetry_quote', 'footnote', 'entry_header', 'chapter_header',
         'page_break']

hdr_cols = ['source','roots','sections','inline_fn','blocks',
            'defn','hadith','quran','poetry','footnote','qrefs','links']
widths   = [40,5,7,9,7,7,7,5,6,8,6,6]
print('  '.join(f'{c:<{w}}' for c, w in zip(hdr_cols, widths)))
print('-' * (sum(widths) + len(widths)*2))

for slug in sorted(roots, key=lambda s: -roots[s]):
    bt = btypes.get(slug, {})
    si = sec_inline.get(slug, {})
    row = [
        slug[:38],
        roots.get(slug, 0),
        si.get('n_sections', 0),
        si.get('n_inline_fn', 0),
        sum(bt.values()),
        bt.get('definition', 0),
        bt.get('hadith_quote', 0),
        bt.get('quran_quote', 0),
        bt.get('poetry_quote', 0),
        bt.get('footnote', 0),
        qrefs.get(slug, 0),
        links.get(slug, 0),
    ]
    print('  '.join(f'{v:<{w}}' for v, w in zip(row, widths)))

# Flag gaps
print()
print('GAPS — sources with quran_quote blocks but few/no quran_refs:')
for slug in roots:
    bt = btypes.get(slug, {})
    qq = bt.get('quran_quote', 0)
    qr = qrefs.get(slug, 0)
    if qq > 50 and qr < qq * 0.3:
        print(f'  {slug:<48} qq={qq} qrefs={qr} → resolve')

print()
print('GAPS — sources with inline-fn sections but no per-source composer:')
for slug, si in sec_inline.items():
    if si.get('n_inline_fn', 0) > 100:
        print(f'  {slug:<48} sections_with_[[..]]: {si["n_inline_fn"]}')
