#!/usr/bin/env python3
"""
build_archive.py — Reorganise _pipeline data into a clean archive/ structure.

What it does
============
1. Creates  ingestion/archive/{docs,resources,raw}/{sarf,irab,balagha}/
2. Moves    docs (.docx spec files) into archive/docs/{layer}/
3. Moves    resources (PDFs, links) into archive/resources/sarf/
4. Moves    raw scraped sources into archive/raw/{layer}/sources/
5. Splits   irab chunks (tibyan, itqan, archive_org)
            by surah → ruku → archive/raw/irab/S{NNN}/R{rr}/{source}.json
6. Splits   balagha chunks
            by surah → ruku → archive/raw/balagha/S{NNN}/R{rr}/chunks.json
7. Splits   sarf tafsirs_clean.jsonl (has meta_json.surah/ayah)
            by surah → ruku → archive/raw/sarf/S{NNN}/R{rr}/tafsirs.json
8. Removes  empty directories from _pipeline

Usage:
    python3 _shared/build_archive.py            # full run
    python3 _shared/build_archive.py --dry-run  # preview only
"""
from __future__ import annotations
import argparse
import json
import shutil
import sqlite3
from collections import defaultdict
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE     = Path(__file__).resolve().parents[1]          # ingestion/
PIPELINE = BASE / "_pipeline"
ARCHIVE  = BASE / "archive"
RUKU_DB  = BASE / "../quran-metadata-ruku.sqlite"

SARF_DIR  = PIPELINE / "sarf/kmaps-sarf"
IRAB_DIR  = PIPELINE / "irab/kmaps-irab"
BAL_DIR   = PIPELINE / "balagha/kmaps-balagha"


# ── Ruku map ──────────────────────────────────────────────────────────────────
def build_ruku_map() -> dict[int, dict[int, tuple[int, int]]]:
    """Returns {surah: {ayah: (ruku_num, n_rukus)}}."""
    cx = sqlite3.connect(RUKU_DB)
    rows = cx.execute(
        "SELECT first_verse_key, last_verse_key, surah_ruku_number "
        "FROM ruku ORDER BY first_verse_key"
    ).fetchall()
    cx.close()

    surah_rukus: dict[int, list] = {}
    for fk, lk, rn in rows:
        s  = int(fk.split(":")[0])
        fa = int(fk.split(":")[1])
        la = int(lk.split(":")[1])
        surah_rukus.setdefault(s, []).append((rn, fa, la))

    result: dict[int, dict[int, tuple[int, int]]] = {}
    for surah, rukus in surah_rukus.items():
        n = len(rukus)
        result[surah] = {}
        for rn, fa, la in rukus:
            for ayah in range(fa, la + 1):
                result[surah][ayah] = (rn, n)
    return result


# ── Helpers ───────────────────────────────────────────────────────────────────
def ensure(p: Path, dry: bool) -> None:
    if not dry:
        p.mkdir(parents=True, exist_ok=True)


def move_file(src: Path, dst: Path, dry: bool) -> bool:
    """Move src → dst.  Returns True if action was taken."""
    if not src.exists():
        return False
    if dst.exists():
        print(f"    [skip-exists] {dst.relative_to(BASE)}")
        return False
    if dry:
        print(f"    [move] {src.relative_to(BASE)} → {dst.relative_to(BASE)}")
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
    return True


def move_tree(src: Path, dst: Path, dry: bool) -> int:
    """Recursively move all files from src into dst. Returns count moved."""
    if not src.exists():
        return 0
    count = 0
    for f in sorted(src.rglob("*")):
        if not f.is_file():
            continue
        rel = f.relative_to(src)
        target = dst / rel
        if move_file(f, target, dry):
            count += 1
    return count


# ── 1. Docs ───────────────────────────────────────────────────────────────────
def archive_docs(dry: bool) -> None:
    print("\n── [1] Docs ──")
    mapping = {
        "sarf":    PIPELINE / "sarf/docs",
        "irab":    PIPELINE / "irab/docs",
        "balagha": PIPELINE / "balagha/docs",
    }
    for layer, src_dir in mapping.items():
        dst_dir = ARCHIVE / f"docs/{layer}"
        if not src_dir.exists():
            print(f"  {layer}: docs dir not found, skip")
            continue
        for f in sorted(src_dir.iterdir()):
            if f.is_file():
                moved = move_file(f, dst_dir / f.name, dry)
                if not moved and not (dst_dir / f.name).exists():
                    print(f"  {layer}: no action on {f.name}")


# ── 2. Resources ──────────────────────────────────────────────────────────────
def archive_resources(dry: bool) -> None:
    print("\n── [2] Resources (PDFs / links) ──")
    src_dir = PIPELINE / "sarf/resources"
    dst_dir = ARCHIVE / "resources/sarf"
    if not src_dir.exists():
        print("  sarf/resources not found, skip")
        return
    for f in sorted(src_dir.iterdir()):
        if f.is_file():
            move_file(f, dst_dir / f.name, dry)


# Subdirs to leave in-place (active pipeline infrastructure, referenced by many scripts)
SKIP_RAW_SUBDIRS = {"spine"}

