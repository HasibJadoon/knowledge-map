"""
K-Maps — Qdrant Collection Setup
Run ONCE before any ingestion.

Usage: python setup_qdrant.py
"""
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

client = QdrantClient(url="http://localhost:6333")

# qwen3-embedding produces 1024-dim vectors
VECTOR_SIZE = 1024

collections = [
    "quran_tafsir_ibn_ashur",
    "quran_tafsir_ibn_kathir",
    "arabic_lexicon_lane",
    "arabic_lexicon_lisan",
]

for name in collections:
    if not client.collection_exists(name):
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"✅ Created collection: {name}")
    else:
        print(f"⏭  Already exists: {name}")

print("\nAll collections ready.")
print("Dashboard: http://localhost:6333/dashboard")
