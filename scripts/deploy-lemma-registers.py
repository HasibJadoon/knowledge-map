#!/usr/bin/env python3
"""Deploy seed-al-lemma-registers.sql to km_arabic_linguistic (remote D1).

Runs from repo root:
    python3 scripts/deploy-lemma-registers.py
"""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SEED = REPO / "database/seeds/seed-al-lemma-registers.sql"
WR   = REPO / "node_modules/.bin/wrangler"
CFG  = REPO / "workers/ar-linguistics/wrangler.toml"
DB   = "km_arabic_linguistic"


def run(cmd: list[str], *, label: str) -> None:
    print(f"  → {label}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        sys.exit(result.returncode)


def count_batches() -> int:
    return sum(1 for line in SEED.read_text().splitlines() if line.startswith("INSERT"))


def main() -> None:
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║   K-MAPS  —  Deploy lemma registers seed             ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()
    print(f"  Seed : {SEED.relative_to(REPO)}")
    print(f"  DB   : {DB}")
    print(f"  Config: {CFG.relative_to(REPO)}")

    batches = count_batches()
    print(f"  Batches in file: {batches} × 200 rows")
    print()

    run(
        [str(WR), "d1", "execute", DB,
         "--file", str(SEED),
         "--remote",
         "--config", str(CFG)],
        label=f"wrangler d1 execute {DB} --file {SEED.name}",
    )

    print()
    print("  Verifying row count …")
    run(
        [str(WR), "d1", "execute", DB,
         "--command", "SELECT COUNT(*) AS register_count FROM ar_ling_lemma_registers;",
         "--remote",
         "--config", str(CFG)],
        label="SELECT COUNT(*) FROM ar_ling_lemma_registers",
    )

    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║   ✓  Lemma registers deployed successfully.          ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()


if __name__ == "__main__":
    main()
