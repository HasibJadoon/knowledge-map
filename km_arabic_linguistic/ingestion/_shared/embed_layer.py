#!/usr/bin/env python3
"""
Unified layer-aware embedder. Builds Quran-contextual embeddings and
upserts into a per-layer Qdrant collection.

Usage:
    python3 _shared/embed_layer.py \
        --input <path-to-jsonl> \
        --collection kmaps_irab_source_chunks \
        [--qdrant-path <path>] \
        [--rebuild] [--batch 32]

Embedding text format:
  [Source Title] {ref/heading} | {text_ar[:900]}
  e.g. [al-Tibyan] Surah 2:255 | text...
       [al-Jurjani - Dalail] balagha theory | text...
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

OLLAMA_URL  = "http://127.0.0.1:11434"
EMBED_MODEL = "nomic-embed-text"
VECTOR_DIM  = 768


def stable_uuid(s: str) -> str:
    h = hashlib.md5(s.encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def build_embed_text(c: dict) -> str:
    title   = c.get("source_title_en") or ""
    heading = c.get("heading_norm") or ""
    text    = c.get("text_ar") or ""
    meta    = c.get("meta_json") or {}
    kind    = c.get("chunk_kind", "")
    prefix  = f"[{title}] " if title else ""

    if kind in ("tafsir", "irab"):
        s = meta.get("surah") or meta.get("s")
        af = meta.get("ayah_from") or meta.get("ayah")
        at = meta.get("ayah_to")
        if s and af:
            ref = f"Surah {s}:{af}" if (not at or at == af) else f"Surah {s}:{af}-{at}"
        else:
            ref = heading[:80]
        return f"{prefix}{ref} | {text[:900]}"

    elif kind == "lexicon":
        head = meta.get("headword") or heading or ""
        return f"{prefix}root: {head} | {text[:900]}"

    elif kind in ("balagha", "balagha_theory", "balagha_aux"):
        head = heading[:80] if heading else ""
        sep = " | " if head else ""
        s = meta.get("surah"); af = meta.get("ayah_from") or meta.get("ayah")
        if s and af:
            return f"{prefix}Surah {s}:{af}{sep}{head} | {text[:900]}"
        return f"{prefix}{head}{sep}{text[:900]}"

    else:
        return f"{prefix}{heading[:80]} | {text[:900]}"


def embed_batch(texts: list[str]) -> list[list[float]]:
    body = json.dumps({"model": EMBED_MODEL, "input": texts}).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/embed", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read())
    return [list(e) for e in data.get("embeddings") or []]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input",      required=True, help="JSONL file with chunks")
    ap.add_argument("--collection", required=True, help="Qdrant collection name")
    ap.add_argument("--qdrant-path", default=None, help="Qdrant storage dir")
    ap.add_argument("--done-file",  default=None, help="Tracker file for resumable embedding")
    ap.add_argument("--rebuild",    action="store_true")
    ap.add_argument("--batch",      type=int, default=32)
    ap.add_argument("--limit",      type=int, default=0)
    args = ap.parse_args()

    inp = Path(args.input).resolve()
    qpath = Path(args.qdrant_path or (inp.parent.parent.parent / "data/qdrant_storage")).resolve()
    qpath.mkdir(parents=True, exist_ok=True)
    done_path = Path(args.done_file or (qpath.parent / f"embeddings/{args.collection}_done.txt")).resolve()
    done_path.parent.mkdir(parents=True, exist_ok=True)

    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qm

    cli = QdrantClient(path=str(qpath))
    existing = {col.name for col in cli.get_collections().collections}

    if args.rebuild and args.collection in existing:
        print(f"Deleting existing '{args.collection}'", file=sys.stderr)
        cli.delete_collection(args.collection)
        existing.discard(args.collection)
        if done_path.exists(): done_path.unlink()

    if args.collection not in existing:
        cli.create_collection(
            collection_name=args.collection,
            vectors_config=qm.VectorParams(size=VECTOR_DIM, distance=qm.Distance.COSINE),
        )
        for fname, ftype in [
            ("source_id",    qm.PayloadSchemaType.KEYWORD),
            ("chunk_kind",   qm.PayloadSchemaType.KEYWORD),
            ("source_title", qm.PayloadSchemaType.KEYWORD),
            ("surah",        qm.PayloadSchemaType.INTEGER),
            ("ayah",         qm.PayloadSchemaType.INTEGER),
            ("ayah_from",    qm.PayloadSchemaType.INTEGER),
        ]:
            try:
                cli.create_payload_index(collection_name=args.collection,
                                         field_name=fname, field_schema=ftype)
            except Exception:
                pass

    done: set[str] = set()
    if not args.rebuild and done_path.exists():
        done = set(done_path.read_text(encoding="utf-8").splitlines())

    chunks: list[dict] = []
    with open(inp, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                c = json.loads(line)
                if c["id"] not in done:
                    chunks.append(c)

    if args.limit > 0:
        chunks = chunks[:args.limit]
    print(f"Source: {inp.name} | already embedded: {len(done):,} | to embed: {len(chunks):,}",
          file=sys.stderr)

    done_fh = open(done_path, "a", encoding="utf-8")
    n_ok = n_err = 0

    for i in range(0, len(chunks), args.batch):
        batch = chunks[i: i + args.batch]
        texts = [build_embed_text(c) for c in batch]
        try:
            vectors = embed_batch(texts)
        except Exception as e:
            print(f"Batch {i // args.batch} embed failed: {e}", file=sys.stderr)
            vectors = []
            for t in texts:
                try: vectors.append(embed_batch([t])[0])
                except: vectors.append([0.0]*VECTOR_DIM); n_err += 1

        points = []
        for c, vec in zip(batch, vectors):
            meta = c.get("meta_json") or {}
            payload = {
                "chunk_id":     c["id"],
                "source_id":    c.get("source_id"),
                "source_title": c.get("source_title_en") or "",
                "chunk_kind":   c.get("chunk_kind") or "",
                "heading":      c.get("heading_norm") or "",
                "surah":        meta.get("surah") or meta.get("s"),
                "ayah":         meta.get("ayah"),
                "ayah_from":    meta.get("ayah_from"),
                "ayah_to":      meta.get("ayah_to"),
                "text_ar":      (c.get("text_ar") or "")[:2000],
            }
            points.append(qm.PointStruct(id=stable_uuid(c["id"]), vector=vec, payload=payload))

        cli.upsert(collection_name=args.collection, points=points)
        for c in batch:
            done_fh.write(c["id"] + "\n")
        done_fh.flush()
        n_ok += len(batch)

        if (i // args.batch) % 20 == 0:
            pct = (i + len(batch)) / max(len(chunks), 1) * 100
            print(f"  {n_ok:,}/{len(chunks):,} ({pct:.0f}%)", file=sys.stderr)

    done_fh.close()
    info = cli.get_collection(args.collection)
    print(f"\nDone. {n_ok:,} embedded | {n_err} errors\n"
          f"Qdrant '{args.collection}': {info.points_count:,} points", file=sys.stderr)


if __name__ == "__main__":
    main()
