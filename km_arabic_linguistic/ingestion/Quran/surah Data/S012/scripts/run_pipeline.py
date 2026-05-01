#!/usr/bin/env python3
"""
run_pipeline.py — Full S012 extraction pipeline, ruku by ruku.

Orchestrates all extraction layers for Surah 12 in strict ruku order:
  For each ruku (R01 → R12):
    For each ayah in ruku:
      1. sarf  — morphology extraction (spine + Safi + Darwish)
      2. irab  — syntax/grammar extraction (Safi + Darwish)
      3. balagha — rhetoric extraction (Kashshaf + Alusi + Tahrir + Razi + Bahr)

Sentence-structure extraction runs separately (uses Safi DB only, writes to cache/ss/).

Output layout:
  S012/claims/R01/sarf/12_1.json  ... 12_6.json
  S012/claims/R01/irab/12_1.json  ... 12_6.json
  S012/claims/R01/balagha/12_1.json ... 12_6.json
  S012/claims/R02/sarf/12_7.json  ... 12_20.json
  ...

Usage:
    python3 S012/scripts/run_pipeline.py               # process everything missing
    python3 S012/scripts/run_pipeline.py --force        # re-process all
    python3 S012/scripts/run_pipeline.py --ruku 3       # only R03
    python3 S012/scripts/run_pipeline.py --layers sarf,irab   # specific layers
    python3 S012/scripts/run_pipeline.py --dry-run      # show what would run
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, sqlite3, time, urllib.request
from pathlib import Path

BASE       = Path(__file__).resolve().parents[2]       # ingestion/
SURAH_DIR  = Path(__file__).resolve().parents[1]       # S012/
RUKU_DB    = BASE / "../quran-metadata-ruku.sqlite"
SPINE_DB   = BASE / "spine.sqlite"
TAFSIRS    = BASE / "../Tafsirs"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "qwen3:latest")

SURAH = 12
ALL_LAYERS = ["sarf", "irab", "balagha"]

# ── Ruku map ───────────────────────────────────────────────────────────────────
def load_ruku_map() -> list[dict]:
    """Returns list of ruku dicts ordered by surah_ruku_number."""
    cx = sqlite3.connect(RUKU_DB)
    rows = cx.execute(
        "SELECT surah_ruku_number, first_verse_key, last_verse_key, verses_count "
        "FROM ruku WHERE first_verse_key LIKE '12:%' ORDER BY surah_ruku_number"
    ).fetchall()
    cx.close()
    rukus = []
    for rnum, fk, lk, cnt in rows:
        fa = int(fk.split(":")[1]); la = int(lk.split(":")[1])
        rukus.append({
            "ruku": rnum,
            "first_ayah": fa,
            "last_ayah":  la,
            "count":      cnt,
            "ayahs":      list(range(fa, la + 1)),
        })
    return rukus


def ayah_to_ruku(rukus: list[dict]) -> dict[int, int]:
    mp = {}
    for r in rukus:
        for a in r["ayahs"]:
            mp[a] = r["ruku"]
    return mp


# ── Claim file helpers ─────────────────────────────────────────────────────────
def claim_path(layer: str, ayah: int, ruku_num: int) -> Path:
    return SURAH_DIR / f"claims/R{ruku_num:02d}/{layer}/12_{ayah}.json"


def has_claims(layer: str, ayah: int, ruku_num: int) -> bool:
    f = claim_path(layer, ayah, ruku_num)
    if not f.exists(): return False
    try:
        d = json.loads(f.read_text())
        claims = d.get("result", {}).get("claims", [])
        if layer == "balagha" and d.get("source_type") != "direct":
            return False
        return len(claims) > 0
    except Exception:
        return False


# ── HTML strip ─────────────────────────────────────────────────────────────────
_HTML_TAG  = re.compile(r'<[^>]+>')
_MULTI_SPC = re.compile(r'  +')

def strip_html(text: str) -> str:
    if not text: return ""
    text = html.unescape(text)
    text = _HTML_TAG.sub(' ', text)
    return _MULTI_SPC.sub(' ', text).strip()


def load_tafsir(db_name: str, ayah: int, cap: int) -> str:
    db = TAFSIRS / db_name
    if not db.exists(): return ""
    try:
        cx = sqlite3.connect(db)
        row = cx.execute(
            "SELECT text, group_ayah_key FROM tafsir WHERE ayah_key=?",
            (f"{SURAH}:{ayah}",)
        ).fetchone()
        cx.close()
        if not row: return ""
        text, group_key = row
        clean = strip_html(text)
        if len(clean) > 50: return clean[:cap]
        # grouped ayah fallback
        if group_key and group_key != f"{SURAH}:{ayah}":
            cx = sqlite3.connect(db)
            lead = cx.execute(
                "SELECT text FROM tafsir WHERE ayah_key=?", (group_key,)
            ).fetchone()
            cx.close()
            if lead: return strip_html(lead[0])[:cap]
    except Exception:
        pass
    return ""


def load_spine_words(ayah: int) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    rows = cx.execute(
        "SELECT word_index, word_text, root, lemma, pos, morphology_tag "
        "FROM qr_word_occurrences WHERE surah=? AND ayah=? ORDER BY word_index",
        (SURAH, ayah)
    ).fetchall()
    cx.close()
    return [dict(r) for r in rows]


# ── Stable ID ──────────────────────────────────────────────────────────────────
def sv(v) -> str:
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def stable_id(*parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return "AL:SC:" + hashlib.sha1(raw.encode()).hexdigest()[:24]


# ── Per-layer LLM prompts ──────────────────────────────────────────────────────
LAYER_PROMPTS = {
    "sarf": """You extract صرف (morphology) claims for Quranic Arabic.
