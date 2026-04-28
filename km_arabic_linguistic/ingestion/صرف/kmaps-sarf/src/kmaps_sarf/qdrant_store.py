"""Qdrant local on-disk store. No Docker required.

Collections per technical doc §9:
  kmaps_sarf_source_chunks
  kmaps_sarf_claims
  kmaps_sarf_ui_cards
  kmaps_sarf_review_memory
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Iterable

from .config import PROJECT_ROOT


COLLECTIONS = {
    "kmaps_sarf_source_chunks": 768,  # nomic-embed-text dim
    "kmaps_sarf_claims": 768,
    "kmaps_sarf_ui_cards": 768,
    "kmaps_sarf_review_memory": 768,
}


def _client():
    from qdrant_client import QdrantClient  # type: ignore

    path = os.getenv("QDRANT_PATH") or str(PROJECT_ROOT / "data" / "qdrant_storage")
    Path(path).mkdir(parents=True, exist_ok=True)
    return QdrantClient(path=path)


def ensure_collections(vector_size: int = 768) -> None:
    from qdrant_client.http import models as qm  # type: ignore

    cli = _client()
    existing = {c.name for c in cli.get_collections().collections}
    for name, dim in COLLECTIONS.items():
        if name in existing:
            continue
        cli.create_collection(
            collection_name=name,
            vectors_config=qm.VectorParams(size=vector_size or dim, distance=qm.Distance.COSINE),
        )
    # Indexed payload fields for filtering
    indexes = [
        ("surah", qm.PayloadSchemaType.INTEGER),
        ("ayah_from", qm.PayloadSchemaType.INTEGER),
        ("ayah_to", qm.PayloadSchemaType.INTEGER),
        ("word_index", qm.PayloadSchemaType.INTEGER),
        ("root", qm.PayloadSchemaType.KEYWORD),
        ("lemma", qm.PayloadSchemaType.KEYWORD),
        ("pattern", qm.PayloadSchemaType.KEYWORD),
        ("source_id", qm.PayloadSchemaType.KEYWORD),
        ("source_family", qm.PayloadSchemaType.KEYWORD),
        ("chunk_kind", qm.PayloadSchemaType.KEYWORD),
        ("review_status", qm.PayloadSchemaType.KEYWORD),
        ("hash_ar", qm.PayloadSchemaType.KEYWORD),
    ]
    for name in COLLECTIONS:
        for field, schema in indexes:
            try:
                cli.create_payload_index(collection_name=name, field_name=field, field_schema=schema)
            except Exception:
                pass


def upsert_points(collection: str, points: Iterable[dict]) -> int:
    from qdrant_client.http import models as qm  # type: ignore

    cli = _client()
    batch = list(points)
    if not batch:
        return 0
    qpoints = [
        qm.PointStruct(id=p["id"], vector=p["vector"], payload=p.get("payload") or {})
        for p in batch
    ]
    cli.upsert(collection_name=collection, points=qpoints)
    return len(qpoints)


def search(
    collection: str,
    vector: list[float],
    *,
    must: dict | None = None,
    should: dict | None = None,
    limit: int = 24,
) -> list[Any]:
    from qdrant_client.http import models as qm  # type: ignore

    cli = _client()

    def _flt(d: dict | None) -> list[Any]:
        if not d:
            return []
        out = []
        for k, v in d.items():
            if isinstance(v, list):
                out.append(qm.FieldCondition(key=k, match=qm.MatchAny(any=v)))
            else:
                out.append(qm.FieldCondition(key=k, match=qm.MatchValue(value=v)))
        return out

    flt = qm.Filter(
        must=_flt(must) or None,
        should=_flt(should) or None,
    )
    return cli.search(
        collection_name=collection,
        query_vector=vector,
        query_filter=flt,
        limit=limit,
        with_payload=True,
    )
