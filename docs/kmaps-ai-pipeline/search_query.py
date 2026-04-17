"""
K-Maps Semantic Search CLI
Usage: python search_query.py "what does ibn ashur say about sabr in yusuf"
       python search_query.py "light metaphor" --collection quran_tafsir_ibn_ashur --limit 3
"""

import sys
import argparse
import requests

TOOL_SERVER = "http://localhost:8000"


def search(query: str, collection: str = "quran_tafsir_ibn_ashur", limit: int = 5):
    r = requests.post(
        f"{TOOL_SERVER}/search_tafsir",
        json={"query": query, "collection": collection, "limit": limit},
        timeout=30,
    )
    r.raise_for_status()
    results = r.json()

    print(f"\n🔍 Query: \"{query}\"")
    print(f"   Collection: {collection} | Top {limit} results\n")

    if not results:
        print("  No results found.")
        return

    for i, res in enumerate(results):
        score     = res.get("score", 0)
        ayah_ref  = res.get("ayah_ref", "?")
        kind      = res.get("chunk_kind", "?")
        title_en  = res.get("title_en", "")
        text      = res.get("text", "")[:250]

        bar = "█" * int(score * 20)
        print(f"  [{i+1}] {bar} {score:.3f}")
        print(f"       {ayah_ref} | {kind}")
        if title_en:
            print(f"       {title_en}")
        print(f"       {text}...")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Search K-Maps tafsir semantically")
    parser.add_argument("query", nargs="*", help="Search query")
    parser.add_argument("--collection", default="quran_tafsir_ibn_ashur")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()

    query = " ".join(args.query) if args.query else "divine wisdom in the story of Yusuf"
    search(query, args.collection, args.limit)