# ── 3. Raw scraped sources ────────────────────────────────────────────────────
def archive_raw_sources(dry: bool) -> None:
    print("\n── [3] Raw scraped sources ──")
    raw_dirs = {
        "sarf":    SARF_DIR / "data/raw",
        "irab":    IRAB_DIR / "data/raw",
        "balagha": BAL_DIR  / "data/raw",
    }
    for layer, raw_dir in raw_dirs.items():
        if not raw_dir.exists():
            continue
        dst_base = ARCHIVE / f"raw/{layer}/sources"
        for subdir in sorted(raw_dir.iterdir()):
            if not subdir.is_dir():
                continue
            if subdir.name in SKIP_RAW_SUBDIRS:
                print(f"  {layer}/{subdir.name}: kept in-place (pipeline infrastructure)")
                continue
            dst = dst_base / subdir.name
            n = move_tree(subdir, dst, dry)
            if n:
                print(f"  {layer}/{subdir.name}: moved {n} files → archive/raw/{layer}/sources/{subdir.name}/")
            elif not dry:
                print(f"  {layer}/{subdir.name}: empty, skip")


# ── 4. Split chunks by surah / ruku ──────────────────────────────────────────
def ruku_path(layer: str, surah: int, ruku_num: int, n_rukus: int) -> Path:
    surah_tag = f"S{surah:03d}"
    if n_rukus == 1:
        return ARCHIVE / f"raw/{layer}/{surah_tag}"
    return ARCHIVE / f"raw/{layer}/{surah_tag}/R{ruku_num:02d}"


def split_jsonl(
    jsonl_path: Path,
    layer: str,
    fname_stem: str,
    ruku_map: dict,
    dry: bool,
    surah_field: str = "surah",
    ayah_field: str  = "ayah",
    meta_key: str    = "meta_json",
) -> None:
    """Split a JSONL into per-ruku JSON arrays."""
    if not jsonl_path.exists():
        print(f"  [skip] {jsonl_path.name} not found")
        return

    buckets: dict[tuple, list] = defaultdict(list)
    skipped = 0

    with open(jsonl_path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue

            meta = rec.get(meta_key) or {}
            surah = meta.get(surah_field)
            ayah  = meta.get(ayah_field)

            if not surah or not ayah:
                skipped += 1
                continue

            surah_map = ruku_map.get(surah)
            if not surah_map:
                skipped += 1
                continue

            ruku_info = surah_map.get(ayah)
            if not ruku_info:
                # Try closest ayah (some chunks span ranges)
                skipped += 1
                continue

            ruku_num, n_rukus = ruku_info
            buckets[(surah, ruku_num, n_rukus)].append(rec)

    written = 0
    for (surah, ruku_num, n_rukus), chunks in sorted(buckets.items()):
        out_dir  = ruku_path(layer, surah, ruku_num, n_rukus)
        out_file = out_dir / f"{fname_stem}.json"
        if out_file.exists():
            continue
        if dry:
            print(f"    [write] {out_file.relative_to(BASE)}  ({len(chunks)} chunks)")
        else:
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file.write_text(
                json.dumps(chunks, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        written += 1

    print(f"  {jsonl_path.name}: {written} ruku files written, {skipped} records skipped")


def archive_chunks(ruku_map: dict, dry: bool) -> None:
    print("\n── [4] Split chunks by surah / ruku ──")

    # Irab sources
    irab_chunks = IRAB_DIR / "data/staging/chunks"
    print("  irab/tibyan_chunks.jsonl")
    split_jsonl(irab_chunks / "tibyan_chunks.jsonl",    "irab", "tibyan",    ruku_map, dry)
    print("  irab/itqan_chunks.jsonl")
    split_jsonl(irab_chunks / "itqan_chunks.jsonl",     "irab", "itqan",     ruku_map, dry)
    print("  irab/archive_org_chunks.jsonl")
    split_jsonl(irab_chunks / "archive_org_chunks.jsonl","irab","archive_org",ruku_map, dry)

    # Balagha
    print("  balagha/balagha_chunks.jsonl")
    split_jsonl(
        BAL_DIR / "data/staging/chunks/balagha_chunks.jsonl",
        "balagha", "chunks", ruku_map, dry,
    )

    # Sarf tafsirs (have meta_json.surah/ayah)
    print("  sarf/tafsirs_clean.jsonl")
    split_jsonl(
        SARF_DIR / "data/staging/chunks/tafsirs_clean.jsonl",
        "sarf", "tafsirs", ruku_map, dry,
    )


# ── 5. Clean empty dirs from _pipeline ───────────────────────────────────────
def clean_empty_dirs(dry: bool) -> None:
    print("\n── [5] Remove empty dirs from _pipeline ──")
    removed = 0
    # Walk bottom-up so children are removed before parents
    for d in sorted(PIPELINE.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if not d.is_dir():
            continue
        try:
            children = list(d.iterdir())
        except PermissionError:
            continue
        if not children:
            if dry:
                print(f"  [rmdir] {d.relative_to(BASE)}")
            else:
                try:
                    d.rmdir()
                except OSError:
                    pass
            removed += 1
    print(f"  {removed} empty dirs {'would be ' if dry else ''}removed")


# ── main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser(description="Build archive/ from _pipeline data")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.dry_run:
        print("DRY RUN — no files will be written or moved\n")

    print(f"Building ruku map from {RUKU_DB.name}...")
    ruku_map = build_ruku_map()
    print(f"  Loaded {len(ruku_map)} surahs\n")

    archive_docs(args.dry_run)
    archive_resources(args.dry_run)
    archive_raw_sources(args.dry_run)
    archive_chunks(ruku_map, args.dry_run)
    clean_empty_dirs(args.dry_run)

    print("\n=== Done ===")
    if args.dry_run:
        print("Re-run without --dry-run to apply.")


if __name__ == "__main__":
    main()
