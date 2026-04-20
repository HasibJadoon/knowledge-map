#!/usr/bin/env python3
"""
migrate_qr_data.py — Migrate Quran data from legacy knowledgemap D1 to km_quran D1

Usage:
    cd scripts/migration
    source ../pipeline/.venv/bin/activate   (or: pip install httpx python-dotenv)
    python migrate_qr_data.py --discover            # list legacy tables + row counts
    python migrate_qr_data.py --dry-run             # read-only check
    python migrate_qr_data.py                       # run all (idempotent)
    python migrate_qr_data.py --tables ayah,meta    # selective

Reads from:  knowledgemap  (ef164d27-6e98-41c5-beca-03903d658976)
Writes to:   km_quran      (8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba)
Credentials: scripts/pipeline/.env  (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN)

Legacy table → new table mapping (confirmed from schema inspection 2026-04-20):
  ar_quran_ayah           → qr_ayah               (6,236 rows)
  ar_quran_ayah           → qr_surah_ayah_meta     (6,236 rows, juz/hizb/ruku columns)
  qr_translation_sources  → (4 rows, hardcoded — already inserted)
  ar_quran_translations   → qr_translations        (6,236 rows × 4 translators = 24,944 rows)
  ar_quran_word_occurrences→qr_word_occurrences    (77,432 rows, char_type='word' only)
  ar_quran_page_layout_lines→qr_page_layout_lines  (9,046 rows, joined to word_occurrences)
  ar_quran_surah_passage  → qr_surah_passages      (0 rows in legacy — skipped)

Translation source IDs (already in km_quran):
  haleem     → 01HW000000HALEEM0000000000
  sahih_intl → 01HW000000SAHIHINT00000000
  asad       → 01HW000000ASAD000000000000
  usmani     → 01HW000000USMANI00000000000
"""

import os
import sys
import time
import argparse
import random
from pathlib import Path
from collections import defaultdict

try:
    import httpx
except ImportError:
    print("Missing dependency: pip install httpx python-dotenv")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / "pipeline" / ".env"
    load_dotenv(env_path if env_path.exists() else None)
except ImportError:
    pass

# ─── Config ───────────────────────────────────────────────────────────────────

CF_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
CF_API_TOKEN  = os.environ.get("CLOUDFLARE_API_TOKEN", "")

LEGACY_DB_ID = "ef164d27-6e98-41c5-beca-03903d658976"   # knowledgemap
QR_DB_ID     = "8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba"   # km_quran

HEADERS: dict = {}  # set in main() after credential check

# Translation source IDs — already inserted into km_quran
SRC_HALEEM    = "01HW000000HALEEM0000000000"
SRC_SAHIH     = "01HW000000SAHIHINT00000000"
SRC_ASAD      = "01HW000000ASAD000000000000"
SRC_USMANI    = "01HW000000USMANI00000000000"

# Sajda (prostration) ayahs — 15 canonical
SAJDA_AYAHS = {
    (7, 206), (13, 15), (16, 50), (17, 109), (19, 58),
    (22, 18), (22, 77), (25, 60), (27, 26), (32, 15),
    (38, 24), (41, 38), (53, 62), (84, 21), (96, 19),
}

# ─── ULID ─────────────────────────────────────────────────────────────────────

ULID_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

def ulid() -> str:
    t = int(time.time() * 1000)
    ts = ""
    for _ in range(10):
        ts = ULID_CHARS[t & 0x1F] + ts
        t >>= 5
    return ts + "".join(random.choices(ULID_CHARS, k=16))

# ─── D1 REST API ──────────────────────────────────────────────────────────────

def d1_url(db_id: str) -> str:
    return (f"https://api.cloudflare.com/client/v4/accounts"
            f"/{CF_ACCOUNT_ID}/d1/database/{db_id}/query")

