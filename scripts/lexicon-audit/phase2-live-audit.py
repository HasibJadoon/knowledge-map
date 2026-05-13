#!/usr/bin/env python3
"""
Phase-2 live audit: hit the actual reader endpoint for a stratified sample
of ~1,000 roots per source. Catch composer-level failures the SQL audit
can't see — empty paragraph arrays, 500s, content-shape regressions.

We hit:
  /api/al/lex/v2/read/<slug>/<root_norm>     (classical-lexicon composer)
  /api/al/lex/v2/read/ketabonline_al_raghib_mufradat/<root>  (mufradat)
  /api/al/lex/v2/entry/lane_lexicon/<root>   (lane falls through to v2 entry)

Parallel via threadpool. Aggregates failures by category.
"""
from __future__ import annotations

import json, sqlite3, sys, time, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from collections import defaultdict, Counter
import random

HERE = Path(__file__).resolve().parent
BASE = 'https://backend.k-maps.com/api'

CLASSICAL_SLUGS = {
    'ketabonline_ibn_manzur_lisan_al_arab',
    'ketabonline_al_jawhari_al_sihah',
    'thahabi_al_khalil_kitab_al_ayn',
    'saaid_maqayis_al_lugha',
    'qomra_al_ubab_al_zakhir',
    'ketabonline_al_zabidi_taj_al_arus',
    'ketabonline_al_fayyumi_misbah_munir',
    'ketabonline_ibn_duraid_jamharat_al_lugha',
    'qomra_al_qamus_al_muhit',
}
MUFRADAT_SLUG = 'ketabonline_al_raghib_mufradat'
LANE_SLUG     = 'lane_lexicon'

ROOTS_PER_SOURCE = 100   # 100 × 11 = 1,100 total HTTP calls

def fetch(url: str, timeout: float = 12.0):
    """Use curl (matches header signature backend.k-maps.com expects).
    The default Python urllib UA gets a blanket 403."""
    import subprocess
    try:
        proc = subprocess.run(
            ['curl', '-s', '-A', 'Mozilla/5.0 (k-maps audit)', '-w', '\n%{http_code}', '--max-time', str(int(timeout)), url],
            capture_output=True, text=True,
        )
        out = proc.stdout
        if '\n' not in out: return 0, None
        body, _, code = out.rpartition('\n')
        try: status = int(code.strip())
        except: status = 0
        try: payload = json.loads(body)
        except: payload = None
        return status, payload
    except Exception:
        return 0, None


def classify_classical(payload: dict | None) -> str:
    if payload is None: return 'http_fail'
    if not payload.get('ok'): return 'api_not_ok'
    v = payload.get('data') or {}
    if v.get('kind') != 'lisan': return 'wrong_kind'
    secs = v.get('sections') or []
    if not secs: return 'no_sections'
    pcount = sum(len(s.get('paragraphs') or []) for s in secs)
    if pcount == 0: return 'no_paragraphs'
    if pcount < 2:  return 'thin_content'
    return 'ok'


def classify_mufradat(payload: dict | None) -> str:
    if payload is None: return 'http_fail'
    if not payload.get('ok'): return 'api_not_ok'
    v = payload.get('data') or {}
    if v.get('kind') != 'mufradat': return 'wrong_kind'
    if not (v.get('sections') or []): return 'no_sections'
    return 'ok'


def classify_v2_entry(payload: dict | None) -> str:
    if payload is None: return 'http_fail'
    if not payload.get('ok'): return 'api_not_ok'
    v = payload.get('data') or {}
    if not (v.get('blocks') or []): return 'no_blocks'
    return 'ok'


def audit_source(slug: str, roots: list[str]) -> dict:
    if slug == MUFRADAT_SLUG:
        path_fmt = '/al/lex/v2/read/{slug}/{root}'
        classifier = classify_mufradat
    elif slug == LANE_SLUG:
        path_fmt = '/al/lex/v2/entry/{slug}/{root}'
        classifier = classify_v2_entry
    elif slug in CLASSICAL_SLUGS:
        path_fmt = '/al/lex/v2/read/{slug}/{root}'
        classifier = classify_classical
    else:
        return {'skip': True}

    results = Counter()
    latencies = []
    failures = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {}
        for root in roots:
            url = BASE + path_fmt.format(
                slug=slug, root=urllib.parse.quote(root, safe=''),
            )
            futs[pool.submit(fetch, url)] = root
        for f in as_completed(futs):
            root = futs[f]
            status, payload = f.result()
            verdict = classifier(payload) if status == 200 else f'http_{status}'
            results[verdict] += 1
            if verdict != 'ok':
                failures.append((root, verdict))
    elapsed = time.time() - t0
    return {
        'verdicts': dict(results),
        'failures_sample': failures[:5],
        'sec': round(elapsed, 1),
        'rps': round(len(roots) / max(0.1, elapsed), 1),
    }


def main():
    rng = random.Random(42)
    roots_per_source: dict[str, list[str]] = {}
    for path in HERE.glob('.p1_roots.json'):
        pass

    # Pull a stratified sample of roots per source via wrangler
    import subprocess
    all_sources = [LANE_SLUG, MUFRADAT_SLUG] + sorted(CLASSICAL_SLUGS)
    for slug in all_sources:
        q = (f"SELECT root_norm FROM ar_ling_lexicon_root_entries "
             f"WHERE source_slug='{slug}' ORDER BY RANDOM() LIMIT {ROOTS_PER_SOURCE}")
        out = subprocess.run([
            'wrangler', 'd1', 'execute', 'km_arabic_linguistic', '--remote',
            '--config', 'workers/ar-linguistics/wrangler.toml',
            '--command', q, '--json',
        ], capture_output=True, text=True, cwd=HERE.parents[1])
        try:
            roots = [r['root_norm'] for r in json.loads(out.stdout)[0]['results']]
        except Exception:
            print(f'WARN: could not parse roots for {slug}')
            roots = []
        roots_per_source[slug] = roots
        print(f'sampled {len(roots)} roots from {slug}')

    print()
    print('═══ Auditing in parallel ═══')
    grand_total = Counter()
    per_source: dict[str, dict] = {}
    for slug, roots in roots_per_source.items():
        if not roots: continue
        r = audit_source(slug, roots)
        per_source[slug] = r
        for verdict, n in r['verdicts'].items():
            grand_total[verdict] += n
        ok = r['verdicts'].get('ok', 0)
        total = sum(r['verdicts'].values())
        print(f'  {slug:<48} ok={ok}/{total} ({100*ok/max(1,total):.0f}%)  '
              f'{r["sec"]}s @ {r["rps"]} req/s')

    print()
    print('═══ Failure breakdown by source ═══')
    for slug, r in per_source.items():
        fails = {k: v for k, v in r['verdicts'].items() if k != 'ok'}
        if not fails: continue
        print(f'  {slug}:')
        for k, n in sorted(fails.items(), key=lambda x: -x[1]):
            print(f'    {k:>20}: {n}')
        for root, verdict in r['failures_sample']:
            print(f'    sample: root={root!r} → {verdict}')

    print()
    print('═══ Grand total verdicts ═══')
    total = sum(grand_total.values())
    for v, n in sorted(grand_total.items(), key=lambda x: -x[1]):
        print(f'  {v:>20}: {n:>4} ({100*n/total:.1f}%)')


if __name__ == '__main__':
    main()
