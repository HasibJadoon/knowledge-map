"""
extract.py — Run Claude extraction on embedded chunks → wv_insight_suggestions.

Usage (via app.py):
  python app.py extract --source-id <wv_sources_id>
  python app.py extract --source-id <wv_sources_id> --model claude-sonnet-4-6
  python app.py extract --source-id <wv_sources_id> --batch-title "Ibn Ashur run 1"
"""
from __future__ import annotations
import os
import json
import time
import hashlib
from pathlib import Path
from typing import Any

import anthropic

import d1

# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
DEFAULT_MODEL  = "claude-sonnet-4-6"
PROMPTS_DIR    = Path(__file__).parent / "prompts"
MAX_CHUNK_CHARS = 3000   # truncate chunk text sent to Claude

VALID_NODE_TYPES = {
    "concept", "claim", "theme", "tafsir_view", "tafsir_question",
    "motif", "principle", "pattern", "structural_section", "ring_anchor",
    "contrast_pair", "lexical_theme",
}

VALID_RELATION_TYPES = {
    "supports", "contradicts", "mentions", "related_to", "part_of",
    "derived_from", "feeds_output", "questions", "cites", "about",
    "illustrates", "defines", "parallels", "sequence", "leads_to",
    "resolves", "echoes", "contrasts_with", "completes", "dovetails_with",
    "center_of", "framed_by", "mirrors", "anticipates", "fulfilled_by", "other",
}


# --------------------------------------------------------------------------- #
# Prompt loading
# --------------------------------------------------------------------------- #

def _load_prompt(name: str) -> str:
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


# --------------------------------------------------------------------------- #
# Claude call
# --------------------------------------------------------------------------- #

def _call_claude(client: anthropic.Anthropic, model: str, chunk_text: str) -> dict:
    system = _load_prompt("concept_extract")
    user_msg = f"<chunk>\n{chunk_text[:MAX_CHUNK_CHARS]}\n</chunk>"

    msg = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = msg.content[0].text.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  [warn] Claude returned invalid JSON: {e}")
        return {"nodes": [], "edges": [], "motifs": []}


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #

def _validate_extraction(data: dict) -> dict:
    """Filter out invalid node/edge types so bad Claude output doesn't pollute DB."""
    nodes = [
        n for n in data.get("nodes", [])
        if n.get("node_type") in VALID_NODE_TYPES and n.get("title")
    ]
    edges = [
        e for e in data.get("edges", [])
        if e.get("relation_type") in VALID_RELATION_TYPES
        and e.get("from_title") and e.get("to_title")
    ]
    motifs = [
        m for m in data.get("motifs", [])
        if m.get("motif_key") and m.get("title") and m.get("surah")
    ]
    return {"nodes": nodes, "edges": edges, "motifs": motifs}


# --------------------------------------------------------------------------- #
# Suggestion writing
# --------------------------------------------------------------------------- #

def _canonical_id(batch_id: str, chunk_id: str, type_: str, index: int) -> str:
    raw = f"{batch_id}:{chunk_id}:{type_}:{index}"
    return hashlib.sha1(raw.encode()).hexdigest()[:20].upper()


def _write_suggestions(
    batch_id: str,
    chunk_id: str,
    extraction: dict,
    workspace_id: str,
    group_id: str | None,
) -> int:
    """Write extracted items as wv_insight_suggestions rows. Returns count written."""
    written = 0
    items: list[tuple[str, dict, float]] = []

    for i, node in enumerate(extraction.get("nodes", [])):
        items.append(("node", node, node.get("confidence", 0.8)))

    for i, edge in enumerate(extraction.get("edges", [])):
        items.append(("edge", edge, edge.get("confidence", 0.7)))

    for i, motif in enumerate(extraction.get("motifs", [])):
        items.append(("cluster", motif, motif.get("confidence", 0.75)))

    for i, (stype, payload, conf) in enumerate(items):
        canonical = _canonical_id(batch_id, chunk_id, stype, i)
        suggestion_id = f"SUG:{canonical}"
        rationale = payload.pop("rationale", None)

        # Check for duplicate
        existing = d1.query(
            "SELECT 1 FROM wv_insight_suggestions WHERE id = ?", [suggestion_id]
        )
        if existing:
            continue

        d1.execute(
            """
            INSERT INTO wv_insight_suggestions
              (id, canonical_input, workspace_id, group_id, batch_id,
               suggestion_type, payload_json, confidence, rationale, status,
               meta_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'suggested',
                    json_object('chunk_id', ?), datetime('now'))
            """,
            [
                suggestion_id, suggestion_id, workspace_id, group_id, batch_id,
                stype, json.dumps(payload), conf, rationale, chunk_id,
            ],
        )
        written += 1

    return written


# --------------------------------------------------------------------------- #
# Main entry
# --------------------------------------------------------------------------- #

def run(
    source_id: str,
    model: str       = DEFAULT_MODEL,
    batch_title: str | None = None,
    dry_run: bool    = False,
) -> int:
    """
    Extract nodes, edges, motifs from all embedded chunks for a source.
    Writes suggestions to wv_insight_suggestions.
    Returns total suggestions written.
    """
    workspace_id = os.environ["WORKSPACE_ID"]
    group_id     = os.environ.get("GROUP_ID")

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # 1. Find or create distill batch
    title = batch_title or f"extract:{source_id}:{model}"
    batch_rows = d1.query(
        "SELECT id FROM wv_distill_batches WHERE title = ? AND workspace_id = ?",
        [title, workspace_id],
    )
    if batch_rows:
        batch_id = batch_rows[0]["id"]
        print(f"[extract] Using existing batch: {batch_id}")
    else:
        batch_id = f"BAT:{hashlib.sha1(title.encode()).hexdigest()[:16].upper()}"
        if not dry_run:
            d1.execute(
                """
                INSERT INTO wv_distill_batches
                  (id, canonical_input, workspace_id, group_id,
                   batch_type, title, status, created_at)
                VALUES (?, ?, ?, ?, 'insight_generation', ?, 'running', datetime('now'))
                """,
                [batch_id, batch_id, workspace_id, group_id, title],
            )
        print(f"[extract] Created batch: {batch_id}")

    # 2. Fetch embedded chunks for this source
    chunks = d1.query(
        "SELECT chunk_id, heading_norm, text, chunk_kind "
        "FROM ar_source_chunks "
        "WHERE ar_u_source = ? AND is_embedded = 1 "
        "ORDER BY chunk_id",
        [source_id],
    )
    print(f"[extract] {len(chunks)} embedded chunks to process")

    total_suggestions = 0

    for i, chunk in enumerate(chunks):
        print(f"  [{i+1}/{len(chunks)}] chunk {chunk['chunk_id']} ({chunk['chunk_kind']})")

        if dry_run:
            print("    [dry] Skipping Claude call")
            continue

        raw = _call_claude(client, model, chunk["text"])
        validated = _validate_extraction(raw)

        n_nodes  = len(validated["nodes"])
        n_edges  = len(validated["edges"])
        n_motifs = len(validated["motifs"])
        print(f"    → nodes={n_nodes}, edges={n_edges}, motifs={n_motifs}")

        written = _write_suggestions(
            batch_id, chunk["chunk_id"], validated, workspace_id, group_id
        )
        total_suggestions += written

        time.sleep(0.5)   # Claude rate limiting

    # 3. Mark batch ready
    if not dry_run:
        d1.execute(
            "UPDATE wv_distill_batches SET status='ready' WHERE id=?",
            [batch_id],
        )

    print(f"[extract] Done — {total_suggestions} suggestions written (batch: {batch_id})")
    return total_suggestions
