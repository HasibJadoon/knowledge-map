#!/usr/bin/env python3
"""
Step 02: Build spine.sqlite from local QUL/MASAQ/QAC sources.

Reads the same local sqlite files used by ingest-morphology.py and
produces data/raw/spine/spine.sqlite with qr_word_occurrences rows
suitable for offline sarf pipeline use (no Cloudflare API needed).

Usage:
    python3 scripts/02_import_spine/build_spine_from_local.py
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parents[2]          # kmaps-sarf/
REPO_ROOT    = SCRIPT_DIR.parents[3]                        # knowledge-map/
MORPH_SRCS   = REPO_ROOT / "database/ingestion/morphology/sources"
QUL_WORD_DIR = MORPH_SRCS / "qul/word"
QAC_FILE     = MORPH_SRCS / "qac/quranic-corpus-morphology-0.4.txt"
MASAQ_DB     = MORPH_SRCS / "masaq/masaq.sqlite"

SPINE_DIR    = SCRIPT_DIR / "data/raw/spine"
SPINE_DB     = SPINE_DIR / "spine.sqlite"

SPINE_DIR.mkdir(parents=True, exist_ok=True)

# ── Stable ID (mirrors ingest-morphology.py) ──────────────────────────────────
def stable_id(prefix: str, *parts) -> str:
    content = f"{prefix}:" + ":".join(str(p) for p in parts)
    return "QR:" + hashlib.sha256(content.encode()).hexdigest()[:26]

# ── Arabic bare form ──────────────────────────────────────────────────────────
_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۜ۟-ۤۧ-ۭ]")
def bare(text: str) -> str:
    if not text:
        return text
    nfc = unicodedata.normalize("NFC", text)
    return _DIACRITICS.sub("", nfc).strip()

# ── Buckwalter → Arabic helpers (for QAC fallback) ────────────────────────────
_BW_MAP = {
    'b': 'ب', 'p': 'ت', 't': 'ت', 'v': 'ث', 'j': 'ج', 'H': 'ح', 'x': 'خ',
    'd': 'د', '*': 'ذ', 'r': 'ر', 'z': 'ز', 's': 'س', '$': 'ش', 'S': 'ص',
    'D': 'ض', 'T': 'ط', 'Z': 'ظ', 'E': 'ع', 'G': 'غ', 'f': 'ف', 'q': 'ق',
    'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'h': 'ه', 'w': 'و', 'y': 'ي',
    'a': 'ا', '>': 'أ', '<': 'إ', '&': 'ؤ', '}': 'ى', 'I': 'ئ',
}
def bw_to_ar(s: str) -> str:
    return "".join(_BW_MAP.get(c, c) for c in s)

# ── Load QUL word-root ────────────────────────────────────────────────────────
print("Loading QUL word-root …", file=sys.stderr)
cx_r = sqlite3.connect(QUL_WORD_DIR / "word-root.sqlite")
root_map: dict[str, str] = {}   # "surah:ayah:word" → Arabic trilateral
for (loc, trilateral) in cx_r.execute(
    "SELECT rw.word_location, r.arabic_trilateral "
    "FROM root_words rw JOIN roots r ON rw.root_id = r.id"
):
    root_map[loc] = trilateral.replace(" ", "") if trilateral else None
cx_r.close()
print(f"  {len(root_map):,} root→word links", file=sys.stderr)

# ── Load QUL word-lemma ───────────────────────────────────────────────────────
print("Loading QUL word-lemma …", file=sys.stderr)
cx_l = sqlite3.connect(QUL_WORD_DIR / "word-lemma.sqlite")
lemma_map: dict[str, str] = {}  # "surah:ayah:word" → lemma text
for (loc, text) in cx_l.execute(
    "SELECT lw.word_location, l.text FROM lemma_words lw JOIN lemmas l ON lw.lemma_id = l.id"
):
    lemma_map[loc] = text
cx_l.close()
print(f"  {len(lemma_map):,} lemma→word links", file=sys.stderr)

# ── Load QUL word-stem ────────────────────────────────────────────────────────
print("Loading QUL word-stem …", file=sys.stderr)
cx_s = sqlite3.connect(QUL_WORD_DIR / "word-stem.sqlite")
stem_map: dict[str, str] = {}  # "surah:ayah:word" → stem text
for (loc, text) in cx_s.execute(
    "SELECT sw.word_location, s.text FROM stem_words sw JOIN stems s ON sw.stem_id = s.id"
):
    stem_map[loc] = text
cx_s.close()
print(f"  {len(stem_map):,} stem→word links", file=sys.stderr)

# ── Load MASAQ word text ──────────────────────────────────────────────────────
print("Loading MASAQ word text …", file=sys.stderr)
cx_m = sqlite3.connect(MASAQ_DB)
masaq_map: dict[tuple, tuple] = {}  # (sura, verse, col5) → (word_diac, word_bare)
for row in cx_m.execute(
    "SELECT DISTINCT Sura_No, Verse_No, Column5, Word, Without_Diacritics "
    "FROM MASAQcsv ORDER BY Sura_No, Verse_No, Column5"
):
    if row[0] is None or row[1] is None or row[2] is None:
        continue
    key = (int(row[0]), int(row[1]), int(row[2]))
    if key not in masaq_map:
        masaq_map[key] = (row[3] or "", row[4] or "")
cx_m.close()
print(f"  {len(masaq_map):,} unique word positions from MASAQ", file=sys.stderr)

# ── Load QAC morphology per word ──────────────────────────────────────────────
print("Loading QAC morphology …", file=sys.stderr)
qac_map: dict[str, tuple] = {}  # "surah:ayah:word" → (pos, morph_tag)
word_segs: dict[str, list] = defaultdict(list)

with open(QAC_FILE, encoding="utf-8") as fh:
    for line in fh:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        loc_raw, form_bw, tag, features = parts[0], parts[1], parts[2], parts[3]
        # Location format: (SURAH:AYAH:WORD:SEGMENT)
        loc_stripped = loc_raw.strip("()")
        lparts = loc_stripped.split(":")
        if len(lparts) != 4:
            continue
        try:
            s, a, w, seg = int(lparts[0]), int(lparts[1]), int(lparts[2]), int(lparts[3])
        except ValueError:
            continue
        loc_key = f"{s}:{a}:{w}"
        # Parse kind from features
        ftokens = features.split("|") if features else []
        kind = ftokens[0] if ftokens else ""
        word_segs[loc_key].append({
            "segment": seg, "tag": tag, "kind": kind, "form_bw": form_bw,
            "features": features,
        })

for loc_key, segs in word_segs.items():
    # POS = tag of the STEM segment (kind starts with "STEM")
    stem_segs = [s for s in segs if s["kind"].startswith("STEM")]
    pos_tag = stem_segs[0]["tag"] if stem_segs else segs[0]["tag"] if segs else None
    morph_tag = "+".join(s["tag"] for s in segs) if segs else None
    qac_map[loc_key] = (pos_tag, morph_tag)

print(f"  {len(qac_map):,} word positions from QAC", file=sys.stderr)

# ── Derive all canonical word positions from union of all maps ────────────────
print("Building canonical word position set …", file=sys.stderr)
all_locs: set[str] = set(root_map) | set(lemma_map) | set(stem_map) | set(qac_map)
print(f"  {len(all_locs):,} unique positions", file=sys.stderr)

# ── Build spine DB ────────────────────────────────────────────────────────────
print(f"Writing {SPINE_DB} …", file=sys.stderr)

cx = sqlite3.connect(SPINE_DB)
cx.executescript("""
CREATE TABLE IF NOT EXISTS qr_word_occurrences (
    id TEXT PRIMARY KEY,
    surah INTEGER NOT NULL,
    ayah INTEGER NOT NULL,
    word_index INTEGER NOT NULL,
    word_text TEXT,
    word_text_bare TEXT,
    root TEXT,
    lemma TEXT,
    pos TEXT,
    morphology_tag TEXT,
    morphology_tag_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_sa ON qr_word_occurrences(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_lemma ON qr_word_occurrences(lemma);
CREATE INDEX IF NOT EXISTS idx_root ON qr_word_occurrences(root);
""")

rows: list[tuple] = []
miss_masaq = 0
miss_qac = 0

for loc_key in sorted(all_locs, key=lambda x: tuple(int(p) for p in x.split(":"))):
    parts = loc_key.split(":")
    if len(parts) != 3:
        continue
    s, a, w = int(parts[0]), int(parts[1]), int(parts[2])
    row_id = stable_id("QRW", s, a, w)

    # word text
    masaq = masaq_map.get((s, a, w))
    if masaq:
        word_text, word_bare = masaq
    else:
        stem = stem_map.get(loc_key)
        word_text = stem or None
        word_bare = bare(stem) if stem else None
        miss_masaq += 1

    root = root_map.get(loc_key)
    lemma = lemma_map.get(loc_key)

    qac = qac_map.get(loc_key)
    if qac:
        pos, morph_tag = qac
    else:
        pos, morph_tag = None, None
        miss_qac += 1

    rows.append((row_id, s, a, w, word_text, word_bare, root, lemma, pos, morph_tag, None))

cx.executemany(
    "INSERT OR REPLACE INTO qr_word_occurrences "
    "(id, surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, morphology_tag, morphology_tag_json) "
    "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    rows,
)
cx.commit()
cx.close()

print(
    f"Done. {len(rows):,} word rows written to {SPINE_DB}\n"
    f"  Missing MASAQ text: {miss_masaq}  |  Missing QAC tag: {miss_qac}",
    file=sys.stderr,
)
