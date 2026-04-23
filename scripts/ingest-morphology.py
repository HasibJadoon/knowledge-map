#!/usr/bin/env python3
"""
K-MAPS Morphology Ingestion Pipeline
=====================================
Consolidates three sources into seed SQL for two D1 databases.

Sources
-------
  QUL   – word-root.sqlite, word-lemma.sqlite, word-stem.sqlite
           (Quranic word-level root / lemma / stem indices)
  QAC   – quranic-corpus-morphology-0.4.txt
           (Quranic Arabic Corpus TSV: Buckwalter morphology per word segment)
  MASAQ – masaq.sqlite
           (Morphological Analysis: Arabic annotations, full word text)

Outputs  →  database/ingestion/morphology/outputs/
-------
  seed-al-roots.sql            ar_ling_roots            (km_arabic_linguistics)
  seed-al-lemmas.sql           ar_ling_lemmas            (km_arabic_linguistics)
  seed-qr-word-occurrences.sql qr_word_occurrences       (km_quran)
  seed-qr-lemmas.sql           qr_lemmas                 (km_quran)
  seed-qr-lemma-occurrences.sql qr_lemma_occurrences     (km_quran)

Usage
-----
  python3 scripts/ingest-morphology.py
  # from repo root
"""

import sqlite3
import json
import re
import hashlib
import sys
import unicodedata
from pathlib import Path
from collections import defaultdict

# ─── PATHS ────────────────────────────────────────────────────────────────────
REPO   = Path(__file__).resolve().parent.parent
QUL_W  = REPO / 'database/ingestion/morphology/sources/qul/word'
QAC_F  = REPO / 'database/ingestion/morphology/sources/qac/quranic-corpus-morphology-0.4.txt'
MASAQ_F= REPO / 'database/ingestion/morphology/sources/masaq/masaq.sqlite'
OUTDIR = REPO / 'database/ingestion/morphology/outputs'
OUTDIR.mkdir(parents=True, exist_ok=True)

# ─── STABLE ID ────────────────────────────────────────────────────────────────
def stable_id(prefix, *parts):
    """Deterministic 26-char hex ID from content — stable across re-runs."""
    content = f"{prefix}:" + ":".join(str(p) for p in parts)
    return hashlib.sha256(content.encode()).hexdigest()[:26]

# ─── SQL HELPERS ──────────────────────────────────────────────────────────────
def q(v):
    """Quote a value for SQL: None→NULL, numbers→bare, strings→'...'."""
    if v is None:
        return 'NULL'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def write_batched_inserts(f, table, columns, rows, batch=500):
    """Write multi-row INSERT batches — efficient for D1."""
    col_list = ', '.join(columns)
    for i in range(0, len(rows), batch):
        chunk = rows[i:i+batch]
        vals = ',\n  '.join(
            '(' + ', '.join(q(c) for c in row) + ')'
            for row in chunk
        )
        f.write(f"INSERT OR IGNORE INTO {table} ({col_list}) VALUES\n  {vals};\n\n")

def write_word_morphology_updates(f, rows, batch=50):
    """Write batched updates keyed by the stable word position unique key."""
    for i in range(0, len(rows), batch):
        chunk = rows[i:i+batch]
        tag_cases = '\n'.join(
            f"  WHEN surah = {row[0]} AND ayah = {row[1]} AND word_index = {row[2]} THEN {q(row[3])}"
            for row in chunk
        )
        json_cases = '\n'.join(
            f"  WHEN surah = {row[0]} AND ayah = {row[1]} AND word_index = {row[2]} THEN {q(row[4])}"
            for row in chunk
        )
        where = ' OR\n  '.join(
            f"(surah = {row[0]} AND ayah = {row[1]} AND word_index = {row[2]})"
            for row in chunk
        )
        f.write(
            f"UPDATE qr_word_occurrences\n"
            f"SET morphology_tag = CASE\n"
            f"{tag_cases}\n"
            f"  ELSE morphology_tag\n"
            f"END,\n"
            f"morphology_tag_json = CASE\n"
            f"{json_cases}\n"
            f"  ELSE morphology_tag_json\n"
            f"END\n"
            f"WHERE {where};\n\n"
        )

