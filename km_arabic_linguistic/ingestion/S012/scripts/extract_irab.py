#!/usr/bin/env python3
"""
Direct irab extraction for S12 using Safi + Darwish DB content.

Bypasses Qdrant entirely — reads per-ayah text directly from the two
irab source DBs, feeds it to qwen3, writes claims + SQL.

Coverage:
  Safi   → 111/111 ayahs (full coverage)
  Darwish→ supplement only (used when Safi has <30 chars of content)
  Run with --force to re-extract all ayahs (replaces old Qdrant-based claims)

Usage:
    python3 s12/scripts/extract_irab.py
    python3 s12/scripts/extract_irab.py --force   # re-run even if claims exist
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, sqlite3, time, urllib.request
from pathlib import Path

BASE       = Path(__file__).resolve().parents[2]       # ingestion/
SURAH_DIR  = Path(__file__).resolve().parents[1]       # S012/
SAFI_DB    = BASE / "../Tafsirs/al-jadwal-fi-i-rab-al-quran.db"
DARWISH_DB = BASE / "../Tafsirs/i-rab-al-quran-li-al-darwish.db"
SPINE_DB   = BASE / "_pipeline/sarf/kmaps-sarf/data/raw/spine/spine.sqlite"
RUKU_DB    = BASE / "../quran-metadata-ruku.sqlite"
SQL_OUT    = SURAH_DIR / "sql/s12_al_claims_irab.sql"

# ── Ruku map: ayah → surah_ruku_number ────────────────────────────────────────
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
    return SURAH_DIR / f"claims/R{ruku:02d}/irab"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "qwen3:latest")

HTML_TAG  = re.compile(r'<[^>]+>')
MULTI_SPC = re.compile(r'  +')

IRAB_TYPES = [
    "irab","taalluq","taqdir","qiraat","ikhtilaf","wajh_irab",
    "semantic_effect","rule_reference","governance",
]

SYSTEM_PROMPT = """You are extracting إعراب (Quranic grammar/syntax) claims from classical Arabic irab sources.

Given the source irab text for ONE Quranic ayah, extract structured claims.

Return ONLY valid JSON:
{
  "claims": [
    {
      "word_index": int,          // 1-based position of the word in the ayah
      "word_ar": string,          // the Arabic word (from source)
      "claim_type": string,       // MUST be one of: irab, taalluq, taqdir, qiraat, ikhtilaf, wajh_irab, semantic_effect, rule_reference, governance
      "source_quote_ar": string,  // exact excerpt from the provided source text
      "claim_ar": string,         // full Arabic explanation
      "claim_en": string,         // English translation of the claim
      "root": string,             // Arabic root (or "")
      "lemma": string,            // Arabic lemma (or "")
      "irab_position": string,    // Arabic grammatical position: مبتدأ، خبر، فاعل، مفعول به، حال، نعت، مجرور، etc.
      "irab_case": string,        // مرفوع، منصوب، مجرور، مجزوم (or "")
      "confidence": string,       // "high"|"medium"|"low"
      "needs_review_reason": string  // "" if none
    }
  ],
  "warnings": []
}

Rules:
- Extract ALL irab positions mentioned in the source (مبتدأ، خبر، فاعل، مفعول به، حال، تمييز، نعت، مجرور، مجزوم، etc.)
- word_index maps to the word's 1-based position in the ayah word list provided
- source_quote_ar must be a real substring of the provided source text
- If multiple analyses exist (ikhtilaf), create one claim per analysis
- Do NOT extract morphology or rhetoric
- Extract AS MANY claims as the source supports — be thorough
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

def load_source_db(db_path: Path) -> dict[int, str]:
    cx = sqlite3.connect(db_path)
    rows = cx.execute(
        "SELECT ayah_key, text FROM tafsir WHERE ayah_key LIKE '12:%'"
    ).fetchall()
    cx.close()
    result = {}
    for ayah_key, text in rows:
        clean = strip_html(text)
        if len(clean) > 30:
            try:
                ayah_num = int(ayah_key.split(":")[1])
                result[ayah_num] = clean[:30000]  # D1 safe cap
            except (ValueError, IndexError):
                pass
    return result

def load_spine_words(ayah: int) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    rows = cx.execute(
        "SELECT word_index, word_text, root, lemma FROM qr_word_occurrences "
        "WHERE surah=12 AND ayah=? ORDER BY word_index", (ayah,)
    ).fetchall()
    cx.close()
    return [dict(r) for r in rows]

def already_has_claims(ayah: int) -> bool:
    f = claims_dir(ayah) / f"12_{ayah}.json"
    if not f.exists(): return False
    try:
        d = json.loads(f.read_text())
        return len(d.get("result", {}).get("claims", [])) > 0
    except Exception:
        return False

def call_llm(ayah: int, words: list[dict], source_text: str, source_name: str) -> dict:
    words_list = " ".join(f"[{w['word_index']}]{w['word_text']}" for w in words)
    user_msg = (
        f"SURAH 12, AYAH {ayah}\n"
        f"Ayah words (1-based index): {words_list}\n\n"
        f"Source ({source_name}) irab analysis:\n{source_text}"
    )
    body = json.dumps({
        "model": LLM_MODEL,
        "think": False,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 4096},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
    }).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
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

