#!/usr/bin/env python3
"""
Direct Arabic text repair pipeline — no AI required.

Fixes PDF RTL extraction artifacts in ar_ling_expressions:
  - Spaces injected inside Arabic words (most common artifact)
  - Consecutive short fragments (≤ 3 Arabic chars) are joined without spaces
  - Segments with ≥ 4 Arabic chars are treated as proper word boundaries

Algorithm: split each pipe-separated term on spaces, then greedily merge
consecutive fragments where every fragment has ≤ 3 Arabic letters.

Stages:
  1. Fetch all AREX:VI:* records from D1 via wrangler  →  d1_dump.json
  2. Apply repair heuristic                            →  repaired.json
  3. Generate UPDATE SQL batches                       →  direct_repair_sql/upd_*.sql
  4. Push UPDATE SQL to D1 via wrangler

Usage:
  cd /Users/abdulhasibahmedjadoon/Documents/LLM/knowledge-map
  python3 km_arabic_linguistic/ingestion/archive/raw/sarf/repair_arabic_direct.py

  # Or individual stages:
  python3 ... --stage=fetch
  python3 ... --stage=repair
  python3 ... --stage=push
"""

from __future__ import annotations
import json, re, shutil, subprocess, sys
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
DB_NAME    = "km_arabic_linguistic"
BATCH_SIZE = 200          # UPDATE statements per SQL file

SCRIPT_DIR  = Path(__file__).parent
WORK_DIR    = SCRIPT_DIR / "direct_repair_work"

D1_DUMP_FILE = WORK_DIR / "d1_dump.json"
REPAIRED_FILE = WORK_DIR / "repaired.json"
SQL_DIR       = WORK_DIR / "direct_repair_sql"

# ── Arabic helpers ────────────────────────────────────────────────────────────
AR_CHAR = re.compile(r'[ء-يٱ]')

def count_ar(s: str) -> int:
    return len(AR_CHAR.findall(s))


def repair_term(term: str) -> str:
    """
    Fix a single pipe-free Arabic expression.

    Strategy: split on spaces, then greedily merge consecutive short fragments
    (each ≤ 3 Arabic chars).  Fragments ≥ 4 chars are treated as word anchors.
    A lone single-letter fragment adjacent to a long word is attached to it
    (handles Arabic prefix letters: و ب ف ل ك).
    """
    term = re.sub(r'\s+', ' ', term).strip()
    segs = term.split(' ')
    if len(segs) == 1:
        return term

    result: list[str] = []
    i = 0
    while i < len(segs):
        seg  = segs[i]
        ar   = count_ar(seg)

        if ar <= 3:
            # Start accumulating a run of short fragments
            run = seg
            j   = i + 1
            while j < len(segs):
                ns  = segs[j]
                nar = count_ar(ns)
                if nar <= 3:
                    run += ns           # join without space
                    j   += 1
                else:
                    # Long word: only attach if current run is a single Arabic
                    # letter (likely a prefix like ب / و / ل / ف / ك)
                    if count_ar(run) == 1:
                        run += ns
                        j   += 1
                    break
            result.append(run)
            i = j
        else:
            result.append(seg)
            i += 1

    return ' '.join(result)


def repair_arabic(text: str) -> str:
    if not text:
        return text
    terms = [t.strip() for t in text.split('|')]
    return ' | '.join(repair_term(t) for t in terms if t.strip())


# ── Helpers ───────────────────────────────────────────────────────────────────
def find_wrangler() -> list[str]:
    for cmd in [["wrangler"], ["npx", "wrangler"]]:
        if shutil.which(cmd[0]):
            return cmd
    print("ERROR: wrangler not found. Install with: npm install -g wrangler")
    sys.exit(1)


def escape_sql(s: str) -> str:
    return s.replace("'", "''")


# ── Stage 1: Fetch from D1 ────────────────────────────────────────────────────
def stage_fetch() -> list[dict]:
    WORK_DIR.mkdir(exist_ok=True)
    wr = find_wrangler()
    print("📥  Fetching AREX:VI:* records from D1…")

    cmd = wr + [
        "d1", "execute", DB_NAME, "--remote", "--json",
        "--command",
        "SELECT id, expression_ar FROM ar_ling_expressions "
        "WHERE id LIKE 'AREX:VI:%' ORDER BY id"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"ERROR:\n{r.stderr}")
        sys.exit(1)

    data = json.loads(r.stdout)
    rows = data[0]["results"] if isinstance(data, list) else data.get("results", [])
    D1_DUMP_FILE.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    print(f"✅  Fetched {len(rows)} expressions  →  {D1_DUMP_FILE.name}")
    return rows


