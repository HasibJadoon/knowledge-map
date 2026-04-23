#!/usr/bin/env python3
"""Deploy all morphology seeds and migrations to remote D1.

Runs from repo root:
    python3 scripts/deploy-all-seeds.py
"""
from __future__ import annotations
import json
import re
import subprocess
import sys
from pathlib import Path

REPO    = Path(__file__).resolve().parent.parent
SEEDS   = REPO / "database/seeds"
MIG_QR  = REPO / "database/migrations/km-quran"
MIG_AL  = REPO / "database/migrations/km-arabic-linguistics"
WR      = REPO / "node_modules/.bin/wrangler"
AL_CFG  = REPO / "workers/ar-linguistics/wrangler.toml"
QR_CFG  = REPO / "workers/quran/wrangler.toml"


# ── helpers ──────────────────────────────────────────────────────────────────

def batches(path: Path) -> int:
    return sum(1 for l in path.read_text().splitlines() if l.startswith("INSERT"))


def d1_execute(db: str, cfg: Path, *, file: Path | None = None, cmd: str | None = None) -> str:
    args = [str(WR), "d1", "execute", db, "--remote", "--config", str(cfg)]
    if file:
        args += ["--file", str(file)]
    elif cmd:
        args += ["--command", cmd]
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr.strip(), file=sys.stderr)
        sys.exit(result.returncode)
    return result.stdout


def parse_wrangler_json(out: str) -> list:
    m = re.search(r"(\[[\s\S]*\])", out)
    if not m:
        return []
    return json.loads(m.group(1))


def count_remote(db: str, cfg: Path, table: str) -> int:
    out = d1_execute(db, cfg, cmd=f"SELECT COUNT(*) AS n FROM {table};")
    for obj in parse_wrangler_json(out):
        if obj.get("results"):
            return obj["results"][0]["n"]
    return -1


def column_exists(db: str, cfg: Path, table: str, column: str) -> bool:
    out = d1_execute(db, cfg, cmd=f"SELECT COUNT(*) AS n FROM pragma_table_info('{table}') WHERE name='{column}';")
    for obj in parse_wrangler_json(out):
        if obj.get("results"):
            return obj["results"][0]["n"] > 0
    return False


def section(title: str) -> None:
    print()
    print(f"━━━ {title} {'━' * max(0, 54 - len(title))}")
    print()


def step(n: str, label: str, detail: str = "") -> None:
    suffix = f"  ({detail})" if detail else ""
    print(f"[{n}] {label}{suffix} …")


def ok() -> None:
    print("      ✓ done\n")


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║   K-MAPS  —  Full Morphology Seed Deploy             ║")
    print("╚══════════════════════════════════════════════════════╝")

    # ── km_arabic_linguistic ──────────────────────────────────────────────────
    section("km_arabic_linguistic")

    step("1/9", "ar_ling_roots", f"{batches(SEEDS/'seed-al-roots.sql')} batches")
    d1_execute("km_arabic_linguistic", AL_CFG, file=SEEDS / "seed-al-roots.sql")
    ok()

    step("2/9", "ar_ling_lemmas", f"{batches(SEEDS/'seed-al-lemmas.sql')} batches")
    d1_execute("km_arabic_linguistic", AL_CFG, file=SEEDS / "seed-al-lemmas.sql")
    ok()

    step("3/9", "ar_ling_lemma_registers", f"{batches(SEEDS/'seed-al-lemma-registers.sql')} batches")
    d1_execute("km_arabic_linguistic", AL_CFG, file=SEEDS / "seed-al-lemma-registers.sql")
    ok()

    roots_search = SEEDS / "seed-al-roots-search.sql"
    if roots_search.exists():
        mig = MIG_AL / "003_root_search_keys.sql"
        if mig.exists():
            if not column_exists("km_arabic_linguistic", AL_CFG, "ar_ling_roots", "buckwalter"):
                step("4a/9", "migration 003_root_search_keys (schema)")
                d1_execute("km_arabic_linguistic", AL_CFG, file=mig)
                ok()
            else:
                print("[4a/9] buckwalter column already present — skipping migration 003\n")
        step("4b/9", "ar_ling_root_search", f"{batches(roots_search)} batches")
        d1_execute("km_arabic_linguistic", AL_CFG, file=roots_search)
        ok()
    else:
        print("[4/9] seed-al-roots-search.sql not found — skipping\n")

    # ── km_quran ──────────────────────────────────────────────────────────────
    section("km_quran")

    mig_008 = MIG_QR / "008_word_occurrence_morphology_tag_json.sql"
    mig_009 = MIG_QR / "009_word_occurrence_morphology_tag_json_type.sql"

    if not column_exists("km_quran", QR_CFG, "qr_word_occurrences", "morphology_tag_json"):
        step("5a/9", "migration 008 — add morphology_tag_json column")
        d1_execute("km_quran", QR_CFG, file=mig_008)
        ok()
    else:
        print("[5a/9] morphology_tag_json column already present — skipping\n")

    step("5b/9", "migration 009 — set column type to JSON (idempotent)")
    d1_execute("km_quran", QR_CFG, file=mig_009)
    ok()

    step("6/9", "qr_word_occurrences", f"{batches(SEEDS/'seed-qr-word-occurrences.sql')} batches")
    d1_execute("km_quran", QR_CFG, file=SEEDS / "seed-qr-word-occurrences.sql")
    ok()

    step("7/9", "qr_lemmas", f"{batches(SEEDS/'seed-qr-lemmas.sql')} batches")
    d1_execute("km_quran", QR_CFG, file=SEEDS / "seed-qr-lemmas.sql")
    ok()

    step("8/9", "qr_lemma_occurrences", f"{batches(SEEDS/'seed-qr-lemma-occurrences.sql')} batches")
    d1_execute("km_quran", QR_CFG, file=SEEDS / "seed-qr-lemma-occurrences.sql")
    ok()

    backfill = SEEDS / "backfill-qr-word-occurrences-morphology-tag-json.sql"
    if backfill.exists():
        step("9/9", "backfill morphology_tag_json", f"{batches(backfill)} batches")
        d1_execute("km_quran", QR_CFG, file=backfill)
        ok()
    else:
        print("[9/9] backfill file not found — skipping\n")

    # ── verification ──────────────────────────────────────────────────────────
    section("Verification")

    checks = [
        ("km_arabic_linguistic", AL_CFG, "ar_ling_roots"),
        ("km_arabic_linguistic", AL_CFG, "ar_ling_lemmas"),
        ("km_arabic_linguistic", AL_CFG, "ar_ling_lemma_registers"),
        ("km_quran",             QR_CFG, "qr_word_occurrences"),
        ("km_quran",             QR_CFG, "qr_lemmas"),
        ("km_quran",             QR_CFG, "qr_lemma_occurrences"),
    ]
    width = max(len(t) for _, _, t in checks)
    for db, cfg, table in checks:
        n = count_remote(db, cfg, table)
        print(f"  {table:<{width}}  {n:>8,} rows")

    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║   ✓  All seeds deployed successfully.                ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()


if __name__ == "__main__":
    main()
