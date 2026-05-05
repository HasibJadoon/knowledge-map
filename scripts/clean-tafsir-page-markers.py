#!/usr/bin/env python3
"""
Clean inline page markers from qr_tafsir_entries in D1 km_quran.

For every row where content_ar contains صفحة N:
  - Extracts the first page number → source_page column
  - Strips all صفحة N markers from content_ar
  - Normalises surrounding whitespace

Usage (from repo root):
    python3 scripts/clean-tafsir-page-markers.py [--dry-run]
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

# ── config ────────────────────────────────────────────────────────────────────

REPO       = Path(__file__).resolve().parent.parent
WR         = REPO / "node_modules/.bin/wrangler"
QR_CFG     = REPO / "workers/quran/wrangler.toml"
DB_NAME    = "km_quran"
OUTPUT_DIR = REPO / "database/seeds/tafsir-clean"

FETCH_BATCH = 50    # rows per SELECT (content can be large)
SQL_BATCH   = 150   # UPDATE statements per SQL file

# Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩
_AR_IND = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

# Matches:  صفحة  +  one-or-more digits (Western or Arabic-Indic)
#           with optional surrounding whitespace
_PAGE_RE = re.compile(r"\s*صفحة\s+([\d٠-٩]+)\s*")


# ── wrangler helpers ──────────────────────────────────────────────────────────

def _wrangler(*extra_args: str) -> tuple[bool, str, str]:
    cmd = [str(WR), "d1", "execute", DB_NAME, "--remote",
           "--config", str(QR_CFG)] + list(extra_args)
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return r.returncode == 0, r.stdout, r.stderr


def _parse_json(out: str) -> list:
    m = re.search(r"(\[[\s\S]*\])", out)
    return json.loads(m.group(1)) if m else []


def query(sql: str) -> list[dict]:
    ok, out, err = _wrangler("--json", "--command", sql)
    if not ok:
        print(f"  [wrangler error] {err[:400]}", file=sys.stderr)
        return []
    parsed = _parse_json(out)
    return parsed[0]["results"] if parsed else []


def execute_file(path: Path) -> bool:
    ok, _, err = _wrangler("--file", str(path))
    if not ok:
        print(f"  [wrangler error] {err[:400]}", file=sys.stderr)
    return ok


# ── text helpers ──────────────────────────────────────────────────────────────

def to_western(digits: str) -> str:
    return digits.translate(_AR_IND)


def extract_first_page(text: str) -> str | None:
    m = _PAGE_RE.search(text)
    if not m:
        return None
    return to_western(m.group(1))


def strip_page_markers(text: str) -> str:
    cleaned = _PAGE_RE.sub(" ", text)
    cleaned = re.sub(r"  +", " ", cleaned)
    return cleaned.strip()


def esc(s: str) -> str:
    return s.replace("'", "''")


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    dry_run = "--dry-run" in sys.argv

    # 1. Count affected rows
    rows = query(
        "SELECT COUNT(*) AS n FROM qr_tafsir_entries "
        "WHERE content_ar LIKE '%صفحة%'"
    )
    total = rows[0]["n"] if rows else 0
    print(f"Rows with page markers: {total}")
    if total == 0:
        print("Nothing to clean.")
        return

    # 2. Fetch all affected rows in pages
    updates: list[tuple[str, str, str]] = []   # (id, clean_content, source_page)
    offset = 0
    while offset < total:
        batch = query(
            f"SELECT id, content_ar FROM qr_tafsir_entries "
            f"WHERE content_ar LIKE '%صفحة%' "
            f"LIMIT {FETCH_BATCH} OFFSET {offset}"
        )
        if not batch:
            break
        for row in batch:
            raw = row["content_ar"]
            page = extract_first_page(raw)
            clean = strip_page_markers(raw)
            if clean != raw:
                updates.append((row["id"], clean, page or ""))
        offset += len(batch)
        pct = min(offset, total)
        print(f"  fetched {pct}/{total} ({len(updates)} queued)...", flush=True)

    print(f"\nRows to update: {len(updates)}")

    if dry_run:
        print("\n--- DRY RUN sample (3 rows) ---")
        for row_id, content, page in updates[:3]:
            print(f"  id:         {row_id}")
            print(f"  source_page:{page}")
            print(f"  content[:120]: {content[:120]}")
            print()
        return

    # 3. Write SQL UPDATE batches
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    batch_files: list[Path] = []

    for i in range(0, len(updates), SQL_BATCH):
        chunk = updates[i : i + SQL_BATCH]
        fp = OUTPUT_DIR / f"update_batch_{i // SQL_BATCH + 1:03d}.sql"
        with open(fp, "w", encoding="utf-8") as f:
            for row_id, content, page in chunk:
                page_sql = f"'{esc(page)}'" if page else "NULL"
                f.write(
                    f"UPDATE qr_tafsir_entries "
                    f"SET content_ar = '{esc(content)}', "
                    f"    source_page = {page_sql}, "
                    f"    updated_at  = datetime('now') "
                    f"WHERE id = '{esc(row_id)}';\n"
                )
        batch_files.append(fp)
        kb = fp.stat().st_size // 1024
        print(f"  wrote {fp.name}  ({len(chunk)} stmts, {kb} KB)")

    # 4. Apply each batch
    print(f"\nApplying {len(batch_files)} SQL file(s) to {DB_NAME}...")
    ok_count = 0
    for fp in batch_files:
        ok = execute_file(fp)
        mark = "✓" if ok else "✗"
        print(f"  {mark} {fp.name}")
        if ok:
            ok_count += 1

    print(f"\n{ok_count}/{len(batch_files)} batches applied.")
    if ok_count == len(batch_files):
        print("All page markers cleaned and source_page populated.")
    else:
        print("Some batches failed — check errors above.")


if __name__ == "__main__":
    main()
