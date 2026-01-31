#!/usr/bin/env python3
"""Populate ar_u_roots from the legacy tarteel.ai roots export."""

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
    normalized = re.sub(r"\s+", " ", value or "").strip()
    return re.sub(r"[A-Z]", lambda match: match.group(0).lower(), normalized)


def sha256_hex(input_value: str) -> Tuple[str, str]:
    canonical = canonicalize(input_value)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return digest, canonical


def normalize_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.upper() == "NULL":
        return None
    return text


def parse_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def build_meta(row: sqlite3.Row) -> Optional[str]:
    meta: Dict[str, Any] = {}
    root_copy = normalize_text(row["c6"])
    if root_copy:
        meta["root_copy"] = root_copy
    family = normalize_text(row["c4"])
    if family:
        meta["family"] = family
    letter_breakdown = normalize_text(row["c18"])
    if letter_breakdown:
        meta["letter_breakdown"] = letter_breakdown
    word_count = parse_int(normalize_text(row["c19"]))
    if word_count is not None:
        meta["legacy_word_count"] = word_count
    occurrence_count = parse_int(normalize_text(row["c20"]))
    if occurrence_count is not None:
        meta["legacy_occurrence_count"] = occurrence_count
    roman_sources = normalize_text(row["c8"])
    if roman_sources:
        try:
            meta["romanization_sources"] = json.loads(roman_sources)
        except json.JSONDecodeError:
            meta["romanization_sources_raw"] = roman_sources
    extra_note = normalize_text(row["c21"])
    if extra_note:
        meta["legacy_note"] = extra_note
    return json.dumps(meta, ensure_ascii=False) if meta else None


def migrate(db_path: Path, dry_run: bool) -> None:
    if not db_path.exists():
        raise SystemExit(f"Database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if not cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='roots'"
    ).fetchone():
        raise SystemExit("Legacy roots table is missing; load database/data/roots/tarteel.ai/roots-only.sql first.")

    rows = cursor.execute("SELECT * FROM roots").fetchall()
    if not rows:
        print("No legacy rows found in roots.")
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
      canonical_input = excluded.canonical_input,
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

    migrated = 0
    for row in rows:
        root = normalize_text(row["c3"])
        if not root:
            continue
        root_norm = normalize_text(row["c17"]) or normalize_text(row["c5"])
        if not root_norm:
            continue

        canonical_input = f"{CANONICAL_PREFIX}{root_norm}"
        ar_u_root, canonical = sha256_hex(canonical_input)

        payload = (
            ar_u_root,
            canonical,
            root,
            None,
            None,
            normalize_text(row["c5"]),
            root_norm,
            normalize_text(row["c7"]),
            normalize_text(row["c10"]),
            normalize_text(row["c11"]) or "active",
            parse_int(normalize_text(row["c12"])),
            normalize_text(row["c13"]),
            normalize_text(row["c16"]),
            build_meta(row),
            normalize_text(row["c14"]),
            normalize_text(row["c15"]),
        )

        if dry_run:
            print(f"Would migrate {root} ({root_norm}) → {ar_u_root}")
        else:
            cursor.execute(insert_sql, payload)
        migrated += 1

    if dry_run:
        print(f"Dry run: {migrated} rows would be touched.")
    else:
        conn.commit()
        print(f"Migrated {migrated} legacy rows into ar_u_roots.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import tarteel.ai roots into ar_u_roots.")
    parser.add_argument("--db", type=Path, default=Path("database/d1.db"), help="Path to the SQLite database.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without modifying the database.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        migrate(args.db, args.dry_run)
    except sqlite3.Error as exc:
        raise SystemExit(f"SQLite error: {exc}") from exc
