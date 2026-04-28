#!/usr/bin/env python3
"""
Targeted re-extraction for S12 irab + balagha gap ayahs.

Reads existing claim files, skips ayahs that already have claims,
re-runs LLM extraction only on empty/missing ones.

Usage:
    python3 s12/scripts/retry_gaps.py --layer irab
    python3 s12/scripts/retry_gaps.py --layer balagha
    python3 s12/scripts/retry_gaps.py --layer both   (runs irab then balagha)
    python3 s12/scripts/retry_gaps.py --layer both --dry-run
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, sys, time, urllib.error, urllib.request
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE      = Path(__file__).resolve().parents[2]   # ingestion/
SURAH_DIR = Path(__file__).resolve().parents[1]   # S012/
RUKU_DB   = BASE / "../quran-metadata-ruku.sqlite"

LAYER_DIRS = {
    "irab":    BASE / "_pipeline/irab/kmaps-irab",
    "balagha": BASE / "_pipeline/balagha/kmaps-balagha",
}

# ── Ruku map ───────────────────────────────────────────────────────────────────
def _build_ruku_map() -> dict[int, int]:
    import sqlite3 as _sq3
    mp: dict[int, int] = {}
    try:
        cx = _sq3.connect(RUKU_DB)
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

_AYAH_TO_RUKU: dict[int, int] = _build_ruku_map()

def claims_file(layer: str, ayah: int) -> Path:
    ruku = _AYAH_TO_RUKU.get(ayah, 1)
    return SURAH_DIR / f"claims/R{ruku:02d}/{layer}/12_{ayah}.json"
LAYER_COLLECTIONS = {
    "irab":    "kmaps_irab_source_chunks",
    "balagha": "kmaps_balagha_source_chunks",
}
QDRANT_PATHS = {
    "irab":    LAYER_DIRS["irab"]    / "data/data/qdrant_storage",
    "balagha": LAYER_DIRS["balagha"] / "data/data/qdrant_storage",
}
SPINE_DB = BASE / "_pipeline/sarf/kmaps-sarf/data/raw/spine/spine.sqlite"

OLLAMA_URL  = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
LLM_MODEL   = os.getenv("OLLAMA_LLM_MODEL", "qwen3:latest")

# ── Load .env ──────────────────────────────────────────────────────────────────
env_file = BASE / "_pipeline/sarf/kmaps-sarf/.env"
if env_file.exists():
    for raw in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("'\""))

# ── Claim types ────────────────────────────────────────────────────────────────
IRAB_TYPES = [
    "irab","taalluq","taqdir","qiraat","ikhtilaf","wajh_irab",
    "semantic_effect","rule_reference","governance",
]
BALAGHA_TYPES = [
    "taqdim_takhir","iltifat","hasr_qasr","ijaaz","itnaab","musawat",
    "tashbih","istiarah","majaz","kinayah",
    "jinas","tibaq","muqabalah","saj","takrar",
    "asloob_hakim","naktah","surah_movement",
    "fasl_wasl","tarif_tankir","ijab_inshaa",
    "rule_reference",
]

LAYER_TYPES = {"irab": IRAB_TYPES, "balagha": BALAGHA_TYPES}

# ── Normalization for balagha (maps hallucinated types to valid ones) ──────────
_BALAGHA_NORM = {
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
    "laf_nashr":"tibaq","husn_talil":"asloob_hakim",
    "isti_arah_makniyya":"istiarah","isti_arah_tasrihiyya":"istiarah",
}

LAYER_PROMPTS = {
    "irab": """You are extracting إعراب (Quranic grammar/syntax) claims for K-Maps.
Return JSON with keys "claims" (array) and "warnings" (array of strings).
Each claim must have:
  word_index (int, 1-based word position in this ayah),
  claim_type (one of: irab, taalluq, taqdir, qiraat, ikhtilaf, wajh_irab, semantic_effect, rule_reference, governance),
  source_quote_ar (EXACT substring from provided chunks — must match character-for-character),
  claim_ar (Arabic explanation),
  claim_en (English explanation),
  root (Arabic root or ""),
  lemma (Arabic lemma or ""),
  confidence ("high"|"medium"|"low"|"needs_review"),
  needs_review_reason ("" if none).