def parse_qac_features(features):
    """Split a QAC FEATURES value into segment kind, key/value features, and flags."""
    tokens = features.split('|') if features else []
    kind = tokens[0] if tokens else None
    values = {}
    flags = []
    for token in tokens[1:]:
        if ':' in token:
            k, v = token.split(':', 1)
            values[k] = v
        elif token:
            flags.append(token)
    return kind, values, flags

def qac_segment_json(segment):
    out = {
        'segment': segment['segment'],
        'kind': segment['kind'],
        'form_bw': segment['form_bw'],
        'form_ar': segment['form_ar'],
        'tag': segment['tag'],
        'features_raw': segment['features_raw'],
        'features': segment['features'],
        'flags': segment['flags'],
    }
    if segment.get('pos_raw'):
        out['pos'] = segment['pos_raw']
    if segment.get('lemma_bw'):
        out['lemma_bw'] = segment['lemma_bw']
        out['lemma_ar'] = segment['lemma_ar']
    if segment.get('root_bw'):
        out['root_bw'] = segment['root_bw']
        out['root_ar'] = segment['root_ar']
    return out

def qac_morphology_json(stem_segment, segments):
    """Structured JSON companion for qr_word_occurrences.morphology_tag."""
    payload = {
        'source': 'QAC-0.4',
        'raw': stem_segment['features_raw'],
        'stem': qac_segment_json(stem_segment),
        'segments': [qac_segment_json(s) for s in segments],
    }
    return json.dumps(payload, ensure_ascii=False, separators=(',', ':'))

# ─── ARABIC HELPERS ───────────────────────────────────────────────────────────
_AR_CONSONANTS = set(
    'ء أ إ ؤ ئ آ ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة'.split()
)

def arabic_consonants(text):
    """Return list of Arabic consonant letters from text (strips diacritics/spaces)."""
    return [c for c in text if c in _AR_CONSONANTS]

def root_text_clean(qul_arabic_trilateral):
    """
    QUL stores roots as spaced text: 'ك   ت   ب'
    → strip to 'كتب' (compact, no spaces).
    """
    letters = arabic_consonants(qul_arabic_trilateral)
    return ''.join(letters)

# ─── BUCKWALTER → ARABIC ──────────────────────────────────────────────────────
_BW = {
    "'": '\u0621',  # ء
    '|': '\u0622',  # آ
    '>': '\u0623',  # أ
    '&': '\u0625',  # إ
    '<': '\u0625',  # إ (alt)
    '}': '\u0624',  # ؤ
    '{': '\u0623',  # أ (alt)
    '^': '\u0626',  # ئ
    'A': '\u0627',  # ا
    'b': '\u0628',  # ب
    'p': '\u0629',  # ة
    't': '\u062a',  # ت
    'v': '\u062b',  # ث
    'j': '\u062c',  # ج
    'H': '\u062d',  # ح
    'x': '\u062e',  # خ
    'd': '\u062f',  # د
    '*': '\u0630',  # ذ
    'r': '\u0631',  # ر
    'z': '\u0632',  # ز
    's': '\u0633',  # س
    '$': '\u0634',  # ش
    'S': '\u0635',  # ص
    'D': '\u0636',  # ض
    'T': '\u0637',  # ط
    'Z': '\u0638',  # ظ
    'E': '\u0639',  # ع
    'g': '\u063a',  # غ
    'f': '\u0641',  # ف
    'q': '\u0642',  # ق
    'k': '\u0643',  # ك
    'l': '\u0644',  # ل
    'm': '\u0645',  # م
    'n': '\u0646',  # ن
    'h': '\u0647',  # ه
    'w': '\u0648',  # و
    'y': '\u064a',  # ي
    'a': '\u064e',  # َ  fatha
    'u': '\u064f',  # ُ  damma
    'i': '\u0650',  # ِ  kasra
    '~': '\u0651',  # ّ  shadda
    'o': '\u0652',  # ْ  sukun
    'F': '\u064b',  # ً  fathatan
    'N': '\u064c',  # ٌ  dammatan
    'K': '\u064d',  # ٍ  kasratan
    '`': '\u0640',  # ـ  tatweel
}
_BW_CONSONANTS = {k for k in _BW if k not in 'auio~FNK`'}

def bw_to_ar(s):
    """Full Buckwalter → Arabic (includes diacritics)."""
    return ''.join(_BW.get(c, c) for c in s)

def bw_root_to_ar(s):
    """Buckwalter root/consonants → Arabic string (no diacritics)."""
    return ''.join(_BW[c] for c in s if c in _BW_CONSONANTS)