def d1_query(db_id: str, sql: str, params: list = None, retries: int = 4) -> list[dict]:
    payload: dict = {"sql": sql}
    if params:
        payload["params"] = params
    for attempt in range(retries):
        try:
            r = httpx.post(d1_url(db_id), headers=HEADERS, json=payload, timeout=120)
            r.raise_for_status()
            data = r.json()
            if not data.get("success"):
                raise RuntimeError(f"D1 error: {data.get('errors', [])}")
            result = data.get("result", [])
            return result[0].get("results", []) if result else []
        except (httpx.HTTPStatusError, httpx.ReadTimeout) as e:
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"  retry {attempt+1}/{retries} ({wait}s) — {e}")
                time.sleep(wait)
            else:
                raise
    return []

def d1_execute(db_id: str, sql: str, params: list = None) -> dict:
    payload: dict = {"sql": sql}
    if params:
        payload["params"] = params
    r = httpx.post(d1_url(db_id), headers=HEADERS, json=payload, timeout=120)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data.get('errors', [])}")
    result = data.get("result", [{}])
    return result[0].get("meta", {}) if result else {}

def d1_count(db_id: str, table: str) -> int:
    rows = d1_query(db_id, f"SELECT COUNT(*) AS n FROM {table}")
    return rows[0]["n"] if rows else 0

