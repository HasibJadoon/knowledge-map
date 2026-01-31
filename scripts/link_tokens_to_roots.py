#!/usr/bin/env python3
"""Fill missing ar_u_root values on ar_u_tokens using the tarteel.ai roots table."""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

DIACRITICS_RE = re.compile(
    r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0591-\u05C7]+"
)


def normalize_root_arabic(text: str | None) -> str:
    if not text:
        return ""
    cleaned = DIACRITICS_RE.sub("", text)
    cleaned = "".join(cleaned.split())
    return cleaned


def main() -> None:
    db_path = Path("database/d1.db")
    if not db_path.exists():
        raise SystemExit(f"Database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    root_lookup: dict[str, str] = {}
    english_lookup: dict[str, str] = {}

    for row in conn.execute("SELECT ar_u_root, root, english_trilateral FROM ar_u_roots"):
        root_norm = normalize_root_arabic(row["root"])
        if root_norm:
            root_lookup.setdefault(root_norm, row["ar_u_root"])
        english = (row["english_trilateral"] or "").replace(" ", "")
        if english:
            english_lookup.setdefault(english.lower(), row["ar_u_root"])

    rows = conn.execute(
        "SELECT rowid, root_norm FROM ar_u_tokens WHERE ar_u_root IS NULL AND root_norm IS NOT NULL AND root_norm != ''"
    ).fetchall()

    updated = 0
    cursor = conn.cursor()

    for item in rows:
        rowid = item["rowid"]
        root_norm = item["root_norm"] or ""
        parts = root_norm.split("|")
        arabic = parts[-1].strip() if parts else ""
        normalized_arabic = normalize_root_arabic(arabic)

        ar_u_root = root_lookup.get(normalized_arabic)

        if not ar_u_root:
            english = parts[0].strip().lower() if parts else ""
            ar_u_root = english_lookup.get(english)

        if not ar_u_root:
            continue

        cursor.execute(
            "UPDATE ar_u_tokens SET ar_u_root = ? WHERE rowid = ?",
            (ar_u_root, rowid),
        )
        updated += 1

    conn.commit()

    remaining = conn.execute("SELECT COUNT(*) FROM ar_u_tokens WHERE ar_u_root IS NULL").fetchone()
    remaining_count = remaining[0] if remaining else 0

    print(f"Updated {updated} tokens; {remaining_count} still null.")

    conn.close()


if __name__ == "__main__":
    main()
