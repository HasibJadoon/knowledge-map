#!/usr/bin/env python3
"""
Step 01: Scrape 4 classical Arabic lexicons from Hawramani's mirror.

Hawramani (arabiclexicon.hawramani.com) is a clean mirror of Shamela lexicons,
without the Cloudflare bot challenge. Each book has ~1,600 to ~10,000 root-keyed
entry pages.

Books scraped:
    book=33 - Raghib, al-Mufradat fi Gharib al-Quran (1,608 entries) ← Quran-specific
    book=9  - Ibn Faris, Maqayis al-Lugha       (4,814 entries) ← etymological
    book=3  - Ibn Manzur, Lisan al-Arab          (9,245 entries) ← comprehensive
    book=50 - Lane's Arabic-English Lexicon      (4,953 entries) ← bilingual
    (Substitutes: Maqayis≈Jabal, Lane≈Basa'ir for sarf-relevance.)

Output: data/raw/shamela/lexicons/<book_slug>/entries.jsonl
        data/staging/chunks/lexicons.jsonl  (merged)

State-aware: tracks completed entries in done.txt; safely resumable.

Usage:
    python3 scripts/01_download/scrape_hawramani.py
    python3 scripts/01_download/scrape_hawramani.py --workers 4 --sleep 0.3
    python3 scripts/01_download/scrape_hawramani.py --book mufradat  (single book)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR    = SCRIPT_DIR / "data/raw/shamela/lexicons"
OUT_JSONL  = SCRIPT_DIR / "data/staging/chunks/lexicons.jsonl"
DONE_DIR   = SCRIPT_DIR / "data/staging/lexicon_progress"
RAW_DIR.mkdir(parents=True, exist_ok=True)
DONE_DIR.mkdir(parents=True, exist_ok=True)

# ── Books ──────────────────────────────────────────────────────────────────────
BOOKS = {
    "mufradat": {
        "id": 33,
        "slug": "al-raghib-al-isfahani-al-mufradat-fi-gharib-al-quran",
        "title_ar": "مفردات ألفاظ القرآن",
        "title_en": "Raghib - Mufradat",
        "source_id_slug": "SRC:HAWRAMANI:MUFRADAT",
    },
    "maqayis": {
        "id": 9,
        "slug": "ibn-faris-maqayis-al-lugha",
        "title_ar": "مقاييس اللغة",
        "title_en": "Ibn Faris - Maqayis al-Lugha",
        "source_id_slug": "SRC:HAWRAMANI:MAQAYIS",
    },
    "lisan": {
        "id": 3,
        "slug": "ibn-manzur-lisan-al-arab",
        "title_ar": "لسان العرب",
        "title_en": "Ibn Manzur - Lisan al-Arab",
        "source_id_slug": "SRC:HAWRAMANI:LISAN",
    },
    "lane": {
        "id": 50,
        "slug": "william-edward-lane-arabic-english-lexicon",
        "title_ar": "معجم لين العربي-الإنجليزي",
        "title_en": "Lane - Arabic-English Lexicon",
        "source_id_slug": "SRC:HAWRAMANI:LANE",
    },
}

BASE = "https://arabiclexicon.hawramani.com"
UA   = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# ── Stable IDs ─────────────────────────────────────────────────────────────────
def stable_id(prefix: str, *parts) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return prefix + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


# ── HTTP fetch with retry ──────────────────────────────────────────────────────
def fetch(url: str, timeout: int = 30, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "ar,en;q=0.9",
            })
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", errors="replace")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ConnectionResetError) as e:
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
            else:
                raise
    raise RuntimeError("unreachable")


# ── Index page → list of entry URLs ────────────────────────────────────────────
def get_entry_urls(book_slug: str, book_id: int) -> list[tuple[str, str]]:
    """Returns [(headword, url), ...] from the book's index page."""
    html = fetch(f"{BASE}/{book_slug}/")
    pattern = re.compile(
        r'class="letter-nav-post-link"[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*<',
        re.DOTALL,
    )
    out: list[tuple[str, str]] = []
    for href, text in pattern.findall(html):
        # Filter to those linking to this book
        if f"book={book_id}" in href:
            out.append((text.strip(), href))
    return out