# ─── WEAK PATTERN ─────────────────────────────────────────────────────────────
_WAW   = '\u0648'  # و
_YA    = '\u064a'  # ي
_HAMZAS = {'\u0621', '\u0623', '\u0625', '\u0624', '\u0626', '\u0622'}

def detect_weak(letters):
    """Determine the weak (إعلال/همز) pattern of a root from its letter list."""
    if not letters:
        return None
    n = len(letters)
    l = letters
    # Mudha'af: ʿayn = lam (positions 2,3 for trilateral; 2,4 for quadrilateral)
    # Classical: مدد (م-د-د) → l[1]==l[2]; also covers ل[0]==l[2] edge cases
    if n >= 3 and l[1] == l[2]:
        return 'mudha_af'
    if n >= 4 and l[1] == l[3]:
        return 'mudha_af'
    # Mahmuz (hamza at positions fa'/ain/lam)
    if l[0] in _HAMZAS:
        return 'mahmuz_fa'
    if n >= 2 and l[1] in _HAMZAS:
        return 'mahmuz_ain'
    if n >= 3 and l[2] in _HAMZAS:
        return 'mahmuz_lam'
    # Mithal (weak 1st letter)
    if l[0] == _WAW:
        return 'mithal_waw'
    if l[0] == _YA:
        return 'mithal_ya'
    # Ajwaf (weak 2nd letter)
    if n >= 2 and l[1] == _WAW:
        return 'ajwaf_waw'
    if n >= 2 and l[1] == _YA:
        return 'ajwaf_ya'
    # Naqis (weak 3rd letter)
    if n >= 3 and l[2] == _WAW:
        return 'naqis_waw'
    if n >= 3 and l[2] == _YA:
        return 'naqis_ya'
    return 'sound'

# ─── QAC POS → SCHEMA POS ─────────────────────────────────────────────────────
_QAC_POS = {
    'V': 'verb', 'IV': 'verb', 'PV': 'verb', 'CV': 'verb',
    'IV_PASS': 'verb', 'PV_PASS': 'verb',
    'N': 'noun', 'NOUN': 'noun', 'NOUN_ABSTRACT': 'noun',
    'NOUN_NUM': 'noun', 'NOM': 'noun',
    'PN': 'proper_noun', 'NOUN_PROP': 'proper_noun',
    'ADJ': 'adjective',
    'CONJ': 'conjunction',
    'P': 'preposition', 'PREP': 'preposition',
    'PRON': 'pronoun', 'POSS_PRON': 'pronoun',
    'DEM_PRON': 'pronoun', 'REL_PRON': 'pronoun', 'REL': 'pronoun',
    'T': 'noun', 'LOC': 'noun',
}

def schema_pos(qac_pos):
    return _QAC_POS.get(qac_pos, 'particle')

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 1 — LOAD SOURCE DATA
# ═════════════════════════════════════════════════════════════════════════════
print("=== PHASE 1: Loading source data ===")

# ─── 1A. QUL ROOTS ────────────────────────────────────────────────────────────
print("  1a. Loading QUL roots...")
con_r = sqlite3.connect(QUL_W / 'word-root.sqlite')
# roots: id, arabic_trilateral, english_trilateral, words_count, uniq_words_count
qul_roots = {}          # root_id → dict
for row in con_r.execute('SELECT id, arabic_trilateral, english_trilateral, words_count FROM roots'):
    rid, ar_raw, en, freq = row
    letters = arabic_consonants(ar_raw)
    text    = ''.join(letters)
    qul_roots[rid] = {
        'id':      stable_id('root', text),
        'text':    text,
        'letters': letters,
        'en':      en.strip() if en else None,
        'freq':    freq or 0,
        'type':    'trilateral' if len(letters) == 3 else (
                   'quadrilateral' if len(letters) == 4 else 'quinqueliteral'),
        'weak':    detect_weak(letters),
    }

# root_words: root_id, word_location ("s:a:w")
word_to_root = {}       # (surah, ayah, word_idx) → root_id (QUL)
for row in con_r.execute('SELECT root_id, word_location FROM root_words'):
    rid, loc = row
    try:
        s, a, w = map(int, loc.split(':'))
        word_to_root[(s, a, w)] = rid
    except Exception:
        pass
con_r.close()
print(f"     {len(qul_roots)} roots, {len(word_to_root)} word→root mappings")

