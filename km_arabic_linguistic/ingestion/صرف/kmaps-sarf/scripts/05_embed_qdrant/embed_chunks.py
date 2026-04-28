#!/usr/bin/env python3
"""
Step 05: Embed all chunks via Ollama nomic-embed-text and upsert to Qdrant.

Reads: data/staging/chunks/all_chunks_clean.jsonl  (after running clean_chunks.py)
       falls back to all_chunks.jsonl if clean version not present

Embedding strategy — Quran-contextual:
  Instead of embedding raw text_ar only, we prepend structured context:

  Tafsir:   "[Tabari - Jami' al-Bayan] Surah 2:255 | {text_ar}"
  Lexicon:  "[Ibn Faris - Maqayis] root: خَتَمَ | {text_ar}"
  PDF:      "[Key Terms of the Qur'an] {heading} | {text_ar}"

  This anchors retrieval to Quran references and root terms so that
  when extract_claims.py queries for a word like خَتَمَ in 2:7, it
  surfaces contextually relevant chunks.

Qdrant payload stored per point:
  chunk_id, source_id, source_title, chunk_kind, heading,
  surah, ayah, ayah_from, ayah_to, text_ar (first 2000 chars)

State-aware: tracks embedded IDs in data/staging/embeddings/embedded_ids.txt

Usage:
    python3 scripts/05_embed_qdrant/embed_chunks.py [--batch 32] [--rebuild]
    --rebuild  : wipe Qdrant collection and re-embed everything from scratch
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.request
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parents[2]
CLEAN_CHUNKS = SCRIPT_DIR / "data/staging/chunks/all_chunks_clean.jsonl"
ALL_CHUNKS   = SCRIPT_DIR / "data/staging/chunks/all_chunks.jsonl"
EMB_DIR      = SCRIPT_DIR / "data/staging/embeddings"
QDRANT_PATH  = SCRIPT_DIR / "data/qdrant_storage"
DONE_FILE    = EMB_DIR / "embedded_ids.txt"

EMB_DIR.mkdir(parents=True, exist_ok=True)
QDRANT_PATH.mkdir(parents=True, exist_ok=True)

COLLECTION  = "kmaps_sarf_source_chunks"
VECTOR_DIM  = 768
OLLAMA_URL  = "http://127.0.0.1:11434"
EMBED_MODEL = "nomic-embed-text"


# ── Build Quran-contextual embedding text ──────────────────────────────────────

def build_embed_text(c: dict) -> str:
    """
    Build a rich embedding string that anchors the chunk to its
    Quran context, source, and root — not just raw Arabic text.

    Format varies by chunk_kind:
      tafsir:  [Source Title] Surah S:A-B | {heading} | {text_ar[:800]}
      lexicon: [Source Title] root: {headword} | {text_ar[:800]}
      pdf/docx:[Source Title] {heading} | {text_ar[:800]}
    """
    kind    = c.get("chunk_kind", "")
    title   = c.get("source_title_en") or ""
    heading = c.get("heading_norm") or ""
    text    = c.get("text_ar") or ""
    meta    = c.get("meta_json") or {}

    prefix = f"[{title}] " if title else ""

    if kind == "tafsir":
        s = meta.get("surah") or meta.get("s")
        a_from = meta.get("ayah_from") or meta.get("ayah")
        a_to   = meta.get("ayah_to")
        if s and a_from:
            ref = f"Surah {s}:{a_from}" if (not a_to or a_to == a_from) else f"Surah {s}:{a_from}-{a_to}"
        else:
            ref = heading
        return f"{prefix}{ref} | {text[:900]}"

    elif kind in ("lexicon",):
        headword = meta.get("headword") or heading or ""
        return f"{prefix}root: {headword} | {text[:900]}"

    else:
        # lexical, sarf, pdf, docx, etc.
        head = heading[:80] if heading else ""
        sep  = " | " if head else ""
        return f"{prefix}{head}{sep}{text[:900]}"


# ── Qdrant helpers ─────────────────────────────────────────────────────────────

def get_qdrant(rebuild: bool = False):
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qm
    cli = QdrantClient(path=str(QDRANT_PATH))
    existing = {col.name for col in cli.get_collections().collections}

    if rebuild and COLLECTION in existing:
        print(f"  Deleting existing '{COLLECTION}' …", file=sys.stderr)
        cli.delete_collection(COLLECTION)
        existing.discard(COLLECTION)
        # Reset done file
        DONE_FILE.write_text("", encoding="utf-8")

    if COLLECTION not in existing:
        cli.create_collection(
            collection_name=COLLECTION,
            vectors_config=qm.VectorParams(size=VECTOR_DIM, distance=qm.Distance.COSINE),
        )
        # Payload indexes for filtered retrieval in extract_claims.py
        for field, schema in [
            ("source_id",    qm.PayloadSchemaType.KEYWORD),
            ("chunk_kind",   qm.PayloadSchemaType.KEYWORD),
            ("source_title", qm.PayloadSchemaType.KEYWORD),
            ("surah",        qm.PayloadSchemaType.INTEGER),
            ("ayah",         qm.PayloadSchemaType.INTEGER),
            ("ayah_from",    qm.PayloadSchemaType.INTEGER),
        ]:
            try:
                cli.create_payload_index(
                    collection_name=COLLECTION,
                    field_name=field,
                    field_schema=schema,
                )
            except Exception:
                pass
    return cli


def point_id_from_chunk_id(chunk_id: str) -> str:
    h = hashlib.md5(chunk_id.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


# ── Ollama embed ───────────────────────────────────────────────────────────────

def embed_batch(texts: list[str]) -> list[list[float]]:
    body = json.dumps({"model": EMBED_MODEL, "input": texts}).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/embed",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read())
    embs = data.get("embeddings") or []
    if not embs:
        raise RuntimeError(f"Empty embeddings from Ollama: {list(data)[:5]}")
    return [list(e) for e in embs]


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch",   type=int,  default=16)
    ap.add_argument("--limit",   type=int,  default=0)
    ap.add_argument("--rebuild", action="store_true",
                    help="Wipe Qdrant and re-embed everything from scratch")
    args = ap.parse_args()

    # Use clean version if available, else fall back
    chunks_file = CLEAN_CHUNKS if CLEAN_CHUNKS.exists() else ALL_CHUNKS
    print(f"Source: {chunks_file.name}", file=sys.stderr)

    # Load already-embedded IDs (empty if --rebuild)
    done: set[str] = set()
    if not args.rebuild and DONE_FILE.exists():
        done = set(DONE_FILE.read_text(encoding="utf-8").splitlines())
    print(f"Already embedded: {len(done):,}", file=sys.stderr)

    # Load chunks
    chunks: list[dict] = []
    with open(chunks_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                c = json.loads(line)
                if c["id"] not in done:
                    chunks.append(c)

    if args.limit > 0:
        chunks = chunks[:args.limit]

    print(f"To embed: {len(chunks):,} chunks (batch={args.batch})", file=sys.stderr)

    cli = get_qdrant(rebuild=args.rebuild)
    from qdrant_client.http import models as qm

    done_fh = open(DONE_FILE, "a", encoding="utf-8")
    n_ok = n_err = 0

    for i in range(0, len(chunks), args.batch):
        batch = chunks[i: i + args.batch]

        # Build Quran-contextual embedding texts
        texts = [build_embed_text(c) for c in batch]

        try:
            vectors = embed_batch(texts)
        except Exception as exc:
            print(f"  Embed error (batch {i // args.batch}): {exc}", file=sys.stderr)
            vectors = []
            for t in texts:
                try:
                    vectors.append(embed_batch([t])[0])
                except Exception as e2:
                    print(f"    skip: {e2}", file=sys.stderr)
                    vectors.append([0.0] * VECTOR_DIM)
                    n_err += 1

        points = []
        for c, vec in zip(batch, vectors):
            meta = c.get("meta_json") or {}
            payload = {
                # Core identifiers
                "chunk_id":     c["id"],
                "source_id":    c.get("source_id"),
                "source_title": c.get("source_title_en") or "",
                "chunk_kind":   c.get("chunk_kind") or "",
                "heading":      c.get("heading_norm") or "",
                # Quran location (for filtered retrieval)
                "surah":        meta.get("surah") or meta.get("s"),
                "ayah":         meta.get("ayah"),
                "ayah_from":    meta.get("ayah_from"),
                "ayah_to":      meta.get("ayah_to"),
                # Text (truncated for payload efficiency)
                "text_ar":      (c.get("text_ar") or "")[:2000],
            }
            points.append(qm.PointStruct(
                id=point_id_from_chunk_id(c["id"]),
                vector=vec,
                payload=payload,
            ))

        cli.upsert(collection_name=COLLECTION, points=points)

        for c in batch:
            done_fh.write(c["id"] + "\n")
        done_fh.flush()
        n_ok += len(batch)

        if (i // args.batch) % 20 == 0:
            pct = (i + len(batch)) / max(len(chunks), 1) * 100
            print(f"  {n_ok:,}/{len(chunks):,} ({pct:.0f}%) embedded …", file=sys.stderr)

    done_fh.close()

    info = cli.get_collection(COLLECTION)
    print(
        f"\nDone. {n_ok:,} embedded | {n_err} errors\n"
        f"Qdrant '{COLLECTION}': {info.points_count:,} total points",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
