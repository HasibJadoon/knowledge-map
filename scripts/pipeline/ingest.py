"""
ingest.py — Chunk a wv_sources entry into ar_source_chunks rows.

Usage (via app.py):
  python app.py ingest --source-id <wv_sources_id>
  python app.py ingest --source-id <wv_sources_id> --chunk-size 500 --overlap 50
"""
from __future__ import annotations
import re
import time
import textwrap
import hashlib
from typing import Any

import d1

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
DEFAULT_CHUNK_SIZE   = 500   # tokens (approx — we split on words)
DEFAULT_OVERLAP      = 50    # words of overlap between chunks
WORDS_PER_TOKEN      = 0.75  # rough estimate: 1 word ≈ 0.75 tokens


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _make_chunk_id(source_id: str, page_no: int | None, index: int) -> str:
    """Deterministic ULID-style ID for a chunk."""
    raw = f"{source_id}:{page_no}:{index}"
    h = hashlib.sha1(raw.encode()).hexdigest()[:16].upper()
    return f"CHK:{h}"


def _split_into_chunks(
    text: str,
    chunk_size_words: int = int(DEFAULT_CHUNK_SIZE / WORDS_PER_TOKEN),
    overlap_words: int    = DEFAULT_OVERLAP,
) -> list[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size_words, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_size_words - overlap_words
    return chunks


def _infer_chunk_kind(heading: str | None, text: str) -> str:
    """Heuristically classify chunk_kind from heading / text."""
    combined = ((heading or "") + " " + text[:200]).lower()
    if re.search(r"\bsarf\b|\bsyntax\b|\bi.rab\b|نحو|صرف", combined):
        return "syntax"
    if re.search(r"\bbalagha\b|\brhetoric\b|بلاغة|استعارة|تشبيه", combined):
        return "rhetoric"
    if re.search(r"\blexic\b|\bmean\b|\broot\b|\bword\b|لغة|معنى|جذر", combined):
        return "lexical"
    if re.search(r"\baqida\b|\btheolog\b|\bkalam\b|عقيدة|كلام", combined):
        return "theology"
    if re.search(r"\bgrammar\b|\bgrammatical\b|قاعدة", combined):
        return "grammar"
    if re.search(r"\bdiscourse\b|\bcoherence\b|\bnarrat\b|سياق", combined):
        return "discourse_link"
    return "semantic"


# --------------------------------------------------------------------------- #
# Main entry
# --------------------------------------------------------------------------- #

def run(
    source_id: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int    = DEFAULT_OVERLAP,
    dry_run: bool   = False,
) -> int:
    """
    Chunk the source's text into ar_source_chunks rows.
    Returns number of chunks created.
    """
    # 1. Fetch source
    rows = d1.query(
        "SELECT id, title, source_domain FROM wv_sources WHERE id = ?",
        [source_id],
    )
    if not rows:
        raise ValueError(f"Source '{source_id}' not found in wv_sources")
    source = rows[0]
    print(f"[ingest] Source: {source['title']} ({source['id']})")

    # 2. Fetch source units
    units = d1.query(
        "SELECT id, title, order_index, start_ref, end_ref, anchor_text, summary "
        "FROM wv_source_units WHERE source_id = ? ORDER BY order_index",
        [source_id],
    )
    print(f"[ingest] Found {len(units)} source units to chunk")

    # 3. Check if ar_source_chunks has an ar_u_source key for this source
    #    We use source_id as ar_u_source (compatible with ar_u_sources if bridged)
    ar_u_source = source_id  # wv_sources.id used as the chunk source key

    total_created = 0

    for unit in units:
        text_to_chunk = unit.get("anchor_text") or unit.get("summary") or ""
        if not text_to_chunk.strip():
            print(f"  [skip] Unit '{unit['title']}' — no text content")
            continue

        heading = unit.get("title")
        heading_norm = (heading or "").strip().lower()
        chunk_kind = _infer_chunk_kind(heading, text_to_chunk)

        chunk_words = int(chunk_size / WORDS_PER_TOKEN)
        overlap_words = int(overlap / WORDS_PER_TOKEN)
        texts = _split_into_chunks(text_to_chunk, chunk_words, overlap_words)

        print(f"  [unit] '{heading}' → {len(texts)} chunk(s), kind={chunk_kind}")

        for i, chunk_text in enumerate(texts):
            chunk_id = _make_chunk_id(source_id, None, total_created + i)
            text_search = re.sub(r"[^\w\s]", " ", chunk_text).lower()

            if dry_run:
                print(f"    [dry] Would insert chunk {chunk_id} ({len(chunk_text.split())} words)")
                continue

            d1.execute(
                """
                INSERT INTO ar_source_chunks
                  (chunk_id, ar_u_source, heading_raw, heading_norm,
                   text, text_search, chunk_type, chunk_kind, is_embedded,
                   meta_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'other', ?, 0,
                        json_object('unit_id', ?, 'chunk_index', ?),
                        datetime('now'))
                ON CONFLICT(chunk_id) DO NOTHING
                """,
                [
                    chunk_id, ar_u_source, heading, heading_norm,
                    chunk_text, text_search, chunk_kind,
                    unit["id"], i,
                ],
            )

        total_created += len(texts)
        time.sleep(0.05)   # gentle D1 rate-limiting

    print(f"[ingest] Done — {total_created} chunks created for source {source_id}")
    return total_created