# ─── 1B. QUL LEMMAS ───────────────────────────────────────────────────────────
print("  1b. Loading QUL lemmas...")
con_l = sqlite3.connect(QUL_W / 'word-lemma.sqlite')
# lemmas: id, text, text_clean, words_count, uniq_words_count
qul_lemmas = {}         # lemma_id → dict
for row in con_l.execute('SELECT id, text, text_clean, words_count FROM lemmas'):
    lid, text, text_bare, freq = row
    qul_lemmas[lid] = {
        'id':        stable_id('lemma', text or text_bare or str(lid)),
        'text':      text or '',
        'text_bare': text_bare or '',
        'freq':      freq or 0,
    }

# lemma_words: lemma_id, word_location
word_to_lemma  = {}    # (s,a,w) → lemma_id (QUL)
lemma_to_words = defaultdict(list)  # lemma_id → [(s,a,w)]
for row in con_l.execute('SELECT lemma_id, word_location FROM lemma_words'):
    lid, loc = row
    try:
        s, a, w = map(int, loc.split(':'))
        word_to_lemma[(s, a, w)] = lid
        lemma_to_words[lid].append((s, a, w))
    except Exception:
        pass
con_l.close()
print(f"     {len(qul_lemmas)} lemmas, {len(word_to_lemma)} word→lemma mappings")

# ─── 1C. QUL STEMS (canonical word position list + Arabic text) ───────────────
print("  1c. Loading QUL stems (word positions + Arabic word text)...")
con_s = sqlite3.connect(QUL_W / 'word-stem.sqlite')
# stems: id, text (diacriticized), text_clean
qul_stems = {}          # stem_id → (text, text_clean)
for row in con_s.execute('SELECT id, text, text_clean FROM stems'):
    sid, text, text_clean = row
    qul_stems[sid] = (text or '', text_clean or '')

# stem_words: stem_id, word_location → gives us all 77k+ Quran word positions
all_word_positions = []  # [(s,a,w)] in QUL order
word_to_stem_text  = {}  # (s,a,w) → (stem_text_diac, stem_text_bare)
for row in con_s.execute('SELECT stem_id, word_location FROM stem_words ORDER BY word_location'):
    sid, loc = row
    try:
        s, a, w = map(int, loc.split(':'))
        all_word_positions.append((s, a, w))
        if sid in qul_stems:
            word_to_stem_text[(s, a, w)] = qul_stems[sid]
    except Exception:
        pass
con_s.close()
print(f"     {len(all_word_positions)} word positions, {len(word_to_stem_text)} stem texts")

# ─── 1D. MASAQ WORD TEXT MAP ──────────────────────────────────────────────────
# Column5 = word position within verse (matches QUL word index)
# Morph_type IN ('Prefix','Stem','Suffix') — all share same Word (full word text)
# We take one Word per (Sura_No, Verse_No, Column5)
print("  1d. Building MASAQ full-word text map (Sura,Verse,Col5)→Word...")
masaq_word_text = {}    # (sura, verse, word_idx) → (word_ar_diac, word_ar_bare)
con_m = sqlite3.connect(MASAQ_F)
for row in con_m.execute(
        'SELECT DISTINCT Sura_No, Verse_No, Column5, Word, Without_Diacritics '
        'FROM MASAQcsv '
        'WHERE Morph_type = "Stem" '
        'ORDER BY Sura_No, Verse_No, Column5'):
    sura, verse, col5, word, word_bare = row
    key = (sura, verse, col5)
    if key not in masaq_word_text:
        masaq_word_text[key] = (word or '', word_bare or '')
con_m.close()
print(f"     {len(masaq_word_text)} unique word positions from MASAQ")

# ─── 1E. QAC PARSE → word morphology map ─────────────────────────────────────
# Format: (s:a:w:seg)\tFORM\tTYPE\tFEATURES
# We keep only STEM segments (TYPE contains 'STEM')
# FEATURES example: STEM|POS:V|IMPV|LEM:qaAla|ROOT:qwl|2MS
print("  1e. Parsing QAC morphology file...")
qac_word = {}           # (s,a,w) → {pos_raw, pos, lemma_ar, root_ar, tag, tag_json}
qac_segments = defaultdict(list)  # (s,a,w) → all QAC segments for the word
qac_loc_re = re.compile(r'\((\d+):(\d+):(\d+):(\d+)\)')

