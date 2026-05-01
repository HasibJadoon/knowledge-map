#!/usr/bin/env python3
"""
surah_pipeline.py — Complete per-surah ingestion pipeline.

Runs end-to-end for any surah:
  Step 1: Check prerequisites (Ollama, model, spine DB, wrangler)
  Step 2: Run LLM extraction — sarf, irab, balagha (local Ollama)
  Step 3: Generate seed SQL for all tables
  Step 4: Deploy to Cloudflare D1

Usage:
    python3 _shared/surah_pipeline.py --surah 12
    python3 _shared/surah_pipeline.py --surah 12 --skip-extract   # skip LLM step
    python3 _shared/surah_pipeline.py --surah 12 --skip-deploy    # don't push to D1
    python3 _shared/surah_pipeline.py --surah 12 --workers 5      # parallel extraction
    python3 _shared/surah_pipeline.py --surah 12 --model qwen3    # override LLM model

Environment (auto-loaded from .env):
    OLLAMA_LLM_MODEL     default: qwen2.5:32b
    OLLAMA_URL           default: http://127.0.0.1:11434
    USE_OLLAMA           default: 1  (set 0 to use OpenAI instead)
    OPENAI_API_KEY       only needed if USE_OLLAMA=0
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

# ── Base paths ─────────────────────────────────────────────────────────────────
BASE   = Path(__file__).resolve().parent.parent   # ingestion/
SHARED = Path(__file__).resolve().parent          # ingestion/_shared/

LAYER_DIRS = {
    "sarf":    BASE / "_pipeline/sarf/kmaps-sarf",
    "irab":    BASE / "_pipeline/irab/kmaps-irab",
    "balagha": BASE / "_pipeline/balagha/kmaps-balagha",
}
SPINE_DB = BASE / "spine.sqlite"
WRANGLER_CONFIGS = {
    "km_arabic_linguistic": str(BASE.parent.parent / "workers/ar-linguistics/wrangler.toml"),
    "km_quran":             str(BASE.parent.parent / "workers/quran/wrangler.toml"),
}

# ── Load .env ──────────────────────────────────────────────────────────────────
for _env in [LAYER_DIRS["sarf"] / ".env", BASE.parent / ".env"]:
    if _env.exists():
        for _line in _env.read_text(encoding="utf-8-sig").splitlines():
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                k, v = _line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'\""))
        break

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
DEFAULT_MODEL = "qwen2.5:32b"

# ── Colours ────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"; BLUE = "\033[94m"; RESET = "\033[0m"; BOLD = "\033[1m"
def ok(msg):   print(f"  {GREEN}✓{RESET} {msg}")
def warn(msg): print(f"  {YELLOW}⚠{RESET}  {msg}")
def err(msg):  print(f"  {RED}✗{RESET} {msg}")
def step(n, msg): print(f"\n{BOLD}{BLUE}── Step {n}: {msg}{RESET}")
def info(msg): print(f"    {msg}")


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: Prerequisites check
# ══════════════════════════════════════════════════════════════════════════════
def check_prerequisites(args) -> bool:
    step(1, "Checking prerequisites")
    ok_all = True

    # Spine DB
    if SPINE_DB.exists():
        ok(f"Spine DB: {SPINE_DB}")
    else:
        err(f"Spine DB missing: {SPINE_DB}"); ok_all = False

    # Ollama
    model = args.model or os.getenv("OLLAMA_LLM_MODEL", DEFAULT_MODEL)
    use_ollama = os.getenv("USE_OLLAMA", "1") != "0"

    if use_ollama:
        try:
            req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
            with urllib.request.urlopen(req, timeout=5) as r:
                tags = json.loads(r.read())
            installed = [m["name"] for m in tags.get("models", [])]
            if any(m.startswith(model.split(":")[0]) for m in installed):
                ok(f"Ollama model '{model}' available")
            else:
                warn(f"Model '{model}' not installed. Installed: {installed}")
                warn(f"Run: ollama pull {model}")
                # Try fallback
                fallback = next((m for m in installed if "qwen" in m.lower()), None)
                if fallback:
                    warn(f"Will use fallback: {fallback}")
                    args.model = fallback
                else:
                    ok_all = False
        except Exception as e:
            err(f"Ollama not running at {OLLAMA_URL}: {e}")
            if os.getenv("OPENAI_API_KEY"):
                warn("Falling back to OpenAI")
                os.environ["USE_OLLAMA"] = "0"
            else:
                ok_all = False
    else:
        if os.getenv("OPENAI_API_KEY"):
            ok("OpenAI API key set")
        else:
            err("USE_OLLAMA=0 but OPENAI_API_KEY not set"); ok_all = False

    # Wrangler (optional — skip-deploy works without it)
    if not args.skip_deploy:
        try:
            result = subprocess.run(["wrangler", "whoami"], capture_output=True, text=True, timeout=15)
            if "Not logged in" in result.stderr:
                warn("Wrangler not logged in — run `wrangler login` before deploy step")
                warn("Continuing; deploy step will fail gracefully")
            else:
                ok("Wrangler authenticated")
        except FileNotFoundError:
            warn("wrangler not found in PATH — deploy step will be skipped")
            args.skip_deploy = True

    # S12 words in spine
    cx = sqlite3.connect(SPINE_DB)
    n = cx.execute("SELECT COUNT(*) FROM qr_word_occurrences WHERE surah=?", (args.surah,)).fetchone()[0]
    cx.close()
    if n > 0:
        ok(f"Surah {args.surah}: {n} words in spine")
    else:
        err(f"Surah {args.surah} not found in spine DB"); ok_all = False

    return ok_all


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: LLM Extraction (sarf / irab / balagha)
# ══════════════════════════════════════════════════════════════════════════════
def run_extraction(args):
    step(2, f"LLM extraction — surah {args.surah} — model: {args.model or os.getenv('OLLAMA_LLM_MODEL', DEFAULT_MODEL)}")

    env = os.environ.copy()
    if args.model:
        env["OLLAMA_LLM_MODEL"] = args.model

    extractor = SHARED / "extract_layer.py"
    scope = f"S{args.surah}"
    procs = []

    for layer in ["sarf", "irab", "balagha"]:
        claims_dir = BASE / f"S{args.surah:03d}/claims/{layer}"
        claims_dir.mkdir(parents=True, exist_ok=True)
        log_dir = Path.home() / "Library/Logs/kmaps-extract"
        log_dir.mkdir(parents=True, exist_ok=True)

        for wid in range(args.workers):
            log_file = log_dir / f"s{args.surah}-{layer}-w{wid}.log"
            cmd = [
                sys.executable, str(extractor),
                "--layer", layer,
                "--scope", scope,
                "--workers", str(args.workers),
                "--worker-id", str(wid),
            ]
            with open(log_file, "a") as lf:
                p = subprocess.Popen(cmd, stdout=lf, stderr=lf, env=env)
                procs.append((layer, wid, p, log_file))
            info(f"{layer} worker {wid} started (PID={p.pid})  log: {log_file.name}")

    # Monitor until all done
    info(f"\nWaiting for {len(procs)} workers to complete...")
    t0 = time.time()
    while procs:
        time.sleep(10)
        still_running = []
        for layer, wid, p, lf in procs:
            if p.poll() is None:
                still_running.append((layer, wid, p, lf))
            else:
                elapsed = int(time.time() - t0)
                if p.returncode == 0:
                    ok(f"{layer} w{wid} done ({elapsed}s)")
                else:
                    err(f"{layer} w{wid} exited with code {p.returncode}")
        procs = still_running
        if still_running:
            elapsed = int(time.time() - t0)
            remaining = len(still_running)
            info(f"  {remaining} workers still running... ({elapsed}s elapsed)")

    ok("All extraction workers finished")


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3: Generate seed SQL
# ══════════════════════════════════════════════════════════════════════════════
def sha1(prefix, *parts):
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode()).hexdigest()[:24]

def sv(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (dict, list)): return "'" + json.dumps(v, ensure_ascii=False).replace("'","''") + "'"
    return "'" + str(v).replace("'","''") + "'"

VALID_BALAGHA = {
    "taqdim_takhir","iltifat","hasr_qasr","ijaaz","itnaab","musawat",
    "tashbih","istiarah","majaz","kinayah","jinas","tibaq","muqabalah",
    "saj","takrar","asloob_hakim","naktah","surah_movement",
    "fasl_wasl","tarif_tankir","ijab_inshaa","rule_reference"
}
VALID_IRAB  = {"irab","taalluq","taqdir","qiraat_irab","ikhtilaf_irab","wajh_irab","semantic_effect","rule_reference","dirasat_note"}
VALID_SARF  = {
    "root_core","root_image","root_extension","derived_family","sarf_pattern",
    "verb_form","form_flavour","masdar","participle","noun_type","weak_root",
    "hamzated_root","doubled_root","inflection","qiraat_morph_variant",
    "idiomatic_meaning","verb_preposition_frame","tadmeen_frame",
    "antonym_relation","near_synonym_sarf_difference","translation_loss",
    "academic_key_term_note",
}
BALAGHA_NORM = {
    "maani":"ijaaz","معاني":"ijaaz","بديع":"jinas","جناس":"jinas","badi:jinas":"jinas",
    "bayan":"tashbih","بيان":"tashbih","مقابلة":"muqabalah","badi":"tibaq","ijaz":"ijaaz",
    "muaqabalah":"muqabalah","mucabalah":"muqabalah","mukabalah / parallelism":"muqabalah",
    "tibaq / muqabalah (antithesis / contrast)":"tibaq","طباق/مقابلة":"tibaq",
    "مقابلة/طباق (سنابل خضر ويابسات)":"muqabalah",
    "التفات":"iltifat","iltifat (shift in address / vocative)":"iltifat",
    "الالتفات (التبدّل في المتكلم / إلتفات)":"iltifat",
    "حصر/قصر (hasr_qasr)":"hasr_qasr","تشبيه / تصوير مجازي":"tashbih",
    "استعارة/تشخيص (تجسيد النفس كفاعل)":"istiarah",
    "أسلوب حكيم / حركة السرد":"asloob_hakim","أسلوب حكيم (استئناف بياني)":"asloob_hakim",
    "أسلوب إنشائي / أسلوب الأمر (حكمي)":"ijab_inshaa",
    "استفهام إنشائي / إنشائيّ مقنع":"ijab_inshaa",
    "تحرك السورة / انتقال سردي":"surah_movement","تحريك موضوعي/مَوْضِع السورة":"surah_movement",
    "surah_movement (تأطير/إحالة سياقية)":"surah_movement",
    "use_of_إِنَّ_for_emphasis":"ijab_inshaa","توكيد بـ(إِنَّ ... لَ)":"ijab_inshaa",
    "توكيد/تصحيح بالمقابلة (استدراك بـ «بل») / بلاغة التصويب":"muqabalah",
    "kinayah (excuse/indirect attribution)":"kinayah",
    "تمييز/ترتيب الوصف (اقتصاد اللفظ)":"ijaaz","جناس (تجانس لفظي)":"jinas",
    "تنبيه":"rule_reference","إسلاف جواب":"rule_reference",
    "معاني (إعجاز/إيجاز)":"ijaaz","بديع (مقابلة)":"muqabalah",
}
IRAB_NORM = {"qiraat":"qiraat_irab","ikhtilaf":"ikhtilaf_irab"}

def _norm_ct(ct: str, layer: str):
    norm  = {"balagha": BALAGHA_NORM, "irab": IRAB_NORM, "sarf": {}}.get(layer, {})
    valid = {"balagha": VALID_BALAGHA, "irab": VALID_IRAB, "sarf": VALID_SARF}.get(layer, set())
    ct = norm.get(ct, ct)
    if ct in valid: return ct
    for k, v in norm.items():
        if k in ct or ct in k: return v
    return None

def gen_sql(args) -> dict[str, Path]:
    step(3, "Generating seed SQL")
    surah = args.surah
    out_dir = BASE / f"S{surah:03d}/sql"     # e.g. S012/sql/
    out_dir.mkdir(parents=True, exist_ok=True)
    generated = {}

    # ── QR spine ──────────────────────────────────────────────────────────────
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    words = cx.execute(
        "SELECT * FROM qr_word_occurrences WHERE surah=? ORDER BY ayah, word_index", (surah,)
    ).fetchall()
    ayah_count = cx.execute("SELECT COUNT(DISTINCT ayah) FROM qr_word_occurrences WHERE surah=?", (surah,)).fetchone()[0]

    SURAH_META = {
        1:  ("الفاتحة","Al-Fatiha","Al-Fatiha","makki",7,1,1,5),
        2:  ("البقرة","Al-Baqarah","Al-Baqarah","madani",286,1,2,87),
        3:  ("آل عمران","Al-Imran","Al-Imran","madani",200,3,50,89),
        12: ("يوسف","Yusuf","Yusuf","makki",111,12,235,53),
        36: ("يس","Ya-Sin","Ya-Sin","makki",83,22,440,41),
        55: ("الرحمن","Ar-Rahman","Ar-Rahman","madani",78,27,531,97),
        67: ("الملك","Al-Mulk","Al-Mulk","makki",30,29,562,77),
    }
    meta = SURAH_META.get(surah, (f"سورة {surah}", f"Surah {surah}", f"Surah {surah}", "makki", ayah_count, 0, 0, 0))
    name_ar, name_en, name_tr, rev, _, juz, page, order = meta

    stmts = []
    stmts.append(
        f"INSERT OR IGNORE INTO qr_surahs "
        f"(id,name_ar,name_en,name_transliteration,revelation_type,ayah_count,juz_start,page_start,order_revelation) "
        f"VALUES ({surah},{sv(name_ar)},{sv(name_en)},{sv(name_tr)},{sv(rev)},{ayah_count},{juz},{page},{order});"
    )

    ayah_map = defaultdict(list)
    for w in words: ayah_map[w["ayah"]].append(dict(w))

    seen_lemmas: dict[str, tuple] = {}
    for ayah_no, aws in sorted(ayah_map.items()):
        text = " ".join(w["word_text"] for w in aws if w.get("word_text"))
        bare = " ".join((w.get("word_text_bare") or w["word_text"]) for w in aws if w.get("word_text"))
        stmts.append(
            f"INSERT OR IGNORE INTO qr_ayah "
            f"(id,surah,ayah,text_uthmani,text_uthmani_clean,text_bare,text) "
            f"VALUES ({sv(f'QR:AYAH:{surah}:{ayah_no}')},{surah},{ayah_no},{sv(text)},{sv(text)},{sv(bare)},{sv(text)});"
        )
        for w in aws:
            wid = w.get("id") or sha1("QR:WO:", surah, w["ayah"], w["word_index"])
            stmts.append(
                f"INSERT OR IGNORE INTO qr_word_occurrences "
                f"(id,surah,ayah,word_index,word_text,word_text_bare,root,lemma,pos,morphology_tag) "
                f"VALUES ({sv(wid)},{surah},{w['ayah']},{w['word_index']},"
                f"{sv(w.get('word_text'))},{sv(w.get('word_text_bare'))},{sv(w.get('root'))},"
                f"{sv(w.get('lemma'))},{sv(w.get('pos'))},{sv(w.get('morphology_tag'))});"
            )
            lt = w.get("lemma")
            if lt and lt not in seen_lemmas:
                lid = sha1("QR:LEM:", lt)
                seen_lemmas[lt] = (lid, w.get("root"))
    for lt, (lid, root) in seen_lemmas.items():
        stmts.append(f"INSERT OR IGNORE INTO qr_lemmas (id,lemma_text,root) VALUES ({sv(lid)},{sv(lt)},{sv(root)});")
    for w in words:
        lt = w["lemma"]
        if not lt: continue
        lid, _ = seen_lemmas[lt]
        wid = w["id"] or sha1("QR:WO:", surah, w["ayah"], w["word_index"])
        stmts.append(
            f"INSERT OR IGNORE INTO qr_lemma_occurrences "
            f"(id,lemma_id,surah,ayah,word_index,word_occurrence_id) "
            f"VALUES ({sv(sha1('QR:LO:',lid,wid))},{sv(lid)},{surah},{w['ayah']},{w['word_index']},{sv(wid)});"
        )
    p = out_dir / f"s{surah:03d}_qr_spine.sql"
    p.write_text("\n".join(stmts), encoding="utf-8")
    ok(f"s{surah}_qr_spine.sql  ({len(stmts)} stmts)")
    generated["qr_spine"] = p

    # ── AL roots + lemmas ──────────────────────────────────────────────────────
    stmts = []
    lem_rows = cx.execute(
        "SELECT DISTINCT lemma, root, pos FROM qr_word_occurrences WHERE surah=? AND lemma IS NOT NULL", (surah,)
    ).fetchall()
    root_rows = cx.execute(
        "SELECT DISTINCT root FROM qr_word_occurrences WHERE surah=? AND root IS NOT NULL", (surah,)
    ).fetchall()
    cx.close()

    seen_roots: set[str] = set()
    for (root,) in root_rows:
        if root in seen_roots: continue
        seen_roots.add(root)
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_roots (id,root_text,root_text_bare,root_type,frequency_quran) "
            f"VALUES ({sv(sha1('AL:ROOT:',root))},{sv(root)},{sv(root)},'sound',0);"
        )
    pos_map = {
        "N":"noun","V":"verb","ADJ":"adjective","ADV":"adverb","P":"particle",
        "PN":"proper_noun","PRON":"pronoun","REL":"particle","CONJ":"particle",
        "DEM":"pronoun","T":"particle","INL":"particle","DET+N":"noun","ACC+PRON":"pronoun",
        "V+PRON+PRON":"verb",
    }
    seen_lem2: set[str] = set()
    for row in lem_rows:
        lt, root, pos = row[0], row[1], row[2]
        if lt in seen_lem2: continue
        seen_lem2.add(lt)
        lid = sha1("AL:LEM:", lt)
        rid = sha1("AL:ROOT:", root) if root else None
        part = pos_map.get(pos, "noun")
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_lemmas (id,root_id,lemma_text,lemma_text_bare,part_of_speech,is_quran_word) "
            f"VALUES ({sv(lid)},{sv(rid)},{sv(lt)},{sv(lt)},{sv(part)},1);"
        )
        if rid:
            stmts.append(
                f"INSERT OR IGNORE INTO ar_ling_lemma_root_links (id,lemma_id,root_id,link_type) "
                f"VALUES ({sv(sha1('AL:LRL:',lid,rid))},{sv(lid)},{sv(rid)},'primary');"
            )
    p = out_dir / f"s{surah:03d}_al_roots_lemmas.sql"
    p.write_text("\n".join(stmts), encoding="utf-8")
    ok(f"s{surah}_al_roots_lemmas.sql  ({len(stmts)} stmts)")
    generated["al_roots_lemmas"] = p

    # ── AL taxonomy ────────────────────────────────────────────────────────────
    tax_sql = BASE / "S012/sql/s012_al_taxonomy.sql"  # reuse static taxonomy from S012
    if tax_sql.exists():
        p = out_dir / f"s{surah:03d}_al_taxonomy.sql"
        p.write_text(tax_sql.read_text(encoding="utf-8"), encoding="utf-8")
        ok(f"s{surah}_al_taxonomy.sql  (copied from static)")
        generated["al_taxonomy"] = p

    # ── AL claims ──────────────────────────────────────────────────────────────
    for layer in ["sarf", "irab", "balagha"]:
        cd = BASE / f"S{surah:03d}/claims/{layer}"
        files = sorted(cd.glob(f"{surah}_*.json"))
        stmts = []
        run_id = sha1(f"AL:RUN:{layer.upper()}:", f"S{surah}", "pipeline")
        n_ok = n_drop = 0
        for f in files:
            data = json.loads(f.read_text())
            ayah_key = data.get("ayah_key","")
            if not ayah_key: continue
            s_num, a_num = [int(x) for x in ayah_key.split(":")]
            for claim in data["result"].get("claims", []):
                ct = _norm_ct(claim.get("claim_type",""), layer)
                if not ct: n_drop += 1; continue
                wi = int(claim.get("word_index") or 1)
                cid = sha1(f"AL:CLAIM:{layer.upper()}:",
                           "UNKNOWN","UNKNOWN",ct,s_num,a_num,wi,
                           (claim.get("source_quote_ar") or "")[:30])
                payload = {k:v for k,v in claim.items()
                           if k not in ("claim_type","source_quote_ar","root","lemma","word_index")}
                stmts.append(
                    f"INSERT INTO ar_ling_source_claims "
                    f"(id,layer,claim_type,source_id,chunk_id,surah,ayah_from,ayah_to,word_index,"
                    f"source_quote_ar,claim_payload,confidence,run_id,created_at) "
                    f"VALUES ({sv(cid)},{sv(layer)},{sv(ct)},'UNKNOWN','UNKNOWN',"
                    f"{s_num},{a_num},{a_num},{wi},"
                    f"{sv(claim.get('source_quote_ar') or '')},"
                    f"{sv(payload)},"
                    f"{sv(claim.get('confidence','pending'))},"
                    f"{sv(run_id)},datetime('now')) "
                    f"ON CONFLICT(id) DO UPDATE SET claim_payload=excluded.claim_payload,"
                    f"confidence=excluded.confidence;"
                )
                n_ok += 1
        p = out_dir / f"s{surah:03d}_al_claims_{layer}.sql"
        p.write_text("\n".join(stmts), encoding="utf-8")
        ok(f"s{surah}_al_claims_{layer}.sql  ({n_ok} claims, {n_drop} dropped)")
        generated[f"al_claims_{layer}"] = p

    return generated


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4: Deploy to D1
# ══════════════════════════════════════════════════════════════════════════════
def deploy(args, sql_files: dict[str, Path]):
    step(4, "Deploying to Cloudflare D1")

    QR_FILES  = ["qr_spine"]
    AL_FILES  = ["al_roots_lemmas","al_taxonomy","al_claims_sarf","al_claims_irab","al_claims_balagha"]

    def execute(db: str, sql_path: Path):
        cfg = WRANGLER_CONFIGS.get(db)
        if not cfg or not Path(cfg).exists():
            warn(f"Config not found for {db}: {cfg}"); return False
        if not sql_path.exists():
            warn(f"SQL file missing: {sql_path}"); return False
        info(f"  Deploying {sql_path.name} → {db}")
        result = subprocess.run(
            ["wrangler","d1","execute",db,"--remote","--file",str(sql_path),"--config",cfg],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode == 0:
            ok(f"{sql_path.name} → {db}")
            return True
        else:
            err(f"Deploy failed: {result.stderr[:300]}")
            return False

    for key in QR_FILES:
        if key in sql_files:
            execute("km_quran", sql_files[key])

    # AL sources + chunks first (must exist before claims FK)
    al_chunks_dirs = [
        ("km_arabic_linguistic", BASE / "_pipeline/sarf/kmaps-sarf/data/staging/chunks", "tafsirs_sources.sql"),
        ("km_arabic_linguistic", BASE / "_pipeline/sarf/kmaps-sarf/data/staging/chunks", "lexicons_sources.sql"),
        ("km_arabic_linguistic", BASE / "_pipeline/irab/kmaps-irab/data/staging/chunks", "irab_sources.sql"),
        ("km_arabic_linguistic", BASE / "_pipeline/balagha/kmaps-balagha/data/staging/chunks", "balagha_sources.sql"),
    ]
    for db, d, fname in al_chunks_dirs:
        p = d / fname
        if p.exists(): execute(db, p)

    for key in AL_FILES:
        if key in sql_files:
            execute("km_arabic_linguistic", sql_files[key])


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    ap = argparse.ArgumentParser(
        description="End-to-end surah ingestion pipeline (extract → seed SQL → deploy)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 _shared/surah_pipeline.py --surah 12
  python3 _shared/surah_pipeline.py --surah 12 --workers 5
  python3 _shared/surah_pipeline.py --surah 12 --skip-extract   # already extracted
  python3 _shared/surah_pipeline.py --surah 12 --skip-deploy    # just generate SQL
  python3 _shared/surah_pipeline.py --surah 12 --model qwen3    # use lighter model
        """
    )
    ap.add_argument("--surah",        type=int, required=True, help="Surah number (1-114)")
    ap.add_argument("--workers",      type=int, default=3,     help="Parallel workers per layer (default 3)")
    ap.add_argument("--model",        type=str, default=None,  help="Ollama model override (default: qwen2.5:32b)")
    ap.add_argument("--skip-extract", action="store_true",     help="Skip LLM extraction (use existing JSON)")
    ap.add_argument("--skip-deploy",  action="store_true",     help="Skip D1 deploy (just generate SQL)")
    ap.add_argument("--skip-prereq",  action="store_true",     help="Skip prerequisite check")
    args = ap.parse_args()

    print(f"\n{BOLD}{'═'*60}")
    print(f"  K-Maps Surah Pipeline — Surah {args.surah}")
    print(f"{'═'*60}{RESET}")

    if not args.skip_prereq:
        if not check_prerequisites(args):
            err("Prerequisites failed. Fix issues above and retry.")
            sys.exit(1)

    if not args.skip_extract:
        run_extraction(args)
    else:
        info("Extraction skipped (--skip-extract)")

    sql_files = gen_sql(args)

    if not args.skip_deploy:
        deploy(args, sql_files)
    else:
        info(f"\nSQL files ready in: {SHARED / f's{args.surah}_sql'}")
        info("Run with wrangler login + remove --skip-deploy to deploy.")

    print(f"\n{GREEN}{BOLD}Pipeline complete for Surah {args.surah}.{RESET}\n")


if __name__ == "__main__":
    main()
