#!/usr/bin/env python3
"""
Push near-synonym SQL batches to Cloudflare D1 (km_arabic_linguistic).
Uses wrangler (must already be logged in via 'wrangler login').

Usage — run from the knowledge-map repo root OR from any directory:
    python3 km_arabic_linguistic/ingestion/near_synonyms/output/push_to_d1.py

Prerequisites:
    wrangler login   (already authenticated if you've used wrangler before)
"""
from __future__ import annotations
import shutil, subprocess, sys
from pathlib import Path

DB_NAME     = "km_arabic_linguistic"
SCRIPT_DIR  = Path(__file__).parent
BATCHES_DIR = SCRIPT_DIR / "sql_batches"


def find_wrangler() -> list[str]:
    if shutil.which("wrangler"):
        return ["wrangler"]
    if shutil.which("npx"):
        return ["npx", "wrangler"]
    print("ERROR: wrangler not found. Install with: npm install -g wrangler")
    sys.exit(1)


def push_batch(wr: list[str], path: Path) -> bool:
    cmd = wr + ["d1", "execute", DB_NAME, "--remote", "--file", str(path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"\n  STDERR: {result.stderr[:400]}")
        return False
    return True


def main() -> None:
    wr      = find_wrangler()
    batches = sorted(BATCHES_DIR.glob("batch_*.sql"))
    total   = len(batches)
    if total == 0:
        print(f"No batch files found in {BATCHES_DIR}")
        sys.exit(1)

    print(f"=== Near-synonym D1 push ({total} batches) ===")
    print(f"DB:   {DB_NAME}")
    print(f"Tool: {' '.join(wr)}\n")

    failed = 0
    for idx, path in enumerate(batches, 1):
        size_kb = path.stat().st_size // 1024
        print(f"[{idx:02d}/{total}] {path.name} ({size_kb}KB) ... ", end="", flush=True)
        if push_batch(wr, path):
            print("OK")
        else:
            print("FAILED")
            failed += 1

    print(f"\n=== Done: {total} batches, {failed} failed ===")
    if failed == 0:
        print("✓ All near-synonym data is now live in D1.")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