with open(QAC_F, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split('\t')
        if len(parts) < 4:
            continue
        loc_str, form_bw, seg_type, features = parts[0], parts[1], parts[2], parts[3]

        m = qac_loc_re.match(loc_str)
        if not m:
            continue
        s, a, w, seg = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))

        # QAC format: TAG column = shorthand POS (N/V/P/ADJ/...)
        # FEATURES column = STEM|POS:N|LEM:...|ROOT:...|...  (first token = segment kind)
        seg_kind, feats, flags = parse_qac_features(features)
        lemma_bw = feats.get('LEM', '')
        root_bw  = feats.get('ROOT', '')
        key = (s, a, w)
        qac_segments[key].append({
            'segment': seg,
            'kind': seg_kind,
            'form_bw': form_bw,
            'form_ar': bw_to_ar(form_bw) if form_bw else None,
            'tag': seg_type,
            'features_raw': features,
            'features': feats,
            'flags': flags,
            'pos_raw': feats.get('POS'),
            'lemma_bw': lemma_bw or None,
            'lemma_ar': bw_to_ar(lemma_bw) if lemma_bw else None,
            'root_bw': root_bw or None,
            'root_ar': bw_root_to_ar(root_bw) if root_bw else None,
        })

for key, segments in qac_segments.items():
    segments.sort(key=lambda item: item['segment'])
    stem_segment = next((item for item in segments if item['kind'] == 'STEM'), None)
    if not stem_segment:
        continue

    # POS: from FEATURES POS: key; fall back to TAG column.
    pos_raw = stem_segment.get('pos_raw') or stem_segment['tag']
    qac_word[key] = {
        'pos_raw':  pos_raw,
        'pos':      schema_pos(pos_raw),
        'lemma_ar': stem_segment.get('lemma_ar'),
        'root_ar':  stem_segment.get('root_ar'),
        'tag':      stem_segment['features_raw'],
        'tag_json': qac_morphology_json(stem_segment, segments),
    }

print(f"     {len(qac_word)} word entries from QAC")

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2 — BUILD CANONICAL REGISTRIES
# ═════════════════════════════════════════════════════════════════════════════
print("\n=== PHASE 2: Building canonical registries ===")

# ─── 2A. ar_ling_roots ────────────────────────────────────────────────────────
# Cross-ref: for each root, also gather its QAC root_ar to validate / enrich
# Final unique key = QUL root text (authoritative Arabic)
print("  2a. Building ar_ling_roots registry...")

root_registry = {}      # root_text → row dict (QUL is primary)
root_qulid_to_reg = {}  # QUL root id → root_text (for later cross-ref)
for qrid, r in qul_roots.items():
    text = r['text']
    root_registry[text] = r
    root_qulid_to_reg[qrid] = text

# Also absorb any QAC roots not covered by QUL (edge cases)
qac_roots_new = 0
for key, qw in qac_word.items():
    ra = qw.get('root_ar')
    if ra and ra not in root_registry:
        letters = arabic_consonants(ra)
        root_registry[ra] = {
            'id':      stable_id('root', ra),
            'text':    ra,
            'letters': letters,
            'en':      None,
            'freq':    0,
            'type':    'trilateral' if len(letters) == 3 else (
                       'quadrilateral' if len(letters) == 4 else 'quinqueliteral'),
            'weak':    detect_weak(letters),
        }
        qac_roots_new += 1

print(f"     {len(root_registry)} roots total ({len(qul_roots)} QUL + {qac_roots_new} QAC-only)")

# ─── 2B. ar_ling_lemmas ───────────────────────────────────────────────────────
# Root linking: vote across the lemma's word positions to find its root
print("  2b. Building ar_ling_lemmas registry (root cross-ref + POS)...")

lemma_registry = {}     # QUL lemma_id → enriched row dict

for qlid, lem in qul_lemmas.items():
    positions = lemma_to_words.get(qlid, [])

    # Vote for most common root across word positions
    root_votes = defaultdict(int)
    pos_votes  = defaultdict(int)
    for pos_key in positions:
        qrid = word_to_root.get(pos_key)
        if qrid:
            rtxt = root_qulid_to_reg.get(qrid)
            if rtxt:
                root_votes[rtxt] += 1
        qw = qac_word.get(pos_key)
        if qw:
            pos_votes[qw['pos']] += 1

    best_root = max(root_votes, key=root_votes.get) if root_votes else None
    best_pos  = max(pos_votes,  key=pos_votes.get)  if pos_votes  else 'noun'

    root_id = root_registry[best_root]['id'] if best_root else None

    lemma_registry[qlid] = {
        'id':        lem['id'],
        'root_id':   root_id,
        'text':      lem['text'],
        'text_bare': lem['text_bare'],
        'pos':       best_pos,
        'freq':      lem['freq'],
        'is_quran':  1,
    }

