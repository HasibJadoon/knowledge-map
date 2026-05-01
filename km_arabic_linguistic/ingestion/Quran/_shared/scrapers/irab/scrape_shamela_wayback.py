#!/usr/bin/env python3
"""
Generalized Shamela-via-Wayback scraper.

Fetches all snapshotted pages of a Shamela book from Wayback Machine,
extracts the <div class="nass"> content (raw HTML via id_ flag).

Usage:
    python3 scrape_shamela_wayback.py --book-id 22928 --slug tibyan_akbari
    python3 scrape_shamela_wayback.py --book-id 11769 --slug miftah_sakkaki
    python3 scrape_shamela_wayback.py --probe-only --book-id 11680
"""
from __future__ import annotations

import argparse
import gzip
import html as html_module
import io
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36"

_NASS_RE = re.compile(r'<div[^>]*class="[^"]*nass[^"]*"[^>]*>(.+?)</div>\s*(?:<div|<script|<!--)', re.DOTALL)
_TAG     = re.compile(r'<[^>]+>')


def fetch(url: str, timeout: int = 60, retries: int = 3) -> str:
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
                if enc == "gzip" or data[:2] == b'\x1f\x8b':
                    data = gzip.decompress(data)
                elif enc == "deflate":
                    import zlib
                    data = zlib.decompress(data)
                return data.decode("utf-8", errors="replace")
        except Exception:
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
            else:
                raise


def build_cdx_index(book_id: int) -> dict[int, str]:
    url = (
        f"http://web.archive.org/cdx/search/cdx"
        f"?url=shamela.ws/book/{book_id}/*"
        f"&output=json&fl=original,timestamp,statuscode"
        f"&filter=statuscode:200&collapse=urlkey&limit=10000"
    )
    body = fetch(url, timeout=120, retries=4)
    rows = json.loads(body)
    if rows and rows[0][0] == "original":
        rows = rows[1:]

    index: dict[int, str] = {}
    pat = re.compile(rf'/{book_id}/(\d+)\b')
    for row in rows:
        original, ts, *_ = row
        m = pat.search(original)
        if not m: continue
        page_no = int(m.group(1))
        if page_no not in index or ts > index[page_no]:
            index[page_no] = ts
    return index


def extract_text(html: str) -> str:
    m = _NASS_RE.search(html)
    if not m: return ""
    inner = m.group(1)
    inner = re.sub(r'<a[^>]*class="margin-10".*?</a>', '', inner, flags=re.DOTALL)
    inner = re.sub(r'<span[^>]*class="[^"]*copy[^"]*".*?</span>', '', inner, flags=re.DOTALL)
    text = _TAG.sub(' ', inner)
    text = html_module.unescape(text)
    return re.sub(r'\s+', ' ', text).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book-id", type=int, required=True)
    ap.add_argument("--slug",    default=None, help="Output folder name (default: book_<id>)")
    ap.add_argument("--out-dir", default=None, help="Override output directory")
    ap.add_argument("--sleep",   type=float, default=2.0)
    ap.add_argument("--probe-only", action="store_true", help="Just print page count and exit")
    args = ap.parse_args()

    slug = args.slug or f"book_{args.book_id}"
    if args.out_dir:
        out_dir = Path(args.out_dir) / slug
    else:
        # Default: km_arabic_linguistic/ingestion/<sources_pool>/<slug>/
        out_dir = Path(__file__).resolve().parents[2] / f"data/raw/shamela/{slug}"
    out_dir.mkdir(parents=True, exist_ok=True)

    cdx_cache = out_dir / "cdx_index.json"
    out_jsonl = out_dir / "pages.jsonl"
    done_file = out_dir / "page_progress.txt"

    if cdx_cache.exists():
        cdx = {int(k): v for k, v in json.loads(cdx_cache.read_text(encoding="utf-8")).items()}
    else:
        print(f"[{slug}] Querying Wayback CDX for book {args.book_id}…", file=sys.stderr)
        cdx = build_cdx_index(args.book_id)
        cdx_cache.write_text(json.dumps({str(k): v for k, v in sorted(cdx.items())},
                                        ensure_ascii=False, indent=2), encoding="utf-8")

    if not cdx:
        print(f"[{slug}] No snapshots found on Wayback.", file=sys.stderr)
        sys.exit(1)

    pages_found = sorted(cdx.keys())
    print(f"[{slug}] CDX index: {len(cdx)} pages, range {pages_found[0]}-{pages_found[-1]}",
          file=sys.stderr)

    if args.probe_only:
        return

    done: set[int] = set()
    if done_file.exists():
        for ln in done_file.read_text(encoding="utf-8").splitlines():
            ln = ln.strip()
            if ln and not ln.startswith("#"):
                try: done.add(int(ln))
                except: pass

    todo = [(p, cdx[p]) for p in pages_found if p not in done]
    print(f"[{slug}] Already fetched: {len(done):,} | To fetch: {len(todo):,}", file=sys.stderr)

    out_fh  = open(out_jsonl, "a", encoding="utf-8")
    done_fh = open(done_file, "a", encoding="utf-8")
    n_ok = n_err = 0
    t0 = time.time()

    for i, (page_no, ts) in enumerate(todo, 1):
        try:
            url = f"http://web.archive.org/web/{ts}id_/https://shamela.ws/book/{args.book_id}/{page_no}"
            html = fetch(url)
            text = extract_text(html)
            if len(text) < 50:
                done_fh.write(f"# SHORT {page_no}\n"); done_fh.flush()
                n_err += 1
            else:
                rec = {"book_id": args.book_id, "slug": slug, "page_no": page_no,
                       "wayback_ts": ts, "text_ar": text}
                out_fh.write(json.dumps(rec, ensure_ascii=False) + "\n"); out_fh.flush()
                done_fh.write(f"{page_no}\n"); done_fh.flush()
                n_ok += 1
        except Exception as e:
            done_fh.write(f"# ERROR {page_no} {e}\n"); done_fh.flush()
            n_err += 1

        if i % 25 == 0 or i == len(todo):
            el = time.time() - t0
            rate = i / max(el, 1e-6)
            eta = (len(todo) - i) / max(rate, 1e-6)
            print(f"[{slug}] {i:,}/{len(todo):,} | ok={n_ok} err={n_err} | {rate:.2f}/s | ETA {eta/60:.0f}m",
                  file=sys.stderr)

        time.sleep(args.sleep)

    out_fh.close(); done_fh.close()
    print(f"[{slug}] Done. {n_ok} ok, {n_err} err.", file=sys.stderr)


if __name__ == "__main__":
    main()
