#!/usr/bin/env python3
"""
Download classical balagha/irab works from archive.org.

For each archive.org identifier, query the metadata API to find the actual
*_djvu.txt filename (often Arabic-titled), then download it.
For items where djvu.txt has multiple parts (like beko-book = 2 books in 1),
each part becomes a separate output folder.

Output:
  data/raw/archive_org/<slug>/pages.jsonl   one record per form-feed page
  data/raw/archive_org/<slug>/metadata.json
"""
from __future__ import annotations

import gzip
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parents[2] / "data/raw/archive_org"
OUT_DIR.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 Chrome/121"

# Each entry maps a slug → archive.org identifier + which djvu.txt files to use.
# For multi-book items (like beko-book), specify file_filter to pick which files.
WORKS = [
    # Two-book combined item: split by filename prefix
    {"slug": "asrar_balagha_jurjani",
     "ident": "beko-book",
     "file_match": "ASRAR_djvu.txt",
     "title_ar": "أسرار البلاغة", "title_en": "al-Jurjani - Asrar al-Balagha",
     "author": "عبد القاهر الجرجاني", "year": "d. 471 AH", "type": "balagha"},

    {"slug": "dalael_ijaz_jurjani_v2",
     "ident": "beko-book",
     "file_match": "DLAEL_djvu.txt",
     "title_ar": "دلائل الإعجاز", "title_en": "al-Jurjani - Dalail al-I'jaz",
     "author": "عبد القاهر الجرجاني", "year": "d. 471 AH", "type": "balagha"},

    {"slug": "dalael_ijaz_jurjani",
     "ident": "ar114rhet39",
     "file_match": "_djvu.txt",
     "title_ar": "دلائل الإعجاز", "title_en": "al-Jurjani - Dalail al-I'jaz (alt edn)",
     "author": "عبد القاهر الجرجاني", "year": "d. 471 AH", "type": "balagha"},

    {"slug": "miftah_sakkaki",
     "ident": "ar114rhet12",
     "file_match": "_djvu.txt",
     "title_ar": "مفتاح العلوم", "title_en": "al-Sakkaki - Miftah al-Ulum",
     "author": "أبو يعقوب يوسف السكاكي", "year": "d. 626 AH", "type": "balagha"},

    {"slug": "ijaz_baqillani",
     "ident": "alfirdwsiy2018_gmail_452_201809",
     "file_match": "_djvu.txt",
     "title_ar": "إعجاز القرآن", "title_en": "al-Baqillani - I'jaz al-Qur'an",
     "author": "أبو بكر الباقلاني", "year": "d. 403 AH", "type": "balagha"},

    {"slug": "itqan_suyuti_v1",
     "ident": "al-itqan-fi-uloom-il-quran-volume-no-1",
     "file_match": "_djvu.txt",
     "title_ar": "الإتقان في علوم القرآن (ج1)", "title_en": "al-Suyuti - al-Itqan vol 1",
     "author": "جلال الدين السيوطي", "year": "d. 911 AH", "type": "balagha"},
    {"slug": "itqan_suyuti_v2",
     "ident": "al-itqan-fi-uloom-il-quran-volume-no-2",
     "file_match": "_djvu.txt",
     "title_ar": "الإتقان في علوم القرآن (ج2)", "title_en": "al-Suyuti - al-Itqan vol 2",
     "author": "جلال الدين السيوطي", "year": "d. 911 AH", "type": "balagha"},
]


def fetch(url: str, timeout: int = 180, retries: int = 3) -> bytes:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
            else:
                raise


def get_files(ident: str) -> list[dict]:
    body = fetch(f"https://archive.org/metadata/{ident}/files", timeout=30)
    data = json.loads(body.decode("utf-8"))
    return data.get("result", [])


def find_file(files: list[dict], match: str) -> str | None:
    """Find first file matching given suffix or substring."""
    for f in files:
        name = f.get("name", "")
        if match in name and name.endswith(".txt"):
            return name
    return None


def split_pages(text: str) -> list[str]:
    """djvu.txt uses form-feed character (\f) between pages."""
    return [p.strip() for p in text.split('\f') if p.strip()]


def main():
    summary = []
    for w in WORKS:
        slug = w["slug"]
        ident = w["ident"]
        out_dir = OUT_DIR / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out_jsonl = out_dir / "pages.jsonl"
        meta_file = out_dir / "metadata.json"

        if out_jsonl.exists() and out_jsonl.stat().st_size > 5000:
            # Already done with real content (not the broken HTML attempt)
            with open(out_jsonl, encoding="utf-8") as f:
                first = f.readline()
                if first and "html" not in first[:200].lower():
                    print(f"[{slug}] Already downloaded ({out_jsonl.stat().st_size:,} bytes), skipping",
                          file=sys.stderr)
                    continue
            # else: re-download (was the bad HTML version)

        try:
            files = get_files(ident)
            target = find_file(files, w["file_match"])
            if not target:
                print(f"[{slug}] No matching file. Available .txt files:", file=sys.stderr)
                for f in files:
                    if f.get("name","").endswith(".txt"):
                        print(f"    - {f['name']}", file=sys.stderr)
                summary.append((slug, w["title_en"], 0, "NO_TXT_FILE"))
                continue

            # URL-encode the Arabic filename properly
            url = f"https://archive.org/download/{ident}/{urllib.parse.quote(target)}"
            print(f"[{slug}] Downloading {target} …", file=sys.stderr)
            raw = fetch(url, timeout=240)
            text = raw.decode("utf-8", errors="replace")

            pages = split_pages(text)
            char_total = sum(len(p) for p in pages)
            arabic_chars = sum(1 for c in text if '؀' <= c <= 'ۿ')
            arabic_ratio = arabic_chars / max(len(text), 1)

            print(f"[{slug}] {len(pages):,} pages, {char_total:,} chars, "
                  f"{arabic_ratio:.0%} arabic", file=sys.stderr)

            with open(out_jsonl, "w", encoding="utf-8") as f:
                for i, page_text in enumerate(pages, 1):
                    rec = {"slug": slug, "ident": ident, "file": target,
                           "page_no": i, "text_ar": page_text}
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")

            meta = {**w, "url": url, "file": target,
                    "n_pages": len(pages), "n_chars": char_total,
                    "arabic_ratio": round(arabic_ratio, 3)}
            meta_file.write_text(json.dumps(meta, ensure_ascii=False, indent=2),
                                 encoding="utf-8")

            summary.append((slug, w["title_en"], len(pages), f"{arabic_ratio:.0%} ar"))

        except Exception as e:
            print(f"[{slug}] FAILED: {e}", file=sys.stderr)
            summary.append((slug, w["title_en"], 0, f"FAIL: {str(e)[:40]}"))

        time.sleep(2)

    print("\n=== Summary ===", file=sys.stderr)
    for slug, title, npages, status in summary:
        print(f"  {slug:30s} {npages:5d} pages  {status:20s}  {title[:40]}",
              file=sys.stderr)


if __name__ == "__main__":
    main()
