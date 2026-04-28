#!/usr/bin/env python3
"""
run_surah_pipeline.py — Generic surah extraction pipeline, ruku by ruku.

This is the canonical pipeline driver for any surah. It runs all layers
(sarf, irab, balagha) for a given surah, ruku by ruku, ayah by ayah.

Prerequisites:
  1. Surah folder must exist: scaffold first with:
     python3 _shared/scaffold_surah.py --surah N
  2. Tafsir DBs must be present in ../Tafsirs/
  3. Spine SQLite must exist at _pipeline/sarf/kmaps-sarf/data/raw/spine/spine.sqlite
  4. Ruku DB at ../quran-metadata-ruku.sqlite

Output:
  S{NNN}/claims/R{r:02d}/{layer}/{surah}_{ayah}.json
  S{NNN}/sql/s{nnn}_al_claims_{layer}.sql

Usage:
    python3 _shared/run_surah_pipeline.py --surah 1
    python3 _shared/run_surah_pipeline.py --surah 114
    python3 _shared/run_surah_pipeline.py --surah 2 --ruku 5
    python3 _shared/run_surah_pipeline.py --surah 12 --layers irab,balagha
    python3 _shared/run_surah_pipeline.py --surah 12 --force
    python3 _shared/run_surah_pipeline.py --surah 3 --dry-run
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, sqlite3, time, urllib.request
from pathlib import Path

BASE    = Path(__file__).resolve().parents[1]   # ingestion/
RUKU_DB = BASE / "../quran-metadata-ruku.sqlite"
TAFSIRS = BASE / "../Tafsirs"
SPINE_DB = BASE / "_pipeline/sarf/kmaps-sarf/data/raw/spine/spine.sqlite"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
LLM_MODEL  = os.getenv("OLLAMA_LLM_MODEL", "qwen3:latest")

ALL_LAYERS = ["sarf", "irab", "balagha"]

_HTML_TAG  = re.compile(r'<[^>]+>')
_MULTI_SPC = re.compile(r'  +')

LAYER_PROMPTS = {
    "sarf": """Extract صرف (morphology) claims for each Quranic word.
Return JSON: {"claims":[{"word_index":int,"word_ar":str,"claim_type":str,
"wazn":str,"root":str,"lemma":str,"sigha":str,"pos_detail":str,
"source_note_ar":str,"claim_ar":str,"claim_en":str,
"confidence":str,"needs_review_reason":str}],"warnings":[]}
claim_type: wazn|ishtiqaq|word_class|sigha|verb_type|mubalaghah|masdar|broken_plural|rule_reference""",

    "irab": """Extract إعراب (grammar/syntax) claims from irab source text.
Return JSON: {"claims":[{"word_index":int,"word_ar":str,"claim_type":str,
"source_quote_ar":str,"claim_ar":str,"claim_en":str,"root":str,"lemma":str,
"irab_position":str,"irab_case":str,"confidence":str,"needs_review_reason":str}],"warnings":[]}
claim_type: irab|taalluq|taqdir|qiraat|ikhtilaf|wajh_irab|semantic_effect|rule_reference|governance""",

    "balagha": """Extract بلاغة (rhetoric) claims from classical tafsir sources.
