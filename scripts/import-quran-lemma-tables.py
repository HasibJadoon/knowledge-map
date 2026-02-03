#!/usr/bin/env python3
"""Import QUL word-lemma data into quran_ayah_lemmas / quran_ayah_lemma_location tables."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


def parse_word_location(location: str) -> Optional[Tuple[int, int, int]]:
    """Parse word_location strings like 54:26:4 or DOC_QURAN_HAFS:12:23:TOK_05."""
    if not location:
        return None
    parts = location.split(":")
    if len(parts) < 3:
        return None
    try:
        surah = int(parts[-3])
        ayah = int(parts[-2])
    except ValueError:
        return None
    token_part = parts[-1]
    if token_part.upper().startswith("TOK_"):
        try:
            token_index = int(token_part.split("_")[-1])
        except ValueError:
            return None
    else:
        try:
            token_index = int(token_part)
        except ValueError:
            return None
    return surah, ayah, token_index


def ensure_tables(cursor: sqlite3.Cursor) -> None:
    cursor.executescript(
        """
        CREATE TABLE IF NOT EXISTS quran_ayah_lemmas (
            lemma_id INTEGER PRIMARY KEY,
            lemma_text TEXT NOT NULL,
            lemma_text_clean TEXT NOT NULL,
            words_count INTEGER,
            uniq_words_count INTEGER,
            primary_ar_u_token TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (primary_ar_u_token) REFERENCES ar_u_tokens(ar_u_token)
        );

        CREATE TABLE IF NOT EXISTS quran_ayah_lemma_location (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lemma_id INTEGER NOT NULL REFERENCES quran_ayah_lemmas(lemma_id) ON DELETE CASCADE,
            word_location TEXT NOT NULL,
            surah INTEGER NOT NULL,
            ayah INTEGER NOT NULL,
            token_index INTEGER NOT NULL,
            ar_token_occ_id TEXT,
            ar_u_token TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id),
            FOREIGN KEY (ar_u_token) REFERENCES ar_u_tokens(ar_u_token)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_quran_ayah_lemma_location_unique
            ON quran_ayah_lemma_location (lemma_id, word_location);
        CREATE INDEX IF NOT EXISTS idx_quran_ayah_lemma_location_ref
            ON quran_ayah_lemma_location (surah, ayah);
        """
    )


def load_lemmas(lemmas_conn: sqlite3.Connection) -> Tuple[Dict[int, sqlite3.Row], List[Tuple[int, str]]]:
    lemmas_conn.row_factory = sqlite3.Row
    lemmas: Dict[int, sqlite3.Row] = {
        row["id"]: row
        for row in lemmas_conn.execute("SELECT id, text, text_clean, words_count, uniq_words_count FROM lemmas")
    }
    word_rows = [(row["lemma_id"], row["word_location"]) for row in lemmas_conn.execute("SELECT lemma_id, word_location FROM lemma_words")]
    return lemmas, word_rows


def find_token(cursor: sqlite3.Cursor, surah: int, ayah: int, token_index: int) -> Tuple[Optional[str], Optional[str]]:
    unit_id = f"U:QURAN:{surah}:{ayah}"
    pos_candidates = [token_index - 1, token_index]
    for pos in pos_candidates:
        if pos < 0:
            continue
        row = cursor.execute(
            "SELECT ar_token_occ_id, ar_u_token FROM ar_occ_token WHERE unit_id = ? AND pos_index = ? LIMIT 1",
            (unit_id, pos),
        ).fetchone()
        if row:
            return row[0], row[1]
    return None, None


def group_locations(locations: Iterable[Tuple[int, str]]) -> Dict[int, List[str]]:
    grouped: Dict[int, List[str]] = {}
    for lemma_id, location in locations:
        grouped.setdefault(lemma_id, []).append(location)
    return grouped


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import QUL lemmas into quran_ayah_lemmas tables.")
    parser.add_argument("--lemmas-db", type=Path, required=True, help="Path to word-lemma SQLite file.")
    parser.add_argument("--target-db", type=Path, default=Path("database/d1.db"), help="Target D1 SQLite file.")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing to target.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.lemmas_db.exists():
        raise SystemExit(f"Word lemma DB missing: {args.lemmas_db}")
    if not args.target_db.exists():
        raise SystemExit(f"Target D1 DB missing: {args.target_db}")

    lemmas_conn = sqlite3.connect(args.lemmas_db)
    target_conn = sqlite3.connect(args.target_db)
    target_cursor = target_conn.cursor()
    ensure_tables(target_cursor)
    grouped_locations = group_locations(load_lemmas(lemmas_conn)[1])
    lemmas_conn.row_factory = sqlite3.Row
    total_locations = 0
    missing_tokens = 0

    insert_lemma_sql = """
        INSERT INTO quran_ayah_lemmas (lemma_id, lemma_text, lemma_text_clean, words_count, uniq_words_count)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(lemma_id) DO UPDATE SET
            lemma_text = excluded.lemma_text,
            lemma_text_clean = excluded.lemma_text_clean,
            words_count = excluded.words_count,
            uniq_words_count = excluded.uniq_words_count;
    """
    insert_location_sql = """
        INSERT INTO quran_ayah_lemma_location (lemma_id, word_location, surah, ayah, token_index, ar_token_occ_id, ar_u_token)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(lemma_id, word_location) DO UPDATE SET
            ar_token_occ_id = excluded.ar_token_occ_id,
            ar_u_token = excluded.ar_u_token;
    """

    for lemma_row in lemmas_conn.execute("SELECT id, text, text_clean, words_count, uniq_words_count FROM lemmas"):
        lemma_id = lemma_row["id"]
        target_cursor.execute(
            insert_lemma_sql,
            (
                lemma_id,
                lemma_row["text"],
                lemma_row["text_clean"],
                lemma_row["words_count"],
                lemma_row["uniq_words_count"],
            ),
        )
        primary_set = False
        for location in grouped_locations.get(lemma_id, []):
            parsed = parse_word_location(location)
            if not parsed:
                continue
            surah, ayah, token_index = parsed
            token_occ_id, ar_u_token = find_token(target_cursor, surah, ayah, token_index)
            if not token_occ_id and not ar_u_token:
                missing_tokens += 1
            else:
                if not primary_set and ar_u_token:
                    target_cursor.execute(
                        "UPDATE quran_ayah_lemmas SET primary_ar_u_token = ? WHERE lemma_id = ? AND primary_ar_u_token IS NULL",
                        (ar_u_token, lemma_id),
                    )
                    primary_set = True
            target_cursor.execute(
                insert_location_sql,
                (lemma_id, location, surah, ayah, token_index, token_occ_id, ar_u_token),
            )
            total_locations += 1

    if args.dry_run:
        target_conn.rollback()
        print(f"[dry-run] would have added {total_locations} lemma locations, {missing_tokens} without tokens.")
    else:
        target_conn.commit()
        print(f"Imported {total_locations} lemma locations ({missing_tokens} without known tokens).")

    lemmas_conn.close()
    target_conn.close()


if __name__ == "__main__":
    main()