Extract: grammatical roles, jar-majrur attachment, elision, reading variants, grammarian disagreements, semantic effects of structure.
DO NOT extract morphology or rhetoric.
If no evidence in chunks, return {"claims":[],"warnings":["no relevant source content found"]}.""",

    "balagha": """You are extracting بلاغة (Quranic rhetoric) claims for K-Maps.
Return JSON with keys "claims" (array) and "warnings" (array of strings).
Each claim must have:
  word_index (int, 1-based; use 0 for ayah-level devices),
  claim_type (MUST be exactly one of: taqdim_takhir, iltifat, hasr_qasr, ijaaz, itnaab, musawat, tashbih, istiarah, majaz, kinayah, jinas, tibaq, muqabalah, saj, takrar, asloob_hakim, naktah, surah_movement, fasl_wasl, tarif_tankir, ijab_inshaa, rule_reference),
  source_quote_ar (EXACT substring from provided chunks),
  claim_ar (Arabic explanation),
  claim_en (English explanation),
  device_branch ("maani"|"bayan"|"badi"|"other"),
  device_subtype (specific subtype or ""),
  root (Arabic root or ""),
  lemma (Arabic lemma or ""),
  confidence ("high"|"medium"|"low"|"needs_review"),
  needs_review_reason ("" if none).
Devices:
  maani branch: taqdim_takhir, iltifat, hasr_qasr, ijaaz, itnaab, fasl_wasl, tarif_tankir, ijab_inshaa
  bayan branch: tashbih, istiarah, majaz, kinayah
  badi branch: jinas, tibaq, muqabalah, saj, takrar
  other: asloob_hakim, naktah, surah_movement, rule_reference