print(f"     {len(lemma_registry)} lemmas enriched")

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 3 — BUILD qr_word_occurrences
# ═════════════════════════════════════════════════════════════════════════════
print("\n=== PHASE 3: Building qr_word_occurrences ===")

wo_rows   = []   # rows for qr_word_occurrences
miss_masaq = 0
miss_qac   = 0

seen_positions = set()
for (s, a, w) in sorted(set(all_word_positions)):
    if (s, a, w) in seen_positions:
        continue
    seen_positions.add((s, a, w))

    wo_id = stable_id('wo', s, a, w)

    # word_text: prefer MASAQ (full word with attached articles), fall back to stem
    masaq = masaq_word_text.get((s, a, w))
    if masaq:
        word_text, word_bare = masaq
    else:
        stem = word_to_stem_text.get((s, a, w))
        word_text  = stem[0] if stem else None
        word_bare  = stem[1] if stem else None
        miss_masaq += 1

    # root: prefer QUL Arabic root text, fall back to QAC root_ar
    qrid   = word_to_root.get((s, a, w))
    root   = root_qulid_to_reg.get(qrid) if qrid else None
    if not root:
        qw_data = qac_word.get((s, a, w))
        root = qw_data.get('root_ar') if qw_data else None

    # lemma: prefer QUL lemma text, fall back to QAC lemma_ar
    qlid   = word_to_lemma.get((s, a, w))
    if qlid and qlid in qul_lemmas:
        lemma = qul_lemmas[qlid]['text'] or qul_lemmas[qlid]['text_bare']
    else:
        qw_data = qac_word.get((s, a, w))
        lemma = qw_data.get('lemma_ar') if qw_data else None

    # pos + morphology_tag from QAC
    qw_data = qac_word.get((s, a, w))
    if qw_data:
        pos  = qw_data['pos_raw']
        tag  = qw_data['tag']
        tag_json = qw_data['tag_json']
    else:
        pos  = None
        tag  = None
        tag_json = None
        miss_qac += 1

    wo_rows.append((
        wo_id,
        s, a, w,
        word_text, word_bare,
        root, lemma, pos, tag, tag_json,
    ))

print(f"     {len(wo_rows)} word occurrences")
print(f"     Missing MASAQ text: {miss_masaq}  |  Missing QAC tag: {miss_qac}")

# Build reverse map: (s,a,w) → wo_id
pos_to_wo_id = {}
for row in wo_rows:
    pos_to_wo_id[(row[1], row[2], row[3])] = row[0]

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 4 — BUILD qr_lemmas + qr_lemma_occurrences
# ═════════════════════════════════════════════════════════════════════════════
print("\n=== PHASE 4: Building qr_lemmas + qr_lemma_occurrences ===")

# qr_lemmas: one row per distinct lemma (same set as QUL lemmas)
qrl_rows   = []   # qr_lemmas
qrlo_rows  = []   # qr_lemma_occurrences

# QUL lemma_id → qr_lemmas.id map
qlid_to_qrl_id = {}

for qlid, lem in qul_lemmas.items():
    lr = lemma_registry.get(qlid)
    root_text = None
    if lr and lr['root_id']:
        # find root text from root_id
        for rt, rd in root_registry.items():
            if rd['id'] == lr['root_id']:
                root_text = rt
                break

    qrl_id = stable_id('qrl', lem['text'] or lem['text_bare'] or str(qlid))
    qlid_to_qrl_id[qlid] = qrl_id
    al_lemma_id = lr['id'] if lr else None
    lx_ref = f'AL:{al_lemma_id}' if al_lemma_id else None

    qrl_rows.append((
        qrl_id,
        lem['text'] or lem['text_bare'],
        root_text,
        lx_ref,
        lem['freq'] or 0,
    ))