# ── Stage 2: Repair + generate SQL ───────────────────────────────────────────
def stage_repair() -> None:
    if not D1_DUMP_FILE.exists():
        print("Run --stage=fetch first"); sys.exit(1)

    rows = json.loads(D1_DUMP_FILE.read_text())
    print(f"🔧  Repairing {len(rows)} expressions…")

    updates: list[tuple[str, str, str]] = []
    unchanged = 0

    for row in rows:
        rid   = row["id"]
        orig  = (row.get("expression_ar") or "").strip()
        fixed = repair_arabic(orig)

        if fixed == orig:
            unchanged += 1
        else:
            updates.append((rid, orig, fixed))

    print(f"     Changed : {len(updates)}")
    print(f"     No change: {unchanged}")

    # Save for inspection
    REPAIRED_FILE.write_text(
        json.dumps(
            [{"id": rid, "before": before, "after": after}
             for rid, before, after in updates],
            ensure_ascii=False,
            indent=2
        )
    )
    print(f"     Diff saved → {REPAIRED_FILE.name}")

    # Write UPDATE SQL batches
    SQL_DIR.mkdir(exist_ok=True)
    for old in SQL_DIR.glob("upd_*.sql"):
        old.unlink()

    for batch_i, start in enumerate(range(0, len(updates), BATCH_SIZE)):
        chunk = updates[start : start + BATCH_SIZE]
        lines = [
            f"UPDATE ar_ling_expressions "
            f"SET expression_ar='{escape_sql(after)}' "
            f"WHERE id='{escape_sql(rid)}';"
            for rid, _before, after in chunk
        ]
        (SQL_DIR / f"upd_{batch_i:04d}.sql").write_text("\n".join(lines) + "\n")

    n_files = (len(updates) + BATCH_SIZE - 1) // BATCH_SIZE if updates else 0
    print(f"✅  {len(updates)} UPDATE statements  →  {SQL_DIR.name}/  ({n_files} files)")


# ── Stage 3: Push to D1 ───────────────────────────────────────────────────────
def stage_push() -> None:
    if not SQL_DIR.exists() or not list(SQL_DIR.glob("upd_*.sql")):
        print("Run --stage=repair first (or nothing to update)"); sys.exit(1)

    wr    = find_wrangler()
    files = sorted(SQL_DIR.glob("upd_*.sql"))
    total = len(files)
    failed: list[str] = []

    print(f"🚀  Pushing {total} UPDATE batches to D1…")
    for i, path in enumerate(files, 1):
        print(f"  [{i:02d}/{total}]  {path.name} … ", end="", flush=True)
        cmd = wr + ["d1", "execute", DB_NAME, "--remote", "--file", str(path)]
        r   = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            print("✅")
        else:
            print(f"❌")
            print(f"           {r.stderr.strip()[:200]}")
            failed.append(path.name)

    if failed:
        print(f"\n⚠️   {len(failed)} batch(es) failed: {failed}")
        print("     Retry individually:")
        for f in failed:
            print(f"       wrangler d1 execute {DB_NAME} --remote --file {SQL_DIR / f}")
    else:
        print(f"\n🎉  All done! Verifying sample…")
        wr2 = find_wrangler()
        subprocess.run(wr2 + [
            "d1", "execute", DB_NAME, "--remote",
            "--command",
            "SELECT id, expression_ar FROM ar_ling_expressions "
            "WHERE id LIKE 'AREX:VI:%' LIMIT 8"
        ])


# ── Main ──────────────────────────────────────────────────────────────────────
STAGE_MAP = {
    "fetch":  stage_fetch,
    "repair": stage_repair,
    "push":   stage_push,
}


def main() -> None:
    stage = "all"
    for arg in sys.argv[1:]:
        if arg.startswith("--stage="):
            stage = arg.split("=", 1)[1]

    WORK_DIR.mkdir(exist_ok=True)

    if stage == "all":
        stage_fetch()
        stage_repair()
        stage_push()
    elif stage in STAGE_MAP:
        STAGE_MAP[stage]()
    else:
        print(f"Unknown stage '{stage}'. Options: {', '.join(STAGE_MAP)} | all")
        sys.exit(1)


if __name__ == "__main__":
    main()