def table_exists(db_id: str, name: str) -> bool:
    rows = d1_query(db_id,
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", [name])
    return bool(rows)

def chunked(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i:i+size]

# ─── Discovery ────────────────────────────────────────────────────────────────

def discover():
    print("\n[DISCOVERY] Legacy knowledgemap tables with row counts:")
    rows = d1_query(LEGACY_DB_ID,
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [r["name"] for r in rows]
    for t in tables:
        try:
            n = d1_count(LEGACY_DB_ID, t)
            print(f"  {t:<50} {n:>10,}")
        except Exception:
            print(f"  {t:<50} (error)")

# ─── 1. qr_ayah ───────────────────────────────────────────────────────────────
# Source: ar_quran_ayah
# Confirmed columns: id(int), surah, ayah, page, juz, hizb, ruku,
#   text (=text_uthmani), text_uthmani_clean, text_bare, verse_mark
# words column (~2KB each) is EXCLUDED from SELECT to avoid size limits

def migrate_ayah(dry_run: bool):
    print("\n" + "─"*55)
    print("[1/7] qr_ayah  ←  ar_quran_ayah")

    total    = d1_count(LEGACY_DB_ID, "ar_quran_ayah")
    existing = d1_count(QR_DB_ID,     "qr_ayah")
    print(f"  Legacy: {total:,}   Already in qr_ayah: {existing:,}")
    if existing >= total:
        print("  ✓ Complete"); return

    PAGE = 100  # ~400 chars/row without 'words' col → ~40KB/batch (safe)

    for offset in range(existing, total, PAGE):
        rows = d1_query(
            LEGACY_DB_ID,
            """SELECT id, surah, ayah,
                      text            AS text_uthmani,
                      text_uthmani_clean,
                      text_bare,
                      verse_mark,
                      page            AS page_number
               FROM ar_quran_ayah
               ORDER BY surah, ayah
               LIMIT ? OFFSET ?""",
            [PAGE, offset]
        )
        if not rows: break

        print(f"  {offset+1}–{offset+len(rows)}/{total}", end=" ")
        if dry_run: print("[DRY RUN]"); continue

        for batch in chunked(rows, 50):
            vp, pa = [], []
            for row in batch:
                vp.append("(?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))")
                pa.extend([
                    ulid(),
                    row["surah"], row["ayah"],
                    row.get("text_uthmani_clean"),
                    row.get("text_uthmani"),
                    row.get("text_bare"),
                    None,  # translation col — populated separately via qr_translations
                    row.get("verse_mark"),
                    row.get("page_number"),
                ])
            sql = ("INSERT OR IGNORE INTO qr_ayah"
                   " (id,surah,ayah,text_uthmani_clean,text_uthmani,text_bare,"
                   "  translation,verse_mark,page_number,created_at,updated_at)"
                   f" VALUES {','.join(vp)}")
            d1_execute(QR_DB_ID, sql, pa)
        print(f"✓ (+{len(rows)})")
        time.sleep(0.15)

    print(f"  → qr_ayah: {d1_count(QR_DB_ID, 'qr_ayah'):,} rows total")

# ─── 2. qr_surah_ayah_meta ────────────────────────────────────────────────────
# Source: ar_quran_ayah  (juz, hizb, ruku columns confirmed)
# NOTE: ar_quran_surah_ayah_meta has DIFFERENT content (theme/matching JSON) — not used

def migrate_surah_ayah_meta(dry_run: bool):
    print("\n" + "─"*55)
    print("[2/7] qr_surah_ayah_meta  ←  ar_quran_ayah (juz/hizb/ruku)")

    total    = d1_count(LEGACY_DB_ID, "ar_quran_ayah")
    existing = d1_count(QR_DB_ID,     "qr_surah_ayah_meta")
    print(f"  Legacy: {total:,}   Already in qr_surah_ayah_meta: {existing:,}")
    if existing >= total:
        print("  ✓ Complete"); return

    PAGE = 300

    for offset in range(existing, total, PAGE):
        rows = d1_query(
            LEGACY_DB_ID,
            "SELECT surah, ayah, juz, hizb, ruku FROM ar_quran_ayah"
            " ORDER BY surah, ayah LIMIT ? OFFSET ?",
            [PAGE, offset]
        )
        if not rows: break

        print(f"  {offset+1}–{offset+len(rows)}/{total}", end=" ")
        if dry_run: print("[DRY RUN]"); continue

        for batch in chunked(rows, 100):
            vp, pa = [], []
            for row in batch:
                s, a = row["surah"], row["ayah"]
                vp.append("(?,?,?,?,?,NULL,?)")
                pa.extend([s, a,
                           row.get("juz"), row.get("hizb"), row.get("ruku"),
                           1 if (s, a) in SAJDA_AYAHS else 0])
            sql = ("INSERT OR IGNORE INTO qr_surah_ayah_meta"
                   " (surah,ayah,juz,hizb,ruku,manzil,sajda)"
                   f" VALUES {','.join(vp)}")
            d1_execute(QR_DB_ID, sql, pa)
        print(f"✓ (+{len(rows)})")
        time.sleep(0.1)

    print(f"  → qr_surah_ayah_meta: {d1_count(QR_DB_ID, 'qr_surah_ayah_meta'):,} rows total")

# ─── 3. qr_translation_sources ───────────────────────────────────────────────
# Already inserted in prior session — this just verifies / tops up

def migrate_translation_sources(dry_run: bool):
    print("\n" + "─"*55)
    print("[3/7] qr_translation_sources  (4 canonical rows)")

    existing = d1_count(QR_DB_ID, "qr_translation_sources")
    if existing >= 4:
        print(f"  ✓ Complete ({existing} rows)"); return

    sources = [
        (SRC_HALEEM, "haleem",     "Abdul Haleem",        "en", "OUP 2004",        0),
        (SRC_SAHIH,  "sahih_intl", "Sahih International", "en", "Abul Qasim 1997", 1),
        (SRC_ASAD,   "asad",       "Muhammad Asad",       "en", "Gibraltar 1980",  0),
        (SRC_USMANI, "usmani",     "Mufti Usmani",        "en", "Maktaba",         0),
    ]
    if dry_run:
        print(f"  [DRY RUN] Would insert {len(sources)} rows"); return

    for src_id, code, name, lang, edition, is_default in sources:
        d1_execute(QR_DB_ID,
            "INSERT OR IGNORE INTO qr_translation_sources"
            " (id,source_code,translator_name,language,edition,is_default,created_at)"
            " VALUES (?,?,?,?,?,?,datetime('now'))",
            [src_id, code, name, lang, edition, is_default])

    print(f"  → qr_translation_sources: {d1_count(QR_DB_ID, 'qr_translation_sources')} rows total")

# ─── 4. qr_translations ───────────────────────────────────────────────────────
# Source: ar_quran_translations (wide format — 4 translation columns per row)
# Confirmed columns: surah, ayah, translation_haleem, translation_asad,
#   translation_sahih, translation_usmani, footnotes_sahih, footnotes_haleem
# Target: one row per (source_id, surah, ayah) → 4 × 6,236 = 24,944 rows

TRANSLATION_COLS = [
    # (legacy_col,           footnote_col,        source_id)
    ("translation_haleem",  "footnotes_haleem",   SRC_HALEEM),
    ("translation_sahih",   "footnotes_sahih",    SRC_SAHIH),
    ("translation_asad",    None,                 SRC_ASAD),
    ("translation_usmani",  "footnotes_usmani",   SRC_USMANI),
]

def migrate_translations(dry_run: bool):
    print("\n" + "─"*55)
    print("[4/7] qr_translations  ←  ar_quran_translations (unpivot 4 cols)")

    total    = d1_count(LEGACY_DB_ID, "ar_quran_translations")
    existing = d1_count(QR_DB_ID,     "qr_translations")
    target   = total * 4  # 4 translators per ayah
    print(f"  Legacy: {total:,} rows × 4 translators = {target:,} target")
    print(f"  Already in qr_translations: {existing:,}")
    if existing >= target:
        print("  ✓ Complete"); return

    # Work out which ayah offset we're at (existing ÷ 4 translators)
    start_offset = (existing // 4)
    PAGE = 100  # 100 ayahs × 4 = 400 rows per batch; rows are ~1KB each

    for offset in range(start_offset, total, PAGE):
        rows = d1_query(
            LEGACY_DB_ID,
            """SELECT surah, ayah,
                      translation_haleem, footnotes_haleem,
                      translation_sahih,  footnotes_sahih,
                      translation_asad,
                      translation_usmani, footnotes_usmani
               FROM ar_quran_translations
               ORDER BY surah, ayah
               LIMIT ? OFFSET ?""",
            [PAGE, offset]
        )
        if not rows: break

        print(f"  ayah {offset+1}–{offset+len(rows)}/{total}", end=" ")
        if dry_run: print("[DRY RUN]"); continue

        # Unpivot: one insert batch per translator to keep param counts small
        for tr_col, fn_col, src_id in TRANSLATION_COLS:
            vp, pa = [], []
            for row in rows:
                text = row.get(tr_col)
                if not text:
                    continue
                note = row.get(fn_col) if fn_col else None
                vp.append("(?,?,?,?,?,?,datetime('now'),datetime('now'))")
                pa.extend([ulid(), src_id, row["surah"], row["ayah"], text, note])
            if vp:
                sql = ("INSERT OR IGNORE INTO qr_translations"
                       " (id,source_id,surah,ayah,translation_text,footnote_md,created_at,updated_at)"
                       f" VALUES {','.join(vp)}")
                d1_execute(QR_DB_ID, sql, pa)

        print(f"✓")
        time.sleep(0.2)

    print(f"  → qr_translations: {d1_count(QR_DB_ID, 'qr_translations'):,} rows total")

# ─── 5. qr_word_occurrences ───────────────────────────────────────────────────
# Source: ar_quran_word_occurrences
# Confirmed columns: id(int), word_id, surah, ayah, position, verse_key, text(arabic+diacritics),
#   simple(bare), juz, hezb, rub, page, class_name, line, code, code_v3, char_type,
#   audio, translation, lemma, root, ar_u_root, meta_json, ar_u_lemma, ar_u_morphology,
#   surface_norm, root_norm, occurrence_key
# Filter: char_type = 'word'  (excludes 'end' marker rows)
# Mapping: text→word_text, simple→word_text_bare, position→word_index,
#          root→root, lemma→lemma, ar_u_morphology→morphology_tag

def migrate_word_occurrences(dry_run: bool):
    print("\n" + "─"*55)
    print("[5/7] qr_word_occurrences  ←  ar_quran_word_occurrences (char_type='word')")

    total_all = d1_count(LEGACY_DB_ID, "ar_quran_word_occurrences")
    # Count word-type rows (the actual words, excluding 'end' markers)
    res = d1_query(LEGACY_DB_ID,
        "SELECT COUNT(*) AS n FROM ar_quran_word_occurrences WHERE char_type='word'")
    total = res[0]["n"] if res else total_all
    existing = d1_count(QR_DB_ID, "qr_word_occurrences")
    print(f"  Legacy total: {total_all:,}   char_type='word': {total:,}")
    print(f"  Already in qr_word_occurrences: {existing:,}")
    if existing >= total:
        print("  ✓ Complete"); return

    PAGE = 100  # ~500 chars/row → ~50KB/batch

    for offset in range(existing, total, PAGE):
        rows = d1_query(
            LEGACY_DB_ID,
            """SELECT id, surah, ayah,
                      position        AS word_index,
                      text            AS word_text,
                      simple          AS word_text_bare,
                      root,
                      lemma,
                      ar_u_morphology AS morphology_tag
               FROM ar_quran_word_occurrences
               WHERE char_type = 'word'
               ORDER BY surah, ayah, position
               LIMIT ? OFFSET ?""",
            [PAGE, offset]
        )
        if not rows: break

        print(f"  {offset+1}–{offset+len(rows)}/{total}", end=" ")
        if dry_run: print("[DRY RUN]"); continue

        for batch in chunked(rows, 50):
            vp, pa = [], []
            for row in batch:
                raw_id = row.get("id")
                row_id = (f"QR{raw_id:024d}" if isinstance(raw_id, int) else raw_id) or ulid()
                vp.append("(?,?,?,?,?,?,?,?,NULL,?,datetime('now'))")
                pa.extend([
                    row_id,
                    row["surah"], row["ayah"],
                    row["word_index"],
                    row.get("word_text") or "",
                    row.get("word_text_bare"),
                    row.get("root"),
                    row.get("lemma"),
                    row.get("morphology_tag"),
                ])
            sql = ("INSERT OR IGNORE INTO qr_word_occurrences"
                   " (id,surah,ayah,word_index,word_text,word_text_bare,"
                   "  root,lemma,pos,morphology_tag,created_at)"
                   f" VALUES {','.join(vp)}")
            d1_execute(QR_DB_ID, sql, pa)
        print(f"✓ (+{len(rows)})")
        time.sleep(0.15)

    print(f"  → qr_word_occurrences: {d1_count(QR_DB_ID, 'qr_word_occurrences'):,} rows total")

# ─── 6. qr_page_layout_lines ──────────────────────────────────────────────────
# Source: ar_quran_page_layout_lines
# Confirmed columns: page_number, line_number, line_type (surah_name|ayah|...),
#   is_centered, first_word_id, last_word_id, surah_number
# Strategy:
#   - For each line, resolve surah/ayah/word_index by joining ar_quran_word_occurrences
#     ON word_id = first_word_id / last_word_id (WHERE char_type='word')
#   - surah_name lines: surah=surah_number, ayah_from=ayah_to=0, word indices null
#   - Do the join in Python (load word_id→(surah,ayah,position) map in RAM, ~77k entries)

def migrate_page_layout_lines(dry_run: bool):
    print("\n" + "─"*55)
    print("[6/7] qr_page_layout_lines  ←  ar_quran_page_layout_lines")

    total    = d1_count(LEGACY_DB_ID, "ar_quran_page_layout_lines")
    existing = d1_count(QR_DB_ID,     "qr_page_layout_lines")
    print(f"  Legacy: {total:,}   Already in qr_page_layout_lines: {existing:,}")
    if existing >= total:
        print("  ✓ Complete"); return

    # Build word_id → (surah, ayah, position) lookup in RAM
    print("  Building word_id lookup map from ar_quran_word_occurrences ...")
    word_map: dict = {}
    wmap_page = 1000
    all_words = []
    offset = 0
    while True:
        chunk = d1_query(
            LEGACY_DB_ID,
            "SELECT id AS word_id, surah, ayah, position FROM ar_quran_word_occurrences"
            " WHERE char_type='word' ORDER BY id LIMIT ? OFFSET ?",
            [wmap_page, offset]
        )
        if not chunk: break
        all_words.extend(chunk)
        offset += len(chunk)
        if len(chunk) < wmap_page: break
        time.sleep(0.05)
    for w in all_words:
        word_map[w["word_id"]] = (w["surah"], w["ayah"], w["position"])
    print(f"  Loaded {len(word_map):,} word_id entries")

    # Now load page_layout_lines and resolve
    PAGE = 300
    for offset in range(existing, total, PAGE):
        rows = d1_query(
            LEGACY_DB_ID,
            "SELECT page_number, line_number, line_type, surah_number,"
            "       first_word_id, last_word_id"
            " FROM ar_quran_page_layout_lines"
            " ORDER BY page_number, line_number LIMIT ? OFFSET ?",
            [PAGE, offset]
        )
        if not rows: break

        print(f"  lines {offset+1}–{offset+len(rows)}/{total}", end=" ")
        if dry_run: print("[DRY RUN]"); continue

        vp, pa = [], []
        for row in rows:
            fw_id = row.get("first_word_id")
            lw_id = row.get("last_word_id")
            fw = word_map.get(fw_id)
            lw = word_map.get(lw_id)

            if row["line_type"] == "surah_name":
                surah      = row.get("surah_number")
                ayah_from  = 0
                ayah_to    = 0
                wi_from    = None
                wi_to      = None
            elif fw:
                surah      = fw[0]
                ayah_from  = fw[1]
                ayah_to    = lw[1] if lw else fw[1]
                wi_from    = fw[2]
                wi_to      = lw[2] if lw else fw[2]
            else:
                continue  # can't resolve — skip

            vp.append("(?,?,?,?,?,?,?,?)")
            pa.extend([ulid(), row["page_number"], row["line_number"],
                       surah, ayah_from, ayah_to, wi_from, wi_to])

        if vp:
            sql = ("INSERT OR IGNORE INTO qr_page_layout_lines"
                   " (id,page_number,line_number,surah,ayah_from,ayah_to,"
                   "  word_from_index,word_to_index)"
                   f" VALUES {','.join(vp)}")
            d1_execute(QR_DB_ID, sql, pa)
        print(f"✓ (+{len(rows)})")
        time.sleep(0.1)

    print(f"  → qr_page_layout_lines: {d1_count(QR_DB_ID, 'qr_page_layout_lines'):,} rows total")

# ─── 7. qr_surah_passages ─────────────────────────────────────────────────────
# Source: ar_quran_surah_passage (0 rows in legacy — skip but check)

def migrate_surah_passages(dry_run: bool):
    print("\n" + "─"*55)
    print("[7/7] qr_surah_passages  ←  ar_quran_surah_passage")
    n = d1_count(LEGACY_DB_ID, "ar_quran_surah_passage")
    print(f"  Legacy ar_quran_surah_passage: {n} rows")
    if n == 0:
        print("  ⚠ Empty in legacy — skipping (passages to be authored manually in Hub)")
        return

    total    = n
    existing = d1_count(QR_DB_ID, "qr_surah_passages")
    if existing >= total:
        print("  ✓ Complete"); return

    rows = d1_query(LEGACY_DB_ID,
        "SELECT * FROM ar_quran_surah_passage ORDER BY surah, passage_index")
    if not rows: return

    if dry_run:
        print(f"  [DRY RUN] Would insert {len(rows)} rows"); return

    for batch in chunked(rows, 50):
        vp, pa = [], []
        for row in batch:
            vp.append("(?,?,?,?,?,?,?,datetime('now'),datetime('now'))")
            pa.extend([
                row.get("id") or ulid(),
                row.get("surah"),
                row.get("passage_index") or 1,
                row.get("ayah_from"),
                row.get("ayah_to"),
                row.get("theme") or row.get("title") or "",
                row.get("note_md") or row.get("note"),
            ])
        sql = ("INSERT OR IGNORE INTO qr_surah_passages"
               " (id,surah,passage_index,ayah_from,ayah_to,theme,note_md,created_at,updated_at)"
               f" VALUES {','.join(vp)}")
        d1_execute(QR_DB_ID, sql, pa)
        time.sleep(0.05)

    print(f"  → qr_surah_passages: {d1_count(QR_DB_ID, 'qr_surah_passages'):,} rows total")

# ─── Summary ─────────────────────────────────────────────────────────────────

def print_summary(dry_run: bool):
    print("\n" + "="*55)
    print("  K-MAPS  km_quran — migration summary")
    print("="*55)
    for tbl, expected in [
        ("qr_surahs",             114),
        ("qr_ayah",               6236),
        ("qr_surah_ayah_meta",    6236),
        ("qr_translation_sources", 4),
        ("qr_translations",       24944),
        ("qr_word_occurrences",   77432),
        ("qr_page_layout_lines",  9046),
        ("qr_surah_passages",     0),
    ]:
        try:
            n = d1_count(QR_DB_ID, tbl)
            ok = "✓" if n >= expected else "·" if n > 0 else "✗"
            note = "" if n >= expected else f"  (expected ≥{expected:,})"
            print(f"  {ok}  {tbl:<35} {n:>10,}{note}")
        except Exception as e:
            print(f"  ✗  {tbl:<35} ERROR: {e}")
    print("="*55)
    if dry_run:
        print("  ⚠  DRY RUN — no data was written")
    print()

# ─── Entry point ─────────────────────────────────────────────────────────────

ALL_TABLES = ["ayah", "meta", "sources", "translations", "words", "pages", "passages"]

def main():
    parser = argparse.ArgumentParser(
        description="Migrate Quran data from knowledgemap D1 → km_quran D1")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Read-only — no writes to km_quran")
    parser.add_argument("--tables",   default="all",
                        help=f"Comma-separated subset (default: all): {','.join(ALL_TABLES)}")
    parser.add_argument("--discover", action="store_true",
                        help="Print legacy table names + row counts and exit")
    args = parser.parse_args()

    if not CF_ACCOUNT_ID or not CF_API_TOKEN:
        print("ERROR: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN not set.\n"
              "       Add them to scripts/pipeline/.env or export as env vars.")
        sys.exit(1)

    global HEADERS
    HEADERS = {"Authorization": f"Bearer {CF_API_TOKEN}",
               "Content-Type": "application/json"}

    print("="*55)
    print(f"  K-MAPS Quran Migration{' [DRY RUN]' if args.dry_run else ''}")
    print(f"  Legacy  knowledgemap  ({LEGACY_DB_ID[:8]}…)")
    print(f"  Target  km_quran      ({QR_DB_ID[:8]}…)")
    print("="*55)

    if args.discover:
        discover(); return

    tables = (ALL_TABLES if args.tables.strip().lower() == "all"
              else [t.strip() for t in args.tables.split(",")])

    if "ayah"         in tables: migrate_ayah(args.dry_run)
    if "meta"         in tables: migrate_surah_ayah_meta(args.dry_run)
    if "sources"      in tables: migrate_translation_sources(args.dry_run)
    if "translations" in tables: migrate_translations(args.dry_run)
    if "words"        in tables: migrate_word_occurrences(args.dry_run)
    if "pages"        in tables: migrate_page_layout_lines(args.dry_run)
    if "passages"     in tables: migrate_surah_passages(args.dry_run)

    print_summary(args.dry_run)

if __name__ == "__main__":
    main()
