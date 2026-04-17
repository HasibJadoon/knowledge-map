"""
K-Maps Tafsir Ingest Pipeline
Reads a JSON chunk file, embeds each chunk with Ollama qwen3-embedding,
and upserts the vectors + payloads into Qdrant.

Usage:
  python ingest_from_file.py --file chunks/ibn_ashur_12_3.json
  python ingest_from_file.py --file chunks/ibn_ashur_12_3.json --dry-run
"""

import json
import argparse
import uuid
import requests
from pathlib import Path
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# ── Config ─────────────────────────────────────────────────────────────────
OLLAMA_URL  = "http://localhost:11434/api/embed"
EMBED_MODEL = "qwen3-embedding"
QDRANT_URL  = "http://localhost:6333"


# ── Embedding ───────────────────────────────────────────────────────────────
def embed_text(text: str) -> list[float]:
    """Call Ollama to embed text. Returns float list."""
    r = requests.post(
        OLLAMA_URL,
        json={"model": EMBED_MODEL, "input": text},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["embeddings"][0]


# ── Main ────────────────────────────────────────────────────────────────────
def ingest(file_path: str, dry_run: bool = False):
    data    = json.loads(Path(file_path).read_text(encoding="utf-8"))
    collection = data["collection_name"]
    records    = data["records"]

    qdrant = QdrantClient(url=QDRANT_URL)

    print(f"📦 Ingesting {len(records)} chunks → collection: {collection}")
    print(f"   Embedding model: {data.get('embedding_model', EMBED_MODEL)}\n")

    points = []
    for i, record in enumerate(records):
        chunk_id        = record["id"]
        embedding_input = record["embedding_input"]
        payload         = record["payload"]

        print(f"  [{i+1}/{len(records)}] Embedding: {chunk_id}")

        if not dry_run:
            vector = embed_text(embedding_input)
        else:
            vector = [0.0] * 1024  # dummy for dry run

        # Deterministic UUID from chunk_id string
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))

        payload["qdrant_point_id"] = point_id
        payload["chunk_id"]        = chunk_id

        points.append(PointStruct(
            id      = point_id,
            vector  = vector,
            payload = payload,
        ))

    if not dry_run:
        batch_size = 50
        for start in range(0, len(points), batch_size):
            batch = points[start:start + batch_size]
            qdrant.upsert(collection_name=collection, points=batch)
            print(f"  ✅ Upserted batch {start // batch_size + 1} ({len(batch)} points)")
    else:
        print("\n[DRY RUN] No data written to Qdrant.")

    print(f"\n🎉 Done! {len(points)} chunks embedded and stored.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest tafsir chunks into Qdrant")
    parser.add_argument("--file",    required=True, help="Path to JSON chunk file")
    parser.add_argument("--dry-run", action="store_true", help="Test without writing")
    args = parser.parse_args()
    ingest(args.file, dry_run=args.dry_run)
