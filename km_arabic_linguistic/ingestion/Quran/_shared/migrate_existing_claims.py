#!/usr/bin/env python3
"""
migrate_existing_claims.py — One-time migration of old flat claim files into
the surah-structured S{NNN}/claims/ hierarchy.

Old locations scanned:
  _pipeline/sarf/kmaps-sarf/data/staging/claims/{s}_{a}.json
  _pipeline/irab/kmaps-irab/data/staging/claims/{s}_{a}.json
  _pipeline/balagha/kmaps-balagha/data/staging/claims/{s}_{a}.json

New locations (matching run_surah_pipeline.py):
  Multi-ruku: S{NNN}/claims/R{rr:02d}/{layer}/{s}_{a}.json
  Single-ruku: S{NNN}/claims/{layer}/{s}_{a}.json

Rules:
  - Skip if destination already exists (never overwrite newer files)
  - Enrich: if destination exists but has 0 claims, overwrite with old file if it has claims
  - Copy only; never delete source files

Usage:
    python3 _shared/migrate_existing_claims.py            # migrate all
    python3 _shared/migrate_existing_claims.py --dry-run  # show what would happen
    python3 _shared/migrate_existing_claims.py --surah 2  # only surah 2
"""
from __future__ import annotations
import argparse
import json
import re
import shutil
import sqlite3
from pathlib import Path

BASE    = Path(__file__).resolve().parents[1]   # ingestion/
RUKU_DB = BASE / "../quran-metadata-ruku.sqlite"

LAYER_STAGING_DIRS = {
    "sarf":    BASE / "_pipeline/sarf/kmaps-sarf/data/staging/claims",
    "irab":    BASE / "_pipeline/irab/kmaps-irab/data/staging/claims",
    "balagha": BASE / "_pipeline/balagha/kmaps-balagha/data/staging/claims",
}

_FNAME = re.compile(r"^(\d+)_(\d+)\.json$")


def build_ruku_map() -> dict[int, dict[int, tuple[int, int]]]:
    """Returns {surah: {ayah: (ruku_num, n_rukus)}}."""
    cx = sqlite3.connect(RUKU_DB)
    rows = cx.execute(
        "SELECT first_verse_key, last_verse_key, surah_ruku_number FROM ruku ORDER BY first_verse_key"
    ).fetchall()
    cx.close()

    # First pass: count rukus per surah
    surah_rukus: dict[int, list] = {}
    for fk, lk, rn in rows:
        s = int(fk.split(":")[1] if ":" in fk else fk.split(":")[0])
        # Actually parse correctly
        s = int(fk.split(":")[0])
        surah_rukus.setdefault(s, []).append((rn, int(fk.split(":")[1]), int(lk.split(":")[1])))

    # Build ayah→(ruku_num, n_rukus)
    result: dict[int, dict[int, tuple[int, int]]] = {}
    for surah, rukus in surah_rukus.items():
        n = len(rukus)
        result[surah] = {}
        for rn, fa, la in rukus:
            for ayah in range(fa, la + 1):
                result[surah][ayah] = (rn, n)
    return result


def claim_count(path: Path) -> int:
    """Return number of claims in a JSON file, or 0 on error."""
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
        return len(d.get("result", {}).get("claims", []))
    except Exception:
        return 0


def migrate_layer(layer: str, ruku_map: dict, only_surah: int | None,
                  dry_run: bool) -> tuple[int, int, int]:
    """Returns (copied, skipped_exists, skipped_empty)."""
    staging_dir = LAYER_STAGING_DIRS[layer]
    if not staging_dir.exists():
        print(f"  [{layer}] staging dir not found: {staging_dir} — skip")
        return 0, 0, 0

    files = sorted(staging_dir.glob("*.json"))
    copied = skipped_exists = skipped_empty = 0

    for f in files:
        m = _FNAME.match(f.name)
        if not m:
            continue
        surah, ayah = int(m.group(1)), int(m.group(2))

        if only_surah is not None and surah != only_surah:
            continue

        surah_map = ruku_map.get(surah)
        if not surah_map:
            print(f"  [{layer}] S{surah:03d}: no ruku data — skip {f.name}")
            continue

        ruku_info = surah_map.get(ayah)
        if not ruku_info:
            print(f"  [{layer}] S{surah:03d}:{ayah} not in ruku map — skip {f.name}")
            continue

        ruku_num, n_rukus = ruku_info
        surah_dir = BASE / f"S{surah:03d}"

        if n_rukus == 1:
            dest = surah_dir / f"claims/{layer}/{surah}_{ayah}.json"
        else:
            dest = surah_dir / f"claims/R{ruku_num:02d}/{layer}/{surah}_{ayah}.json"

        # Decide whether to copy
        if dest.exists():
            dest_n = claim_count(dest)
            src_n  = claim_count(f)
            if dest_n > 0:
                # Destination has claims — keep it (don't overwrite with potentially worse data)
                skipped_exists += 1
                continue
            elif src_n == 0:
                # Both empty — skip
                skipped_empty += 1
                continue
            else:
                # Destination is empty, source has claims — enrich (overwrite)
                action = "enrich"
        else:
            src_n = claim_count(f)
            if src_n == 0:
                skipped_empty += 1
                continue
            action = "copy"

        if dry_run:
            rel_dest = dest.relative_to(BASE)
            print(f"  [{layer}] {action}: {f.name} → {rel_dest}  ({src_n} claims)")
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest)

        copied += 1

    return copied, skipped_exists, skipped_empty


def main():
    parser = argparse.ArgumentParser(description="Migrate old flat claims into S{NNN}/ structure")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done")
    parser.add_argument("--surah",   type=int, default=None, help="Migrate only this surah")
    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN — no files will be written\n")

    print(f"Building ruku map from {RUKU_DB.name}...")
    ruku_map = build_ruku_map()
    print(f"  Loaded {len(ruku_map)} surahs\n")

    grand_copied = grand_skipped = grand_empty = 0

    for layer in ["sarf", "irab", "balagha"]:
        print(f"── {layer} ──")
        c, s, e = migrate_layer(layer, ruku_map, args.surah, args.dry_run)
        grand_copied  += c
        grand_skipped += s
        grand_empty   += e
        print(f"   copied/enriched: {c}   skipped (exists): {s}   skipped (no claims): {e}")
        print()

    print(f"Total: {grand_copied} migrated | {grand_skipped} already done | {grand_empty} empty skipped")
    if not args.dry_run and grand_copied > 0:
        print("\nMigration complete. Run run_surah_pipeline.py — it will skip already-migrated ayahs.")


if __name__ == "__main__":
    main()
