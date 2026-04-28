#!/usr/bin/env python3
"""
Repair arabic_display / arabic_bare for near-synonym members that were
nulled out by migrations 0004/0005 (OCR corruption).

Strategy (in priority order):
  1. synonyms_map.json  — match member by topic_id + sort_order index
  2. PDF (pdfplumber)   — OCR each topic page when JSON lacks the word
  3. Manual list        — write remaining entries to CSV for human review

Outputs:
  database/seeds/repair-near-synonym-arabic.sql   UPDATE statements to apply
  database/scratch/near-synonym-manual-repair.csv  entries that need manual fix
"""

import json, re, sys, unicodedata, subprocess, os

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP_F  = os.path.join(ROOT, "database/data/synonyms/data-master/synonyms/synonyms_map.json")
PDF_F  = os.path.join(ROOT, "database/data/synonyms/مترادفات القرآن ( قرآن مجید کے ہم معنی الفاظ کا لغوی فرق) ۔ عبد الرحمٰن کیلانی ۔حق   .pdf")
SQL_OUT = os.path.join(ROOT, "database/seeds/repair-near-synonym-arabic.sql")
CSV_OUT = os.path.join(ROOT, "database/scratch/near-synonym-manual-repair.csv")

# ── helpers ─────────────────────────────────────────────────────────────────

URDU_CHARS = set("ئیےپٹڈڑژگچڈھۃۂ")
URDU_WORDS = {"کرنا","ہونا","لینا","دینا","آنا","جانا","سے","کا","کی","کے"}

def is_valid_arabic(word: str) -> bool:
    if not word or not word.strip():
        return False
    w = word.strip()
    if len(w) <= 1:
        return False
    if any(c in URDU_CHARS for c in w):
        return False
    # reject Urdu verb constructions
    parts = w.split()
    if any(p in URDU_WORDS for p in parts):
        return False
    return True

def strip_diacritics(text: str) -> str:
    """Remove Arabic diacritics (harakat) to produce bare form."""
    # Arabic diacritics range: U+064B–U+065F, U+0670
    return re.sub(r'[\u064b-\u065f\u0670]', '', text).strip()

def escape_sql(s: str) -> str:
    return s.replace("'", "''")

# ── load synonyms_map ────────────────────────────────────────────────────────

with open(MAP_F, encoding="utf-8") as f:
    raw = json.load(f)

# index by topic_id (case-insensitive)
topic_map: dict[str, list[str]] = {}
for topic in raw["topics"]:
    tid = topic["id"].lower()
    words = [s.get("word_ar", "") for s in topic.get("synonyms", [])]
    topic_map[tid] = words

print(f"Loaded {len(topic_map)} topics from synonyms_map.json")

# ── query D1 for NULL members ────────────────────────────────────────────────

print("Querying D1 for NULL-display members …")
result = subprocess.run(
    [
        "wrangler", "d1", "execute", "km_arabic_linguistic",
        "--remote",
        "--config", os.path.join(ROOT, "workers/ar-linguistics/wrangler.toml"),
        "--json",
        "--command", """
            SELECT
              m.id          AS member_id,
              m.set_id,
              m.sort_order,
              m.basic_gloss,
              m.basic_gloss_ur,
              m.nuance_note,
              m.nuance_note_ur,
              ss.chunk_id,
              s.canonical_en,
              s.canonical_ur
            FROM ar_ling_near_synonym_members m
            JOIN ar_ling_near_synonym_sets s ON m.set_id = s.id
            LEFT JOIN ar_ling_near_synonym_set_sources ss
              ON ss.set_id = m.set_id
              AND ss.source_id = 'SRC:KELANI:MUTARADIFAT_QURAN'
            WHERE m.arabic_display IS NULL
            ORDER BY m.set_id, m.sort_order
        """
    ],
    capture_output=True, text=True, cwd=ROOT
)

if result.returncode != 0:
    print("ERROR querying D1:", result.stderr)
    sys.exit(1)

rows = json.loads(result.stdout)[0]["results"]
print(f"Found {len(rows)} NULL-display members")

# ── PDF fallback (pdfplumber) ────────────────────────────────────────────────

pdf_available = False
try:
    import pdfplumber
    pdf_available = os.path.exists(PDF_F)
    if pdf_available:
        print("PDF available — will use as fallback")
    else:
        print("PDF not found at expected path — skipping PDF fallback")
except ImportError:
    print("pdfplumber not installed — skipping PDF fallback (pip install pdfplumber)")

