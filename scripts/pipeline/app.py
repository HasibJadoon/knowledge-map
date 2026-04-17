#!/usr/bin/env python3
"""
app.py — K-Maps AI Pipeline CLI

Commands:
  ingest   --source-id <id> [--chunk-size 500] [--overlap 50] [--dry-run]
  embed    [--source-id <id>] [--batch 50] [--dry-run]
  extract  --source-id <id> [--model claude-sonnet-4-6] [--batch-title "..."] [--dry-run]
  approve  --batch-id <id> [--dry-run]
  status   [--source-id <id>]
  qdrant   info | reset-collection

Setup:
  cp .env.example .env          # fill in your credentials
  uv venv .venv
  source .venv/bin/activate
  uv pip install -r requirements.txt
  python app.py status
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the pipeline directory
load_dotenv(Path(__file__).parent / ".env")

import d1
import qdrant_helpers as qh


def cmd_ingest(args: argparse.Namespace) -> None:
    import ingest
    d1.init()
    ingest.run(
        source_id  = args.source_id,
        chunk_size = args.chunk_size,
        overlap    = args.overlap,
        dry_run    = args.dry_run,
    )


def cmd_embed(args: argparse.Namespace) -> None:
    import embed
    d1.init()
    qh.init()
    embed.run(
        source_id  = args.source_id,
        batch_size = args.batch,
        dry_run    = args.dry_run,
    )


def cmd_extract(args: argparse.Namespace) -> None:
    import extract
    d1.init()
    extract.run(
        source_id   = args.source_id,
        model       = args.model,
        batch_title = args.batch_title,
        dry_run     = args.dry_run,
    )


def cmd_approve(args: argparse.Namespace) -> None:
    import approve
    d1.init()
    approve.run(batch_id=args.batch_id, dry_run=args.dry_run)


def cmd_status(args: argparse.Namespace) -> None:
    d1.init()

    where = ""
    params = []
    if args.source_id:
        where = "WHERE ar_u_source = ?"
        params = [args.source_id]

    rows = d1.query(
        f"""
        SELECT
          ar_u_source,
          COUNT(*) as total_chunks,
          SUM(is_embedded) as embedded,
          COUNT(*) - SUM(is_embedded) as pending
        FROM ar_source_chunks {where}
        GROUP BY ar_u_source
        ORDER BY ar_u_source
        """,
        params,
    )
    if not rows:
        print("No chunks found.")
        return

    print(f"\n{'Source':<40} {'Total':>8} {'Embedded':>10} {'Pending':>9}")
    print("-" * 72)
    for r in rows:
        print(f"{r['ar_u_source']:<40} {r['total_chunks']:>8} {r['embedded']:>10} {r['pending']:>9}")

    # Suggestions summary
    sug = d1.query(
        """
        SELECT status, COUNT(*) as cnt
        FROM wv_insight_suggestions
        GROUP BY status
        ORDER BY status
        """
    )
    if sug:
        print("\nSuggestions:")
        for s in sug:
            print(f"  {s['status']:<12} {s['cnt']}")


def cmd_qdrant(args: argparse.Namespace) -> None:
    qh.init()
    if args.qdrant_cmd == "info":
        try:
            info = qh.collection_info()
            print(f"Collection: {qh.COLLECTION}")
            for k, v in info.items():
                print(f"  {k}: {v}")
        except Exception as e:
            print(f"Qdrant error: {e}")
    elif args.qdrant_cmd == "reset-collection":
        confirm = input(
            f"This will DELETE and recreate collection '{qh.COLLECTION}'. "
            "Type YES to confirm: "
        )
        if confirm.strip() == "YES":
            qh.reset_collection()
            print("Done. Remember to re-embed all chunks:")
            print("  python app.py embed --batch 100")
        else:
            print("Aborted.")


# --------------------------------------------------------------------------- #
# Argument parsing
# --------------------------------------------------------------------------- #

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python app.py",
        description="K-Maps AI Pipeline",
    )
    sub = p.add_subparsers(dest="command", required=True)

    # ingest
    pi = sub.add_parser("ingest", help="Chunk a wv_sources entry into ar_source_chunks")
    pi.add_argument("--source-id", required=True, help="wv_sources.id")
    pi.add_argument("--chunk-size", type=int, default=500, help="Target chunk size in tokens")
    pi.add_argument("--overlap", type=int, default=50, help="Overlap tokens between chunks")
    pi.add_argument("--dry-run", action="store_true")

    # embed
    pe = sub.add_parser("embed", help="Embed un-embedded chunks into Qdrant")
    pe.add_argument("--source-id", default=None, help="Limit to one source")
    pe.add_argument("--batch", type=int, default=50, help="Chunks per API call")
    pe.add_argument("--dry-run", action="store_true")

    # extract
    px = sub.add_parser("extract", help="Run Claude extraction → wv_insight_suggestions")
    px.add_argument("--source-id", required=True, help="wv_sources.id")
    px.add_argument("--model", default="claude-sonnet-4-6",
                    choices=["claude-sonnet-4-6", "claude-opus-4-6"])
    px.add_argument("--batch-title", default=None, help="Human label for this batch")
    px.add_argument("--dry-run", action="store_true")

    # approve
    pa = sub.add_parser("approve", help="Bulk-approve suggestions → wv_nodes / wv_node_edges")
    pa.add_argument("--batch-id", required=True, help="wv_distill_batches.id")
    pa.add_argument("--dry-run", action="store_true")

    # status
    ps = sub.add_parser("status", help="Show pipeline progress for all sources")
    ps.add_argument("--source-id", default=None)

    # qdrant
    pq = sub.add_parser("qdrant", help="Qdrant collection management")
    pq.add_argument("qdrant_cmd", choices=["info", "reset-collection"])

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    dispatch = {
        "ingest":  cmd_ingest,
        "embed":   cmd_embed,
        "extract": cmd_extract,
        "approve": cmd_approve,
        "status":  cmd_status,
        "qdrant":  cmd_qdrant,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
