#!/usr/bin/env python3
"""
Direct balagha extraction for S12 using multi-tafsir sources.

Bypasses Qdrant entirely — reads per-ayah text directly from the best
balagha-rich tafsir DBs, concatenates them, feeds to qwen3.

Source priority (balagha richness):
  1. Kashshaf (Zamakhshari)  — premier classical balagha source
  2. Alusi (Ruh al-Ma'ani)   — richest content, 110/111 ayahs, avg 6349 chars
  3. Tahrir (Ibn Ashur)      — must-include, modern scholarly balagha, 67/111
  4. Razi                    — supplement, theological + rhetorical, 57/111
  5. Bahr al-Muhit           — Abu Hayyan, grouped ayahs (resolved via group_ayah_key)

Coverage: 111/111 S12 ayahs (Alusi alone covers 110/111; combined = full)

Usage:
    python3 s12/scripts/extract_balagha.py
    python3 s12/scripts/extract_balagha.py --force    # re-run all
    python3 s12/scripts/extract_balagha.py --ayah 43  # single ayah
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, sqlite3, time, urllib.request
from pathlib import Path

BASE       = Path(__file__).resolve().parents[2]       # ingestion/
SURAH_DIR  = Path(__file__).resolve().parents[1]       # S012/
TAFSIRS    = BASE / "../Tafsirs"
SPINE_DB   = BASE / "spine.sqlite"
RUKU_DB    = BASE / "../quran-metadata-ruku.sqlite"
SQL_OUT    = SURAH_DIR / "sql/s12_al_claims_balagha.sql"

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
    return SURAH_DIR / f"claims/R{ruku:02d}/balagha"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "qwen3:latest")

HTML_TAG  = re.compile(r'<[^>]+>')
MULTI_SPC = re.compile(r'  +')

# Source DBs in priority order for balagha
# Caps are per-source; total target ~18K chars / ~4.5K tokens to leave room for output
BALAGHA_SOURCES = [
    ("Kashshaf",      "al-kashshaf-al-zamakhshari.db",   6000),
    ("Alusi",         "tafsir-al-alusi.db",              8000),
    ("Tahrir",        "ar-tafseer-tahrir-al-tanwir.db",  6000),
    ("Razi",          "tafsir-al-razi.db",               4000),
    ("Bahr_Muhit",    "al-bahr-al-muhit.db",             4000),
]

BALAGHA_TYPES = [
    "taqdim_takhir","iltifat","hasr_qasr","ijaaz","itnaab","musawat",
    "tashbih","istiarah","majaz","kinayah",
    "jinas","tibaq","muqabalah","saj","takrar",
    "asloob_hakim","naktah","surah_movement",
    "fasl_wasl","tarif_tankir","ijab_inshaa",
    "rule_reference",
]

BALAGHA_NORM = {
    "maani":"ijaaz","معاني":"ijaaz","بديع":"jinas","جناس":"jinas",
    "badi:jinas":"jinas","bayan":"tashbih","مقابلة":"muqabalah",
    "التفات":"iltifat","حصر/قصر (hasr_qasr)":"hasr_qasr",
    "hasr":"hasr_qasr","qasr":"hasr_qasr","qosr":"hasr_qasr",
    "takhsis":"hasr_qasr","ikhtisas":"hasr_qasr",
    "itnab":"itnaab","إطناب":"itnaab","إيجاز":"ijaaz",
    "تشبيه":"tashbih","استعارة":"istiarah","كناية":"kinayah",
    "مجاز":"majaz","طباق":"tibaq","سجع":"saj","تكرار":"takrar",
    "حسن التعليل":"asloob_hakim","تأكيد":"naktah","مبالغة":"naktah",
    "tajnis":"jinas","tibaq_ijabi":"tibaq","tibaq_salbi":"tibaq",
    "muaqabalah":"muqabalah","muqabelah":"muqabalah",
    "tawriya":"majaz","iqtibas":"rule_reference",
    "surah movement":"surah_movement","narrative":"surah_movement",
    "use_of_إِنَّ_for_emphasis":"naktah",
}

SYSTEM_PROMPT = """You are extracting بلاغة (Quranic rhetoric/stylistics) claims for K-Maps.

Given multi-source classical tafsir commentary for ONE Quranic ayah, extract ALL rhetorical devices.

Return ONLY valid JSON:
{
  "claims": [
    {
      "word_index": int,          // 1-based word position; use 0 for ayah-level devices
      "word_ar": string,          // the Arabic word or phrase (key focus of the device)
      "claim_type": string,       // MUST be exactly one of the types below
      "source_name": string,      // which source this comes from: Kashshaf|Alusi|Tahrir|Razi|Bahr_Muhit
      "source_quote_ar": string,  // exact excerpt from that source text
      "claim_ar": string,         // full Arabic explanation of the device
      "claim_en": string,         // English translation/explanation
      "device_branch": string,    // "maani"|"bayan"|"badi"|"other"
      "device_subtype": string,   // specific subtype or ""
      "root": string,             // Arabic root (or "")
      "lemma": string,            // Arabic lemma (or "")
      "confidence": string,       // "high"|"medium"|"low"
      "needs_review_reason": string  // "" if none
    }
  ],
  "warnings": []
}