# qr_lemma_occurrences: one row per (lemma_id, surah, ayah, word_index)
miss_wo = 0
for qlid, positions in lemma_to_words.items():
    qrl_id = qlid_to_qrl_id.get(qlid)
    if not qrl_id:
        continue
    for (s, a, w) in positions:
        wo_id = pos_to_wo_id.get((s, a, w))
        if not wo_id:
            miss_wo += 1
            continue
        qrlo_id = stable_id('qrlo', qrl_id, s, a, w)
        qrlo_rows.append((qrlo_id, qrl_id, s, a, w, wo_id))

print(f"     {len(qrl_rows)} qr_lemmas")
print(f"     {len(qrlo_rows)} qr_lemma_occurrences  (missing WO refs: {miss_wo})")

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 5 — GENERATE SQL SEED FILES
# ═════════════════════════════════════════════════════════════════════════════
print("\n=== PHASE 5: Generating SQL seed files ===")

HEADER = """\
-- ═══════════════════════════════════════════════════════════════
-- K-MAPS GENERATED SEED — DO NOT EDIT BY HAND
-- Generated by: scripts/ingest-morphology.py
-- Sources: QUL (word-root/lemma/stem), QAC (morphology TSV), MASAQ
-- ═══════════════════════════════════════════════════════════════

"""

# ─── 5A. seed-al-roots.sql ────────────────────────────────────────────────────
print("  5a. Writing seed-al-roots.sql ...")
root_rows = []
for rt, rd in sorted(root_registry.items(), key=lambda x: x[0]):
    letters_json = json.dumps(rd['letters'], ensure_ascii=False)
    root_rows.append((
        rd['id'],
        rd['text'],
        letters_json,
        rd['type'],
        rd.get('weak'),
        rd['freq'],
        0,               # frequency_hadith
        rd.get('en'),    # meaning_core_en
        None,            # note_md
    ))

with open(OUTDIR / 'seed-al-roots.sql', 'w', encoding='utf-8') as f:
    f.write(HEADER)
    f.write(f"-- Rows: {len(root_rows)} roots\n\n")
    write_batched_inserts(f,
        'ar_ling_roots',
        ['id','root_text','root_letters','root_type','weak_pattern',
         'frequency_quran','frequency_hadith','meaning_core_en','note_md'],
        root_rows)

print(f"     {len(root_rows)} rows → seed-al-roots.sql")

# ─── 5B. seed-al-lemmas.sql ───────────────────────────────────────────────────
print("  5b. Writing seed-al-lemmas.sql ...")
al_lemma_rows = []
for qlid, lr in lemma_registry.items():
    al_lemma_rows.append((
        lr['id'],
        lr['root_id'],
        lr['text'],
        lr['text_bare'],
        lr['pos'],
        None,       # verb_form
        lr['is_quran'],
        lr['freq'],
        None,       # note_md
    ))

with open(OUTDIR / 'seed-al-lemmas.sql', 'w', encoding='utf-8') as f:
    f.write(HEADER)
    f.write(f"-- Rows: {len(al_lemma_rows)} lemmas\n\n")
    write_batched_inserts(f,
        'ar_ling_lemmas',
        ['id','root_id','lemma_text','lemma_text_bare','part_of_speech',
         'verb_form','is_quran_word','frequency_quran','note_md'],
        al_lemma_rows)

print(f"     {len(al_lemma_rows)} rows → seed-al-lemmas.sql")

# ─── 5C. seed-qr-word-occurrences.sql ────────────────────────────────────────
print("  5c. Writing seed-qr-word-occurrences.sql ...")
with open(OUTDIR / 'seed-qr-word-occurrences.sql', 'w', encoding='utf-8') as f:
    f.write(HEADER)
    f.write(f"-- Rows: {len(wo_rows)} word occurrences\n\n")
    write_batched_inserts(f,
        'qr_word_occurrences',
        ['id','surah','ayah','word_index','word_text','word_text_bare',
         'root','lemma','pos','morphology_tag','morphology_tag_json'],
        wo_rows)

print(f"     {len(wo_rows)} rows → seed-qr-word-occurrences.sql")

# ─── 5D. seed-qr-lemmas.sql ───────────────────────────────────────────────────
print("  5d. Writing seed-qr-lemmas.sql ...")
with open(OUTDIR / 'seed-qr-lemmas.sql', 'w', encoding='utf-8') as f:
    f.write(HEADER)
    f.write(f"-- Rows: {len(qrl_rows)} qr_lemmas\n\n")
    write_batched_inserts(f,
        'qr_lemmas',
        ['id','lemma_text','root','lx_lemma_ref','total_occurrences'],
        qrl_rows)

