#!/usr/bin/env python3
"""
scaffold_surah.py — Create the surah ingestion folder structure under ingestion/S{NNN}/.

Layout produced:
  For surahs with >1 ruku:
    S{NNN}/
      scripts/
      sql/
      cache/ss/
      claims/
        R01/irab/
        R01/balagha/
        R02/irab/
        R02/balagha/
        ...

  For surahs with exactly 1 ruku (short surahs):
    S{NNN}/
      scripts/
      sql/
      cache/ss/
      claims/
        irab/
        balagha/

Ruku data from: quran-metadata-ruku.sqlite (authoritative 540-ruku dataset).

Usage:
    python3 _shared/scaffold_surah.py --surah 2        # S002
    python3 _shared/scaffold_surah.py --surah 2 --dry-run
    python3 _shared/scaffold_surah.py --all            # all 114 surahs
    python3 _shared/scaffold_surah.py --all --dry-run
"""
from __future__ import annotations
import argparse, sqlite3
from pathlib import Path

BASE      = Path(__file__).resolve().parents[1]   # ingestion/
RUKU_DB   = BASE / "../quran-metadata-ruku.sqlite"
INGESTION = BASE                                   # same as BASE

LAYERS = ["sarf", "irab", "balagha"]


def get_surah_rukus(surah: int) -> list[dict]:
    """Return list of ruku dicts for this surah, ordered by surah_ruku_number."""
    cx = sqlite3.connect(RUKU_DB)
    rows = cx.execute(
        "SELECT surah_ruku_number, first_verse_key, last_verse_key, verses_count "
        "FROM ruku WHERE first_verse_key LIKE ? ORDER BY surah_ruku_number",
        (f"{surah}:%",)
    ).fetchall()
    cx.close()
    return [
        {
            "surah_ruku": r[0],
            "first": r[1],
            "last":  r[2],
            "count": r[3],
        }
        for r in rows
    ]


def scaffold_surah(surah: int, dry_run: bool = False) -> None:
    rukus = get_surah_rukus(surah)
    if not rukus:
        print(f"  S{surah:03d}: no ruku data found in DB — skipping")
        return

    surah_dir = INGESTION / f"S{surah:03d}"
    n_rukus   = len(rukus)

    dirs_to_create: list[Path] = [
        surah_dir / "scripts",
        surah_dir / "sql",
        surah_dir / "cache" / "ss",
    ]

    if n_rukus == 1:
        # Flat claims layout
        for layer in LAYERS:
            dirs_to_create.append(surah_dir / "claims" / layer)
        layout = "flat (1 ruku)"
    else:
        # Ruku sub-folder layout
        for r in rukus:
            rn = r["surah_ruku"]
            for layer in LAYERS:
                dirs_to_create.append(surah_dir / "claims" / f"R{rn:02d}" / layer)
        layout = f"ruku-based ({n_rukus} rukus)"

    # Summary
    ruku_summary = " | ".join(
        f"R{r['surah_ruku']:02d}: {r['first']}→{r['last']} ({r['count']}v)"
        for r in rukus
    )
    print(f"  S{surah:03d}: {layout}")
    print(f"    {ruku_summary}")

    if dry_run:
        for d in dirs_to_create:
            already = "exists" if d.exists() else "new"
            print(f"    {'[exists]' if already=='exists' else '[create]'} {d.relative_to(BASE)}")
        return

    for d in dirs_to_create:
        d.mkdir(parents=True, exist_ok=True)

    print(f"    Created {len(dirs_to_create)} dirs under {surah_dir.name}/")


def main():
    parser = argparse.ArgumentParser(description="Scaffold surah ingestion folders")
    grp = parser.add_mutually_exclusive_group(required=True)
    grp.add_argument("--surah", type=int, metavar="N", help="Single surah number (1-114)")
    grp.add_argument("--all",   action="store_true",   help="Scaffold all 114 surahs")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be created")
    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN — no directories will be created\n")

    if args.all:
        print(f"Scaffolding all 114 surahs under {INGESTION}\n")
        for s in range(1, 115):
            scaffold_surah(s, dry_run=args.dry_run)
    else:
        scaffold_surah(args.surah, dry_run=args.dry_run)

    print("\nDone.")


if __name__ == "__main__":
    main()
