#!/usr/bin/env python3
"""
Direct sarf (morphology) extraction for S12.

Sources:
  - spine.sqlite    — word-by-word morphology: root, lemma, pos, morphology_tag
  - Safi DB         — irab analysis often contains wazn + derivation notes
  - Darwish DB      — supplement sarf/wazn notes

Extracts per-word صرف claims:
  - wazn (verbal/noun pattern وزن)
  - root derivation (اشتقاق)
  - word class / POS detail (نوع الكلمة)
  - inflectional form (الصيغة الصرفية)
  - broken plural / dual / feminine forms
  - verb conjugation type (فعل ماضٍ، مضارع، أمر...)

Output:
  S012/claims/R{r:02d}/sarf/12_{ayah}.json  (one per ayah)
  S012/sql/s12_al_claims_sarf.sql

Usage:
    python3 S012/scripts/extract_sarf.py
    python3 S012/scripts/extract_sarf.py --force
    python3 S012/scripts/extract_sarf.py --ayah 7
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, sqlite3, time, urllib.request
from pathlib import Path

BASE       = Path(__file__).resolve().parents[2]       # ingestion/
SURAH_DIR  = Path(__file__).resolve().parents[1]       # S012/
SAFI_DB    = BASE / "../Tafsirs/al-jadwal-fi-i-rab-al-quran.db"
DARWISH_DB = BASE / "../Tafsirs/i-rab-al-quran-li-al-darwish.db"
SPINE_DB   = BASE / "spine.sqlite"
RUKU_DB    = BASE / "../quran-metadata-ruku.sqlite"
SQL_OUT    = SURAH_DIR / "sql/s12_al_claims_sarf.sql"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "qwen3:latest")

HTML_TAG  = re.compile(r'<[^>]+>')
MULTI_SPC = re.compile(r'  +')

SARF_TYPES = [
    "wazn",          # verbal/nominal pattern (فَعَلَ، فَاعِل، مَفْعَلَة...)
    "ishtiqaq",      # root derivation (اشتقاق)
    "word_class",    # part of speech detail (اسم، فعل، حرف + sub-type)
    "sigha",         # inflectional form (صيغة: مفرد، مثنى، جمع، مذكر، مؤنث...)
    "verb_type",     # verb class: ماضٍ، مضارع، أمر، مجهول، متعدٍّ، لازم...
    "mubalaghah",    # hyperbolic form (مبالغة: فَعَّال، فَعُول...)
    "masdar",        # verbal noun (مصدر)
    "broken_plural", # جمع تكسير
    "rule_reference",# grammatical/morphological rule cited
]

SYSTEM_PROMPT = """You are extracting صرف (Arabic morphology) claims from Quranic analysis.

Given:
1. Spine morphology data (root, lemma, pos, morphology_tag per word)
2. Safi's irab text (which often contains wazn and derivation notes)

Extract ALL morphological claims for each word in the ayah.

Return ONLY valid JSON:
{
  "claims": [
    {
      "word_index": int,          // 1-based position in ayah
      "word_ar": string,          // the Arabic word
      "claim_type": string,       // MUST be one of the types listed below
      "wazn": string,             // morphological pattern e.g. فَعَلَ، فَاعِل، مَفْعُول، فَعَّال (or "")
      "root": string,             // Arabic root (3 or 4 letters)
      "lemma": string,            // base form
      "sigha": string,            // مفرد/مثنى/جمع + مذكر/مؤنث + معرفة/نكرة (or "")
      "pos_detail": string,       // detailed POS: اسم فاعل، فعل مضارع مرفوع، حرف جر، etc.
      "source_note_ar": string,   // relevant excerpt from Safi confirming this (or "" if from spine)
      "claim_ar": string,         // brief Arabic morphology explanation
      "claim_en": string,         // English explanation
      "confidence": string,       // "high"|"medium"|"low"
      "needs_review_reason": string  // "" if none
    }
  ],
  "warnings": []
}

Valid claim_types: wazn, ishtiqaq, word_class, sigha, verb_type, mubalaghah, masdar, broken_plural, rule_reference

