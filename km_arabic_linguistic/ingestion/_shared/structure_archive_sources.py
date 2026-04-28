#!/usr/bin/env python3
"""
structure_archive_sources.py — Convert remaining raw/chunk sources into
proper per-book / per-chapter JSON files inside archive/.

Handles:
  1. itqan_chunks.jsonl  → archive/raw/irab/itqan/naw_{seq:02d}_{slug}/chunks.json
     (grouped by nawʿ chapter: Al-Itqan's 80-chapter Quranic-sciences structure)

  2. archive_org_chunks.jsonl → archive/raw/irab/archive_org/{book_slug}/chunks.json
     (one JSON array per book: Asrar al-Balagha, Dalail al-Ijaz, etc.)

  3. Raw pages.jsonl files in archive/raw/irab/sources/
     → archive/raw/irab/{source_name}/{book_slug}/raw_pages.json
     (proper JSON arrays, one record per page, no text blobs)

Usage:
    python3 _shared/structure_archive_sources.py            # apply
    python3 _shared/structure_archive_sources.py --dry-run  # preview
"""
from __future__ import annotations
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

BASE    = Path(__file__).resolve().parents[1]          # ingestion/
ARCHIVE = BASE / "archive"
IRAB_PIPELINE = BASE / "_pipeline/irab/kmaps-irab/data/staging/chunks"


# ── Slug helper ───────────────────────────────────────────────────────────────
_ARABIC_ORDINALS = {
    "الأول":   "01",  "الثاني":  "02",  "الثالث":  "03",
    "الرابع":  "04",  "الخامس":  "05",  "السادس":  "06",
    "السابع":  "07",  "الثامن":  "08",  "التاسع":  "09",
    "العاشر":  "10",  "الحادي":  "11",
    "العشرون": "20",  "الثلاثون":"30",  "الأربعون":"40",
    "الخمسون": "50",  "الستون":  "60",  "السبعون": "70",
    "الثمانون":"80",
}

def naw_slug(naw: str | None, naw_seq: int) -> str:
    """Return a filesystem-safe slug for an Itqan nawʿ chapter."""
    if not naw or naw == "unknown":
        return f"naw_{naw_seq:03d}_misc"
    # Try direct Arabic ordinal mapping first
    for ar, num in _ARABIC_ORDINALS.items():
        if naw.startswith(ar):
            rest = naw[len(ar):].strip()
            rest_slug = re.sub(r"[^a-zA-Z؀-ۿ0-9]+", "_", rest).strip("_")
            label = f"naw_{num}" + (f"_{rest_slug}" if rest_slug else "")
            return label[:60]
    # Fallback: sanitize the Arabic text
    slug = re.sub(r"[^a-zA-Z؀-ۿ0-9]+", "_", naw).strip("_")
    return f"naw_{naw_seq:03d}_{slug}"[:60]