def write_claim_file(ayah: int, result: dict, source_name: str):
    d = claims_dir(ayah)
    d.mkdir(parents=True, exist_ok=True)
    out = {
        "layer": "irab",
        "ayah_key": f"12:{ayah}",
        "source": source_name,
        "result": result,
    }
    (d / f"12_{ayah}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2)
    )

def claims_to_sql(ayah: int, words: list[dict], result: dict, source_name: str) -> list[str]:
    stmts = []
    source_id = f"AL:SOURCE:{source_name.upper().replace(' ','_')}"
    for c in result.get("claims", []):
        wi = c.get("word_index")
        word_row = next((w for w in words if w.get("word_index") == wi), None)
        word_id = word_row.get("id") if word_row else None
        cid = stable_id("irab", 12, ayah, wi, c.get("claim_type",""), c.get("claim_ar","")[:40])
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_source_claims "
            f"(id,layer,surah,ayah,word_id,word_index,claim_type,source_id,"
            f"source_quote_ar,claim_ar,claim_en,device_branch,device_subtype,"
            f"root,lemma,quran_ref,confidence,needs_review,needs_review_reason,"
            f"n_source_chunks) VALUES ("
            f"{sv(cid)},'irab',12,{ayah},"
            f"{sv(word_id)},{sv(wi)},{sv(c.get('claim_type','irab'))},"
            f"{sv(source_id)},"
            f"{sv(c.get('source_quote_ar','')[:1500])},"
            f"{sv(c.get('claim_ar','')[:1200])},"
            f"{sv(c.get('claim_en','')[:1200])},"
            f"NULL,NULL,"
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
    args = parser.parse_args()

    safi    = load_source_db(SAFI_DB)
    darwish = load_source_db(DARWISH_DB)

    # Build ayah → (source_text, source_name) map — Safi preferred
    sources: dict[int, tuple[str, str]] = {}
    for ayah, text in darwish.items():
        sources[ayah] = (text, "Darwish")
    for ayah, text in safi.items():
        sources[ayah] = (text, "Safi")  # Safi overwrites Darwish

    to_process = sorted(sources.keys())
    if not args.force:
        to_process = [a for a in to_process if not already_has_claims(a)]

    print(f"\n{'='*60}")
    print(f"  S12 Irab Direct Extraction (Safi + Darwish)")
    print(f"  Model: {LLM_MODEL}")
    print(f"  Source coverage: Safi={len(safi)} Darwish={len(darwish)}")
    print(f"  To process: {len(to_process)} ayahs")
    print(f"  No source (skip): {111 - len(sources)} ayahs")
    print(f"{'='*60}\n")

    SQL_OUT.parent.mkdir(exist_ok=True)
    all_stmts: list[str] = []

    # Load existing SQL to preserve already-extracted claims
    if SQL_OUT.exists():
        existing = [l for l in SQL_OUT.read_text().splitlines() if l.strip()]
    else:
        existing = []
    seen_ids: set[str] = set()
    for line in existing:
        m = re.search(r"VALUES \('([^']+)'", line)
        if m: seen_ids.add(m.group(1))

    ok = 0; total_claims = 0

    for i, ayah in enumerate(to_process):
        source_text, source_name = sources[ayah]
        words = load_spine_words(ayah)
        if not words:
            print(f"  [{i+1}/{len(to_process)}] 12:{ayah} — no words in spine, skip")
            continue

        t0 = time.time()
        result = call_llm(ayah, words, source_text, source_name)
        elapsed = time.time() - t0

        n_claims = len(result.get("claims", []))
        total_claims += n_claims
        warns = result.get("warnings", [])

        write_claim_file(ayah, result, source_name)

        new_stmts = claims_to_sql(ayah, words, result, source_name)
        for stmt in new_stmts:
            m = re.search(r"VALUES \('([^']+)'", stmt)
            if m and m.group(1) not in seen_ids:
                all_stmts.append(stmt)
                seen_ids.add(m.group(1))

        status = f"✓ {n_claims} claims [{source_name}]"
        if warns: status += f" ⚠ {warns[0][:30]}"
        print(f"  [{i+1}/{len(to_process)}] 12:{ayah:<4} {status:<45} {elapsed:.1f}s")
        ok += 1

        # Flush every 10 ayahs
        if ok % 10 == 0:
            out_lines = existing + all_stmts
            SQL_OUT.write_text("\n".join(out_lines), encoding="utf-8")
            print(f"    └─ flushed {len(all_stmts)} new stmts → {SQL_OUT.name}")

    # Final flush
    out_lines = existing + all_stmts
    SQL_OUT.write_text("\n".join(out_lines), encoding="utf-8")

    print(f"\n{'='*60}")
    print(f"  Done: {ok} ayahs | {total_claims} total claims")
    print(f"  SQL: {len(out_lines)} statements → {SQL_OUT.name}")
    print(f"  No-source ayahs (need other sources): {sorted(set(range(1,112)) - set(sources.keys()))}")

if __name__ == "__main__":
    main()
