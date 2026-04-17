"""
embed.py — Embed un-embedded ar_source_chunks into Qdrant.

Usage (via app.py):
  python app.py embed --batch 50
  python app.py embed --source-id <wv_sources_id> --batch 100
"""
from __future__ import annotations
import os
import time
import uuid
from typing import Any

import httpx

import d1
import qdrant_helpers as qh

# --------------------------------------------------------------------------- #
# Embedding backend (swap here to change model)
# --------------------------------------------------------------------------- #
EMBED_MODEL   = "text-embedding-3-small"
EMBED_DIMS    = 1536
EMBED_BACKEND = "openai"  # "openai" | "voyage"


def _embed_openai(texts: list[str]) -> list[list[float]]:
    api_key = os.environ["OPENAI_API_KEY"]
    r = httpx.post(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": EMBED_MODEL, "input": texts},
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()["data"]
    data.sort(key=lambda x: x["index"])
    return [item["embedding"] for item in data]


def _embed_voyage(texts: list[str]) -> list[list[float]]:
    api_key = os.environ["VOYAGE_API_KEY"]
    r = httpx.post(
        "https://api.voyageai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": "voyage-3", "input": texts},
        timeout=60,
    )
    r.raise_for_status()
    return [item["embedding"] for item in r.json()["data"]]


def embed_texts(texts: list[str]) -> list[list[float]]:
    if EMBED_BACKEND == "openai":
        return _embed_openai(texts)
    elif EMBED_BACKEND == "voyage":
        return _embed_voyage(texts)
    else:
        raise ValueError(f"Unknown embed backend: {EMBED_BACKEND}")


# --------------------------------------------------------------------------- #
# Main entry
# --------------------------------------------------------------------------- #

def run(
    source_id: str | None = None,
    batch_size: int = 50,
    dry_run: bool = False,
) -> int:
    """
    Embed all un-embedded chunks (optionally filtered by source).
    Returns number of chunks embedded.
    """
    qh.ensure_collection()

    where = "is_embedded = 0"
    params: list[Any] = []
    if source_id:
        where += " AND ar_u_source = ?"
        params.append(source_id)

    # Count pending
    total_rows = d1.query(
        f"SELECT COUNT(*) as cnt FROM ar_source_chunks WHERE {where}", params
    )
    total = total_rows[0]["cnt"]
    print(f"[embed] {total} chunk(s) pending embedding")
    if total == 0:
        return 0

    embedded = 0
    offset = 0

    while True:
        chunk_params = params + [batch_size, offset]
        chunks = d1.query(
            f"SELECT chunk_id, ar_u_source, chunk_kind, heading_norm, text "
            f"FROM ar_source_chunks WHERE {where} LIMIT ? OFFSET ?",
            chunk_params,
        )
        if not chunks:
            break

        texts = [c["text"][:4000] for c in chunks]  # guard token limit

        if dry_run:
            print(f"  [dry] Would embed {len(texts)} chunks at offset {offset}")
            offset += batch_size
            embedded += len(chunks)
            continue

        vectors = embed_texts(texts)

        # Upsert into Qdrant
        points = []
        for chunk, vec in zip(chunks, vectors):
            qdrant_id = str(uuid.uuid4())
            points.append({
                "id": qdrant_id,
                "vector": vec,
                "payload": {
                    "chunk_id":    chunk["chunk_id"],
                    "ar_u_source": chunk["ar_u_source"],
                    "chunk_kind":  chunk["chunk_kind"] or "other",
                    "heading_norm":chunk["heading_norm"] or "",
                    "text":        chunk["text"][:200],
                    "embed_model": EMBED_MODEL,
                },
            })

        qh.upsert_chunks(points)

        # Write qdrant_ids back to D1
        for chunk, point in zip(chunks, points):
            d1.execute(
                "UPDATE ar_source_chunks SET is_embedded=1, qdrant_id=? WHERE chunk_id=?",
                [point["id"], chunk["chunk_id"]],
            )

        embedded += len(chunks)
        print(f"  [embed] {embedded}/{total} done")
        offset += batch_size
        time.sleep(0.2)   # rate limiting

    print(f"[embed] Done — {embedded} chunks embedded")
    return embedded
