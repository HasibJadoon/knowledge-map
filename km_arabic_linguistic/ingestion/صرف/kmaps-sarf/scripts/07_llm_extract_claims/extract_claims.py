#!/usr/bin/env python3
"""
Step 07: LLM claim extraction — the core sarf enrichment step.

For each word in SARF_SCOPE:
  1. Load spine row (surah, ayah, word_index, root, lemma, pos, morphology_tag)
  2. Query Qdrant for top-K relevant source chunks (by embedding similarity)
  3. Call OpenAI gpt-4o-mini with structured JSON output (sarf or tafsir-sarf schema)
  4. Write extracted claims to data/staging/claims/<surah>_<ayah>_<word_index>.json
  5. Generate SQL fragments for all canonical tables

State-aware: already-processed words tracked in data/staging/claims/done.txt
The run is resumable at any point.

Usage:
    cd kmaps-sarf/
    OPENAI_API_KEY=sk-... python3 scripts/07_llm_extract_claims/extract_claims.py
    # Or: set OPENAI_API_KEY in .env first, then just:
    python3 scripts/07_llm_extract_claims/extract_claims.py [--scope ALL] [--limit 100]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parents[2]
SPINE_DB     = SCRIPT_DIR / "data/raw/spine/spine.sqlite"
CLAIMS_DIR   = SCRIPT_DIR / "data/staging/claims"
DONE_FILE    = CLAIMS_DIR / "done.txt"
SQL_OUT_DIR  = SCRIPT_DIR / "data/staging/claims/sql"
QDRANT_PATH  = SCRIPT_DIR / "data/qdrant_storage"
OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
EMBED_MODEL  = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
COLLECTION   = "kmaps_sarf_source_chunks"

CLAIMS_DIR.mkdir(parents=True, exist_ok=True)
SQL_OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Load env ───────────────────────────────────────────────────────────────────
env_path = SCRIPT_DIR / ".env"
if env_path.exists():
    for raw in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip("'\""))


# ── Stable IDs ─────────────────────────────────────────────────────────────────
def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


def point_id_from_chunk_id(chunk_id: str) -> str:
    h = hashlib.md5(chunk_id.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


# ── SQL helpers ────────────────────────────────────────────────────────────────
def sql_val(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(v).replace("'", "''") + "'"


# ── Spine reader ───────────────────────────────────────────────────────────────
def load_words(scope_str: str) -> list[dict]:
    cx = sqlite3.connect(SPINE_DB)
    cx.row_factory = sqlite3.Row
    s = scope_str.strip().upper()
    if s == "ALL":
        rows = cx.execute("SELECT * FROM qr_word_occurrences ORDER BY surah, ayah, word_index").fetchall()
    elif ":" in s:
        # S12:1-7 or S12:4
        body = s.lstrip("S")
        surah_part, ayah_part = body.split(":", 1)
        surah = int(surah_part)
        if "-" in ayah_part:
            a1, a2 = ayah_part.split("-", 1)
            rows = cx.execute(
                "SELECT * FROM qr_word_occurrences WHERE surah=? AND ayah BETWEEN ? AND ? "
                "ORDER BY ayah, word_index", (surah, int(a1), int(a2))
            ).fetchall()
        else:
            rows = cx.execute(
                "SELECT * FROM qr_word_occurrences WHERE surah=? AND ayah=? "
                "ORDER BY word_index", (surah, int(ayah_part))
            ).fetchall()
    else:
        surah = int(s.lstrip("S"))
        rows = cx.execute(
            "SELECT * FROM qr_word_occurrences WHERE surah=? ORDER BY ayah, word_index", (surah,)
        ).fetchall()
    cx.close()
    return [dict(r) for r in rows]


# ── Ollama embed (single text) ─────────────────────────────────────────────────
def embed_text(text: str) -> list[float]:
    body = json.dumps({"model": EMBED_MODEL, "input": text}).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/embed", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    embs = data.get("embeddings") or []
    if embs:
        return list(embs[0])
    raise RuntimeError("Empty embedding response")


# ── Qdrant retrieval ───────────────────────────────────────────────────────────
def retrieve_chunks(vector: list[float], surah: int, ayah: int, limit: int = 12) -> list[dict]:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qm
    cli = QdrantClient(path=str(QDRANT_PATH))
    existing = {c.name for c in cli.get_collections().collections}
    if COLLECTION not in existing:
        return []
    # Search: prefer same ayah, then any
    results = cli.search(
        collection_name=COLLECTION,
        query_vector=vector,
        query_filter=qm.Filter(
            should=[
                qm.FieldCondition(key="surah", match=qm.MatchValue(value=surah)),
                qm.FieldCondition(key="ayah",  match=qm.MatchValue(value=ayah)),
            ]
        ),
        limit=limit,
        with_payload=True,
    )
    if len(results) < 4:
        # Supplement with global search
        extra = cli.search(
            collection_name=COLLECTION,
            query_vector=vector,
            limit=limit,
            with_payload=True,
        )
        seen_ids = {r.id for r in results}
        for r in extra:
            if r.id not in seen_ids:
                results.append(r)
                if len(results) >= limit:
                    break
    return [
        {
            "chunk_id":   r.payload.get("chunk_id"),
            "source_id":  r.payload.get("source_id"),
            "chunk_kind": r.payload.get("chunk_kind"),
            "text_ar":    r.payload.get("text_ar", ""),
            "score":      r.score,
        }
        for r in results
    ]


# ── LLM call (OpenAI Responses API) ───────────────────────────────────────────
SARF_CLAIM_TYPES = [
    "root_core","root_image","root_extension","derived_family","sarf_pattern",
    "verb_form","form_flavour","masdar","participle","noun_type","weak_root",
    "hamzated_root","doubled_root","inflection","qiraat_morph_variant",
    "idiomatic_meaning","verb_preposition_frame","tadmeen_frame",
    "antonym_relation","near_synonym_sarf_difference","translation_loss",
    "academic_key_term_note",
]
TAFSIR_CLAIM_TYPES = [
    "tafsir_root_activation","tafsir_form_reason","tafsir_lemma_preference",
    "tafsir_masdar_force","tafsir_participle_state","tafsir_weak_root_note",
    "tafsir_qiraat_morph_variant","tafsir_verb_frame","tafsir_tadmeen",
    "tafsir_idiom","tafsir_cross_verse_usage","tafsir_antonym_boundary",
    "tafsir_translation_loss","tafsir_surah_vocabulary_flow",
]

SYSTEM_PROMPT = """You are a Quranic Sarf extraction agent for K-Maps.
Extract ONLY صرف (morphology) claims from the given word and source chunks.
Do NOT extract إعراب or بلاغة. Do NOT invent Quran examples.
Every claim requires: claim_type, claim_ar, claim_en, quote_ar (verbatim substring of source),
root or lemma, quran_ref, confidence.
Return JSON matching the schema exactly. If uncertain, set confidence='needs_review'.
"""

def make_schema(chunk_kinds: list[str]) -> tuple[str, dict]:
    """Returns (schema_name, json_schema) based on source types."""
    has_tafsir = any(k == "tafsir" for k in chunk_kinds)
    claim_types = TAFSIR_CLAIM_TYPES if has_tafsir else SARF_CLAIM_TYPES

    def _str(max_len=1200):
        return {"type": "string", "minLength": 0, "maxLength": max_len}

    schema = {
        "type": "object",
        "additionalProperties": False,
        "required": ["claims", "warnings"],
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["claim_type","claim_ar","claim_en","quote_ar","root","lemma","pattern","quran_ref","confidence","needs_review_reason"],
                    "properties": {
                        "claim_type": {"type": "string", "enum": claim_types},
                        "claim_ar":   _str(1200),
                        "claim_en":   _str(1200),
                        "quote_ar":   _str(1500),
                        "root":       _str(40),
                        "lemma":      _str(60),
                        "pattern":    _str(60),
                        "quran_ref":  _str(16),
                        "confidence": {"type": "string", "enum": ["needs_review","checked"]},
                        "needs_review_reason": _str(240),
                    },
                },
            },
            "warnings": {"type": "array", "items": _str(300)},
        },
    }
    name = "tafsir_sarf_extraction" if has_tafsir else "sarf_extraction"
    return name, schema


def call_llm(word: dict, chunks: list[dict]) -> dict:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set — set it in .env or environment")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    timeout = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "180"))

    chunk_kinds = [c.get("chunk_kind", "") for c in chunks]
    schema_name, schema = make_schema(chunk_kinds)

    user_payload = {
        "spine": {
            "surah": word["surah"], "ayah": word["ayah"], "word_index": word["word_index"],
            "word_text": word.get("word_text"), "root": word.get("root"),
            "lemma": word.get("lemma"), "pos": word.get("pos"),
            "morphology_tag": word.get("morphology_tag"),
        },
        "source_chunks": [
            {"chunk_id": c["chunk_id"], "source_id": c["source_id"], "text_ar": c["text_ar"][:1500]}
            for c in chunks[:8]
        ],
    }

    # Standard Chat Completions API with structured output (json_schema response_format)
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": schema_name,
                "strict": True,
                "schema": schema,
            },
        },
        "max_completion_tokens": 2400,
    }

    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )

    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            # Chat Completions response: choices[0].message.content
            msg = data["choices"][0]["message"]
            text = msg.get("content") or ""
            if not text:
                # Model refusal or empty — return empty claims (e.g. short particles)
                return {"claims": [], "warnings": ["model returned empty content"]}
            return json.loads(text)
        except urllib.error.HTTPError as e:
            body_bytes = e.read()
            if e.code == 429:
                time.sleep(2 ** attempt)
            elif e.code in (500, 502, 503):
                if attempt < 3:
                    time.sleep(2 ** attempt)
                else:
                    raise
            else:
                raise RuntimeError(f"OpenAI HTTP {e.code}: {body_bytes[:300].decode('utf-8','replace')}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 3:
                time.sleep(2 ** attempt)
            else:
                raise

    raise RuntimeError("LLM call failed after 3 attempts")


# ── SQL emitters ───────────────────────────────────────────────────────────────
def emit_sarf_note(claim: dict, source_id: str, chunk_id: str, surah: int, ayah: int, word_index: int) -> str:
    rid = stable_id("AL:SARF:", source_id, chunk_id, claim.get("claim_type"), claim.get("root"), claim.get("lemma"), surah, ayah, word_index)
    return (
        f"INSERT INTO ar_ling_sarf_notes "
        f"(id, claim_id, word_occurrence_ref, surah, ayah, word_index, root_text, lemma_text, pattern, "
        f"sarf_category, explanation_ar, explanation_en, source_id, chunk_id, confidence, review_status) "
        f"VALUES ({sql_val(rid)},{sql_val(rid)},"
        f"{sql_val(f'QR:{surah}:{ayah}:{word_index}')},"
        f"{surah},{ayah},{word_index},"
        f"{sql_val(claim.get('root') or None)},{sql_val(claim.get('lemma') or None)},"
        f"{sql_val(claim.get('pattern') or None)},"
        f"{sql_val(claim.get('claim_type'))},"
        f"{sql_val(claim.get('claim_ar') or None)},{sql_val(claim.get('claim_en') or None)},"
        f"{sql_val(source_id)},{sql_val(chunk_id)},"
        f"{sql_val(claim.get('confidence','needs_review'))},'pending') "
        f"ON CONFLICT(id) DO UPDATE SET explanation_ar=excluded.explanation_ar, "
        f"explanation_en=excluded.explanation_en, confidence=excluded.confidence;\n"
    )


def emit_tafsir_note(claim: dict, source_id: str, chunk_id: str, surah: int, ayah: int, word_index: int) -> str:
    rid = stable_id("AL:TFSARF:", source_id, chunk_id, claim.get("claim_type"), claim.get("root"), claim.get("lemma"), surah, ayah, word_index)
    locator = json.dumps({"chunk_id": chunk_id, "source_id": source_id, "surah": surah, "ayah": ayah}, ensure_ascii=False)
    return (
        f"INSERT INTO ar_ling_sarf_tafsir_notes "
        f"(id, claim_id, word_occurrence_ref, surah, ayah_from, ayah_to, root_text, lemma_text, pattern, "
        f"note_type, note_ar, note_en, source_id, chunk_id, locator_json, confidence, review_status) "
        f"VALUES ({sql_val(rid)},{sql_val(rid)},"
        f"{sql_val(f'QR:{surah}:{ayah}:{word_index}')},"
        f"{surah},{ayah},{ayah},"
        f"{sql_val(claim.get('root') or None)},{sql_val(claim.get('lemma') or None)},"
        f"{sql_val(claim.get('pattern') or None)},"
        f"{sql_val(claim.get('claim_type'))},"
        f"{sql_val(claim.get('claim_ar') or None)},{sql_val(claim.get('claim_en') or None)},"
        f"{sql_val(source_id)},{sql_val(chunk_id)},"
        f"{sql_val(locator)},"
        f"{sql_val(claim.get('confidence','needs_review'))},'pending') "
        f"ON CONFLICT(id) DO UPDATE SET note_ar=excluded.note_ar, note_en=excluded.note_en, confidence=excluded.confidence;\n"
    )


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Sarf LLM claim extraction")
    ap.add_argument("--scope", default=os.getenv("SARF_SCOPE", "ALL"))
    ap.add_argument("--limit", type=int, default=0, help="Process only first N words (0=all)")
    ap.add_argument("--retrieve-k", type=int, default=12, help="Qdrant top-K per word")
    ap.add_argument("--skip-embed", action="store_true", help="Skip Qdrant retrieval, use empty context")
    # Parallel batch support: split work across W workers by word-list position
    ap.add_argument("--workers", type=int, default=1,
                    help="Total number of parallel worker processes")
    ap.add_argument("--worker-id", type=int, default=0,
                    help="This worker's 0-based index (0..workers-1)")
    args = ap.parse_args()

    if args.workers < 1 or args.worker_id < 0 or args.worker_id >= args.workers:
        print(f"ERROR: invalid --workers/--worker-id: {args.workers}/{args.worker_id}", file=sys.stderr)
        sys.exit(1)

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set. Add it to .env or set in environment.", file=sys.stderr)
        sys.exit(1)

    # Per-worker paths (no conflicts when running in parallel)
    wid = args.worker_id
    suffix = f"-w{wid}" if args.workers > 1 else ""
    done_file = CLAIMS_DIR / f"done{suffix}.txt"

    # Load this worker's done set
    done: set[str] = set()
    if done_file.exists():
        done = set(done_file.read_text(encoding="utf-8").splitlines())
    # Also load global done.txt (single-worker runs) to avoid re-processing
    if args.workers > 1 and DONE_FILE.exists():
        done |= set(DONE_FILE.read_text(encoding="utf-8").splitlines())
    print(f"[w{wid}] Already processed: {len(done):,}", file=sys.stderr)

    # Load spine words for scope, then slice this worker's share
    words = load_words(args.scope)
    if args.limit > 0:
        words = words[: args.limit]
    # Interleave slice: worker i takes positions i, i+W, i+2W, ...
    # This distributes across surahs evenly rather than splitting by contiguous block
    words = [w for j, w in enumerate(words) if j % args.workers == wid]
    words = [w for w in words if f"{w['surah']}:{w['ayah']}:{w['word_index']}" not in done]
    print(f"[w{wid}] Words to process: {len(words):,} (scope={args.scope}, workers={args.workers})", file=sys.stderr)

    done_fh = open(done_file, "a", encoding="utf-8")
    n_ok = 0
    n_err = 0

    # Rolling SQL output with per-worker prefix
    sql_prefix = f"sarf-claims{suffix}"
    sql_state = {"buf": [], "buf_bytes": 0, "idx": 1}

    def flush_sql():
        if not sql_state["buf"]:
            return
        p = SQL_OUT_DIR / f"{sql_prefix}-{sql_state['idx']:04d}.sql"
        p.write_text("".join(sql_state["buf"]), encoding="utf-8")
        sql_state["idx"] += 1
        sql_state["buf"] = []
        sql_state["buf_bytes"] = 0

    def append_sql(stmt: str):
        size = len(stmt.encode("utf-8"))
        if sql_state["buf"] and sql_state["buf_bytes"] + size > 4_000_000:
            flush_sql()
        sql_state["buf"].append(stmt)
        sql_state["buf_bytes"] += size

    for i, word in enumerate(words):
        s, a, w = word["surah"], word["ayah"], word["word_index"]
        word_key = f"{s}:{a}:{w}"
        claim_file = CLAIMS_DIR / f"{s}_{a}_{w}.json"

        try:
            # 1. Embed word query text
            if not args.skip_embed:
                query_text = " ".join(filter(None, [
                    word.get("word_text"), word.get("root"), word.get("lemma"),
                    word.get("morphology_tag"),
                ]))
                try:
                    vec = embed_text(query_text)
                    chunks = retrieve_chunks(vec, s, a, limit=args.retrieve_k)
                except Exception as e:
                    print(f"  [w{wid}] Retrieval error for {word_key}: {e}", file=sys.stderr)
                    chunks = []
            else:
                chunks = []

            # 2. LLM extract
            result = call_llm(word, chunks)

            # 3. Save raw result
            record = {
                "word_key": word_key,
                "surah": s, "ayah": a, "word_index": w,
                "word_text": word.get("word_text"),
                "root": word.get("root"), "lemma": word.get("lemma"),
                "result": result,
                "chunks_used": len(chunks),
            }
            claim_file.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

            # 4. Emit SQL
            claims = result.get("claims") or []
            for claim in claims:
                claim_type = claim.get("claim_type", "")
                is_tafsir = claim_type.startswith("tafsir_")
                if chunks:
                    src_chunk = next((c for c in chunks if (c.get("chunk_kind") == "tafsir") == is_tafsir), chunks[0])
                    chunk_id = src_chunk["chunk_id"]
                    source_id = src_chunk["source_id"]
                else:
                    chunk_id = "UNKNOWN"
                    source_id = "UNKNOWN"

                if is_tafsir:
                    stmt = emit_tafsir_note(claim, source_id, chunk_id, s, a, w)
                else:
                    stmt = emit_sarf_note(claim, source_id, chunk_id, s, a, w)
                append_sql(stmt)

            done_fh.write(word_key + "\n")
            done_fh.flush()
            n_ok += 1

            if i % 100 == 0:
                pct = i / max(len(words), 1) * 100
                print(f"  [w{wid}] {i:,}/{len(words):,} ({pct:.1f}%) — ok={n_ok} err={n_err}", file=sys.stderr)

            # Brief pause — gpt-4o-mini handles high concurrency well
            time.sleep(0.05)

        except Exception as exc:
            print(f"  [w{wid}] ERROR {word_key}: {exc}", file=sys.stderr)
            n_err += 1
            if n_err > 50:
                print(f"[w{wid}] Too many errors, stopping.", file=sys.stderr)
                break

    flush_sql()
    done_fh.close()

    print(
        f"\n[w{wid}] Done. {n_ok:,} words processed | {n_err} errors\n"
        f"SQL files: {sql_state['idx']-1} in {SQL_OUT_DIR}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
