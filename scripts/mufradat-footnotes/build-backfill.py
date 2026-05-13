#!/usr/bin/env python3
"""
Build a SQL backfill that inserts the missing footnote blocks into the
production `ar_ling_lexicon_blocks` table for the Mufradat al-Raghib source.

Pipeline:
  1. Scan all `chunks/page_*.chunks.json` files.
     Each file represents one *printed page* (heading "printed_page:N") and
     carries the body chunk + the footnote chunks for that page.
  2. From the project stage.sqlite, walk every entry's footnote-marker blocks
     (text_plain like "(( N ))"). Markers numbered relative to the printed
     page they sit on — when the number resets (N <= prev_N), the entry has
     crossed a page boundary, so we advance the page counter.
  3. Look up the footnote text by (printed_page, marker_num) and emit an
     INSERT for a new block_type='footnote' row, linked to the same
     root_entry_id / section_id / root_norm as the marker.

Output SQL is idempotent: each block has a deterministic `id` and a unique
`block_path` so re-running won't duplicate.
"""

from __future__ import annotations

import glob
import hashlib
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INGEST = ROOT / 'km_arabic_linguistic/ingestion/Lexicon/sources/ketabonline/mufradat_al_raghib'
STAGE_DB = INGEST / 'stage.sqlite'
CHUNKS_DIR = INGEST / 'chunks'
OUT_SQL = ROOT / 'scripts/mufradat-footnotes/backfill_footnotes.sql'

SOURCE_SLUG = 'ketabonline_al_raghib_mufradat'

ARABIC_INDIC_TO_ASCII = str.maketrans({chr(0x660+i): str(i) for i in range(10)})
MARKER_RE  = re.compile(r'^\(\(\s*([0-9٠-٩]+)\s*\)\)$')
INLINE_NUM = re.compile(r'\(\(\s*([0-9٠-٩]+)\s*\)\)')


def ascii_digits(s: str) -> str:
    return s.translate(ARABIC_INDIC_TO_ASCII)


def parse_marker_num(text: str) -> int | None:
    m = MARKER_RE.match(text.strip())
    if not m:
        return None
    try:
        return int(ascii_digits(m.group(1)))
    except ValueError:
        return None


def load_printed_page_footnotes() -> dict[int, dict[int, str]]:
    """Map: printed_page_num -> { footnote_num: text }."""
    out: dict[int, dict[int, str]] = {}
    files = sorted(CHUNKS_DIR.glob('page_*.chunks.json'))
    for fp in files:
        chunks = json.loads(fp.read_text())
        body = next((c for c in chunks if str(c.get('heading','')).startswith('printed_page:')), None)
        if not body:
            continue
        try:
            pp = int(body['heading'].split(':', 1)[1])
        except (ValueError, IndexError):
            continue
        fn_map: dict[int, str] = {}
        for c in chunks:
            h = str(c.get('heading',''))
            if not h.startswith('footnote:'):
                continue
            raw_num = h.split(':', 1)[1].strip()
            try:
                n = int(ascii_digits(raw_num))
            except ValueError:
                continue
            text = (c.get('text_ar') or '').strip()
            if not text or text in ('.', '[]'):
                continue
            # Footnote can be split across multiple chunks (continuations) —
            # keep the first occurrence as canonical and append continuations.
            if n in fn_map:
                fn_map[n] = fn_map[n].rstrip() + ' ' + text
            else:
                fn_map[n] = text
        if fn_map:
            out[pp] = fn_map
    return out


def fetch_entry_markers(con: sqlite3.Connection):
    """Yield (root_entry_id, root_norm, section_id, page_start, page_end,
              markers=[(block_seq, marker_num)]) for each entry, in order.

    lex_root uses root_norm as PK and doesn't carry the production id. We
    derive the root_entry_id by picking the root_header block's entry id —
    that id is stable and matches the production ar_ling_lexicon_root_entries.id.
    """
    cur = con.cursor()
    cur.execute("""
        SELECT r.root_norm, r.page_start, r.page_end,
               (SELECT root_entry_id FROM lex_block b
                WHERE b.root_norm = r.root_norm
                ORDER BY b.block_seq LIMIT 1) AS root_entry_id
        FROM lex_root r
        ORDER BY r.page_start, r.root_norm
    """)
    entries = cur.fetchall()
    for (root_norm, page_start, page_end, root_id) in entries:
        if not root_id:
            continue
        cur.execute("""
            SELECT section_id, block_seq, text_plain
            FROM lex_block
            WHERE root_norm = ?
              AND text_plain LIKE '((%))'
            ORDER BY block_seq
        """, (root_norm,))
        rows = cur.fetchall()
        markers: list[tuple[str | None, int, int]] = []
        for (section_id, block_seq, text_plain) in rows:
            n = parse_marker_num(text_plain or '')
            if n is None:
                continue  # paren_quote (Arabic content), not a footnote marker
            markers.append((section_id, block_seq, n))
        if markers:
            yield root_id, root_norm, page_start, page_end, markers


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def stable_id(*parts: str) -> str:
    h = hashlib.sha1('|'.join(parts).encode()).hexdigest()[:16]
    return f'blk_mfr_fn_{h}'