# ── HTML → text extraction ─────────────────────────────────────────────────────
class _TextExtractor(HTMLParser):
    """Capture text inside <article> tag, skipping scripts/styles/navs."""
    def __init__(self):
        super().__init__()
        self.in_article = False
        self.in_skip = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        if tag == "article":
            self.in_article = True
        elif tag in {"script", "style", "nav", "header", "footer", "aside"}:
            self.in_skip += 1
        elif tag == "div":
            cls = attrs_d.get("class", "")
            if any(x in cls for x in ["letter-nav", "menu", "sidebar", "navigation", "comments"]):
                self.in_skip += 1

    def handle_endtag(self, tag):
        if tag == "article":
            self.in_article = False
        elif tag in {"script", "style", "nav", "header", "footer", "aside"}:
            if self.in_skip > 0:
                self.in_skip -= 1
        elif tag == "div":
            # Best-effort; we just decrement when we have skip stack
            if self.in_skip > 0:
                self.in_skip -= 1

    def handle_data(self, data):
        if self.in_article and self.in_skip == 0:
            self.parts.append(data)

    def get_text(self) -> str:
        text = "".join(self.parts)
        text = re.sub(r"\s+", " ", text).strip()
        return text


# Boilerplate patterns to strip from extracted Hawramani text
_BOILERPLATE_PREFIXES = [
    re.compile(r"^«Previous[^»]*»Next\s*"),
    re.compile(r"^Entries on \S+ in \d+ Arabic (?:dictionary|dictionaries) by the authors? .*?(?=\n|[؀-ۿ]|Al-Rāghib|Ibn Manẓūr|Ibn Fāris|Lane)", re.DOTALL),
    re.compile(r"Permalink \(الرابط القصير إلى هذا الباب\):\s*https?://\S+\s*"),
    re.compile(r"https?://[^\s]+\s*"),
    re.compile(r"\(d\.\s*c?\.\s*\d{3,4}\s*(?:CE|H|AH)?\)\s*", re.IGNORECASE),
    re.compile(r"▲\s*\(\d+\)\s*▼"),  # ▲ (n) ▼ rating widgets
]
_TAGS_TO_DROP = ["Lane (definitions)", "Lane (root letters)", "Search the dictionary",
                  "Add to favorites", "Print", "Send", "Share"]