Return JSON: {"claims":[{"word_index":int,"word_ar":str,"claim_type":str,
"source_name":str,"source_quote_ar":str,"claim_ar":str,"claim_en":str,
"device_branch":str,"device_subtype":str,"root":str,"lemma":str,
"confidence":str,"needs_review_reason":str}],"warnings":[]}
claim_type: taqdim_takhir|iltifat|hasr_qasr|ijaaz|itnaab|musawat|fasl_wasl|tarif_tankir|ijab_inshaa|tashbih|istiarah|majaz|kinayah|jinas|tibaq|muqabalah|saj|takrar|asloob_hakim|naktah|surah_movement|rule_reference
word_index=0 for whole-ayah devices.""",
}

LAYER_OPTIONS = {
    "sarf":    {"temperature": 0.1, "num_predict": 4096, "num_ctx": 8192},
    "irab":    {"temperature": 0.1, "num_predict": 4096},
    "balagha": {"temperature": 0.1, "num_predict": 8192, "num_ctx": 16384},
}

LAYER_TIMEOUT = {"sarf": 300, "irab": 300, "balagha": 1200}

BALAGHA_SOURCES = [
    ("Kashshaf", "al-kashshaf-al-zamakhshari.db",   6000),
    ("Alusi",    "tafsir-al-alusi.db",               8000),
    ("Tahrir",   "ar-tafseer-tahrir-al-tanwir.db",   6000),
    ("Razi",     "tafsir-al-razi.db",                4000),
    ("BahrMuhit","al-bahr-al-muhit.db",              4000),
]


def strip_html(text: str) -> str:
    if not text: return ""
    text = html.unescape(text)
    text = _HTML_TAG.sub(' ', text)
    return _MULTI_SPC.sub(' ', text).strip()


def load_tafsir(db_name: str, surah: int, ayah: int, cap: int) -> str:
    db = TAFSIRS / db_name
    if not db.exists(): return ""
    try:
        cx = sqlite3.connect(db)
        row = cx.execute(
            "SELECT text, group_ayah_key FROM tafsir WHERE ayah_key=?",
            (f"{surah}:{ayah}",)
        ).fetchone()
        cx.close()
        if not row: return ""
        text, gk = row
        clean = strip_html(text)
        if len(clean) > 50: return clean[:cap]
        if gk and gk != f"{surah}:{ayah}":
            cx = sqlite3.connect(db)
            lead = cx.execute("SELECT text FROM tafsir WHERE ayah_key=?", (gk,)).fetchone()
            cx.close()
            if lead: return strip_html(lead[0])[:cap]
    except Exception:
        pass
    return ""


def load_spine_words(surah: int, ayah: int) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    rows = cx.execute(
        "SELECT word_index, word_text, root, lemma, pos, morphology_tag "
        "FROM qr_word_occurrences WHERE surah=? AND ayah=? ORDER BY word_index",
        (surah, ayah)
    ).fetchall()
    cx.close()
    return [dict(r) for r in rows]


def load_rukus(surah: int) -> list[dict]:
    cx = sqlite3.connect(RUKU_DB)
    rows = cx.execute(
        "SELECT surah_ruku_number, first_verse_key, last_verse_key, verses_count "
        "FROM ruku WHERE first_verse_key LIKE ? ORDER BY surah_ruku_number",
        (f"{surah}:%",)
    ).fetchall()
    cx.close()
    result = []
    for rn, fk, lk, cnt in rows:
        fa = int(fk.split(":")[1]); la = int(lk.split(":")[1])
        result.append({"ruku": rn, "first": fa, "last": la,
                       "count": cnt, "ayahs": list(range(fa, la+1))})
    return result


def stable_id(*parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return "AL:SC:" + hashlib.sha1(raw.encode()).hexdigest()[:24]


def sv(v) -> str:
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def build_user_msg(layer: str, surah: int, ayah: int, words: list[dict]) -> str:
    words_list = " ".join(f"[{w['word_index']}]{w['word_text']}" for w in words)

    if layer == "sarf":
        morph = "\n".join(
            f"[{w['word_index']}] {w['word_text']} root={w.get('root','')} "
            f"lemma={w.get('lemma','')} pos={w.get('pos','')} morph={w.get('morphology_tag','')}"
            for w in words
        )
        safi    = load_tafsir("al-jadwal-fi-i-rab-al-quran.db", surah, ayah, 3000)
        darwish = load_tafsir("i-rab-al-quran-li-al-darwish.db", surah, ayah, 2000)
        src = f"[Spine]\n{morph}"
        if safi: src += f"\n\n[Safi]\n{safi}"
        if darwish: src += f"\n\n[Darwish]\n{darwish}"
        return f"SURAH {surah}, AYAH {ayah}\n\n{src}"

    if layer == "irab":
        safi    = load_tafsir("al-jadwal-fi-i-rab-al-quran.db", surah, ayah, 8000)
        darwish = load_tafsir("i-rab-al-quran-li-al-darwish.db", surah, ayah, 4000)
        src = f"[Safi]\n{safi}" if safi else ""
        if darwish: src += f"\n\n[Darwish]\n{darwish}"
        if not src: return ""
        return f"SURAH {surah}, AYAH {ayah}\nWords: {words_list}\n\n{src}"

    if layer == "balagha":
        parts = []; names = []
        for name, fname, cap in BALAGHA_SOURCES:
            t = load_tafsir(fname, surah, ayah, cap)
            if len(t) > 50:
                parts.append(f"[{name}]\n{t}")
                names.append(name)
        if not parts: return ""
        return (
            f"SURAH {surah}, AYAH {ayah}\nWords: {words_list}\n"
            f"Sources: {', '.join(names)}\n\n" + "\n\n".join(parts)
        )
    return ""


def call_llm(layer: str, user_msg: str) -> dict:
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


def claim_path(surah_dir: Path, layer: str, ayah: int, ruku: int,
               n_rukus: int, surah: int) -> Path:
    if n_rukus == 1:
        return surah_dir / f"claims/{layer}/{surah}_{ayah}.json"
    else:
        return surah_dir / f"claims/R{ruku:02d}/{layer}/{surah}_{ayah}.json"


def has_claims(path: Path, layer: str) -> bool:
    if not path.exists(): return False
    try:
        d = json.loads(path.read_text())
        if layer == "balagha" and d.get("source_type") != "direct":
            return False
        return len(d.get("result", {}).get("claims", [])) > 0
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--surah",  type=int, required=True, help="Surah number 1-114")
    parser.add_argument("--ruku",   type=int, default=None, help="Only this ruku number")
    parser.add_argument("--layers", default="sarf,irab,balagha")
    parser.add_argument("--force",  action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    surah  = args.surah
    layers = [l.strip() for l in args.layers.split(",") if l.strip() in ALL_LAYERS]
    rukus  = load_rukus(surah)

    if not rukus:
        print(f"ERROR: no ruku data for surah {surah} in {RUKU_DB}")
        return

    if args.ruku:
        rukus = [r for r in rukus if r["ruku"] == args.ruku]

    n_rukus   = len(load_rukus(surah))  # total rukus for surah (for path logic)
    surah_dir = BASE / f"S{surah:03d}"

    if not surah_dir.exists():
        print(f"ERROR: {surah_dir} does not exist. Run scaffold_surah.py --surah {surah} first.")
        return

    sql_out: dict[str, Path] = {
        layer: surah_dir / f"sql/s{surah:03d}_al_claims_{layer}.sql"
        for layer in layers
    }
    sql_buf:  dict[str, list[str]] = {l: [] for l in layers}
    sql_seen: dict[str, set[str]]  = {l: set() for l in layers}

    # Load existing SQL IDs
    for layer, path in sql_out.items():
        if path.exists():
            for line in path.read_text().splitlines():
                m = re.search(r"VALUES \('([^']+)'", line)
                if m: sql_seen[layer].add(m.group(1))

    print(f"\n{'='*65}")
    print(f"  S{surah:03d} Pipeline  |  Layers: {', '.join(layers)}  |  Model: {LLM_MODEL}")
    print(f"  Rukus: {[r['ruku'] for r in rukus]}  |  Dir: {surah_dir.name}/")
    print(f"{'='*65}\n")

    grand_ok = 0; grand_claims = 0

    for ruku in rukus:
        rn    = ruku["ruku"]
        ayahs = ruku["ayahs"]

        print(f"── R{rn:02d}: {ruku['first']}:{ruku['first']}→{surah}:{ruku['last']} ({ruku['count']} ayahs) ──")

        for layer in layers:
            done = sum(
                1 for a in ayahs
                if has_claims(claim_path(surah_dir, layer, a, rn, n_rukus, surah), layer)
            )
            print(f"   {layer:8s}: {done}/{ruku['count']} done")

        if args.dry_run:
            continue

        for ayah in ayahs:
            words = load_spine_words(surah, ayah)
            if not words:
                continue

            for layer in layers:
                cp = claim_path(surah_dir, layer, ayah, rn, n_rukus, surah)
                if not args.force and has_claims(cp, layer):
                    continue

                user_msg = build_user_msg(layer, surah, ayah, words)
                if not user_msg:
                    continue

                t0 = time.time()
                result = call_llm(layer, user_msg)
                elapsed = time.time() - t0

                n = len(result.get("claims", []))
                warns = result.get("warnings", [])
                grand_claims += n; grand_ok += 1

                # Write claim file
                cp.parent.mkdir(parents=True, exist_ok=True)
                extras = {"source_type": "direct"} if layer == "balagha" else {}
                cp.write_text(json.dumps({
                    "layer": layer, "ayah_key": f"{surah}:{ayah}",
                    **extras, "result": result
                }, ensure_ascii=False, indent=2))

                # Build SQL
                source_id = f"AL:SOURCE:{layer.upper()}_DIRECT"
                for c in result.get("claims", []):
                    wi  = c.get("word_index")
                    ct  = c.get("claim_type", "")
                    cid = stable_id(layer, surah, ayah, wi, ct, c.get("claim_ar", "")[:40])
                    if cid in sql_seen[layer]: continue
                    sql_seen[layer].add(cid)
                    sql_buf[layer].append(
                        f"INSERT OR IGNORE INTO ar_ling_source_claims "
                        f"(id,layer,surah,ayah,word_index,claim_type,source_id,"
                        f"source_quote_ar,claim_ar,claim_en,device_branch,device_subtype,"
                        f"root,lemma,confidence,needs_review,needs_review_reason,n_source_chunks) "
                        f"VALUES ({sv(cid)},{sv(layer)},{surah},{ayah},"
                        f"{sv(wi)},{sv(ct)},{sv(source_id)},"
                        f"{sv((c.get('source_quote_ar') or c.get('source_note_ar',''))[:1500])},"
                        f"{sv(c.get('claim_ar','')[:1200])},"
                        f"{sv(c.get('claim_en','')[:1200])},"
                        f"{sv(c.get('device_branch',''))},"
                        f"{sv(c.get('device_subtype') or c.get('wazn',''))},"
                        f"{sv(c.get('root',''))},{sv(c.get('lemma',''))},"
                        f"{sv(c.get('confidence','medium'))},"
                        f"{1 if c.get('needs_review_reason') else 0},"
                        f"{sv(c.get('needs_review_reason',''))},1);"
                    )

                status = f"✓ {n}" if n > 0 else "○ 0"
                ws = f" ⚠{warns[0][:20]}" if warns else ""
                print(f"   {surah}:{ayah:<4} [{layer:8s}] {status}{ws:<22} {elapsed:.1f}s")

        # Flush SQL at end of each ruku
        for layer in layers:
            if sql_buf[layer]:
                path = sql_out[layer]
                path.parent.mkdir(exist_ok=True)
                existing = path.read_text().splitlines() if path.exists() else []
                path.write_text("\n".join(existing + sql_buf[layer]), encoding="utf-8")
                sql_buf[layer].clear()
                print(f"   └─ flushed {layer} SQL for R{rn:02d}")
        print()

    print(f"\n{'='*65}")
    print(f"  Done: {grand_ok} extractions | {grand_claims} claims")
    for layer in layers:
        p = sql_out[layer]
        if p.exists():
            n = len([l for l in p.read_text().splitlines() if l.startswith("INSERT")])
            print(f"  {layer:8s}: {n} statements → {p.name}")


if __name__ == "__main__":
    main()