Rules:
- Extract AT LEAST ONE claim per content word (skip stop particles if no morphological note)
- wazn is the MOST important — extract it for every noun, verb, and adjective
- Use the spine morphology_tag as primary source; Safi's text for wazn/pattern confirmation
- source_note_ar: short excerpt from Safi if he mentions the wazn or derivation; else ""
- Be thorough — every verb needs verb_type, every noun needs sigha
"""


def strip_html(text: str) -> str:
    if not text: return ""
    text = html.unescape(text)
    text = HTML_TAG.sub(' ', text)
    return MULTI_SPC.sub(' ', text).strip()


def stable_id(*parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return "AL:SC:" + hashlib.sha1(raw.encode()).hexdigest()[:24]


def sv(v) -> str:
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"


# ── Ruku map ───────────────────────────────────────────────────────────────────
def _build_ruku_map() -> dict[int, int]:
    mp: dict[int, int] = {}
    try:
        cx = sqlite3.connect(RUKU_DB)
        rows = cx.execute(
            "SELECT surah_ruku_number, first_verse_key, last_verse_key "
            "FROM ruku WHERE first_verse_key LIKE '12:%' ORDER BY surah_ruku_number"
        ).fetchall()
        cx.close()
        for rnum, fk, lk in rows:
            fa = int(fk.split(":")[1]); la = int(lk.split(":")[1])
            for a in range(fa, la + 1):
                mp[a] = rnum
    except Exception:
        pass
    return mp

AYAH_TO_RUKU: dict[int, int] = _build_ruku_map()

def claims_dir(ayah: int) -> Path:
    ruku = AYAH_TO_RUKU.get(ayah, 1)
    return SURAH_DIR / f"claims/R{ruku:02d}/sarf"


# ── Data loading ───────────────────────────────────────────────────────────────
def load_spine_words(ayah: int) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    rows = cx.execute(
        "SELECT word_index, word_text, root, lemma, pos, morphology_tag "
        "FROM qr_word_occurrences WHERE surah=12 AND ayah=? ORDER BY word_index",
        (ayah,)
    ).fetchall()
    cx.close()
    return [dict(r) for r in rows]


def load_safi_text(ayah: int) -> str:
    try:
        cx = sqlite3.connect(SAFI_DB)
        row = cx.execute("SELECT text FROM tafsir WHERE ayah_key=?", (f"12:{ayah}",)).fetchone()
        cx.close()
        if row:
            clean = strip_html(row[0])
            return clean[:4000] if len(clean) > 50 else ""
    except Exception:
        pass
    return ""


def load_darwish_text(ayah: int) -> str:
    try:
        cx = sqlite3.connect(DARWISH_DB)
        row = cx.execute("SELECT text FROM tafsir WHERE ayah_key=?", (f"12:{ayah}",)).fetchone()
        cx.close()
        if row:
            clean = strip_html(row[0])
            return clean[:3000] if len(clean) > 50 else ""
    except Exception:
        pass
    return ""


def already_has_claims(ayah: int) -> bool:
    f = claims_dir(ayah) / f"12_{ayah}.json"
    if not f.exists(): return False
    try:
        d = json.loads(f.read_text())
        return len(d.get("result", {}).get("claims", [])) > 0
    except Exception:
        return False


# ── LLM ───────────────────────────────────────────────────────────────────────
def call_llm(ayah: int, words: list[dict], safi_text: str, darwish_text: str) -> dict:
    # Build spine morphology table
    morph_lines = []
    for w in words:
        morph_lines.append(
            f"[{w['word_index']}] {w['word_text']} | root={w.get('root','')} "
            f"lemma={w.get('lemma','')} pos={w.get('pos','')} "
            f"morph={w.get('morphology_tag','')}"
        )
    morph_block = "\n".join(morph_lines)

    sources = f"[Spine Morphology]\n{morph_block}"
    if safi_text:
        sources += f"\n\n[Safi Irab (wazn/derivation notes)]\n{safi_text}"
    if darwish_text:
        sources += f"\n\n[Darwish Supplement]\n{darwish_text}"

    user_msg = (
        f"SURAH 12, AYAH {ayah}\n\n"
        f"{sources}"
    )
    body = json.dumps({
        "model": LLM_MODEL,
        "think": False,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 4096, "num_ctx": 8192},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
    }).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat", data=body,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.loads(r.read())
        content = resp.get("message", {}).get("content", "")
    except Exception as e:
        return {"claims": [], "warnings": [f"LLM error: {e}"]}
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    try:
        return json.loads(content)
    except Exception:
        m = re.search(r"\{.*\}", content, re.DOTALL)
        if m:
            try: return json.loads(m.group())
            except Exception: pass
        return {"claims": [], "warnings": ["JSON parse failed"]}


def write_claim_file(ayah: int, result: dict):
    d = claims_dir(ayah)
    d.mkdir(parents=True, exist_ok=True)
    out = {
        "layer": "sarf",
        "ayah_key": f"12:{ayah}",
        "sources": ["spine", "safi", "darwish"],
        "result": result,
    }
    (d / f"12_{ayah}.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))


def normalize_type(ct: str) -> str:
    ct = (ct or "").strip()
    if ct in SARF_TYPES: return ct
    # common aliases
    aliases = {
        "pattern": "wazn", "form": "sigha", "derivation": "ishtiqaq",
        "verb": "verb_type", "plural": "broken_plural", "verbal_noun": "masdar",
        "pos": "word_class", "part_of_speech": "word_class",
    }
    return aliases.get(ct.lower(), "wazn")  # fallback to wazn


def claims_to_sql(ayah: int, words: list[dict], result: dict) -> list[str]:
    stmts = []
    source_id = "AL:SOURCE:SARF_DIRECT"
    for c in result.get("claims", []):
        wi = c.get("word_index")
        ct = normalize_type(c.get("claim_type", "wazn"))
        cid = stable_id("sarf", 12, ayah, wi, ct, c.get("claim_ar", "")[:40])
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_source_claims "
            f"(id,layer,surah,ayah,word_index,claim_type,source_id,"
            f"source_quote_ar,claim_ar,claim_en,device_branch,device_subtype,"
            f"root,lemma,quran_ref,confidence,needs_review,needs_review_reason,"
            f"n_source_chunks) VALUES ("
            f"{sv(cid)},'sarf',12,{ayah},"
            f"{sv(wi)},{sv(ct)},"
            f"{sv(source_id)},"
            f"{sv(c.get('source_note_ar','')[:800])},"
            f"{sv(c.get('claim_ar','')[:1000])},"
            f"{sv(c.get('claim_en','')[:1000])},"
            f"NULL,"
            f"{sv(c.get('wazn',''))},"
            f"{sv(c.get('root',''))},"
            f"{sv(c.get('lemma',''))},"
            f"NULL,"
            f"{sv(c.get('confidence','medium'))},"
            f"{1 if c.get('needs_review_reason') else 0},"
            f"{sv(c.get('needs_review_reason',''))},"
            f"1);"
        )
    return stmts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-extract even if claims exist")
    parser.add_argument("--ayah", type=int, help="Process single ayah only")
    args = parser.parse_args()

    to_process = [args.ayah] if args.ayah else list(range(1, 112))
    if not args.force and not args.ayah:
        to_process = [a for a in to_process if not already_has_claims(a)]

    print(f"\n{'='*60}")
    print(f"  S12 Sarf Direct Extraction (Spine + Safi + Darwish)")
    print(f"  Model: {LLM_MODEL}")
    print(f"  To process: {len(to_process)} ayahs")
    print(f"{'='*60}\n")

    SQL_OUT.parent.mkdir(exist_ok=True)
    existing = SQL_OUT.read_text().splitlines() if SQL_OUT.exists() else []
    seen_ids: set[str] = set()
    for line in existing:
        m = re.search(r"VALUES \('([^']+)'", line)
        if m: seen_ids.add(m.group(1))

    all_stmts: list[str] = []
    ok = 0; total_claims = 0

    for i, ayah in enumerate(to_process):
        words = load_spine_words(ayah)
        if not words:
            print(f"  [{i+1}/{len(to_process)}] 12:{ayah} — no words in spine, skip")
            continue

        safi_text    = load_safi_text(ayah)
        darwish_text = load_darwish_text(ayah)

        t0 = time.time()
        result = call_llm(ayah, words, safi_text, darwish_text)
        elapsed = time.time() - t0

        n_claims = len(result.get("claims", []))
        total_claims += n_claims
        warns = result.get("warnings", [])

        write_claim_file(ayah, result)

        new_stmts = claims_to_sql(ayah, words, result)
        for stmt in new_stmts:
            m = re.search(r"VALUES \('([^']+)'", stmt)
            if m and m.group(1) not in seen_ids:
                all_stmts.append(stmt)
                seen_ids.add(m.group(1))

        status = f"✓ {n_claims} claims"
        if warns: status += f" ⚠ {warns[0][:30]}"
        print(f"  [{i+1}/{len(to_process)}] 12:{ayah:<4} {status:<40} {elapsed:.1f}s")
        ok += 1

        if ok % 10 == 0:
            out_lines = existing + all_stmts
            SQL_OUT.write_text("\n".join(out_lines), encoding="utf-8")
            print(f"    └─ flushed {len(all_stmts)} stmts → {SQL_OUT.name}")

    out_lines = existing + all_stmts
    SQL_OUT.write_text("\n".join(out_lines), encoding="utf-8")

    print(f"\n{'='*60}")
    print(f"  Done: {ok} ayahs | {total_claims} total claims")
    print(f"  SQL: {len(out_lines)} statements → {SQL_OUT.name}")
    print(f"\n  Deploy:")
    print(f"  wrangler d1 execute km_arabic_linguistic --remote --file {SQL_OUT}")


if __name__ == "__main__":
    main()
