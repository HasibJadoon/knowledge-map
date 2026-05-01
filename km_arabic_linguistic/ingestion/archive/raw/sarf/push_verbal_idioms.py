#!/usr/bin/env python3
"""Push verbal idioms batches (diacritics removed, deduplicated) to D1.
Run from knowledge-map repo root:
    python3 km_arabic_linguistic/ingestion/archive/raw/sarf/push_verbal_idioms.py
"""
from __future__ import annotations
import shutil, subprocess, sys
from pathlib import Path

DB_NAME     = "km_arabic_linguistic"
SCRIPT_DIR  = Path(__file__).parent
BATCHES_DIR = SCRIPT_DIR / "vi_sql_batches_v2"   # delete + fresh inserts

def find_wrangler():
    if shutil.which("wrangler"): return ["wrangler"]
    if shutil.which("npx"):      return ["npx", "wrangler"]
    print("ERROR: wrangler not found.")
    sys.exit(1)

def push_batch(wr, path):
    cmd = wr + ["d1", "execute", DB_NAME, "--remote", "--file", str(path)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"\n  STDERR: {r.stderr[:400]}")
        return False
    return True

def main():
    wr      = find_wrangler()
    batches = sorted(BATCHES_DIR.glob("b*.sql"), key=lambda p: p.name)
    total   = len(batches)
    if total == 0:
        print(f"No batch files in {BATCHES_DIR}")
        sys.exit(1)
    print(f"=== Verbal idioms D1 push ({total} batches, ~2188 expressions) ===")
    print(f"DB: {DB_NAME}  Tool: {' '.join(wr)}\n")
    failed = 0
    for idx, path in enumerate(batches, 1):
        kb = path.stat().st_size // 1024
        print(f"[{idx:02d}/{total}] {path.name} ({kb}KB) ... ", end="", flush=True)
        ok = push_batch(wr, path)
        print("OK" if ok else "FAILED")
        if not ok: failed += 1
    print(f"\n=== Done: {total} batches, {failed} failed ===")
    if failed == 0:
        print("✓ Verbal idiom expressions live in D1.")
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()
