"""
qdrant_helpers.py — Qdrant vector store helpers for the K-Maps pipeline.
Collection: "km_chunks"   Vector size: 1536 (text-embedding-3-small)
"""
from __future__ import annotations
import os
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

_client: QdrantClient | None = None
COLLECTION = "km_chunks"
VECTOR_SIZE = 1536   # text-embedding-3-small / voyage-3 dimensionality


def init() -> None:
    """Initialise Qdrant client from environment. Call once at startup."""
    global _client
    url = os.environ.get("QDRANT_URL", "http://localhost:6333")
    _client = QdrantClient(url=url)


def _c() -> QdrantClient:
    if _client is None:
        raise RuntimeError("qdrant_helpers.init() not called")
    return _client


def ensure_collection() -> None:
    """Create collection if it doesn't already exist."""
    c = _c()
    existing = [col.name for col in c.get_collections().collections]
    if COLLECTION not in existing:
        c.recreate_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"[qdrant] Created collection '{COLLECTION}'")
    else:
        print(f"[qdrant] Collection '{COLLECTION}' already exists")


def reset_collection() -> None:
    """Delete and recreate the collection (use when changing embedding model)."""
    c = _c()
    c.delete_collection(COLLECTION)
    c.recreate_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    print(f"[qdrant] Reset collection '{COLLECTION}'")


def upsert_chunks(points: list[dict]) -> None:
    """
    Upsert a batch of chunk vectors.
    Each dict: { "id": str_uuid, "vector": list[float], "payload": dict }
    """
    c = _c()
    structs = [
        PointStruct(id=p["id"], vector=p["vector"], payload=p["payload"])
        for p in points
    ]
    c.upsert(collection_name=COLLECTION, points=structs)


def search(
    vector: list[float],
    source_filter: str | None = None,
    kind_filter: str | None = None,
    top_k: int = 10,
) -> list[dict]:
    """Semantic search over km_chunks. Returns list of {chunk_id, score, payload}."""
    c = _c()
    must: list[Any] = []
    if source_filter:
        must.append(FieldCondition(key="ar_u_source", match=MatchValue(value=source_filter)))
    if kind_filter:
        must.append(FieldCondition(key="chunk_kind", match=MatchValue(value=kind_filter)))

    results = c.search(
        collection_name=COLLECTION,
        query_vector=vector,
        query_filter=Filter(must=must) if must else None,
        limit=top_k,
        with_payload=True,
    )
    return [
        {
            "chunk_id": r.payload.get("chunk_id"),
            "score": r.score,
            "payload": r.payload,
        }
        for r in results
    ]


def collection_info() -> dict:
    """Return basic stats about the collection."""
    c = _c()
    info = c.get_collection(COLLECTION)
    return {
        "vectors_count": info.vectors_count,
        "points_count": info.points_count,
        "status": str(info.status),
    }
