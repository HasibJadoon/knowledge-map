from __future__ import annotations

import argparse
import json
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from quran_words import _parse_word_row


COLUMNS = [
    "id",
    "aya",
    "sura",
    "position",
    "verse_key",
    "text",
    "simple",
    "juz",
    "hezb",
    "rub",
    "page",
    "class_name",
    "line",
    "code",
    "code_v3",
    "char_type",
    "audio",
    "translation",
]

INT_COLUMNS = {
    "id",
    "aya",
    "sura",
    "position",
    "juz",
    "hezb",
    "rub",
    "page",
    "line",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export Salam Quran words into per-ayah JSON payloads for ar_quran_ayah.words."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path("database/d1.db"),
        help="Path to the SQLite DB with quran_ayah_lemma_location + ar_u_tokens.",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("database/salamquran_quran_words.sql"),
        help="Path to salamquran_quran_words.sql",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("database/seeds/seed-ar_quran_ayah_words.sql"),
        help="Output SQL file with UPDATE statements.",
    )
    return parser.parse_args()


def coerce_value(column: str, raw: Optional[str]) -> Any:
    if raw is None:
        return None
    value = raw.strip()
    if not value or value.upper() == "NULL":
        return None
    if column in INT_COLUMNS:
        try:
            return int(value)
        except ValueError:
            return None
    return value


def parse_rows(path: Path) -> Dict[Tuple[int, int], List[Dict[str, Any]]]:
    grouped: Dict[Tuple[int, int], List[Dict[str, Any]]] = defaultdict(list)
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            columns = _parse_word_row(line)
            if not columns or len(columns) < len(COLUMNS):
                continue
            row: Dict[str, Any] = {}
            for idx, name in enumerate(COLUMNS):
                raw_value = columns[idx] if idx < len(columns) else None
                row[name] = coerce_value(name, raw_value)
            surah = row.get("sura")
            ayah = row.get("aya")
            if not isinstance(surah, int) or not isinstance(ayah, int):
                continue
            grouped[(surah, ayah)].append(row)
    return grouped


def load_lemma_root_map(db_path: Path) -> Dict[Tuple[int, int, int], Dict[str, Optional[str]]]:
    if not db_path.exists():
        raise SystemExit(f"Missing DB file: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
          q.surah,
          q.ayah,
          q.token_index,
          l.lemma_text,
          l.lemma_text_clean,
          t.ar_u_root,
          r.root,
          r.root_norm
        FROM quran_ayah_lemma_location q
        LEFT JOIN quran_ayah_lemmas l ON l.lemma_id = q.lemma_id
        LEFT JOIN ar_u_tokens t ON t.ar_u_token = q.ar_u_token
        LEFT JOIN ar_u_roots r ON r.ar_u_root = t.ar_u_root
        """
    )

    mapping: Dict[Tuple[int, int, int], Dict[str, Optional[str]]] = {}
    for row in cursor.fetchall():
        surah, ayah, token_index, lemma_text, lemma_clean, ar_u_root, root, root_norm = row
        if not isinstance(surah, int) or not isinstance(ayah, int) or not isinstance(token_index, int):
            continue
        key = (surah, ayah, token_index)
        if key in mapping:
            continue
        lemma_value = lemma_clean or lemma_text
        root_value = root or root_norm or ar_u_root
        mapping[key] = {
            "lemma": lemma_value,
            "root": root_value,
        }

    conn.close()
    return mapping


def main() -> None:
    args = parse_args()
    if not args.input.exists():
        raise SystemExit(f"Missing input file: {args.input}")

    grouped = parse_rows(args.input)
    lemma_root_map = load_lemma_root_map(args.db)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as fh:
        fh.write("-- Seed ar_quran_ayah.words using the Salam Quran words dump.\n")
        for (surah, ayah) in sorted(grouped.keys()):
            items = grouped[(surah, ayah)]
            items.sort(key=lambda item: (item.get("position") or 0, item.get("id") or 0))
            page_value = None
            for item in items:
                page = item.get("page")
                if isinstance(page, int):
                    page_value = page
                    break
            for item in items:
                key = (
                    item.get("sura"),
                    item.get("aya"),
                    item.get("position"),
                )
                if (
                    isinstance(key[0], int)
                    and isinstance(key[1], int)
                    and isinstance(key[2], int)
                    and key in lemma_root_map
                ):
                    lemma_root = lemma_root_map[key]
                    item["lemma"] = lemma_root.get("lemma")
                    item["root"] = lemma_root.get("root")
            payload = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
            escaped = payload.replace("'", "''")
            if page_value is None:
                fh.write(
                    f"UPDATE ar_quran_ayah SET words = '{escaped}' WHERE surah = {surah} AND ayah = {ayah};\n"
                )
            else:
                fh.write(
                    "UPDATE ar_quran_ayah SET words = '{words}', page = {page} "
                    "WHERE surah = {surah} AND ayah = {ayah};\n".format(
                        words=escaped, page=page_value, surah=surah, ayah=ayah
                    )
                )

    print(f"Wrote {len(grouped)} ayah updates to {args.output}")


if __name__ == "__main__":
    main()