Given spine morphology data and Safi's irab notes, extract per-word claims.
Return JSON: {"claims":[{"word_index":int,"word_ar":str,"claim_type":str,
"wazn":str,"root":str,"lemma":str,"sigha":str,"pos_detail":str,
"source_note_ar":str,"claim_ar":str,"claim_en":str,
"confidence":str,"needs_review_reason":str}],"warnings":[]}
claim_type options: wazn, ishtiqaq, word_class, sigha, verb_type, mubalaghah, masdar, broken_plural, rule_reference
Extract at least one claim per content word. wazn is most important.""",

    "irab": """You extract إعراب (grammar/syntax) claims for Quranic Arabic.
Given Safi's irab analysis text, extract all grammatical positions and dependencies.
Return JSON: {"claims":[{"word_index":int,"word_ar":str,"claim_type":str,
"source_quote_ar":str,"claim_ar":str,"claim_en":str,"root":str,"lemma":str,
"irab_position":str,"irab_case":str,"confidence":str,"needs_review_reason":str}],"warnings":[]}
claim_type options: irab, taalluq, taqdir, qiraat, ikhtilaf, wajh_irab, semantic_effect, rule_reference, governance
Extract ALL irab positions (مبتدأ، خبر، فاعل، مفعول، حال، تمييز، etc.).""",

    "balagha": """You extract بلاغة (rhetoric) claims for Quranic Arabic.
