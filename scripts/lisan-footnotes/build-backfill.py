#!/usr/bin/env python3
"""
Build a SQL backfill that inserts the missing footnote blocks into the
production `ar_ling_lexicon_blocks` table for Lisan al-Arab.

Source of truth:
  km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline
       /ibn_manzur_lisan_al_arab/stage.sqlite
       └── page_segments  (segment_type='footnote', footnote_no, text_ar)

Pipeline:
  1. For each footnote row in page_segments, find the canonical root that
     owns the page (page_no ∈ [page_start, page_end]). 93%+ of Lisan
     roots are single-page so this is unambiguous.
  2. Derive the production root_entry_id from any existing lex_block row
     for that root (its root_entry_id is the production id).
  3. Pick a section_id — Lisan is overwhelmingly single-section so the
     root's first lex_section row is the right home.
  4. Emit one INSERT OR IGNORE per footnote with:
       block_type='footnote', printed_page=N,
       data_json={ footnote_no:N, printed_page:N, pivot_phrase:"…" },
       text_plain=<footnote body>, title_ar=<num>

Stable ids + unique block_paths make the script idempotent.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path
from collections import defaultdict

ROOT      = Path(__file__).resolve().parents[2]
INGEST    = ROOT / 'km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline/ibn_manzur_lisan_al_arab'
STAGE_DB  = INGEST / 'stage.sqlite'
OUT_SQL   = ROOT / 'scripts/lisan-footnotes/backfill_footnotes.sql'

SOURCE_SLUG = 'ketabonline_ibn_manzur_lisan_al_arab'

AR_INDIC_TO_ASCII = str.maketrans({chr(0x660 + i): str(i) for i in range(10)})
PIVOT_RX = re.compile(r'"([^"]+)"')   # the lemma being annotated, in quotes


def to_ascii(s: str) -> str:
    return s.translate(AR_INDIC_TO_ASCII)


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def stable_id(*parts: str) -> str:
    h = hashlib.sha1('|'.join(parts).encode()).hexdigest()[:16]
    return f'blk_lsn_fn_{h}'


def extract_pivot(text: str) -> str | None:
    """Pull the quoted lemma phrase the footnote is annotating, if any."""
    if not text: return None
    m = PIVOT_RX.search(text)
    return m.group(1).strip() if m else None


def main() -> None:
    if not STAGE_DB.exists():
        sys.exit(f'stage.sqlite not found at {STAGE_DB}')

    con = sqlite3.connect(STAGE_DB)
    cur = con.cursor()

    # ── Step 1: build a {page → root_norm} index from lex_root ────────
    cur.execute("SELECT root_norm, page_start, page_end FROM lex_root "
                "WHERE page_start IS NOT NULL ORDER BY page_start, root_norm")
    page_to_roots: dict[int, list[str]] = defaultdict(list)
    for root_norm, ps, pe in cur:
        for p in range(ps, (pe or ps) + 1):
            page_to_roots[p].append(root_norm)
    print(f'Indexed {len(page_to_roots)} pages across {sum(len(v) for v in page_to_roots.values())} root-page pairs')

    # ── Step 2: root_norm → (root_entry_id, first_section_id) ─────────
    cur.execute("""
      SELECT b.root_norm, b.root_entry_id, MIN(b.block_seq) AS first_seq,
             (SELECT s.id FROM lex_section s
              WHERE s.root_norm = b.root_norm ORDER BY s.section_seq LIMIT 1) AS section_id
      FROM lex_block b
      GROUP BY b.root_norm
    """)
    root_info: dict[str, tuple[str, str | None]] = {}
    for root_norm, root_entry_id, _seq, section_id in cur:
        if root_entry_id:
            root_info[root_norm] = (root_entry_id, section_id)
    print(f'Resolved root_entry_id for {len(root_info)} roots')

    # ── Step 2b: per-root body markers index ─────────────────────────
    # Walk every lex_block for each root, detect `(( N ))` markers, and
    # store the marker number alongside the BLOCK page (which equals
    # printed_page since each block carries it). When multiple roots share
    # a page, we use this index to attribute the footnote to the root
    # whose own body text actually references it.
    MARKER_RX = re.compile(r'\(\(\s*([٠-٩0-9]+)\s*\)\)')
    cur.execute("""
      SELECT b.root_norm, b.text_plain, b.printed_page
      FROM lex_block b
      WHERE b.text_plain IS NOT NULL
    """)
    marker_owners: dict[tuple[int, int], set[str]] = defaultdict(set)
    for root_norm, text, printed_page in cur:
        if not text or printed_page is None: continue
        for h in MARKER_RX.findall(text):
            try: n = int(to_ascii(h))
            except ValueError: continue
            marker_owners[(printed_page, n)].add(root_norm)
    print(f'Indexed {len(marker_owners)} distinct (page, marker) ownership slots')

    # ── Step 3: walk every footnote row, assign to its owning root ────
    inserts: list[str] = []
    unattributed: list[tuple[int, str, str]] = []
    multi_owner = 0
    by_root = defaultdict(int)

    cur.execute("""
      SELECT page_no, footnote_no, text_ar, segment_index
      FROM page_segments WHERE segment_type='footnote'
      ORDER BY page_no, segment_index
    """)
    for page_no, fn_num_raw, fn_text, seg_idx in cur:
        if page_no is None or fn_num_raw is None: continue
        try: fn_num = int(to_ascii(str(fn_num_raw)))
        except ValueError: continue
        text = (fn_text or '').strip()
        if not text: continue

        candidates = page_to_roots.get(page_no, [])
        if not candidates:
            unattributed.append((page_no, fn_num_raw, text[:80]))
            continue

        # ── Best-effort attribution ─────────────────────────────────
        # 1. If the (page, num) appears as a `(( N ))` marker in EXACTLY
        #    one candidate root's body, attribute it there.
        # 2. Otherwise fall back to the first candidate in reading order.
        marker_match = marker_owners.get((page_no, fn_num), set())
        narrowed = [r for r in candidates if r in marker_match]
        if len(narrowed) == 1:
            root_norm = narrowed[0]
        elif len(narrowed) > 1:
            multi_owner += 1
            root_norm = narrowed[0]
        else:
            if len(candidates) > 1: multi_owner += 1
            root_norm = candidates[0]
        info = root_info.get(root_norm)
        if not info:
            unattributed.append((page_no, fn_num_raw, text[:80]))
            continue
        root_entry_id, section_id = info

        # ── Build the row ─────────────────────────────────────────────
        bid       = stable_id(root_entry_id, str(page_no), str(fn_num))
        block_path= f'fn.{page_no}.{fn_num}'
        # Bias seq high so footnotes sit at end of the block stream
        block_seq = 9_000_000 + page_no * 100 + fn_num
        pivot     = extract_pivot(text) or ''
        data_json = json.dumps({
            'footnote_no':  fn_num,
            'printed_page': page_no,
            'pivot_phrase': pivot,
            'segment_idx':  seg_idx,
        }, ensure_ascii=False)
        section_sql = 'NULL' if section_id is None else "'" + sql_escape(section_id) + "'"

        cols = ('(id, source_slug, root_entry_id, section_id, root_norm, '
                'block_path, block_seq, depth, block_type, lang, title_ar, '
                'text_plain, data_json, origin, printed_page)')
        vals = (
            f"'{bid}', '{SOURCE_SLUG}', '{root_entry_id}', "
            f"{section_sql}, '{sql_escape(root_norm)}', "
            f"'{block_path}', {block_seq}, 1, 'footnote', 'ar', '{fn_num}', "
            f"'{sql_escape(text)}', '{sql_escape(data_json)}', "
            f"'book_native', {page_no}"
        )
        inserts.append(f"INSERT OR IGNORE INTO ar_ling_lexicon_blocks {cols} VALUES ({vals});")
        by_root[root_norm] += 1

    # ── Step 4: write the SQL file ───────────────────────────────────
    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    # D1 imposes a row-per-statement cap on bulk imports; chunk transactions.
    CHUNK = 500
    with OUT_SQL.open('w') as f:
        f.write('-- Backfill: Lisan al-Arab footnote blocks promoted from staging.\n')
        f.write(f'-- Source: {INGEST}\n')
        f.write(f'-- Total INSERTs: {len(inserts)}\n')
        f.write(f'-- Distinct roots touched: {len(by_root)}\n')
        f.write(f'-- Multi-owner pages encountered: {multi_owner}\n')
        f.write(f'-- Unattributed (skipped): {len(unattributed)}\n\n')
        for i in range(0, len(inserts), CHUNK):
            f.write('BEGIN;\n')
            f.write('\n'.join(inserts[i:i+CHUNK]))
            f.write('\nCOMMIT;\n\n')

    print()
    print(f'Wrote {len(inserts)} INSERTs → {OUT_SQL}')
    print(f'Distinct roots touched:   {len(by_root)}')
    print(f'Multi-owner page rows:    {multi_owner}')
    print(f'Unattributed (skipped):   {len(unattributed)}')
    if unattributed[:5]:
        print('Sample unattributed:')
        for p, n, t in unattributed[:5]:
            print(f'  p={p} n={n!r}  → {t!r}')


if __name__ == '__main__':
    main()
