#!/usr/bin/env python3
"""Phase 1 aggregate report: matrix view of every source × every signal."""
import json
from pathlib import Path
from collections import defaultdict

H = Path(__file__).resolve().parent

def load(name): return json.load(open(H/f'.{name}.json'))[0]['results']

roots = {r['source_slug']: r['n'] for r in load('p1_roots')}
sec = {}
for r in load('p1_sec'):
    sec[r['source_slug']] = (r['n_sec'], r['empty_sec'] or 0)

bt = defaultdict(lambda: defaultdict(int))
for r in load('p1_bt'):
    bt[r['source_slug']][r['block_type']] = r['n']

braced = {r['source_slug']: r['n_braced'] for r in load('p1_braced')}
qrefs  = {r['source_slug']: r['n'] for r in load('p1_qrefs')}

cols = ['source','roots','sects','empty_sec','blocks','defn','qrn_q','hdt_q','poet_q','fn_blk','{...}','qrefs','q_ratio']
widths = [42,5,6,7,8,7,5,5,5,6,6,5,7]
print('  '.join(f'{c:<{w}}' for c,w in zip(cols,widths)))
print('-' * (sum(widths) + len(widths)*2))

total_roots = sum(roots.values())
total_qrefs = sum(qrefs.values())

for slug in sorted(roots, key=lambda s: -roots[s]):
    b = bt[slug]
    s_n, s_empty = sec.get(slug, (0,0))
    qq = b.get('quran_quote', 0)
    qr = qrefs.get(slug, 0)
    q_ratio = f'{100*qr/max(1,qq):.0f}%' if qq > 0 else (
        f'{qr}/braced({braced.get(slug,0)})' if braced.get(slug, 0) > 100 else 'n/a')
    vals = [slug[:40], roots[slug], s_n, s_empty,
            sum(b.values()), b.get('definition',0), qq,
            b.get('hadith_quote',0), b.get('poetry_quote',0),
            b.get('footnote',0), braced.get(slug,0), qr, q_ratio]
    print('  '.join(f'{v:<{w}}' for v,w in zip(vals,widths)))

print()
print(f'Total roots across corpus: {total_roots:,}')
print(f'Total quran_refs:          {total_qrefs:,}')
print()

# Surface anomalies
print('═══ SUSPICIOUS PATTERNS ═══')
for slug in sorted(roots, key=lambda s: -roots[s]):
    b = bt[slug]
    s_n, s_empty = sec.get(slug, (0,0))
    issues = []
    if s_empty > roots[slug] * 0.01:
        issues.append(f'{s_empty} empty sections ({100*s_empty/s_n:.1f}%)')
    if sum(b.values()) < roots[slug] * 2:
        issues.append(f'thin: {sum(b.values())} blocks / {roots[slug]} roots')
    qq = b.get('quran_quote', 0)
    if qq > 100 and qrefs.get(slug, 0) < qq * 0.2:
        issues.append(f'low Quran-ref yield: {qrefs.get(slug,0)}/{qq}')
    if braced.get(slug, 0) > 1000 and qrefs.get(slug, 0) < 200:
        issues.append(f'{braced[slug]} brace-blocks vs {qrefs.get(slug,0)} refs — likely matn/lemma noise')
    if issues:
        print(f'  {slug}: {"; ".join(issues)}')