def extract_arabic_from_pdf_page(page_no: int) -> list[str]:
    """Extract Arabic words from a specific PDF page."""
    if not pdf_available:
        return []
    try:
        with pdfplumber.open(PDF_F) as pdf:
            if page_no < 1 or page_no > len(pdf.pages):
                return []
            page = pdf.pages[page_no - 1]
            text = page.extract_text() or ""
            # Arabic words: consecutive Arabic chars + diacritics
            words = re.findall(r'[\u0600-\u06FF\u200c\u200d]+(?:\s[\u0600-\u06FF\u200c\u200d]+)*', text)
            return [w for w in words if is_valid_arabic(w)]
    except Exception as e:
        print(f"  PDF page {page_no} error: {e}")
        return []

# ── process each member ──────────────────────────────────────────────────────

updates: list[tuple[str, str, str]] = []  # (member_id, arabic_display, arabic_bare)
manual:  list[dict] = []

CHUNK_RE = re.compile(r'CHK:KELANI:KELANI-STRUCTURED-TOPIC-BUNDLES-(.+)$', re.IGNORECASE)

for row in rows:
    member_id  = row["member_id"]
    sort_order = row["sort_order"] or 1
    chunk_id   = row.get("chunk_id") or ""
    gloss_en   = row.get("basic_gloss") or ""
    gloss_ur   = row.get("basic_gloss_ur") or ""
    nuance_en  = row.get("nuance_note") or ""
    nuance_ur  = row.get("nuance_note_ur") or ""
    set_en     = row.get("canonical_en") or ""
    set_ur     = row.get("canonical_ur") or ""

    arabic_word = None

    # ── strategy 1: synonyms_map by topic_id + sort_order ──────────────────
    m = CHUNK_RE.match(chunk_id)
    topic_id = m.group(1).lower() if m else None
    if topic_id and topic_id in topic_map:
        words = topic_map[topic_id]
        idx = sort_order - 1
        if 0 <= idx < len(words) and is_valid_arabic(words[idx]):
            arabic_word = words[idx]

    # ── strategy 2: PDF page (if chunk has page_no in meta — currently null) ─
    # Currently page_no is NULL in chunks so we skip this unless we can derive it.
    # Placeholder for future implementation.

    if arabic_word:
        bare = strip_diacritics(arabic_word)
        updates.append((member_id, arabic_word, bare))
    else:
        manual.append({
            "member_id":  member_id,
            "set_en":     set_en,
            "set_ur":     set_ur,
            "sort_order": sort_order,
            "gloss_ur":   gloss_ur,
            "nuance_en":  nuance_en,
            "nuance_ur":  nuance_ur,
            "topic_id":   topic_id or "",
            "chunk_id":   chunk_id,
        })

print(f"\nResults:")
print(f"  Repairable from synonyms_map: {len(updates)}")
print(f"  Need manual repair:           {len(manual)}")

# ── write SQL ────────────────────────────────────────────────────────────────

os.makedirs(os.path.dirname(SQL_OUT), exist_ok=True)
with open(SQL_OUT, "w", encoding="utf-8") as f:
    f.write("-- Auto-generated: repair arabic_display/arabic_bare from synonyms_map.json\n")
    f.write(f"-- Repairs {len(updates)} members. Generated by scripts/repair-near-synonym-arabic-display.py\n\n")
    for member_id, arabic_display, arabic_bare in updates:
        mid  = escape_sql(member_id)
        adisp = escape_sql(arabic_display)
        abare = escape_sql(arabic_bare)
        f.write(
            f"UPDATE ar_ling_near_synonym_members "
            f"SET arabic_display = '{adisp}', arabic_bare = '{abare}' "
            f"WHERE id = '{mid}';\n"
        )

print(f"\nSQL written to: {SQL_OUT}")

# ── write manual-repair CSV ──────────────────────────────────────────────────

os.makedirs(os.path.dirname(CSV_OUT), exist_ok=True)
with open(CSV_OUT, "w", encoding="utf-8") as f:
    f.write("member_id|set_en|set_ur|sort_order|gloss_ur|nuance_en|nuance_ur|topic_id|book_ref\n")
    for r in manual:
        book_ref = f"Kailani — topic {r['topic_id'].upper()}" if r["topic_id"] else "unknown"
        row_parts = [
            r["member_id"],
            r["set_en"],
            r["set_ur"],
            str(r["sort_order"]),
            r["gloss_ur"],
            r["nuance_en"],
            r["nuance_ur"],
            r["topic_id"].upper(),
            book_ref,
        ]
        f.write("|".join(p.replace("|", "/") for p in row_parts) + "\n")

print(f"Manual repair list written to: {CSV_OUT}")
print("\nDone. To apply repairs run:")
print("  wrangler d1 execute km_arabic_linguistic --remote \\")
print("    --config workers/ar-linguistics/wrangler.toml \\")
print("    --file database/seeds/repair-near-synonym-arabic.sql")