Given multi-source classical tafsir commentary, extract ALL rhetorical devices.
Return JSON: {"claims":[{"word_index":int,"word_ar":str,"claim_type":str,
"source_name":str,"source_quote_ar":str,"claim_ar":str,"claim_en":str,
"device_branch":str,"device_subtype":str,"root":str,"lemma":str,
"confidence":str,"needs_review_reason":str}],"warnings":[]}
claim_type options: taqdim_takhir, iltifat, hasr_qasr, ijaaz, itnaab, musawat, fasl_wasl, tarif_tankir, ijab_inshaa, tashbih, istiarah, majaz, kinayah, jinas, tibaq, muqabalah, saj, takrar, asloob_hakim, naktah, surah_movement, rule_reference
Extract EVERY rhetorical device mentioned. word_index=0 for ayah-level devices.""",
}

LAYER_OPTIONS = {
    "sarf":    {"temperature": 0.1, "num_predict": 4096, "num_ctx": 8192},
    "irab":    {"temperature": 0.1, "num_predict": 4096},
    "balagha": {"temperature": 0.1, "num_predict": 8192, "num_ctx": 16384},
}

LAYER_TIMEOUT = {"sarf": 300, "irab": 300, "balagha": 1200}


def build_user_msg(layer: str, ayah: int, words: list[dict]) -> str:
    words_list = " ".join(f"[{w['word_index']}]{w['word_text']}" for w in words)

    if layer == "sarf":
        morph = "\n".join(
            f"[{w['word_index']}] {w['word_text']} root={w.get('root','')} "
            f"lemma={w.get('lemma','')} pos={w.get('pos','')} morph={w.get('morphology_tag','')}"
            for w in words
        )
        safi = load_tafsir("al-jadwal-fi-i-rab-al-quran.db", ayah, 3000)
        darwish = load_tafsir("i-rab-al-quran-li-al-darwish.db", ayah, 2000)
        src = f"[Spine Morphology]\n{morph}"
        if safi: src += f"\n\n[Safi]\n{safi}"
        if darwish: src += f"\n\n[Darwish]\n{darwish}"
        return f"SURAH {SURAH}, AYAH {ayah}\n\n{src}"

    if layer == "irab":
        safi = load_tafsir("al-jadwal-fi-i-rab-al-quran.db", ayah, 8000)
        darwish = load_tafsir("i-rab-al-quran-li-al-darwish.db", ayah, 4000)
        src_txt = f"[Safi]\n{safi}" if safi else ""
        if darwish: src_txt += f"\n\n[Darwish]\n{darwish}"
        if not src_txt: return ""
        return (
            f"SURAH {SURAH}, AYAH {ayah}\n"
            f"Words: {words_list}\n\n"
            f"{src_txt}"
        )

    if layer == "balagha":
        SOURCES = [
            ("Kashshaf", "al-kashshaf-al-zamakhshari.db", 6000),
            ("Alusi",    "tafsir-al-alusi.db",             8000),
            ("Tahrir",   "ar-tafseer-tahrir-al-tanwir.db", 6000),
            ("Razi",     "tafsir-al-razi.db",              4000),
            ("BahrMuhit","al-bahr-al-muhit.db",            4000),
        ]
        parts = []
        names = []
        for name, fname, cap in SOURCES:
            t = load_tafsir(fname, ayah, cap)
            if len(t) > 50:
                parts.append(f"[{name}]\n{t}")
                names.append(name)
        if not parts: return ""
        return (
            f"SURAH {SURAH}, AYAH {ayah}\n"
            f"Words: {words_list}\n"
            f"Sources: {', '.join(names)}\n\n"
            + "\n\n".join(parts)
        )
    return ""


def call_llm(layer: str, ayah: int, user_msg: str) -> dict:
    body = json.dumps({
        "model": LLM_MODEL,
        "think": False,
        "stream": False,
        "format": "json",
        "options": LAYER_OPTIONS[layer],
        "messages": [
            {"role": "system", "content": LAYER_PROMPTS[layer]},
            {"role": "user",   "content": user_msg},
        ],
    }).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat", data=body,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=LAYER_TIMEOUT[layer]) as r:
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


def write_claim(layer: str, ayah: int, ruku_num: int, result: dict,
                sources_used: list[str] | None = None):
    f = claim_path(layer, ayah, ruku_num)
    f.parent.mkdir(parents=True, exist_ok=True)
    extras: dict = {}
    if layer == "balagha":
        extras["source_type"] = "direct"
        extras["sources"] = sources_used or []
    out = {"layer": layer, "ayah_key": f"{SURAH}:{ayah}", **extras, "result": result}
    f.write_text(json.dumps(out, ensure_ascii=False, indent=2))


# ── SQL generation ─────────────────────────────────────────────────────────────
SQL_OUT = {
    "sarf":    SURAH_DIR / "sql/s12_al_claims_sarf.sql",
    "irab":    SURAH_DIR / "sql/s12_al_claims_irab.sql",
    "balagha": SURAH_DIR / "sql/s12_al_claims_balagha.sql",
}
_sql_buffer:   dict[str, list[str]] = {l: [] for l in ALL_LAYERS}
_sql_seen_ids: dict[str, set[str]]  = {l: set() for l in ALL_LAYERS}

def _load_existing_sql():
    for layer, path in SQL_OUT.items():
        if path.exists():
            for line in path.read_text().splitlines():
                m = re.search(r"VALUES \('([^']+)'", line)
                if m: _sql_seen_ids[layer].add(m.group(1))

def _flush_sql(layer: str):
    path = SQL_OUT[layer]
    path.parent.mkdir(exist_ok=True)
    existing = path.read_text().splitlines() if path.exists() else []
    path.write_text("\n".join(existing + _sql_buffer[layer]), encoding="utf-8")
    _sql_buffer[layer].clear()

def append_sql(layer: str, ayah: int, result: dict, words: list[dict]):
    source_id = {
        "sarf":    "AL:SOURCE:SARF_DIRECT",
        "irab":    "AL:SOURCE:SAFI_DARWISH",
        "balagha": "AL:SOURCE:MULTI_TAFSIR_BALAGHA",
    }[layer]
    for c in result.get("claims", []):
        wi = c.get("word_index")
        ct = c.get("claim_type", "")
        cid = stable_id(layer, SURAH, ayah, wi, ct, c.get("claim_ar", "")[:40])
        if cid in _sql_seen_ids[layer]: continue
        _sql_seen_ids[layer].add(cid)
        _sql_buffer[layer].append(
            f"INSERT OR IGNORE INTO ar_ling_source_claims "
            f"(id,layer,surah,ayah,word_index,claim_type,source_id,"
            f"source_quote_ar,claim_ar,claim_en,device_branch,device_subtype,"
            f"root,lemma,confidence,needs_review,needs_review_reason,n_source_chunks) "
            f"VALUES ({sv(cid)},{sv(layer)},{SURAH},{ayah},"
            f"{sv(wi)},{sv(ct)},{sv(source_id)},"
            f"{sv((c.get('source_quote_ar') or c.get('source_note_ar',''))[:1500])},"
            f"{sv(c.get('claim_ar','')[:1200])},"
            f"{sv(c.get('claim_en','')[:1200])},"
            f"{sv(c.get('device_branch',''))},"
            f"{sv(c.get('device_subtype') or c.get('wazn',''))},"
            f"{sv(c.get('root',''))},"
            f"{sv(c.get('lemma',''))},"
            f"{sv(c.get('confidence','medium'))},"
            f"{1 if c.get('needs_review_reason') else 0},"
            f"{sv(c.get('needs_review_reason',''))},"
            f"1);"
        )


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="S012 full pipeline, ruku by ruku")
    parser.add_argument("--force",  action="store_true", help="Re-extract even if claims exist")
    parser.add_argument("--ruku",   type=int, default=None, help="Process only this ruku (1-12)")
    parser.add_argument("--layers", default="sarf,irab,balagha",
                        help="Comma-separated layers to run (default: sarf,irab,balagha)")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without running LLM")
    args = parser.parse_args()

    layers = [l.strip() for l in args.layers.split(",") if l.strip() in ALL_LAYERS]
    rukus  = load_ruku_map()
    if args.ruku:
        rukus = [r for r in rukus if r["ruku"] == args.ruku]

    _load_existing_sql()

    print(f"\n{'='*65}")
    print(f"  S012 Pipeline  |  Layers: {', '.join(layers)}  |  Model: {LLM_MODEL}")
    print(f"  Rukus to process: {[r['ruku'] for r in rukus]}")
    print(f"{'='*65}\n")

    grand_ok = 0; grand_claims = 0

    for ruku in rukus:
        rn       = ruku["ruku"]
        ayahs    = ruku["ayahs"]
        n_ayahs  = len(ayahs)

        # Count what's already done
        already = {
            layer: sum(1 for a in ayahs if has_claims(layer, a, rn))
            for layer in layers
        }
        missing = {
            layer: [a for a in ayahs if not has_claims(layer, a, rn)]
            for layer in layers
        }

        print(f"── R{rn:02d}: ayahs {ruku['first_ayah']}→{ruku['last_ayah']} ({n_ayahs} ayahs) ──")
        for layer in layers:
            done = already[layer]
            left = len(missing[layer])
            print(f"   {layer:8s}: {done}/{n_ayahs} done, {left} to process")

        if args.dry_run:
            continue

        for ayah in ayahs:
            words = load_spine_words(ayah)
            if not words:
                print(f"   12:{ayah} — no words in spine, skip")
                continue

            for layer in layers:
                if not args.force and has_claims(layer, ayah, rn):
                    continue

                user_msg = build_user_msg(layer, ayah, words)
                if not user_msg:
                    continue

                t0 = time.time()
                result = call_llm(layer, ayah, user_msg)
                elapsed = time.time() - t0

                n = len(result.get("claims", []))
                warns = result.get("warnings", [])
                grand_claims += n
                grand_ok += 1

                write_claim(layer, ayah, rn, result)
                append_sql(layer, ayah, result, words)

                status = f"✓ {n}" if n > 0 else "○ 0"
                warn_s = f" ⚠{warns[0][:20]}" if warns else ""
                print(f"   12:{ayah:<4} [{layer:8s}] {status}{warn_s:<25} {elapsed:.1f}s")

        # Flush SQL at end of each ruku
        for layer in layers:
            if _sql_buffer[layer]:
                _flush_sql(layer)
                print(f"   └─ flushed SQL for R{rn:02d}")

        print()

    if not args.dry_run:
        for layer in layers:
            _flush_sql(layer)

    print(f"\n{'='*65}")
    print(f"  Done: {grand_ok} extractions | {grand_claims} total claims")
    print(f"\n  SQL files:")
    for layer in layers:
        p = SQL_OUT[layer]
        if p.exists():
            n_stmts = len([l for l in p.read_text().splitlines() if l.startswith("INSERT")])
            print(f"    {layer:8s}: {n_stmts} statements → {p.name}")
    print(f"\n  Deploy:")
    print(f"  wrangler d1 execute km_arabic_linguistic --remote \\")
    print(f"    --file S012/sql/s12_al_claims_sarf.sql --config workers/ar-linguistics/wrangler.toml")


if __name__ == "__main__":
    main()