DO NOT extract grammar or morphology.
If no evidence in chunks, return {"claims":[],"warnings":["no relevant source content found"]}.""",
}

# ── Utilities ──────────────────────────────────────────────────────────────────
def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]

def sql_val(v):
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def embed_text(text: str) -> list[float]:
    body = json.dumps({"model": EMBED_MODEL, "input": text}).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/embed", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read())
    return list(data.get("embeddings", [[]])[0])

def retrieve_chunks(collection: str, vector: list[float], surah: int, ayah: int,
                    layer: str, k: int = 16) -> list[dict]:
    """
    Retrieve relevant chunks for a given surah:ayah.

    NOTE: irab/balagha chunks have `ayah=ayah_from` metadata — the chunker set
    per-section boundaries, not per-ayah. So we filter by surah only and rely
    on semantic similarity to surface the most relevant chunks.
    """
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qm
    cli = QdrantClient(path=str(QDRANT_PATHS[layer]))
    existing = {c.name for c in cli.get_collections().collections}
    if collection not in existing:
        return []

    # Primary search: surah-filtered (all chunks for this surah, ranked by semantic similarity)
    surah_filtered = cli.search(
        collection_name=collection,
        query_vector=vector,
        query_filter=qm.Filter(must=[
            qm.FieldCondition(key="surah", match=qm.MatchValue(value=surah)),
        ]),
        limit=k, with_payload=True
    )

    # If very few surah-specific results, pad with general semantic search
    if len(surah_filtered) < 4:
        extra = cli.search(collection_name=collection, query_vector=vector,
                           limit=k, with_payload=True)
        seen = {r.id for r in surah_filtered}
        for r in extra:
            if r.id not in seen:
                surah_filtered.append(r)
                if len(surah_filtered) >= k: break

    return [{"chunk_id": r.payload.get("chunk_id"), "text_ar": r.payload.get("text_ar","")[:1500],
             "score": r.score} for r in surah_filtered]

def call_ollama(layer: str, ayah_words: list[dict], chunks: list[dict]) -> dict:
    sys_prompt = LAYER_PROMPTS[layer]
    words_txt = "\n".join(
        f"  word_index={w['word_index']}: ar={w.get('arabic_token','?')} "
        f"root={w.get('root','?')} lemma={w.get('lemma','?')}"
        for w in ayah_words
    )
    chunks_txt = "\n\n".join(
        f"[CHUNK {i+1}]\n{c['text_ar']}"
        for i, c in enumerate(chunks)
    )
    user_msg = (
        f"SURAH {ayah_words[0]['surah']}, AYAH {ayah_words[0]['ayah']}:\n"
        f"Words (1-based index):\n{words_txt}\n\n"
        f"Source chunks:\n{chunks_txt}"
    )
    body = json.dumps({
        "model": LLM_MODEL,
        "think": False,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 3000},
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user",   "content": user_msg},
        ],
    }).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            resp = json.loads(r.read())
        content = resp.get("message", {}).get("content", "")
    except Exception as e:
        return {"claims": [], "warnings": [f"LLM error: {e}"]}

    # Strip <think> blocks
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", content, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group())
            except Exception:
                return {"claims": [], "warnings": ["JSON parse failed"]}
        else:
            return {"claims": [], "warnings": ["No JSON in response"]}

    # Normalize balagha claim_types
    if layer == "balagha":
        valid = set(BALAGHA_TYPES)
        normalized = []
        for c in data.get("claims", []):
            ct = c.get("claim_type", "")
            if ct not in valid:
                ct = _BALAGHA_NORM.get(ct, _BALAGHA_NORM.get(ct.lower(), None))
                if ct is None:
                    continue  # drop unrecognizable
                c["claim_type"] = ct
            normalized.append(c)
        data["claims"] = normalized

    return data

def load_spine_ayah(surah: int, ayah: int) -> list[dict]:
    import sqlite3
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    rows = cx.execute(
        "SELECT * FROM qr_word_occurrences WHERE surah=? AND ayah=? ORDER BY word_index",
        (surah, ayah)
    ).fetchall()
    cx.close()
    return [dict(r) for r in rows]

def get_gap_ayahs(layer: str) -> list[int]:
    """Return ayah numbers (1-111) that are missing or have 0 claims."""
    gap = []
    for i in range(1, 112):
        f = claims_file(layer, i)
        if not f.exists():
            gap.append(i)
            continue
        try:
            d = json.loads(f.read_text())
            if len(d.get("result", {}).get("claims", [])) == 0:
                gap.append(i)
        except Exception:
            gap.append(i)
    return gap

def write_claim_file(layer: str, surah: int, ayah: int, result: dict, n_chunks: int):
    dest = claims_file(layer, ayah)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out = {"layer": layer, "ayah_key": f"{surah}:{ayah}",
           "result": result, "n_chunks": n_chunks}
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2))

def claims_to_sql(layer: str, surah: int, ayah: int,
                  words: list[dict], result: dict, n_chunks: int) -> list[str]:
    stmts = []
    source_id = f"AL:LAYER:{layer.upper()}"
    for c in result.get("claims", []):
        wi = c.get("word_index")
        word_row = next((w for w in words if w.get("word_index") == wi), None)
        word_id = word_row.get("id") if word_row else None
        cid = stable_id("AL:SC:", layer, surah, ayah, wi,
                        c.get("claim_type"), c.get("claim_ar", "")[:40])
        stmts.append(
            f"INSERT OR IGNORE INTO ar_ling_source_claims "
            f"(id,layer,surah,ayah,word_id,word_index,claim_type,source_id,"
            f"source_quote_ar,claim_ar,claim_en,device_branch,device_subtype,"
            f"root,lemma,quran_ref,confidence,needs_review,needs_review_reason,"
            f"n_source_chunks) VALUES ("
            f"{sql_val(cid)},{sql_val(layer)},{surah},{ayah},"
            f"{sql_val(word_id)},{sql_val(wi)},{sql_val(c.get('claim_type'))},"
            f"{sql_val(source_id)},"
            f"{sql_val(c.get('source_quote_ar','')[:1500])},"
            f"{sql_val(c.get('claim_ar','')[:1200])},"
            f"{sql_val(c.get('claim_en','')[:1200])},"
            f"{sql_val(c.get('device_branch',''))},"
            f"{sql_val(c.get('device_subtype',''))},"
            f"{sql_val(c.get('root',''))},"
            f"{sql_val(c.get('lemma',''))},"
            f"{sql_val(c.get('quran_ref',''))},"
            f"{sql_val(c.get('confidence','medium'))},"
            f"{1 if c.get('needs_review_reason') else 0},"
            f"{sql_val(c.get('needs_review_reason',''))},"
            f"{n_chunks});"
        )
    return stmts

# ── Main ───────────────────────────────────────────────────────────────────────
def run_layer(layer: str, dry_run: bool = False):
    gaps = get_gap_ayahs(layer)
    print(f"\n{'='*60}")
    print(f"  Layer: {layer.upper()} | Gap ayahs: {len(gaps)}/111 | Model: {LLM_MODEL}")
    print(f"{'='*60}")
    if not gaps:
        print("  ✓ No gaps — all ayahs have claims.")
        return

    if dry_run:
        print(f"  DRY RUN — would process: {gaps}")
        return

    collection = LAYER_COLLECTIONS[layer]
    sql_dir = Path(__file__).resolve().parents[1] / "sql"
    sql_dir.mkdir(exist_ok=True)
    sql_out = sql_dir / f"s12_al_claims_{layer}.sql"

    # Load existing SQL to preserve already-extracted claims
    existing_sql = []
    if sql_out.exists():
        existing_sql = sql_out.read_text().splitlines()

    new_stmts = []
    ok_count = 0
    fail_count = 0

    for i, ayah in enumerate(gaps):
        t0 = time.time()
        words = load_spine_ayah(12, ayah)
        if not words:
            print(f"  [{i+1}/{len(gaps)}] 12:{ayah} — no words in spine, skip")
            continue

        # Build query text
        query = " ".join(
            f"{w.get('arabic_token','')} {w.get('root','')} {w.get('lemma','')}"
            for w in words
        ).strip()

        try:
            vec = embed_text(query)
        except Exception as e:
            print(f"  [{i+1}/{len(gaps)}] 12:{ayah} — embed error: {e}")
            fail_count += 1
            continue

        try:
            chunks = retrieve_chunks(collection, vec, 12, ayah, layer=layer)
        except Exception as e:
            print(f"  [{i+1}/{len(gaps)}] 12:{ayah} — retrieve error: {e}")
            fail_count += 1
            continue

        result = call_ollama(layer, words, chunks)
        n_claims = len(result.get("claims", []))
        elapsed = time.time() - t0

        # Save claim file
        write_claim_file(layer, 12, ayah, result, len(chunks))

        # Generate SQL
        stmts = claims_to_sql(layer, 12, ayah, words, result, len(chunks))
        new_stmts.extend(stmts)

        status = f"✓ {n_claims} claims" if n_claims > 0 else "○ 0 claims"
        print(f"  [{i+1}/{len(gaps)}] 12:{ayah:<4} {status:15} {elapsed:.1f}s  chunks={len(chunks)}")
        ok_count += 1

        # Flush SQL every 10 ayahs
        if ok_count % 10 == 0:
            _flush_sql(sql_out, existing_sql, new_stmts)
            print(f"    └─ flushed {len(new_stmts)} new statements to {sql_out.name}")

    # Final flush
    _flush_sql(sql_out, existing_sql, new_stmts)
    total_new = len(new_stmts)
    print(f"\n  Done: {ok_count} processed, {fail_count} failed")
    print(f"  SQL: {total_new} new statements → {sql_out}")

def _flush_sql(sql_out: Path, existing_lines: list[str], new_stmts: list[str]):
    """Merge existing SQL + new statements, deduplicate by INSERT id, write."""
    all_lines = existing_lines + new_stmts
    seen_ids = set()
    deduped = []
    for line in all_lines:
        if line.startswith("INSERT"):
            # Extract id from first value
            m = re.search(r"VALUES \('([^']+)'", line)
            if m:
                if m.group(1) in seen_ids:
                    continue
                seen_ids.add(m.group(1))
        deduped.append(line)
    sql_out.write_text("\n".join(deduped), encoding="utf-8")

# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--layer", choices=["irab","balagha","both"], default="both")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    if args.model:
        LLM_MODEL = args.model

    layers = ["irab","balagha"] if args.layer == "both" else [args.layer]
    for layer in layers:
        run_layer(layer, dry_run=args.dry_run)
