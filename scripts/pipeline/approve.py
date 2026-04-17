"""
approve.py — CLI bulk-approve wv_insight_suggestions → write to wv_* tables.

Usage (via app.py):
  python app.py approve --batch-id <batch_id>
  python app.py approve --batch-id <batch_id> --dry-run
"""
from __future__ import annotations
import os
import json
import hashlib
import time
from typing import Any

import d1


# --------------------------------------------------------------------------- #
# Writers — one per suggestion_type
# --------------------------------------------------------------------------- #

def _write_node(payload: dict, workspace_id: str, group_id: str | None) -> str | None:
    """Write a node suggestion to wv_nodes. Returns node_id or None."""
    node_type = payload.get("node_type", "concept")
    title     = payload.get("title", "").strip()
    if not title:
        return None

    node_id = f"NODE:{hashlib.sha1(title.lower().encode()).hexdigest()[:16].upper()}"

    # Upsert (skip if already exists with same title)
    existing = d1.query("SELECT id FROM wv_nodes WHERE id = ?", [node_id])
    if existing:
        return node_id

    d1.execute(
        """
        INSERT INTO wv_nodes
          (id, canonical_input, workspace_id, group_id, node_type,
           title, text_plain, summary, status, data_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', '{}', datetime('now'))
        """,
        [
            node_id, node_id, workspace_id, group_id, node_type,
            title,
            payload.get("text_plain") or payload.get("summary", ""),
            payload.get("summary", ""),
        ],
    )
    return node_id


def _write_edge(
    payload: dict, workspace_id: str, group_id: str | None
) -> bool:
    """Resolve from/to node titles → IDs and write to wv_node_edges."""
    from_title   = payload.get("from_title", "").strip()
    to_title     = payload.get("to_title", "").strip()
    relation     = payload.get("relation_type", "related_to")

    if not from_title or not to_title:
        return False

    from_id_raw = f"NODE:{hashlib.sha1(from_title.lower().encode()).hexdigest()[:16].upper()}"
    to_id_raw   = f"NODE:{hashlib.sha1(to_title.lower().encode()).hexdigest()[:16].upper()}"

    # Both nodes must exist
    from_rows = d1.query("SELECT id FROM wv_nodes WHERE id = ?", [from_id_raw])
    to_rows   = d1.query("SELECT id FROM wv_nodes WHERE id = ?", [to_id_raw])
    if not from_rows or not to_rows:
        print(f"    [skip edge] missing node: '{from_title}' → '{to_title}'")
        return False

    edge_raw = f"{from_id_raw}:{to_id_raw}:{relation}"
    edge_id  = f"EDGE:{hashlib.sha1(edge_raw.encode()).hexdigest()[:16].upper()}"

    existing = d1.query("SELECT id FROM wv_node_edges WHERE id = ?", [edge_id])
    if existing:
        return True

    d1.execute(
        """
        INSERT INTO wv_node_edges
          (id, canonical_input, workspace_id, group_id,
           from_node_id, to_node_id, relation_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        [
            edge_id, edge_id, workspace_id, group_id,
            from_id_raw, to_id_raw, relation,
            payload.get("note", ""),
        ],
    )
    return True


def _write_motif(payload: dict) -> bool:
    """Write a motif to ar_quran_motif_index + ar_quran_motif_occurrences."""
    motif_key = payload.get("motif_key", "").strip()
    title     = payload.get("title", "").strip()
    surah     = payload.get("surah")
    if not motif_key or not title or not surah:
        return False

    motif_raw = f"MOTIF:{hashlib.sha1(motif_key.encode()).hexdigest()[:16].upper()}"

    # Upsert motif_index
    existing = d1.query(
        "SELECT id FROM ar_quran_motif_index WHERE motif_key = ?", [motif_key]
    )
    if not existing:
        d1.execute(
            """
            INSERT INTO ar_quran_motif_index
              (id, canonical_input, motif_key, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            [motif_raw, motif_raw, motif_key, title],
        )

    # Write occurrence
    occ_raw = f"OCC:{motif_key}:{surah}:{payload.get('ayah_from')}:{payload.get('ayah_to')}"
    occ_id  = f"OCC:{hashlib.sha1(occ_raw.encode()).hexdigest()[:16].upper()}"

    existing_occ = d1.query(
        "SELECT id FROM ar_quran_motif_occurrences WHERE canonical_input = ?",
        [occ_id],
    )
    if not existing_occ:
        d1.execute(
            """
            INSERT INTO ar_quran_motif_occurrences
              (id, canonical_input, motif_id, surah, ayah_from, ayah_to,
               note, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            [
                occ_id, occ_id, motif_raw, surah,
                payload.get("ayah_from"), payload.get("ayah_to"),
                payload.get("note", ""),
            ],
        )
    return True


# --------------------------------------------------------------------------- #
# Main entry
# --------------------------------------------------------------------------- #

def run(batch_id: str, dry_run: bool = False) -> int:
    """
    Approve all 'suggested' items in a batch.
    Returns count of items approved.
    """
    workspace_id = os.environ["WORKSPACE_ID"]
    group_id     = os.environ.get("GROUP_ID")
    user_id      = os.environ.get("USER_ID")

    suggestions = d1.query(
        "SELECT id, suggestion_type, payload_json, confidence "
        "FROM wv_insight_suggestions "
        "WHERE batch_id = ? AND status = 'suggested' "
        "ORDER BY suggestion_type, id",
        [batch_id],
    )

    print(f"[approve] {len(suggestions)} suggestions in batch {batch_id}")

    # Process nodes first (edges depend on them)
    for s in [x for x in suggestions if x["suggestion_type"] == "node"]:
        payload = json.loads(s["payload_json"])
        if dry_run:
            print(f"  [dry] node: {payload.get('title')}")
            continue
        node_id = _write_node(payload, workspace_id, group_id)
        _mark_approved(s["id"], "node", node_id, user_id)
        time.sleep(0.05)

    # Then edges
    for s in [x for x in suggestions if x["suggestion_type"] == "edge"]:
        payload = json.loads(s["payload_json"])
        if dry_run:
            print(f"  [dry] edge: {payload.get('from_title')} → {payload.get('to_title')}")
            continue
        ok = _write_edge(payload, workspace_id, group_id)
        _mark_approved(s["id"], "edge", None, user_id)
        time.sleep(0.05)

    # Then motifs (cluster type)
    for s in [x for x in suggestions if x["suggestion_type"] == "cluster"]:
        payload = json.loads(s["payload_json"])
        if dry_run:
            print(f"  [dry] motif: {payload.get('motif_key')}")
            continue
        _write_motif(payload)
        _mark_approved(s["id"], "cluster", None, user_id)
        time.sleep(0.05)

    total = len(suggestions)
    print(f"[approve] Done — {total} suggestions processed")
    return total


def _mark_approved(
    suggestion_id: str,
    target_type: str,
    target_id: str | None,
    user_id: str | None,
) -> None:
    d1.execute(
        "UPDATE wv_insight_suggestions SET status='saved', updated_at=datetime('now') WHERE id=?",
        [suggestion_id],
    )
    if user_id:
        dec_id = f"DEC:{hashlib.sha1(suggestion_id.encode()).hexdigest()[:16].upper()}"
        d1.execute(
            """
            INSERT OR IGNORE INTO wv_insight_decisions
              (suggestion_id, user_id, decision, target_type, target_id, created_at)
            VALUES (?, ?, 'approve', ?, ?, datetime('now'))
            """,
            [suggestion_id, user_id, target_type, target_id or ""],
        )