def book_slug(title_en: str) -> str:
    """Return a filesystem-safe slug from an English title."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", title_en.lower()).strip("_")
    return slug[:60]


# ── 1. Itqan chunks → per-nawʿ JSON ──────────────────────────────────────────
def structure_itqan(dry: bool) -> None:
    print("\n── [1] itqan_chunks.jsonl → archive/raw/irab/itqan/{naw}/chunks.json ──")
    src = IRAB_PIPELINE / "itqan_chunks.jsonl"
    if not src.exists():
        print("  Not found, skip")
        return

    # Group by (naw_seq, naw_text)
    buckets: dict[tuple, list] = defaultdict(list)
    with open(src, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            m   = rec.get("meta_json") or {}
            naw     = m.get("naw")
            naw_seq = m.get("naw_seq", 0)
            key = (naw_seq, naw or "unknown")
            buckets[key].append(rec)

    # Deduplicate: group same naw name regardless of seq (seq is noisy)
    # Re-bucket by naw text to keep chapters together
    by_naw: dict[str, list] = defaultdict(list)
    for (seq, naw), recs in buckets.items():
        slug = naw_slug(naw, seq)
        by_naw[slug].extend(recs)

    written = 0
    for slug, recs in sorted(by_naw.items()):
        out_dir  = ARCHIVE / f"raw/irab/itqan/{slug}"
        out_file = out_dir / "chunks.json"
        if out_file.exists():
            print(f"  [skip-exists] {out_file.relative_to(BASE)}")
            continue
        # Sort records by chunk_seq inside each chapter
        recs.sort(key=lambda r: r.get("chunk_seq", 0))
        # Add chapter metadata header
        first_meta = recs[0].get("meta_json", {}) if recs else {}
        output = {
            "chapter": slug,
            "source":  recs[0].get("source_title_en", "") if recs else "",
            "naw":     first_meta.get("naw"),
            "count":   len(recs),
            "chunks":  recs,
        }
        if dry:
            print(f"  [write] {out_file.relative_to(BASE)}  ({len(recs)} chunks)")
        else:
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file.write_text(
                json.dumps(output, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(f"  {slug}: {len(recs)} chunks")
        written += 1

    print(f"  → {written} nawʿ chapter files written")


# ── 2. Archive.org chunks → per-book JSON ────────────────────────────────────
def structure_archive_org_chunks(dry: bool) -> None:
    print("\n── [2] archive_org_chunks.jsonl → archive/raw/irab/archive_org/{book}/chunks.json ──")
    src = IRAB_PIPELINE / "archive_org_chunks.jsonl"
    if not src.exists():
        print("  Not found, skip")
        return

    by_book: dict[str, dict] = defaultdict(lambda: {"meta": {}, "chunks": []})

    with open(src, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec  = json.loads(line)
            slug = book_slug(rec.get("source_title_en", "unknown"))
            by_book[slug]["meta"] = rec.get("meta_json", {})
            by_book[slug]["source_title_en"] = rec.get("source_title_en", "")
            by_book[slug]["chunks"].append(rec)

    written = 0
    for slug, data in sorted(by_book.items()):
        out_dir  = ARCHIVE / f"raw/irab/archive_org/{slug}"
        out_file = out_dir / "chunks.json"
        if out_file.exists():
            print(f"  [skip-exists] {out_file.relative_to(BASE)}")
            continue
        recs = sorted(data["chunks"], key=lambda r: r.get("chunk_seq", 0))
        output = {
            "book":   data["source_title_en"],
            "meta":   data["meta"],
            "count":  len(recs),
            "chunks": recs,
        }
        if dry:
            print(f"  [write] {out_file.relative_to(BASE)}  ({len(recs)} chunks)")
        else:
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file.write_text(
                json.dumps(output, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(f"  {slug}: {len(recs)} chunks")
        written += 1

    print(f"  → {written} book files written")


# ── 3. Raw pages.jsonl → structured JSON arrays ───────────────────────────────
def structure_raw_pages(dry: bool) -> None:
    print("\n── [3] Raw pages.jsonl → archive/raw/irab/{source}/raw_pages.json ──")

    sources_root = ARCHIVE / "raw/irab/sources"
    if not sources_root.exists():
        print("  archive/raw/irab/sources/ not found, skip")
        return

    # Find all pages.jsonl files
    pages_files = list(sources_root.rglob("pages.jsonl"))
    if not pages_files:
        print("  No pages.jsonl files found")
        return

    for pages_file in sorted(pages_files):
        # Determine output location based on parent dir structure
        # e.g. sources/archive_org/asrar_balagha_jurjani/pages.jsonl
        #   → archive/raw/irab/archive_org/asrar_balagha_jurjani/raw_pages.json
        rel_parts = pages_file.relative_to(sources_root).parts
        # rel_parts could be ('archive_org', 'asrar_balagha_jurjani', 'pages.jsonl')
        # or ('tibyan', 'pages.jsonl')
        out_parts = rel_parts[:-1]  # drop 'pages.jsonl'
        out_dir   = ARCHIVE / "raw/irab" / Path(*out_parts)
        out_file  = out_dir / "raw_pages.json"

        if out_file.exists():
            print(f"  [skip-exists] {out_file.relative_to(BASE)}")
            continue

        # Load all pages as JSON records
        records = []
        with open(pages_file, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

        if not records:
            print(f"  {'/'.join(out_parts)}: empty, skip")
            continue

        # Sort by page_no if available
        records.sort(key=lambda r: r.get("page_no", 0) if r.get("page_no") is not None else 0)

        # Build structured output with book-level metadata
        first = records[0]
        meta  = {k: v for k, v in first.items() if k not in ("page_no", "text_ar")}
        output = {
            "source": "/".join(out_parts),
            "meta":   meta,
            "total_pages": len(records),
            "pages":  [
                {
                    "page_no":  r.get("page_no"),
                    "text_ar":  r.get("text_ar", ""),
                }
                for r in records
            ],
        }

        if dry:
            print(f"  [write] {out_file.relative_to(BASE)}  ({len(records)} pages)")
        else:
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file.write_text(
                json.dumps(output, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(f"  {'/'.join(out_parts)}: {len(records)} pages → raw_pages.json")


# ── main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser(
        description="Structure archive.org / itqan sources as per-book JSON"
    )
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.dry_run:
        print("DRY RUN — nothing will be written\n")

    structure_itqan(args.dry_run)
    structure_archive_org_chunks(args.dry_run)
    structure_raw_pages(args.dry_run)

    print("\n=== Done ===")
    if args.dry_run:
        print("Re-run without --dry-run to apply.")


if __name__ == "__main__":
    main()
