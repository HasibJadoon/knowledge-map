#!/usr/bin/env python3
"""
Repair near-synonym arabic_display / arabic_bare fields.

Reads:
  - D1 query result (JSON with results array)
  - synonyms_map.json (topics with synonyms[].word_ar)

Writes:
  - database/seeds/repair-near-synonym-arabic.sql
  - database/scratch/near-synonym-manual-repair.csv

Logic:
  - For each row, extract topic_id from chunk_id via regex.
  - Look up synonyms[sort_order - 1]["word_ar"] from synonyms_map.json.
  - A word is VALID if: len > 1, no Urdu-specific chars, no Urdu verb markers.
  - Valid rows -> SQL UPDATE; invalid/missing rows -> manual repair CSV.
  - Duplicate member_ids: if one occurrence yields a valid word, use it.
    If multiple valid options exist, take the first. If none are valid,
    output one row to CSV (deduped).
"""

import json
import re
import os
from collections import OrderedDict

# ── Paths ──────────────────────────────────────────────────────────────────────
D1_RESULT = (
    "/Users/abdulhasibahmedjadoon/.claude/projects/"
    "-Users-abdulhasibahmedjadoon-Documents-LLM-knowledge-map/"
    "aceb3cab-7f53-402b-af6d-d066e494de44/tool-results/"
    "mcp-86747424-3f38-4da5-a468-dc7d521f6943-d1_database_query-1777122025271.txt"
)
SYNONYMS_MAP = (
    "/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/"
    "database/data/synonyms/data-master/synonyms/synonyms_map.json"
)
SQL_OUT = (
    "/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/"
    "database/seeds/repair-near-synonym-arabic.sql"
)
CSV_OUT = (
    "/Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map/"
    "database/scratch/near-synonym-manual-repair.csv"
)

# ── Urdu-specific characters / markers ────────────────────────────────────────
URDU_CHARS = set("ئیےپٹڈڑژگچھہۃۂ")
URDU_VERB_MARKERS = ["کرنا", "ہونا", "لینا", "دینا"]

# Diacritics: U+064B–U+065F and U+0670
DIACRITIC_RE = re.compile(r"[\u064b-\u065f\u0670]")

# chunk_id → topic_id regex
CHUNK_RE = re.compile(
    r"CHK:KELANI:KELANI-STRUCTURED-TOPIC-BUNDLES-(.+)", re.IGNORECASE
)


def strip_diacritics(text):
    return DIACRITIC_RE.sub("", text)


def is_valid_arabic(word_ar):
    if word_ar is None:
        return False
    w = word_ar.strip()
    if len(w) <= 1:
        return False
    if any(ch in URDU_CHARS for ch in w):
        return False
    if any(marker in w for marker in URDU_VERB_MARKERS):
        return False
    return True


def escape_sql(s):
    return s.replace("'", "''")


# ── Load D1 results ────────────────────────────────────────────────────────────
raw = open(D1_RESULT, encoding="utf-8").read()
outer = json.loads(raw)
rows = []
for item in outer:
    rows.extend(item.get("results", []))

print(f"Total rows loaded: {len(rows)}")

# ── Load synonyms map ──────────────────────────────────────────────────────────
synonyms_data = json.loads(open(SYNONYMS_MAP, encoding="utf-8").read())

# Build topic lookup: topic_id.lower() → list of word_ar (indexed 0-based)
topic_lookup = {}
for topic in synonyms_data["topics"]:
    tid = topic["id"].lower()
    words = [s.get("word_ar") for s in topic.get("synonyms", [])]
    topic_lookup[tid] = words

print(f"Topics loaded: {len(topic_lookup)}")

# ── Process rows ───────────────────────────────────────────────────────────────
# Use OrderedDict keyed by member_id to handle duplicates.
# Value: best repair found so far, or None if unrepaired.
# We store (arabic_display, arabic_bare) for repaired, or a "manual" record for unrepaired.

