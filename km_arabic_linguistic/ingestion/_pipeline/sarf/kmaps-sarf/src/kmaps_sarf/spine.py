"""Locked Quran spine reader.

The spine (qr_word_occurrences, qr_tafsir_entries) lives in the km_quran D1 database.
For ingestion runs we want a local SQLite cache so the pipeline can run offline and fast.

Two backends:
  1. local sqlite mirror at data/raw/spine/spine.sqlite (preferred for pilots)
  2. live wrangler d1 export -- requires CLOUDFLARE_API_TOKEN

Use scripts/02_import_spine/dump_spine_from_d1.py to populate the local mirror.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterable

from .config import RAW_DIR

SPINE_DIR = RAW_DIR / "spine"
SPINE_DB = SPINE_DIR / "spine.sqlite"

WORDS_SCHEMA = """
CREATE TABLE IF NOT EXISTS qr_word_occurrences (
    id TEXT PRIMARY KEY,
    surah INTEGER, ayah INTEGER, word_index INTEGER,
    word_text TEXT, word_text_bare TEXT,
    root TEXT, lemma TEXT, pos TEXT,
    morphology_tag TEXT, morphology_tag_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_qrwo_sa ON qr_word_occurrences(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qrwo_lemma ON qr_word_occurrences(lemma);
CREATE INDEX IF NOT EXISTS idx_qrwo_root ON qr_word_occurrences(root);
"""

TAFSIR_SCHEMA = """
CREATE TABLE IF NOT EXISTS qr_tafsir_entries (
    id TEXT PRIMARY KEY,
    surah INTEGER, ayah_from INTEGER, ayah_to INTEGER,
    entry_type TEXT, scholar_id TEXT, work_id TEXT,
    content_ar TEXT, content_en TEXT, source_page TEXT
);
CREATE INDEX IF NOT EXISTS idx_qrte_sa ON qr_tafsir_entries(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_qrte_work ON qr_tafsir_entries(work_id);
"""


def init_spine_db() -> None:
    SPINE_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(SPINE_DB) as cx:
        cx.executescript(WORDS_SCHEMA)
        cx.executescript(TAFSIR_SCHEMA)


@contextmanager
def spine_conn():
    init_spine_db()
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    try:
        yield cx
    finally:
        cx.close()


def words_for_scope(scope: dict) -> list[dict]:
    with spine_conn() as cx:
        if scope.get("all"):
            rows = cx.execute("SELECT * FROM qr_word_occurrences ORDER BY surah, ayah, word_index").fetchall()
        elif scope.get("ayah_from") is not None:
            rows = cx.execute(
                "SELECT * FROM qr_word_occurrences WHERE surah=? AND ayah BETWEEN ? AND ? ORDER BY ayah, word_index",
                (scope["surah"], scope["ayah_from"], scope["ayah_to"]),
            ).fetchall()
        else:
            rows = cx.execute(
                "SELECT * FROM qr_word_occurrences WHERE surah=? ORDER BY ayah, word_index",
                (scope["surah"],),
            ).fetchall()
    return [dict(r) for r in rows]


def tafsir_for_scope(scope: dict) -> list[dict]:
    with spine_conn() as cx:
        if scope.get("all"):
            rows = cx.execute("SELECT * FROM qr_tafsir_entries ORDER BY surah, ayah_from").fetchall()
        elif scope.get("ayah_from") is not None:
            rows = cx.execute(
                "SELECT * FROM qr_tafsir_entries "
                "WHERE surah=? AND ayah_from <= ? AND ayah_to >= ? "
                "ORDER BY ayah_from",
                (scope["surah"], scope["ayah_to"], scope["ayah_from"]),
            ).fetchall()
        else:
            rows = cx.execute(
                "SELECT * FROM qr_tafsir_entries WHERE surah=? ORDER BY ayah_from",
                (scope["surah"],),
            ).fetchall()
    return [dict(r) for r in rows]


def upsert_words(rows: Iterable[dict]) -> int:
    init_spine_db()
    n = 0
    with sqlite3.connect(SPINE_DB) as cx:
        for r in rows:
            cx.execute(
                "INSERT OR REPLACE INTO qr_word_occurrences "
                "(id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag, morphology_tag_json) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    r["id"], r["surah"], r["ayah"], r["word_index"],
                    r.get("word_text"), r.get("word_text_bare"),
                    r.get("root"), r.get("lemma"), r.get("pos"),
                    r.get("morphology_tag"), r.get("morphology_tag_json"),
                ),
            )
            n += 1
        cx.commit()
    return n


def upsert_tafsir(rows: Iterable[dict]) -> int:
    init_spine_db()
    n = 0
    with sqlite3.connect(SPINE_DB) as cx:
        for r in rows:
            cx.execute(
                "INSERT OR REPLACE INTO qr_tafsir_entries "
                "(id, surah, ayah_from, ayah_to, entry_type, scholar_id, work_id, content_ar, content_en, source_page) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    r["id"], r["surah"], r["ayah_from"], r["ayah_to"],
                    r.get("entry_type"), r.get("scholar_id"), r.get("work_id"),
                    r.get("content_ar"), r.get("content_en"), r.get("source_page"),
                ),
            )
            n += 1
        cx.commit()
    return n
