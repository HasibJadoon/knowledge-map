#!/usr/bin/env python3
"""
Scrape al-Suyūṭī's al-Itqan fi Ulum al-Quran from islamweb.net.

islamweb hosts the exact text we wanted (Abu al-Faḍl Ibrāhīm edition) with
links to every grammatical/balagha-related cross-reference. Their pages
load content via an AJAX endpoint that returns clean Arabic in a
<div class="mainsubj"> wrapper.

URL pattern:
  https://www.islamweb.net/ar/library/maktaba/nindex.php?flag=1&page=bookpages
    &bookid=68&id=<ID>&bookparts=[<NUM>:1]&LoadTab=LoadBookDetail

Output:
  data/raw/islamweb/itqan/pages.jsonl
  data/raw/islamweb/itqan/page_progress.txt
"""
from __future__ import annotations

import argparse
import gzip
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR    = SCRIPT_DIR / "data/raw/islamweb/itqan"
RAW_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSONL  = RAW_DIR / "pages.jsonl"
DONE_FILE  = RAW_DIR / "page_progress.txt"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36"

BOOKID = 68
PUBLIC_URL = "https://www.islamweb.net/ar/library/content/{book}/{page}/x"

# <div class="bookcontent-dic" id='pagebody' itemprop="articleBody"> ... </div>
PAGEBODY_RE = re.compile(
    r"<div[^>]*id=['\"]?pagebody['\"]?[^>]*itemprop=['\"]?articleBody['\"]?[^>]*>(.+?)</div>\s*<(?:div|section|/section)",
    re.DOTALL,
)
TAG_RE = re.compile(r'<[^>]+>')
HASH_TITLE_RE = re.compile(r'<font[^>]*>\[\s*<font[^>]*>\s*ص:\s*</font>\s*(\d+)\s*\]</font>')


def fetch(url: str, timeout: int = 30, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate",
            })
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                if data[:2] == b'\x1f\x8b':
                    data = gzip.decompress(data)
                return data.decode("utf-8", errors="replace")
        except Exception:
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                raise


def extract_text(html_text: str) -> tuple[str, str | None, int | None]:
    """Return (clean_text, naw_label_or_None, printed_page_or_None)."""
    m = PAGEBODY_RE.search(html_text)
    if not m:
        return "", None, None

    inner = m.group(1)
    # Extract printed page number (ص: NNN)
    printed_page = None
    pp = HASH_TITLE_RE.search(inner)
    if pp:
        try: printed_page = int(pp.group(1))
        except: pass

    # Remove tooltip iframes / onclick noise
    inner = re.sub(r"onclick=\"[^\"]*\"", "", inner)
    inner = re.sub(r"<iframe.*?</iframe>", "", inner, flags=re.DOTALL)
    # Drop hidden namesatt/quranatt/mainsubjatt spans (navigation IDs)
    inner = re.sub(r"<span[^>]*class=['\"]?(?:names|quran|mainsubj)att['\"]?[^>]*>.*?</span>", "", inner, flags=re.DOTALL)
    # Convert <a> back to text
    inner = re.sub(r'<a[^>]*>([^<]*)</a>', r'\1', inner)
    # <br> → newline
    inner = re.sub(r'<br\s*/?>', '\n', inner)
    # Strip remaining tags
    text = TAG_RE.sub(' ', inner)
    text = html.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    # Detect naw label (could be 'الأول' through 'الثمانون')
    naw_match = re.search(r'النوع\s+([ا-ي]+(?:\s+و?[ا-ي]+){0,3})', text[:300])
    naw = naw_match.group(1).strip() if naw_match else None

    return text, naw, printed_page


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end",   type=int, default=2500, help="Max ID to try")
    ap.add_argument("--sleep", type=float, default=0.4)
    args = ap.parse_args()

    done: set[int] = set()
    if DONE_FILE.exists():
        for ln in DONE_FILE.read_text(encoding="utf-8").splitlines():
            ln = ln.strip()
            if ln and not ln.startswith("#"):
                try: done.add(int(ln))
                except: pass

    print(f"Already fetched: {len(done):,}", file=sys.stderr)

    out_fh  = open(OUT_JSONL, "a", encoding="utf-8")
    done_fh = open(DONE_FILE, "a", encoding="utf-8")

    n_ok = n_empty = n_err = 0
    consecutive_empty = 0
    t0 = time.time()
    todo = [p for p in range(args.start, args.end + 1) if p not in done]
    print(f"To probe: {len(todo)} IDs", file=sys.stderr)

    for i, page_id in enumerate(todo, 1):
        try:
            url = PUBLIC_URL.format(book=BOOKID, page=page_id)
            html_text = fetch(url, timeout=25)
            text, naw, printed_page = extract_text(html_text)

            if len(text) < 80:
                done_fh.write(f"# EMPTY {page_id}\n"); done_fh.flush()
                n_empty += 1
                consecutive_empty += 1
                if consecutive_empty >= 80 and page_id > 1500:
                    print(f"  Stopping at id={page_id}: {consecutive_empty} consecutive empty", file=sys.stderr)
                    break
            else:
                rec = {
                    "page_id":      page_id,
                    "naw":          naw,
                    "printed_page": printed_page,
                    "url":          url,
                    "text_ar":      text,
                }
                out_fh.write(json.dumps(rec, ensure_ascii=False) + "\n"); out_fh.flush()
                done_fh.write(f"{page_id}\n"); done_fh.flush()
                n_ok += 1
                consecutive_empty = 0

            if i % 50 == 0 or i == len(todo):
                elapsed = time.time() - t0
                rate = i / max(elapsed, 1e-6)
                eta  = (len(todo) - i) / max(rate, 1e-6)
                print(f"  {i:,}/{len(todo):,} | ok={n_ok} empty={n_empty} err={n_err} | "
                      f"{rate:.2f}/s | ETA {eta/60:.0f}m", file=sys.stderr)

        except Exception as e:
            print(f"  ERROR id={page_id}: {e}", file=sys.stderr)
            done_fh.write(f"# ERROR {page_id} {e}\n"); done_fh.flush()
            n_err += 1
            consecutive_empty = 0

        time.sleep(args.sleep)

    out_fh.close(); done_fh.close()
    print(f"\nDone. {n_ok} ok, {n_empty} empty, {n_err} err.\nOutput: {OUT_JSONL}", file=sys.stderr)


if __name__ == "__main__":
    main()
