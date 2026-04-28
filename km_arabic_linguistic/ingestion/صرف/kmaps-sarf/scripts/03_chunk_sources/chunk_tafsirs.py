#!/usr/bin/env python3
"""
Step 03a: Chunk local Tafsir SQLite DBs into staging/chunks/tafsirs.jsonl

Reads the 10 usable tafsir DBs from km_arabic_linguistic/Tafsirs/,
strips HTML, and writes one JSONL file per ayah chunk.

Output: data/staging/chunks/tafsirs.jsonl

Usage:
    python3 scripts/03_chunk_sources/chunk_tafsirs.py
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path

try:
    from bs4 import BeautifulSoup
    BS4 = True
except ImportError:
    BS4 = False

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).resolve().parents[2]   # kmaps-sarf/
REPO_ROOT   = SCRIPT_DIR.parents[3]                 # knowledge-map/
TAFSIR_DIR  = REPO_ROOT / "km_arabic_linguistic/Tafsirs"
OUT_DIR     = SCRIPT_DIR / "data/staging/chunks"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSONL   = OUT_DIR / "tafsirs.jsonl"

# ── Source registry: DB filename → (source_id_slug, title_ar, title_en) ───────
TAFSIR_REGISTRY = {
    "ar-tafseer-tahrir-al-tanwir.db": (
        "SRC:SHAMELA:IBN_ASHUR_TAHRIR",
        "التحرير والتنوير",
        "Ibn Ashur - Tahrir wa Tanwir",
        "tafsir_linguistic",
    ),
    "tafsir-al-razi.db": (
        "SRC:SHAMELA:RAZI",
        "مفاتيح الغيب",
        "Razi - Mafatih al-Ghayb",
        "tafsir_linguistic",
    ),
    "tafsir-al-alusi.db": (
        "SRC:SHAMELA:ALUSI",
        "روح المعاني",
        "Alusi - Ruh al-Ma'ani",
        "tafsir_linguistic",
    ),
    "ar-tafsir-al-tabari.db": (
        "SRC:SHAMELA:TABARI",
        "جامع البيان",
        "Tabari - Jami' al-Bayan",
        "tafsir_linguistic",
    ),
    "ar-tafsir-ibn-kathir.db": (
        "SRC:SHAMELA:IBN_KATHIR",
        "تفسير ابن كثير",
        "Ibn Kathir - Tafsir",
        "tafsir_linguistic",
    ),
    "al-kashshaf-al-zamakhshari.db": (
        "SRC:SHAMELA:KASHSHAF",
        "الكشاف",
        "Zamakhshari - al-Kashshaf",
        "tafsir_linguistic",
    ),
    "al-bahr-al-muhit.db": (
        "SRC:SHAMELA:BAHR",
        "البحر المحيط",
        "Abu Hayyan - al-Bahr al-Muhit",
        "tafsir_linguistic",
    ),
    "al-muharrar-al-wajiz-ibn-atiyyah.db": (
        "SRC:SHAMELA:MUHARRAR",
        "المحرر الوجيز",
        "Ibn Atiyya - al-Muharrar al-Wajiz",
        "tafsir_linguistic",
    ),
    "al-jadwal-fi-i-rab-al-quran.db": (
        "SRC:SHAMELA:SAFI_JADWAL",
        "الجدول في إعراب القرآن",
        "Safi - al-Jadwal",
        "tafsir_linguistic",
    ),
    "i-rab-al-quran-li-al-darwish.db": (
        "SRC:SHAMELA:DARWISH",
        "إعراب القرآن وبيانه",
        "Darwish - I'rab",
        "tafsir_linguistic",
    ),
    # skip: ayah-dependency-graphs.db (SVG content, not text)
}

# ── Helpers ────────────────────────────────────────────────────────────────────
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE  = re.compile(r"\s+")

def strip_html(html: str) -> str:
    if not html:
        return ""
    if BS4:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(separator=" ")
    else:
        text = _TAG_RE.sub(" ", html)
    return _WS_RE.sub(" ", text).strip()


def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def parse_ayah_key(ayah_key: str) -> tuple[int, int] | None:
    """Parse 'SURAH:AYAH' → (surah, ayah). Returns None on failure."""
    parts = ayah_key.split(":")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        return None


# ── Main ───────────────────────────────────────────────────────────────────────
total = 0
with open(OUT_JSONL, "w", encoding="utf-8") as fout:
    for db_name, (src_slug, title_ar, title_en, src_type) in TAFSIR_REGISTRY.items():
        db_path = TAFSIR_DIR / db_name
        if not db_path.exists():
            print(f"  SKIP (not found): {db_name}", file=sys.stderr)
            continue

        source_id = stable_id("AL:SRC:", src_slug)

        print(f"Chunking {db_name} → source_id={source_id} …", file=sys.stderr)
        cx = sqlite3.connect(db_path)
        cx.row_factory = sqlite3.Row

        rows = cx.execute(
            "SELECT ayah_key, group_ayah_key, from_ayah, to_ayah, text "
            "FROM tafsir ORDER BY ayah_key"
        ).fetchall()

        count = 0
        for seq, row in enumerate(rows, start=1):
            ayah_key  = row["ayah_key"] or ""
            text_html = row["text"] or ""
            text_ar   = strip_html(text_html)

            if not text_ar or len(text_ar) < 10:
                continue

            # Parse primary location
            parsed = parse_ayah_key(ayah_key)
            surah = parsed[0] if parsed else None
            ayah  = parsed[1] if parsed else None

            # Parse range
            from_key = parse_ayah_key(row["from_ayah"] or ayah_key)
            to_key   = parse_ayah_key(row["to_ayah"]   or ayah_key)
            ayah_from = from_key[1] if from_key else ayah
            ayah_to   = to_key[1]   if to_key   else ayah

            chunk_id = stable_id("AL:CHUNK:", source_id, ayah_key, text_ar[:64])

            record = {
                "id":           chunk_id,
                "source_id":    source_id,
                "source_title_en": title_en,
                "chunk_kind":   "tafsir",
                "chunk_seq":    seq,
                "heading_norm": f"{title_en} {ayah_key}",
                "text_ar":      text_ar,
                "page_no":      None,
                "meta_json": {
                    "db":       db_name,
                    "ayah_key": ayah_key,
                    "surah":    surah,
                    "ayah":     ayah,
                    "ayah_from": ayah_from,
                    "ayah_to":   ayah_to,
                    "src_type":  src_type,
                },
            }
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
            count += 1

        cx.close()
        total += count
        print(f"  {count:,} chunks from {db_name}", file=sys.stderr)

print(f"\nDone. {total:,} total tafsir chunks → {OUT_JSONL}", file=sys.stderr)
