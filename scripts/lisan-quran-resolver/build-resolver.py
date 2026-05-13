#!/usr/bin/env python3
"""
Resolve Lisan al-Arab's inline Quran citations to canonical (surah, ayah).

Why this exists
───────────────
The Mufradat composer can resolve `[سورة/N]` brackets directly because the
source ships explicit surah names + ayah numbers. Lisan al-Arab quotes
verses by TEXT only — no bracketed refs, no surah name — so we have to
match the quoted text back against the Quran corpus.

Approach
────────
1. Pull every ayah from `km_quran.qr_ayah` (6,236 rows).
2. Normalize ayah text once: strip diacritics, collapse alef variants,
   strip hamza-on-seat, drop tatweel. Keep the result as a flat token
   stream (whitespace-split words).
3. Build three inverted indices on the token stream:
      ▸ 5-gram  →  set of (surah, ayah)     primary
      ▸ 4-gram  →  set of (surah, ayah)     fallback
      ▸ 3-gram  →  set of (surah, ayah)     short-quote rescue
4. For each Lisan `block_type='quran_quote'` block:
      • Normalize the block text the same way.
      • Slide a 5-token window across it; lookup each n-gram.
      • Aggregate hits per (surah, ayah) → score.
      • Highest-score verse with score ≥ MIN_HITS is the match.
      • Allow MULTIPLE matches per block (a single block can quote two
        verses); each becomes its own quran_refs row.
5. Emit SQL writing BOTH:
      • `ar_ling_lexicon_quran_refs`   (Mufradat-parity primary table)
      • `ar_ling_lexicon_block_links`  (mirror row, link_kind='quran_ayah')

Idempotent: deterministic ids + `INSERT OR IGNORE`.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

HERE      = Path(__file__).resolve().parent
ROOT      = HERE.parents[1]
QURAN_IN  = HERE / '.qr_ayah_raw.json'
QIRAAT_IN = HERE / '.qiraat-corpus.json'        # variant readings

# Source-slug-driven config. Defaults to Lisan for back-compat; pass
# `LISAN_SOURCE_SLUG=<slug>` env or `--source <slug>` to retarget.
SOURCE_SLUG = (
    os.environ.get('LISAN_SOURCE_SLUG')
    or (sys.argv[sys.argv.index('--source')+1] if '--source' in sys.argv else None)
    or 'ketabonline_ibn_manzur_lisan_al_arab'
)
# Short stable prefix for block IDs — derived from slug initials
_SLUG_PREFIX = ''.join(p[:1] for p in SOURCE_SLUG.split('_'))[:6] or 'lex'
BLOCKS_IN = HERE / f'.{SOURCE_SLUG}.quran_blocks.json'
SQL_OUT   = HERE / f'apply_quran_refs__{SOURCE_SLUG}.sql'

# Resolution thresholds — tuned via accuracy audit (see README)
MIN_TOKEN_LEN         = 4    # short candidates allowed via cue-anchor path
SECONDARY_RATIO       = 0.55 # secondary verse must score ≥ ratio × primary
NGRAM_VERSE_CAP       = 40   # ngrams matching > this many verses are stopwords
SUBSTRING_MIN_RUN     = 12   # min char-run of verse text in block to validate
REQ_5GRAM_HITS        = 1    # full-block: ≥ this many 5-gram hits OR
REQ_4GRAM_HITS        = 2    # full-block: ≥ this many 4-gram hits
# Cue-anchored relaxed thresholds (for short verse fragments after a cue
# like "قوله تعالى:" we trust the cue and need less ngram support).
CUE_REQ_5GRAM         = 1    # OR
CUE_REQ_4GRAM         = 1    # OR
CUE_REQ_3GRAM         = 2    # ≥2 3-grams as last resort
CUE_WINDOW_TOKENS     = 25   # tokens after a cue we treat as the verse fragment

# ── Normalization rules (Hawramani style + classical lexicon practice) ──
DIACR_RX  = re.compile(r'[ً-ٰٟۖ-ۭـ]')  # all combining marks + tatweel
PUNCT_RX  = re.compile(r'[\.,،؛:!؟\?\(\)\[\]«»"\'\-—\*]')

def normalize(s: str) -> str:
    if not s: return ''
    s = DIACR_RX.sub('', s)
    s = PUNCT_RX.sub(' ', s)
    # Alef family → bare ا
    s = s.translate(str.maketrans({
        'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
        'ى': 'ي',
        'ؤ': 'و',
        'ئ': 'ي',
        'ة': 'ه',                          # ta-marbuta → ha for matching
    }))
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def tokens(s: str) -> list[str]:
    return [t for t in normalize(s).split(' ') if t]


# ── Build phase: pull Quran corpus, normalize, build inverted indices ───
def build_indices() -> tuple[dict, dict, dict, dict]:
    raw = json.load(open(QURAN_IN))[0]['results']
    print(f'Loaded {len(raw)} Hafs ayahs from km_quran')

    # token stream per (surah, ayah) for the Hafs reading (used for the
    # substring validation step — we want to surface the standard text
    # back to the user even when a match comes from a qira'a variant).
    by_ayah: dict[tuple[int, int], list[str]] = {}
    for r in raw:
        text = r['text_bare'] or r['text_uthmani'] or ''
        toks = tokens(text)
        if toks: by_ayah[(int(r['surah']), int(r['ayah']))] = toks

    # Build n-gram → set of (surah, ayah)
    idx5: dict[str, set] = defaultdict(set)
    idx4: dict[str, set] = defaultdict(set)
    idx3: dict[str, set] = defaultdict(set)
    for (s, a), toks in by_ayah.items():
        for i in range(len(toks) - 4): idx5[' '.join(toks[i:i+5])].add((s, a))
        for i in range(len(toks) - 3): idx4[' '.join(toks[i:i+4])].add((s, a))
        for i in range(len(toks) - 2): idx3[' '.join(toks[i:i+3])].add((s, a))

    # ── qira'at variants: tested and DISABLED ─────────────────────────
    # We downloaded Warsh / Qaloun / Doori / Sousi / Shu'ba (30K verse
    # rows) and tried THREE expansion strategies:
    #   (a) full 3/4/5-gram search expansion — 72.8% resolution, 1,551 refs
    #       BUT spot-audit showed ~60% false-positive rate among
    #       variant-only matches.
    #   (b) validation-only (variants in substring check, NOT in search) —
    #       no recall improvement vs Hafs-only.
    #   (c) 5-gram-only search expansion — 72.4% resolution, still 80%
    #       false-positive rate on variant-only matches.
    # Root cause: even 5-gram variants share common Arabic tokens
    # ("قال الذين", "في الارض", …) with many unrelated verses; the
    # substring validator can't tell which verse the block actually
    # quoted when the matched verse is a near-paraphrase. Variant
    # expansion buys recall at unacceptable precision cost.
    # The qira'at corpus is parsed and staged at .qiraat-corpus.json
    # in case a later approach (e.g. weighted multi-variant scoring or
    # a learned ranker) wants to re-use it.
    variants_by_ayah: dict[tuple[int, int], list[list[str]]] = defaultdict(list)

    # Merge variants into `by_ayah` as a list of alternative token streams.
    # The substring validation will pass if ANY variant has a contiguous
    # run in the block. We store as `(hafs_toks, [variant_toks, …])`.
    by_ayah_multi: dict[tuple[int, int], list[list[str]]] = {}
    for sa, hafs in by_ayah.items():
        all_variants = [hafs] + variants_by_ayah.get(sa, [])
        by_ayah_multi[sa] = all_variants
    # Replace `by_ayah` with the multi-variant version so resolve_block
    # can consult every reading.
    by_ayah = by_ayah_multi

    # Filter stopword n-grams (appear in too many verses → low signal)
    pruned5 = sum(1 for ng, vs in idx5.items() if len(vs) > NGRAM_VERSE_CAP)
    pruned4 = sum(1 for ng, vs in idx4.items() if len(vs) > NGRAM_VERSE_CAP)
    pruned3 = sum(1 for ng, vs in idx3.items() if len(vs) > NGRAM_VERSE_CAP)
    idx5 = {k: v for k, v in idx5.items() if len(v) <= NGRAM_VERSE_CAP}
    idx4 = {k: v for k, v in idx4.items() if len(v) <= NGRAM_VERSE_CAP}
    idx3 = {k: v for k, v in idx3.items() if len(v) <= NGRAM_VERSE_CAP}

    print(f'Index sizes (after stopword prune):')
    print(f'  5-gram={len(idx5)}  (pruned {pruned5})')
    print(f'  4-gram={len(idx4)}  (pruned {pruned4})')
    print(f'  3-gram={len(idx3)}  (pruned {pruned3})')
    return idx5, idx4, idx3, by_ayah


# ── Cue extraction ──────────────────────────────────────────────────────
# Lisan blocks that quote a verse almost always introduce it with a cue
# phrase. Capturing the post-cue window gives us a much higher-signal
# candidate string than scanning the whole block (which may run hundreds
# of tokens of commentary). We use the diacritic-stripped form to detect
# the cue across vocalization variants.
QURAN_CUES = [
    'قوله تعالى', 'قول الله تعالى', 'قال الله تعالى', 'قال تعالى',
    'قوله عز وجل', 'قال الله عز وجل', 'قوله سبحانه',
    'يقول الله تعالى', 'في قوله تعالى', 'وقوله تعالى', 'لقوله تعالى',
    'وفي التنزيل', 'وفي القرآن', 'في التنزيل العزيز',
    'كقوله تعالى', 'كقوله', 'وقوله',
]

def extract_cue_windows(text: str) -> list[list[str]]:
    """Return token-windows that follow Quranic cues in `text`.
    Each window is up to CUE_WINDOW_TOKENS tokens long, plus we also
    return the whole-block token list at the end as a fallback.
    """
    norm = normalize(text)
    windows: list[list[str]] = []
    for cue in QURAN_CUES:
        cn = normalize(cue)
        start = 0
        while True:
            i = norm.find(cn, start)
            if i < 0: break
            # Position right after the cue (skip optional ':' colon)
            tail = norm[i + len(cn):].lstrip(' :،').strip()
            window = [t for t in tail.split(' ') if t][:CUE_WINDOW_TOKENS]
            if window: windows.append(window)
            start = i + len(cn)
    return windows


def _score_window(toks: list[str], idx5: dict, idx4: dict, idx3: dict):
    score: dict = defaultdict(int)
    hits5: dict = defaultdict(int)
    hits4: dict = defaultdict(int)
    hits3: dict = defaultdict(int)
    for i in range(len(toks) - 4):
        ng = ' '.join(toks[i:i+5])
        for sa in idx5.get(ng, ()):
            score[sa] += 5; hits5[sa] += 1
    for i in range(len(toks) - 3):
        ng = ' '.join(toks[i:i+4])
        for sa in idx4.get(ng, ()):
            score[sa] += 3; hits4[sa] += 1
    for i in range(len(toks) - 2):
        ng = ' '.join(toks[i:i+3])
        for sa in idx3.get(ng, ()):
            score[sa] += 1; hits3[sa] += 1
    return score, hits5, hits4, hits3


# ── Resolution: try cue-anchored windows first (high precision/recall on
# short fragments), then fall back to full-block scan.
def resolve_block(block_text: str, idx5: dict, idx4: dict, idx3: dict,
                  by_ayah: dict, normalized_block: str | None = None) -> list[dict]:
    full_toks = tokens(block_text)
    if len(full_toks) < MIN_TOKEN_LEN:
        return []

    # Path 1 — cue-anchored windows. If a cue is present, score each
    # window separately and accept matches with relaxed thresholds.
    cue_windows = extract_cue_windows(block_text)
    cue_results: list[dict] = []
    for window in cue_windows:
        if len(window) < MIN_TOKEN_LEN: continue
        wscore, wh5, wh4, wh3 = _score_window(window, idx5, idx4, idx3)
        if not wscore: continue
        ranked = sorted(wscore.items(), key=lambda kv: -kv[1])
        for sa, sc in ranked[:3]:                       # top-3 candidates per window
            if (wh5[sa] >= CUE_REQ_5GRAM
                or wh4[sa] >= CUE_REQ_4GRAM
                or wh3[sa] >= CUE_REQ_3GRAM):
                cue_results.append({
                    'sa': sa, 'score': sc,
                    'hits5': wh5[sa], 'hits4': wh4[sa], 'hits3': wh3[sa],
                    'cued': True,
                })

    # Path 2 — full-block scan (Mufradat-style, requires strong evidence)
    score, hits5, hits4, hits3 = _score_window(full_toks, idx5, idx4, idx3)
    confident = [
        (sa, sc) for sa, sc in score.items()
        if hits5[sa] >= REQ_5GRAM_HITS or hits4[sa] >= REQ_4GRAM_HITS
    ]
    if not confident and not cue_results: return []

    # Substring validation: the verse's normalized text must share a
    # contiguous run with the block. We allow a SHORTER run when the
    # candidate came from a cue-anchored window (the cue itself is a
    # strong signal that the next tokens ARE a verse).
    nb = normalized_block if normalized_block is not None else normalize(block_text)

    def passes_substring(sa, *, relaxed: bool) -> bool:
        # by_ayah[sa] is a LIST of token-streams (Hafs + each qira'a).
        # The block passes if ANY variant has a contiguous run that
        # appears verbatim in the normalized block.
        variants = by_ayah.get(sa) or []
        if not variants: return False
        # Cue path: 3-token slice is enough; full-block path: 5-token.
        need_base = 3 if relaxed else 5
        min_chars = 8 if relaxed else SUBSTRING_MIN_RUN
        for verse_toks in variants:
            need = need_base if len(verse_toks) >= need_base else len(verse_toks)
            max_i = max(0, len(verse_toks) - need)
            for i in range(0, max_i + 1):
                sl = ' '.join(verse_toks[i:i + need])
                if len(sl) >= min_chars and sl in nb:
                    return True
        return False

    accepted: dict[tuple[int, int], dict] = {}

    # Merge full-block confident matches that pass strict substring check
    for sa, sc in confident:
        if passes_substring(sa, relaxed=False):
            accepted[sa] = {
                'sa': sa, 'score': sc,
                'hits5': hits5[sa], 'hits4': hits4[sa], 'hits3': hits3[sa],
                'cued': False,
            }

    # Merge cue-window matches (relaxed substring requirement)
    for r in cue_results:
        sa = r['sa']
        if sa in accepted: continue   # already accepted with stronger evidence
        if passes_substring(sa, relaxed=True):
            accepted[sa] = r

    if not accepted: return []

    ranked = sorted(accepted.values(), key=lambda r: -r['score'])
    top = ranked[0]['score']
    cutoff = max(int(top * SECONDARY_RATIO), 3)
    return [
        {'surah': r['sa'][0], 'ayah': r['sa'][1], 'score': r['score'],
         'hits5': r['hits5'], 'hits4': r['hits4'], 'hits3': r['hits3'],
         'cued': r['cued']}
        for r in ranked if r['score'] >= cutoff
    ][:5]


# ── Generate SQL rows ───────────────────────────────────────────────────
def sql_escape(s: str) -> str: return s.replace("'", "''")
def stable_id(*parts: str) -> str:
    return f'qref_{_SLUG_PREFIX}_{hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]}'
def link_id(*parts: str) -> str:
    return f'lnk_{_SLUG_PREFIX}_qr_{hashlib.sha1("|".join(parts).encode()).hexdigest()[:16]}'


def emit_inserts(matches: list[tuple[dict, dict]]) -> tuple[list[str], list[str]]:
    refs_sql:  list[str] = []
    links_sql: list[str] = []
    for block, m in matches:
        bid     = block['block_id']
        rid     = block['root_entry_id']
        sid     = block['section_id']
        root    = block['root_norm']
        surah   = m['surah']
        ayah    = m['ayah']
        snippet = (block['text_plain'] or '')[:200].strip()
        raw_ref = f'[{surah}:{ayah}]'

        # quran_refs row
        qref_id = stable_id(bid, str(surah), str(ayah))
        sec_sql = 'NULL' if not sid else "'" + sql_escape(sid) + "'"
        refs_sql.append(
            f"INSERT OR IGNORE INTO ar_ling_lexicon_quran_refs "
            f"(id, source_slug, root_entry_id, section_id, block_id, root_norm, "
            f"surah, ayah, raw_ref, context_snippet) VALUES ("
            f"'{qref_id}', '{SOURCE_SLUG}', '{rid}', {sec_sql}, '{bid}', "
            f"'{sql_escape(root)}', {surah}, {ayah}, "
            f"'{sql_escape(raw_ref)}', '{sql_escape(snippet)}');"
        )

        # block_links mirror row (link_kind='quran_ayah')
        lid = link_id(bid, str(surah), str(ayah))
        links_sql.append(
            f"INSERT OR IGNORE INTO ar_ling_lexicon_block_links "
            f"(id, from_block_id, source_slug, link_kind, to_surah, to_ayah, "
            f"label, weight, origin) VALUES ("
            f"'{lid}', '{bid}', '{SOURCE_SLUG}', 'quran_ayah', {surah}, {ayah}, "
            f"'{sql_escape(raw_ref)}', {m['score']}.0, 'derived');"
        )
    return refs_sql, links_sql


def main():
    if not QURAN_IN.exists() or not BLOCKS_IN.exists():
        sys.exit(f'Missing input files in {HERE}')

    idx5, idx4, idx3, by_ayah = build_indices()
    blocks = json.load(open(BLOCKS_IN))[0]['results']
    print(f'Resolving {len(blocks)} Lisan quran_quote blocks...')

    matches: list[tuple[dict, dict]] = []
    unresolved = 0
    multi_match = 0
    score_hist = defaultdict(int)
    for blk in blocks:
        text = blk.get('text_plain') or ''
        results = resolve_block(text, idx5, idx4, idx3, by_ayah)
        if not results:
            unresolved += 1
            continue
        if len(results) > 1: multi_match += 1
        for m in results:
            matches.append((blk, m))
            score_hist[min(m['score'], 50)] += 1

    resolved_blocks = len(blocks) - unresolved
    print()
    print(f'Resolved blocks:       {resolved_blocks} / {len(blocks)}  '
          f'({100*resolved_blocks/len(blocks):.1f}%)')
    print(f'Total quran_refs rows: {len(matches)}')
    print(f'Multi-match blocks:    {multi_match}')
    print(f'Unresolved blocks:     {unresolved}')
    print(f'Score distribution (capped at 50):')
    for s in sorted(score_hist):
        bar = '█' * min(40, score_hist[s] // 5)
        print(f'  score {s:3d}: {score_hist[s]:5d} {bar}')

    refs_sql, links_sql = emit_inserts(matches)

    # D1 rejects explicit BEGIN/COMMIT statements (Durable-Object rule).
    # Each INSERT is its own implicit transaction; D1 batches statements
    # internally on the server side.
    with SQL_OUT.open('w') as f:
        f.write('-- Lisan al-Arab Quran-ref resolution\n')
        f.write(f'-- Resolved blocks: {resolved_blocks}/{len(blocks)}\n')
        f.write(f'-- Total quran_refs INSERTs: {len(refs_sql)}\n')
        f.write(f'-- Total block_links INSERTs: {len(links_sql)}\n\n')
        f.write('\n'.join(refs_sql))
        f.write('\n')
        f.write('\n'.join(links_sql))
        f.write('\n')

    print()
    print(f'Wrote {len(refs_sql) + len(links_sql)} statements → {SQL_OUT}')
    print(f'  refs:  {len(refs_sql)}')
    print(f'  links: {len(links_sql)}')


if __name__ == '__main__':
    main()