# First pass: collect all rows by member_id, track best repair
repaired_by_id = OrderedDict()   # member_id -> (arabic_display, arabic_bare)
manual_by_id = OrderedDict()     # member_id -> row dict (for CSV)
seen_ids = set()

for row in rows:
    member_id   = row["member_id"]
    sort_order  = row["sort_order"]
    basic_gloss = row.get("basic_gloss") or ""
    basic_gloss_ur = row.get("basic_gloss_ur") or ""
    nuance_note = row.get("nuance_note") or ""
    nuance_note_ur = row.get("nuance_note_ur") or ""
    chunk_id    = row.get("chunk_id") or ""
    canonical_en = row.get("canonical_en") or ""
    canonical_ur = row.get("canonical_ur") or ""

    # Extract topic_id from chunk_id
    topic_id = None
    m = CHUNK_RE.match(chunk_id)
    if m:
        topic_id = m.group(1)

    # Look up word_ar
    word_ar = None
    if topic_id is not None:
        words = topic_lookup.get(topic_id.lower())
        if words is not None and 1 <= sort_order <= len(words):
            word_ar = words[sort_order - 1]

    valid = is_valid_arabic(word_ar)

    if valid:
        # Only store the first valid repair found for this member_id
        if member_id not in repaired_by_id:
            arabic_display = word_ar.strip()
            arabic_bare = strip_diacritics(arabic_display)
            repaired_by_id[member_id] = (arabic_display, arabic_bare)
        # Once repaired, remove from manual (in case it was added earlier)
        manual_by_id.pop(member_id, None)
    else:
        # Only add to manual if not already repaired
        if member_id not in repaired_by_id and member_id not in manual_by_id:
            # build book_ref
            if topic_id:
                book_ref = f"Kailani — topic {topic_id.upper()}"
            else:
                book_ref = "unknown"

            manual_by_id[member_id] = {
                "member_id": member_id,
                "set_en": canonical_en,
                "set_ur": canonical_ur,
                "sort_order": sort_order,
                "gloss_ur": basic_gloss_ur,
                "nuance_en": nuance_note,
                "nuance_ur": nuance_note_ur,
                "topic_id": topic_id or "",
                "book_ref": book_ref,
            }

print(f"Repaired: {len(repaired_by_id)}")
print(f"Need manual fix: {len(manual_by_id)}")

# ── Write SQL ──────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(SQL_OUT), exist_ok=True)

with open(SQL_OUT, "w", encoding="utf-8") as f:
    f.write(
        "-- Repair: arabic_display and arabic_bare for ar_ling_near_synonym_members\n"
        "-- Generated: 2026-04-25\n"
        "-- Source: D1 query result + synonyms_map.json (Kailani topic bundles)\n"
        f"-- Repaired rows: {len(repaired_by_id)}\n\n"
    )
    for member_id, (arabic_display, arabic_bare) in repaired_by_id.items():
        f.write(
            f"UPDATE ar_ling_near_synonym_members "
            f"SET arabic_display = '{escape_sql(arabic_display)}', "
            f"arabic_bare = '{escape_sql(arabic_bare)}' "
            f"WHERE id = '{escape_sql(member_id)}';\n"
        )

print(f"SQL written to: {SQL_OUT}")

# ── Write CSV ──────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(CSV_OUT), exist_ok=True)

with open(CSV_OUT, "w", encoding="utf-8") as f:
    f.write("member_id|set_en|set_ur|sort_order|gloss_ur|nuance_en|nuance_ur|topic_id|book_ref\n")
    for r in manual_by_id.values():
        line = "|".join([
            r["member_id"],
            r["set_en"],
            r["set_ur"],
            str(r["sort_order"]),
            r["gloss_ur"],
            r["nuance_en"],
            r["nuance_ur"],
            r["topic_id"],
            r["book_ref"],
        ])
        f.write(line + "\n")

print(f"CSV written to: {CSV_OUT}")
print(f"\nSummary: {len(repaired_by_id)} repaired, {len(manual_by_id)} need manual fix")
print(f"(Total unique member_ids: {len(repaired_by_id) + len(manual_by_id)} of {len(rows)} rows)")
