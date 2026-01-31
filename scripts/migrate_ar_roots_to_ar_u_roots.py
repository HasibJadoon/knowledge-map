#!/usr/bin/env python3
"""Migrate the legacy ar_roots records into ar_u_roots using the canonical SHA helper."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

CANONICAL_PREFIX = "ROOT|"


def canonicalize(value: str) -> str:
    """Collapse whitespace and lowercase ASCII letters only."""
    normalized = re.sub(r"\s+", " ", value or "").strip()
    return re.sub(r"[A-Z]", lambda match: match.group(0).lower(), normalized)


def sha256_hex(input_value: str) -> Tuple[str, str]:
    canonical = canonicalize(input_value)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return digest, canonical


def build_meta(row: sqlite3.Row) -> Optional[str]:
    meta: Dict[str, Any] = {}
    roman = row["romanization_sources_json"]
    if roman and isinstance(roman, str) and roman.strip().upper() != "NULL":
        try:
            meta["romanization_sources"] = json.loads(roman)
        except json.JSONDecodeError:
            meta["romanization_sources_raw"] = roman


    word_count = row["word_count"]
    if word_count is not None:
        meta["legacy_word_count"] = word_count

    legacy_id = row["id"]
    if legacy_id is not None:
        meta["legacy_row_id"] = legacy_id

    return json.dumps(meta, ensure_ascii=False) if meta else None


def build_insert_payload(row: sqlite3.Row) -> Tuple[str, str, Tuple]:
    root_norm = (row["root_norm"] or row["root"] or "").strip()
    if not root_norm:
        root_norm = row["root"] or ""
    canonical_input = f"{CANONICAL_PREFIX}{root_norm}"
    ar_u_root, canonical = sha256_hex(canonical_input)

    status_raw = row["status"] or "active"
    status = status_raw.strip().lower()

    meta_json = build_meta(row)

    payload = (
        ar_u_root,
        canonical,
        row["root"],
        row["arabic_trilateral"],
        row["english_trilateral"],
        row["root_latn"],
        root_norm,
        row["alt_latn_json"],
        row["search_keys_norm"],
        status,
        row["difficulty"],
        row["frequency"],
        row["extracted_at"],
        meta_json,
        row["created_at"],
        row["updated_at"],
    )
    return canonical, root_norm, payload


def migrate(db_path: Path, dry_run: bool = False) -> None:
    if not db_path.exists():
        raise SystemExit(f"Database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    schema_check = cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='ar_roots'"
    ).fetchone()
    if not schema_check:
        raise SystemExit("ar_roots table is missing from the database.")

    rows = cursor.execute("SELECT * FROM ar_roots").fetchall()
    if not rows:
        print("No rows found in ar_roots; nothing to migrate.")
        return

    insert_sql = """
    INSERT INTO ar_u_roots (
      ar_u_root,
      canonical_input,
      root,
      arabic_trilateral,
      english_trilateral,
      root_latn,
      root_norm,
      alt_latn_json,
      search_keys_norm,
      status,
      difficulty,
      frequency,
      extracted_at,
      meta_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ar_u_root) DO UPDATE SET
      root = excluded.root,
      arabic_trilateral = excluded.arabic_trilateral,
      english_trilateral = excluded.english_trilateral,
      root_latn = excluded.root_latn,
      root_norm = excluded.root_norm,
      alt_latn_json = excluded.alt_latn_json,
      search_keys_norm = excluded.search_keys_norm,
      status = excluded.status,
      difficulty = excluded.difficulty,
      frequency = excluded.frequency,
      extracted_at = excluded.extracted_at,
      meta_json = excluded.meta_json,
      updated_at = excluded.updated_at
  """

    seen_canonical: set[str] = set()
    seen_root_norm: set[str] = set()
    migrated = 0
    for row in rows:
        canonical_input, root_norm, payload = build_insert_payload(row)
        if canonical_input in seen_canonical or root_norm in seen_root_norm:
            continue
        seen_canonical.add(canonical_input)
        seen_root_norm.add(root_norm)
        if dry_run:
            migrated += 1
            continue
        cursor.execute(insert_sql, payload)
        migrated += 1

    if not dry_run:
        conn.commit()
    print(f"Migrated {migrated} row(s) from ar_roots into ar_u_roots.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate legacy ar_roots rows into the ar_u_roots table."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path("database/d1.db"),
        help="Path to the D1 SQLite database",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show the rows that would be migrated without touching the database",
    )
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    try:
        migrate(arguments.db, arguments.dry_run)
    except sqlite3.Error as exc:
        raise SystemExit(f"SQLite error: {exc}") from exc