print(f"     {len(qrl_rows)} rows → seed-qr-lemmas.sql")

# ─── 5E. seed-qr-lemma-occurrences.sql ───────────────────────────────────────
# Instead of hardcoding pre-computed FK IDs (which break when parent tables
# already contain rows with different IDs), use a WITH+JOIN pattern that looks
# up the ACTUAL id values present in qr_lemmas and qr_word_occurrences at
# insert time.  This is robust regardless of what IDs the parent tables carry.
print("  5e. Writing seed-qr-lemma-occurrences.sql (JOIN-based, FK-safe) ...")

# Build lookup tuples: (lemma_text, surah, ayah, word_index)
qrlo_lookup = []
for qlid, positions in lemma_to_words.items():
    lem = qul_lemmas.get(qlid)
    if not lem:
        continue
    lemma_text = lem['text'] or lem['text_bare']
    if not lemma_text:
        continue
    for (s, a, w) in positions:
        if (s, a, w) not in seen_positions:   # only positions we actually inserted
            continue
        qrlo_lookup.append((lemma_text, s, a, w))

BATCH = 300   # keep each CTE VALUES list under D1's per-statement limit

with open(OUTDIR / 'seed-qr-lemma-occurrences.sql', 'w', encoding='utf-8') as f:
    f.write(HEADER)
    f.write(f"-- Rows: {len(qrlo_lookup)} qr_lemma_occurrences\n")
    f.write("-- Uses WITH+JOIN to resolve actual IDs at insert time (FK-safe)\n\n")

    for i in range(0, len(qrlo_lookup), BATCH):
        chunk = qrlo_lookup[i:i+BATCH]
        vals = ',\n    '.join(
            f"({q(lt)}, {s}, {a}, {w})"
            for lt, s, a, w in chunk
        )
        f.write(
            f"INSERT OR IGNORE INTO qr_lemma_occurrences"
            f" (id, lemma_id, surah, ayah, word_index, word_occurrence_id)\n"
            f"WITH data(lemma_text, surah, ayah, word_index) AS (VALUES\n"
            f"    {vals}\n"
            f")\n"
            f"SELECT\n"
            f"  lower(hex(randomblob(13))),\n"
            f"  ql.id,\n"
            f"  d.surah,\n"
            f"  d.ayah,\n"
            f"  d.word_index,\n"
            f"  wo.id\n"
            f"FROM data d\n"
            f"JOIN qr_lemmas ql ON ql.lemma_text = d.lemma_text\n"
            f"JOIN qr_word_occurrences wo\n"
            f"  ON wo.surah = d.surah AND wo.ayah = d.ayah AND wo.word_index = d.word_index;\n\n"
        )

print(f"     {len(qrlo_lookup)} lookup rows → seed-qr-lemma-occurrences.sql ({len(qrlo_lookup)//BATCH + 1} batches)")

# ─── 5F. backfill-qr-word-occurrences-morphology-tag-json.sql ────────────────
print("  5f. Writing backfill-qr-word-occurrences-morphology-tag-json.sql ...")
wo_json_rows = [(row[1], row[2], row[3], row[9], row[10]) for row in wo_rows if row[10] is not None]
with open(OUTDIR / 'backfill-qr-word-occurrences-morphology-tag-json.sql', 'w', encoding='utf-8') as f:
    f.write(HEADER)
    f.write(f"-- Rows: {len(wo_json_rows)} morphology_tag / morphology_tag_json updates\n")
    f.write("-- Key: UNIQUE (surah, ayah, word_index), so this backfills existing rows even when IDs differ.\n\n")
    write_word_morphology_updates(f, wo_json_rows)

print(f"     {len(wo_json_rows)} rows → backfill-qr-word-occurrences-morphology-tag-json.sql")

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════
print("\n=== COMPLETE ===")
print(f"  ar_ling_roots             : {len(root_rows):>7,}")
print(f"  ar_ling_lemmas            : {len(al_lemma_rows):>7,}")
print(f"  qr_word_occurrences       : {len(wo_rows):>7,}")
print(f"  qr_lemmas                 : {len(qrl_rows):>7,}")
print(f"  qr_lemma_occurrences      : {len(qrlo_rows):>7,}")
print(f"\nOutputs in: {OUTDIR}")
