#!/usr/bin/env python3
"""Rebuild ar_u_roots from the tarteel.ai root export, including variants."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
from pathlib import Path
from typing import Any


INSERT_TEMPLATE = '''
INSERT INTO ar_u_roots (
  ar_u_root, canonical_input, root, root_norm,
  arabic_trilateral, english_trilateral, root_latn, alt_latn_json,
  search_keys_norm, cards_json, status, difficulty, frequency,
  created_at, updated_at, extracted_at, meta_json
 ) VALUES (
  ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
 )
ON CONFLICT(ar_u_root) DO UPDATE SET
  canonical_input = excluded.canonical_input,
  root = excluded.root,
  root_norm = excluded.root_norm,
  arabic_trilateral = excluded.arabic_trilateral,
  english_trilateral = excluded.english_trilateral,
  root_latn = excluded.root_latn,
  alt_latn_json = excluded.alt_latn_json,
  search_keys_norm = excluded.search_keys_norm,
  cards_json = excluded.cards_json,
  status = excluded.status,
  difficulty = excluded.difficulty,
  frequency = excluded.frequency,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  extracted_at = excluded.extracted_at,
  meta_json = excluded.meta_json;
'''


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.upper() == 'NULL':
        return None
    return text


def parse_int(value: Any) -> int | None:
    norm = normalize_text(value)
    if norm is None:
        return None
    try:
        return int(norm)
    except ValueError:
        return None


def parse_json_value(value: Any) -> Any | None:
    norm = normalize_text(value)
    if norm is None:
        return None
    try:
        return json.loads(norm)
    except json.JSONDecodeError:
        return norm


def canonicalize(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value or "").strip()
    return re.sub(r"[A-Z]", lambda match: match.group(0).lower(), normalized)


def sha256_hex(input_value: str) -> tuple[str, str]:
    canonical = canonicalize(input_value)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return digest, canonical


def extract_first_string(value: Any) -> str | None:
    parsed = parse_json_value(value)
    if isinstance(parsed, list):
        for item in parsed:
            text = normalize_text(item)
            if text:
                return text
    return None


def collect_search_keys(values: list[tuple[Any, bool]]) -> str | None:
    tokens: list[str] = []
    seen: set[str] = set()
    for value, split in values:
        normalized = normalize_text(value)
        if not normalized:
            continue
        parts = re.split(r"\s+", normalized.strip()) if split else [normalized]
        for part in parts:
            if not part:
                continue
            lower = part.lower()
            if lower in seen:
                continue
            seen.add(lower)
            tokens.append(lower)
    return " ".join(tokens) if tokens else None


def build_meta(row: sqlite3.Row) -> dict[str, Any] | None:
    meta: dict[str, Any] = {}
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
    row_id = parse_int(row["c1"])
    if row_id is not None:
        meta["legacy_row_id"] = row_id
    roman_sources = parse_json_value(row["c8"])
    if isinstance(roman_sources, dict):
        meta["romanization_sources"] = roman_sources
    elif isinstance(roman_sources, str):
        meta["romanization_sources_raw"] = roman_sources
    extra_note = normalize_text(row["c21"])
    if extra_note:
        meta["legacy_note"] = extra_note
    return meta or None


def load_roots(allroots: Path) -> list[sqlite3.Row]:
    text = allroots.read_text()
    inserts = [line for line in text.splitlines() if line.strip().startswith("INSERT INTO roots")]
    script = "CREATE TABLE roots (" + ", ".join(f"c{i} TEXT" for i in range(1, 22)) + ");\n"
    script += "\n".join(inserts)
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(script)
    return sorted(conn.execute("SELECT * FROM roots"), key=lambda r: int(r["c1"] or 0))


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync ar_u_roots with tarteel.ai roots export.")
    parser.add_argument(
        "--roots-sql",
        type=Path,
        default=Path("database/data/roots/tarteel.ai/allroots.sql"),
        help="Path to the tarteel.ai roots SQL dump",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path("database/d1.db"),
        help="Path to the target D1 database",
    )
    args = parser.parse_args()

    if not args.roots_sql.exists():
        raise SystemExit(f"Missing {args.roots_sql}")
    if not args.db.exists():
        raise SystemExit(f"Target database not found: {args.db}")

    rows = load_roots(args.roots_sql)
    conn = sqlite3.connect(args.db)
    seen_canonical: set[str] = set()
    seen_root_norm: set[str] = set()

    cursor = conn.cursor()
    updated = 0
    for row in rows:
        base_root_norm = normalize_text(row["c17"]) or normalize_text(row["c5"]) or ""
        root_norm_val = base_root_norm
        base_template = f"ROOT|{root_norm_val}"
        ar_u_root, canonical_input = sha256_hex(base_template)

        if canonical_input in seen_canonical or (root_norm_val and root_norm_val in seen_root_norm):
            row_id = normalize_text(row["c1"]) or str(row["c1"] or "")
            suffix = f"|{row_id}" if row_id else f"|r{len(seen_root_norm) + 1}"
            fallback_root_norm = f"{root_norm_val}{suffix}" if root_norm_val else suffix.lstrip("|")
            fallback_template = f"ROOT|{fallback_root_norm}"
            ar_u_root, canonical_input = sha256_hex(fallback_template)
            root_norm_val = fallback_root_norm

        seen_canonical.add(canonical_input)
        if root_norm_val:
            seen_root_norm.add(root_norm_val)

        arabic_trilateral = normalize_text(row["c18"])
        english_trilateral = extract_first_string(row["c7"]) or normalize_text(row["c5"])
        search_keys = collect_search_keys([
            (row["c10"], True),
            (arabic_trilateral, False),
            (english_trilateral, False),
        ])
        meta = build_meta(row)
        meta_json = json.dumps(meta, ensure_ascii=False, separators=(",", ":")) if meta else None

        values = (
            ar_u_root,
            canonical_input,
            normalize_text(row["c3"]) or "",
            root_norm_val,
            arabic_trilateral,
            english_trilateral,
            normalize_text(row["c5"]),
            normalize_text(row["c7"]),
            search_keys,
            normalize_text(row["c9"]),
            normalize_text(row["c11"]) or "active",
            parse_int(row["c12"]),
            normalize_text(row["c13"]),
            normalize_text(row["c14"]),
            normalize_text(row["c15"]),
            normalize_text(row["c16"]),
            meta_json,
        )
        cursor.execute(INSERT_TEMPLATE, values)
        updated += 1

    conn.commit()
    conn.close()
    print(f"Synchronized {updated} root rows into {args.db}")


if __name__ == "__main__":
    main()
