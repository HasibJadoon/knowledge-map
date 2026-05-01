#!/usr/bin/env python3
"""
Step 01: Scrape al-Tibyan fi I'rab al-Quran (Akbari, d. 616 AH, ed. Bajawi)
        from Wayback Machine snapshots of shamela.ws/book/22928.

Strategy:
  1. Query Wayback CDX API for full list of snapshotted pages (1,203 of 1,313)
  2. For each page, fetch the latest snapshot via /web/<ts>id_/<original_url>
     (id_ flag returns RAW HTML without Wayback toolbar — much faster + cleaner)
  3. Extract <div class="nass">…</div> Arabic content

Output:
  data/raw/tibyan/pages.jsonl              one record per page
  data/raw/tibyan/page_progress.txt        resumable state
  data/raw/tibyan/cdx_index.json           cached CDX result (page_no → ts)

Each JSONL record:
  { "page_no": 5, "wayback_ts": "20240115...", "url": "...", "text_ar": "..." }

Usage:
    python3 scripts/01_download/scrape_tibyan_wayback.py [--start 1] [--end 1313] [--sleep 1.5]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR    = SCRIPT_DIR / "data/raw/tibyan"
RAW_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSONL  = RAW_DIR / "pages.jsonl"
DONE_FILE  = RAW_DIR / "page_progress.txt"
CDX_CACHE  = RAW_DIR / "cdx_index.json"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

CDX_API = (
    "http://web.archive.org/cdx/search/cdx"
    "?url=shamela.ws/book/22928/*"
    "&output=json"
    "&fl=original,timestamp,statuscode,digest"
    "&filter=statuscode:200"
    "&collapse=urlkey"
    "&limit=5000"
)


def fetch(url: str, timeout: int = 60, retries: int = 3) -> str:
    import gzip, io
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate",
            })
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                enc = r.headers.get("Content-Encoding", "").lower()
                if enc == "gzip" or data[:2] == b"\x1f\x8b":
                    data = gzip.decompress(data)
                elif enc == "deflate":
                    import zlib
                    data = zlib.decompress(data)
                return data.decode("utf-8", errors="replace")
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                raise


# ── Build CDX index: page_no → latest timestamp ───────────────────────────────
def build_cdx_index() -> dict[int, str]:
    if CDX_CACHE.exists():
        return {int(k): v for k, v in json.loads(CDX_CACHE.read_text(encoding="utf-8")).items()}

    print("Querying Wayback CDX API (full snapshot list)…", file=sys.stderr)
    body = fetch(CDX_API, timeout=120)
    rows = json.loads(body)
    if rows and rows[0][0] == "original":
        rows = rows[1:]  # drop header

    index: dict[int, str] = {}
    for row in rows:
        original, ts, *_ = row
        m = re.search(r'/22928/(\d+)\b', original)
        if not m:
            continue
        page_no = int(m.group(1))
        # Keep the latest timestamp per page
        if page_no not in index or ts > index[page_no]:
            index[page_no] = ts

    CDX_CACHE.write_text(json.dumps({str(k): v for k, v in sorted(index.items())},
                                    ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"CDX index: {len(index)} pages", file=sys.stderr)
    return index


# ── Extract <div class="nass">...</div> Arabic page text ──────────────────────
_NASS_RE = re.compile(r'<div[^>]*class="[^"]*nass[^"]*"[^>]*>(.+?)</div>\s*(?:<div|<script|<!--)', re.DOTALL)
_TAG     = re.compile(r'<[^>]+>')

import html as html_module


def extract_page_text(html: str) -> str:
    m = _NASS_RE.search(html)
    if not m:
        return ""
    inner = m.group(1)
    inner = re.sub(r'<a[^>]*class="margin-10".*?</a>', '', inner, flags=re.DOTALL)
    inner = re.sub(r'<span[^>]*class="[^"]*copy[^"]*".*?</span>', '', inner, flags=re.DOTALL)
    text = _TAG.sub(' ', inner)
    text = html_module.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end",   type=int, default=1313)
    ap.add_argument("--sleep", type=float, default=1.5)
    args = ap.parse_args()

    cdx = build_cdx_index()

    done: set[int] = set()
    if DONE_FILE.exists():
        for ln in DONE_FILE.read_text(encoding="utf-8").splitlines():
            ln = ln.strip()
            if ln and not ln.startswith("#"):
                try: done.add(int(ln))
                except: pass
    print(f"Already fetched: {len(done):,}", file=sys.stderr)

    todo: list[tuple[int, str]] = []
    for p in range(args.start, args.end + 1):
        if p in done: continue
        ts = cdx.get(p)
        if ts:
            todo.append((p, ts))

    print(f"To fetch: {len(todo)} pages (sleep {args.sleep}s)", file=sys.stderr)

    out_fh  = open(OUT_JSONL,  "a", encoding="utf-8")
    done_fh = open(DONE_FILE,  "a", encoding="utf-8")

    n_ok = n_err = 0
    t0 = time.time()

    for i, (page_no, ts) in enumerate(todo, 1):
        try:
            # id_ flag → raw original HTML (no Wayback rewriting)
            url = f"http://web.archive.org/web/{ts}id_/https://shamela.ws/book/22928/{page_no}"
            html = fetch(url)
            text = extract_page_text(html)

            if len(text) < 50:
                done_fh.write(f"# SHORT {page_no}\n"); done_fh.flush()
                n_err += 1
            else:
                rec = {"page_no": page_no, "wayback_ts": ts, "url": url, "text_ar": text}
                out_fh.write(json.dumps(rec, ensure_ascii=False) + "\n"); out_fh.flush()
                done_fh.write(f"{page_no}\n"); done_fh.flush()
                n_ok += 1

            if i % 20 == 0 or i == len(todo):
                elapsed = time.time() - t0
                rate = i / max(elapsed, 1e-6)
                eta  = (len(todo) - i) / max(rate, 1e-6)
                print(f"  {i:,}/{len(todo):,} | ok={n_ok} err={n_err} | {rate:.2f}/s | ETA {eta/60:.0f}m",
                      file=sys.stderr)

        except Exception as e:
            print(f"  ERROR p{page_no}: {e}", file=sys.stderr)
            done_fh.write(f"# ERROR {page_no} {e}\n"); done_fh.flush()
            n_err += 1

        time.sleep(args.sleep)

    out_fh.close(); done_fh.close()
    print(f"\nDone. {n_ok} ok, {n_err} err. Output: {OUT_JSONL}", file=sys.stderr)


if __name__ == "__main__":
    main()