Valid claim_types:
  maani branch  : taqdim_takhir, iltifat, hasr_qasr, ijaaz, itnaab, fasl_wasl, tarif_tankir, ijab_inshaa, musawat
  bayan branch  : tashbih, istiarah, majaz, kinayah
  badi branch   : jinas, tibaq, muqabalah, saj, takrar
  other         : asloob_hakim, naktah, surah_movement, rule_reference

Rules:
- Extract EVERY rhetorical device mentioned in the sources — be thorough
- source_quote_ar must be a real substring from the specific source text provided
- If the same device appears in multiple sources, create ONE claim per device (best source)
- DO NOT extract irab/grammar or morphology
- word_index = 0 for devices that span the whole ayah or multiple words
- Multiple devices per ayah is normal; extract all of them
"""


def strip_html(text: str) -> str:
    if not text: return ""
    text = html.unescape(text)
    text = HTML_TAG.sub(' ', text)
    return MULTI_SPC.sub(' ', text).strip()


def load_tafsir_for_ayah(db_path: Path, ayah: int, cap: int) -> str:
    """Load per-ayah text from a tafsir DB, resolving Bahr-style grouping."""
    try:
        cx = sqlite3.connect(db_path)
        row = cx.execute(
            "SELECT text, group_ayah_key FROM tafsir WHERE ayah_key=?",
            (f"12:{ayah}",)
        ).fetchone()
        cx.close()
    except Exception:
        return ""
    if not row:
        return ""
    text, group_key = row
    clean = strip_html(text)
    if len(clean) > 50:
        return clean[:cap]
    # Empty → grouped ayah; resolve via group lead
    if group_key and group_key != f"12:{ayah}":
        try:
            cx = sqlite3.connect(db_path)
            lead = cx.execute(
                "SELECT text FROM tafsir WHERE ayah_key=?", (group_key,)
            ).fetchone()
            cx.close()
            if lead:
                return strip_html(lead[0])[:cap]
        except Exception:
            pass
    return ""


def build_source_block(ayah: int) -> tuple[str, list[str]]:
    """Concatenate all balagha sources for one ayah."""
    parts = []
    names_used = []
    for name, fname, cap in BALAGHA_SOURCES:
        db = TAFSIRS / fname
        if not db.exists():
            continue
        text = load_tafsir_for_ayah(db, ayah, cap)
        if len(text) > 50:
            parts.append(f"[{name}]\n{text}")
            names_used.append(name)
    return "\n\n".join(parts), names_used


def load_spine_words(ayah: int) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    rows = cx.execute(
        "SELECT word_index, word_text, root, lemma FROM qr_word_occurrences "
        "WHERE surah=12 AND ayah=? ORDER BY word_index", (ayah,)
    ).fetchall()
    cx.close()
    return [dict(r) for r in rows]


def stable_id(*parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return "AL:SC:" + hashlib.sha1(raw.encode()).hexdigest()[:24]


def sv(v) -> str:
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def normalize_type(ct: str) -> str:
    ct = (ct or "").strip()
    if ct in BALAGHA_TYPES:
        return ct
    return BALAGHA_NORM.get(ct, BALAGHA_NORM.get(ct.lower(), "naktah"))


def already_has_claims(ayah: int) -> bool:
    f = claims_dir(ayah) / f"12_{ayah}.json"
    if not f.exists():
        return False
    try:
        d = json.loads(f.read_text())
        # Only count as done if it has real direct-source claims
        if d.get("source_type") != "direct":
            return False
        return len(d.get("result", {}).get("claims", [])) > 0
    except Exception:
        return False


def call_llm(ayah: int, words: list[dict], source_block: str, sources_used: list[str]) -> dict:
    words_list = " ".join(f"[{w['word_index']}]{w['word_text']}" for w in words)
    user_msg = (
        f"SURAH 12, AYAH {ayah}\n"
        f"Ayah words (1-based index): {words_list}\n\n"
        f"Sources available: {', '.join(sources_used)}\n\n"
        f"--- Classical Tafsir commentary (balagha-rich) ---\n"
        f"{source_block}"
    )
    body = json.dumps({
        "model": LLM_MODEL,
        "think": False,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 8192, "num_ctx": 16384},
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
        with urllib.request.urlopen(req, timeout=1200) as r:
            resp = json.loads(r.read())
        content = resp.get("message", {}).get("content", "")
        done_reason = resp.get("done_reason", "")
    except Exception as e:
        return {"claims": [], "warnings": [f"LLM error: {e}"]}
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    # Try direct parse
    try:
        return json.loads(content)
    except Exception:
        pass
    # Try to extract largest JSON object
    m = re.search(r"\{.*\}", content, re.DOTALL)
    if m:
        candidate = m.group()
        try:
            return json.loads(candidate)
        except Exception:
            # Try trimming at last complete claim entry
            last_close = candidate.rfind('}', 0, len(candidate)-1)
            if last_close > 0:
                # Find enclosing claims array close
                trunc = candidate[:last_close+1]
                # Attempt to close the claims array and object
                for suffix in [']}', ']\n}', ']\n  }\n}']:
                    try:
                        return json.loads(trunc + suffix)
                    except Exception:
                        pass
    warn = f"JSON parse failed (done_reason={done_reason})" if done_reason else "JSON parse failed"
    return {"claims": [], "warnings": [warn]}


def write_claim_file(ayah: int, result: dict, sources_used: list[str]):
    d = claims_dir(ayah)
    d.mkdir(parents=True, exist_ok=True)
    # Normalize claim types
    for c in result.get("claims", []):
        c["claim_type"] = normalize_type(c.get("claim_type", ""))
    out = {
        "layer": "balagha",
        "ayah_key": f"12:{ayah}",
        "source_type": "direct",
        "sources": sources_used,
        "result": result,
    }
    (d / f"12_{ayah}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2)
    )


def claims_to_sql(ayah: int, words: list[dict], result: dict, sources_used: list[str]) -> list[str]:
    stmts = []
    source_id = "AL:SOURCE:MULTI_TAFSIR_BALAGHA"
    for c in result.get("claims", []):
        wi = c.get("word_index")
        word_row = next((w for w in words if w.get("word_index") == wi), None)
        word_id = word_row.get("id") if word_row else None
        ct = normalize_type(c.get("claim_type", ""))
        cid = stable_id("balagha", 12, ayah, wi, ct, c.get("claim_ar", "")[:40])
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_source_claims "
            f"(id,layer,surah,ayah,word_id,word_index,claim_type,source_id,"
            f"source_quote_ar,claim_ar,claim_en,device_branch,device_subtype,"
            f"root,lemma,quran_ref,confidence,needs_review,needs_review_reason,"
            f"n_source_chunks) VALUES ("
            f"{sv(cid)},'balagha',12,{ayah},"
            f"{sv(word_id)},{sv(wi)},{sv(ct)},"
            f"{sv(source_id)},"
            f"{sv(c.get('source_quote_ar','')[:1500])},"
            f"{sv(c.get('claim_ar','')[:1200])},"
            f"{sv(c.get('claim_en','')[:1200])},"
            f"{sv(c.get('device_branch',''))},"
            f"{sv(c.get('device_subtype',''))},"
            f"{sv(c.get('root',''))},"
            f"{sv(c.get('lemma',''))},"
            f"NULL,"
            f"{sv(c.get('confidence','medium'))},"
            f"{1 if c.get('needs_review_reason') else 0},"
            f"{sv(c.get('needs_review_reason',''))},"
            f"{len(sources_used)});"
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
    print(f"  S12 Balagha Direct Extraction (Multi-Tafsir)")
    print(f"  Model: {LLM_MODEL}")
    print(f"  Sources: Kashshaf + Alusi + Tahrir (Ibn Ashur) + Razi + Bahr al-Muhit")
    print(f"  To process: {len(to_process)} ayahs")
    print(f"{'='*60}\n")

    SQL_OUT.parent.mkdir(exist_ok=True)

    # Load existing SQL to preserve already-extracted claims from other layers
    if SQL_OUT.exists():
        existing = [l for l in SQL_OUT.read_text().splitlines() if l.strip()]
    else:
        existing = []
    seen_ids: set[str] = set()
    for line in existing:
        m = re.search(r"VALUES \('([^']+)'", line)
        if m: seen_ids.add(m.group(1))

    all_stmts: list[str] = []
    ok = 0; total_claims = 0; total_zero = 0

    for i, ayah in enumerate(to_process):
        source_block, sources_used = build_source_block(ayah)
        if not source_block:
            print(f"  [{i+1}/{len(to_process)}] 12:{ayah:<4} — no source content, skip")
            continue

        words = load_spine_words(ayah)
        if not words:
            print(f"  [{i+1}/{len(to_process)}] 12:{ayah:<4} — no words in spine, skip")
            continue

        t0 = time.time()
        result = call_llm(ayah, words, source_block, sources_used)
        elapsed = time.time() - t0

        n_claims = len(result.get("claims", []))
        total_claims += n_claims
        if n_claims == 0: total_zero += 1
        warns = result.get("warnings", [])

        write_claim_file(ayah, result, sources_used)

        new_stmts = claims_to_sql(ayah, words, result, sources_used)
        for stmt in new_stmts:
            m = re.search(r"VALUES \('([^']+)'", stmt)
            if m and m.group(1) not in seen_ids:
                all_stmts.append(stmt)
                seen_ids.add(m.group(1))

        src_label = "+".join(sources_used[:2]) + (f"+{len(sources_used)-2}more" if len(sources_used) > 2 else "")
        status = f"✓ {n_claims} claims [{src_label}]"
        if warns: status += f" ⚠ {warns[0][:25]}"
        print(f"  [{i+1}/{len(to_process)}] 12:{ayah:<4} {status:<55} {elapsed:.1f}s")
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
    print(f"  Done: {ok} ayahs | {total_claims} total claims | {total_zero} zero-claim ayahs")
    print(f"  SQL: {len(out_lines)} statements → {SQL_OUT.name}")


if __name__ == "__main__":
    main()