def extract_entry_text(html: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(html)
    except Exception:
        pass
    text = parser.get_text()
    if len(text) < 30:
        # Fallback: regex strip
        text = re.sub(r"<script.*?</script>", "", html, flags=re.DOTALL)
        text = re.sub(r"<style.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

    # Strip site navigation cruft
    if "Letter Nav" in text:
        idx = text.find("Letter Nav")
        text = text[idx + len("Letter Nav") :]

    # Strip the "«Previous...»Next" prefix and "Entries on X in N..." prefix
    for pat in _BOILERPLATE_PREFIXES:
        text = pat.sub("", text, count=1)

    # Drop UI labels
    for label in _TAGS_TO_DROP:
        text = text.replace(label, "")

    # Cut at known footer markers if present
    for marker in ["Comments", "Leave a Reply", "Post Comment", "Search the dictionary"]:
        idx = text.find(marker)
        if idx > 200:
            text = text[:idx]

    return re.sub(r"\s+", " ", text).strip()


# ── Worker ────────────────────────────────────────────────────────────────────
class Stats:
    def __init__(self):
        self.lock = threading.Lock()
        self.ok = 0
        self.err = 0
        self.skip = 0


def scrape_entry(book_key: str, book_meta: dict, headword: str, url: str,
                 sleep: float, stats: Stats, out_fh, done_fh, done_set: set, lock: threading.Lock) -> None:
    if url in done_set:
        with stats.lock:
            stats.skip += 1
        return

    try:
        html = fetch(url)
        text = extract_entry_text(html)

        if len(text) < 50:
            with stats.lock:
                stats.err += 1
            return

        source_id = stable_id("AL:SRC:", book_meta["source_id_slug"])
        chunk_id  = stable_id("AL:CHUNK:", source_id, headword, url)

        record = {
            "id":           chunk_id,
            "source_id":    source_id,
            "source_title_en": book_meta["title_en"],
            "chunk_kind":   "lexicon",
            "chunk_seq":    0,
            "heading_norm": headword,
            "text_ar":      text[:8000],
            "page_no":      None,
            "meta_json": {
                "book_key":  book_key,
                "book_id":   book_meta["id"],
                "book_slug": book_meta["slug"],
                "headword":  headword,
                "url":       url,
            },
        }

        with lock:
            out_fh.write(json.dumps(record, ensure_ascii=False) + "\n")
            out_fh.flush()
            done_fh.write(url + "\n")
            done_fh.flush()
            done_set.add(url)

        with stats.lock:
            stats.ok += 1

    except Exception as exc:
        with stats.lock:
            stats.err += 1
        # Optional: log to a file
        with lock:
            done_fh.write(f"# ERROR {url} {exc}\n")
            done_fh.flush()
    finally:
        time.sleep(sleep + random.uniform(0, sleep * 0.5))


def scrape_book(book_key: str, sleep: float, workers: int) -> None:
    book_meta = BOOKS[book_key]
    book_dir = RAW_DIR / book_meta["slug"]
    book_dir.mkdir(parents=True, exist_ok=True)
    out_jsonl = book_dir / "entries.jsonl"
    done_file = DONE_DIR / f"{book_key}.txt"

    # Load done set
    done_set: set[str] = set()
    if done_file.exists():
        for line in done_file.read_text(encoding="utf-8").splitlines():
            if line and not line.startswith("#"):
                done_set.add(line.strip())

    print(f"\n=== {book_meta['title_en']} (book={book_meta['id']}) ===", file=sys.stderr)
    print(f"  Already done: {len(done_set):,}", file=sys.stderr)

    print(f"  Fetching index …", file=sys.stderr)
    entries = get_entry_urls(book_meta["slug"], book_meta["id"])
    todo = [(h, u) for h, u in entries if u not in done_set]
    print(f"  Total entries: {len(entries):,}  | To fetch: {len(todo):,}", file=sys.stderr)

    if not todo:
        return

    out_fh  = open(out_jsonl, "a", encoding="utf-8")
    done_fh = open(done_file, "a", encoding="utf-8")
    lock = threading.Lock()
    stats = Stats()

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [
            ex.submit(scrape_entry, book_key, book_meta, h, u, sleep, stats, out_fh, done_fh, done_set, lock)
            for h, u in todo
        ]
        for i, f in enumerate(as_completed(futures), start=1):
            f.result()  # surface unexpected exceptions
            if i % 100 == 0:
                elapsed = time.time() - t0
                rate = i / max(elapsed, 1e-9)
                eta = (len(todo) - i) / max(rate, 1e-9)
                print(
                    f"  {i:,}/{len(todo):,} | ok={stats.ok} err={stats.err} "
                    f"skip={stats.skip} | {rate:.1f}/s | ETA {eta:.0f}s",
                    file=sys.stderr,
                )

    out_fh.close()
    done_fh.close()
    print(f"  Done {book_key}: ok={stats.ok}, err={stats.err}, skipped={stats.skip}", file=sys.stderr)


# ── Merge per-book entries into staging/chunks/lexicons.jsonl ──────────────────
def merge_to_staging():
    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    n = 0
    with open(OUT_JSONL, "w", encoding="utf-8") as fout:
        for book_key, meta in BOOKS.items():
            book_dir = RAW_DIR / meta["slug"]
            f = book_dir / "entries.jsonl"
            if not f.exists():
                continue
            for line in f.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                obj = json.loads(line)
                if obj["id"] in seen:
                    continue
                seen.add(obj["id"])
                fout.write(line + "\n")
                n += 1
    print(f"\nMerged {n:,} lexicon chunks → {OUT_JSONL}", file=sys.stderr)


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", choices=list(BOOKS) + ["all"], default="all")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--sleep", type=float, default=0.4, help="Seconds between fetches per worker")
    ap.add_argument("--merge-only", action="store_true", help="Skip scrape, just merge to staging")
    args = ap.parse_args()

    if args.merge_only:
        merge_to_staging()
        return

    targets = list(BOOKS) if args.book == "all" else [args.book]
    # Order: smallest first (mufradat) for fastest visible progress
    order = ["mufradat", "maqayis", "lane", "lisan"]
    targets = [b for b in order if b in targets]

    for book in targets:
        scrape_book(book, sleep=args.sleep, workers=args.workers)

    merge_to_staging()


if __name__ == "__main__":
    main()
