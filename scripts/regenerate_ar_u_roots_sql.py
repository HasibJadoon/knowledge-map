#!/usr/bin/env python3
"""Rebuild database/data/roots/tarteel.ai/roots-only.sql with the current ar_u_roots schema."""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Tuple

ROOTS_SQL = Path("database/data/roots/tarteel.ai/allroots.sql")
TARGET_SQL = Path("database/data/roots/tarteel.ai/roots-only.sql")


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


def parse_int(value: Any) -> Optional[int]:
    normalized = normalize_text(value)
    if normalized is None:
        return None
    try:
        return int(normalized)
    except ValueError:
        return None


def parse_json_value(value: Any) -> Optional[Any]:
    normalized = normalize_text(value)
    if normalized is None:
        return None
    try:
        return json.loads(normalized)
    except json.JSONDecodeError:
        return normalized


def build_meta(row: sqlite3.Row) -> Optional[Dict[str, Any]]:
    meta: Dict[str, Any] = {}

    family = normalize_text(row["c4"])
    if family:
        meta["family"] = family

    root_copy = normalize_text(row["c6"])
    if root_copy:
        meta["root_copy"] = root_copy

    letter_breakdown = normalize_text(row["c18"])
    if letter_breakdown:
        meta["letter_breakdown"] = letter_breakdown

    word_count = parse_int(row["c19"])
    if word_count is not None:
        meta["legacy_word_count"] = word_count

    occurrence_count = parse_int(row["c20"])
    if occurrence_count is not None:
        meta["legacy_occurrence_count"] = occurrence_count

    legacy_id = parse_int(row["c1"])
    if legacy_id is not None:
        meta["legacy_row_id"] = legacy_id

    roman_sources = parse_json_value(row["c8"])
    if isinstance(roman_sources, dict):
        meta["romanization_sources"] = roman_sources
    elif isinstance(roman_sources, str):
        meta["romanization_sources_raw"] = roman_sources

    extra_note = normalize_text(row["c21"])
    if extra_note:
        meta["legacy_note"] = extra_note

    return meta or None


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def dump_rows(rows: Iterable[sqlite3.Row]) -> str:
    lines = []
    for row in rows:
        root_norm = normalize_text(row["c17"]) or normalize_text(row["c5"]) or ""
        canonical_template = f"ROOT|{root_norm}"
        ar_u_root, canonical_input = sha256_hex(canonical_template)
        status = normalize_text(row["c11"]) or "active"
        difficulty = parse_int(row["c12"])
        frequency = normalize_text(row["c13"])
        created_at = normalize_text(row["c14"])
        updated_at = normalize_text(row["c15"])
        extracted_at = normalize_text(row["c16"])

        meta = build_meta(row)
        meta_json = json.dumps(meta, ensure_ascii=False, separators=(",", ":")) if meta else None

        values = [
            ar_u_root,
            canonical_input,
            normalize_text(row["c3"]) or "",
            root_norm,
            None,
            None,
            normalize_text(row["c5"]),
            normalize_text(row["c7"]),
            normalize_text(row["c10"]),
            status,
            difficulty,
            frequency,
            created_at,
            updated_at,
            extracted_at,
            meta_json,
        ]

        lines.append(f"INSERT INTO ar_u_roots VALUES({', '.join(sql_literal(v) for v in values)});")
    return "\n".join(lines)


def main() -> None:
    if not ROOTS_SQL.exists():
        raise SystemExit(f"Missing {ROOTS_SQL}")

    script = f"CREATE TABLE roots ({', '.join(f'c{i} TEXT' for i in range(1, 22))});\n"
    relevant_lines = [
        line
        for line in ROOTS_SQL.read_text().splitlines()
        if line.strip().startswith("INSERT INTO roots")
    ]
    script += "\n".join(relevant_lines) + "\n"

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(script)

    rows = sorted(conn.execute("SELECT * FROM roots"), key=lambda r: int(r["c1"]))

    header = """-- Tarteel.ai root export aligned with ar_u_roots
DROP TABLE IF EXISTS ar_u_roots;
CREATE TABLE ar_u_roots (
  ar_u_root        TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  root             TEXT NOT NULL,
  root_norm        TEXT NOT NULL UNIQUE,

  arabic_trilateral TEXT,
  english_trilateral TEXT,
  root_latn         TEXT,

  alt_latn_json     JSON CHECK (alt_latn_json IS NULL OR json_valid(alt_latn_json)),
  search_keys_norm  TEXT,

  status            TEXT NOT NULL DEFAULT 'active',
  difficulty        INTEGER,
  frequency         TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  extracted_at      TEXT,
  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json))
);

"""
    body = dump_rows(rows)
    TARGET_SQL.write_text(header + body + ("\n" if body else ""))
    print(f"Wrote {len(rows)} rows → {TARGET_SQL}")


if __name__ == "__main__":
    main()