def build_sql():
    if not STAGE_DB.exists():
        sys.exit(f'stage.sqlite not found at {STAGE_DB}')
    fn_by_page = load_printed_page_footnotes()
    pages_with_fns = len(fn_by_page)
    total_fns = sum(len(v) for v in fn_by_page.values())
    print(f'Loaded footnotes for {pages_with_fns} printed pages, {total_fns} total footnote texts')

    inserts: list[str] = []
    unmatched: list[tuple[str, int, int]] = []  # (root, page, fn_num)
    matched = 0
    entries_touched = 0

    with sqlite3.connect(STAGE_DB) as con:
        for root_id, root_norm, page_start, page_end, markers in fetch_entry_markers(con):
            # Walk markers, advance page counter whenever the marker number
            # resets (current N <= previous N).
            cur_page = page_start or 1
            last_n = 0
            entry_inserts = 0
            seen_fn_num: set[tuple[int, int]] = set()  # dedup (page, num)
            for (section_id, block_seq, n) in markers:
                if n <= last_n:
                    cur_page += 1
                last_n = n

                key = (cur_page, n)
                if key in seen_fn_num:
                    continue  # already attributed within this entry
                seen_fn_num.add(key)

                fn_text = fn_by_page.get(cur_page, {}).get(n)
                if not fn_text:
                    unmatched.append((root_norm, cur_page, n))
                    continue

                # Build a deterministic id + block_path. block_path must be
                # unique per root_entry_id (DB constraint).
                bid = stable_id(root_id, str(cur_page), str(n))
                bpath = f'fn.{cur_page}.{n}'
                bseq = 9000 + (cur_page - (page_start or 1)) * 100 + n
                data_json = json.dumps({'footnote_no': n, 'printed_page': cur_page}, ensure_ascii=False)
                title = str(n)

                cols = '(id, source_slug, root_entry_id, section_id, root_norm, ' \
                       'block_path, block_seq, depth, block_type, lang, title_ar, ' \
                       'text_plain, data_json, origin, printed_page)'
                section_sql = 'NULL' if section_id is None else "'" + sql_escape(section_id) + "'"
                vals = (
                    f"'{bid}', '{SOURCE_SLUG}', '{root_id}', "
                    f"{section_sql}, "
                    f"'{sql_escape(root_norm)}', "
                    f"'{bpath}', {bseq}, 1, 'footnote', 'ar', '{title}', "
                    f"'{sql_escape(fn_text)}', '{sql_escape(data_json)}', "
                    f"'book_native', {cur_page}"
                )
                inserts.append(f"INSERT OR IGNORE INTO ar_ling_lexicon_blocks {cols} VALUES ({vals});")
                entry_inserts += 1
                matched += 1
            if entry_inserts:
                entries_touched += 1

    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    with OUT_SQL.open('w') as f:
        f.write('-- Backfill: Mufradat al-Raghib footnote blocks.\n')
        f.write(f'-- Source: {INGEST}\n')
        f.write(f'-- Inserts: {len(inserts)}  Entries touched: {entries_touched}\n\n')
        f.write('BEGIN;\n')
        for line in inserts:
            f.write(line + '\n')
        f.write('COMMIT;\n')

    print(f'Wrote {len(inserts)} inserts → {OUT_SQL}')
    print(f'Entries touched: {entries_touched}')
    print(f'Matched markers: {matched}')
    print(f'Unmatched markers (no footnote text on attributed page): {len(unmatched)}')
    if unmatched[:5]:
        print('  First few unmatched:')
        for u in unmatched[:5]:
            print(f'    root={u[0]} page={u[1]} num={u[2]}')


if __name__ == '__main__':
    build_sql()
