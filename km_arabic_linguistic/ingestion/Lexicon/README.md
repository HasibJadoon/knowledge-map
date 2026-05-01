# Lexicon Ingestion

This folder is for local-first source acquisition. Scraped pages and raw lexicon dumps are staged here before anything is promoted into canonical `ar_ling_*`, `qr_*`, or `ar_*` tables.

Pipeline:

1. Save raw source locally.
2. Extract main Arabic text locally.
3. Clean text locally.
4. Chunk into local `stage.sqlite`.
5. Review sample pages.
6. Export approved chunks for Cloudflare D1/R2 later.

For Ziydia book 766, the page identity is:

```text
source_slug: ziydia_book_766
book_id: 766
page_no: 6
part_no: 1
source_url: https://ziydia.com/book/766/page/6/1
local_key: ziydia/book_766/page_0006_001
```

Run one review page:

```bash
cd km_arabic_linguistic/ingestion/Lexicon
python3 scripts/lexicon_stage.py fetch-ziydia --book-id 766 --page-start 6 --page-end 6 --part-no 1
python3 scripts/lexicon_stage.py review --source-dir sources/ziydia/book_766 --limit 5
```

After review, scrape a range with a delay:

```bash
python3 scripts/lexicon_stage.py fetch-ziydia --book-id 766 --page-start 6 --page-end 99 --part-no 1 --delay 2
```

To crawl by following Ziydia's next-page links:

```bash
python3 scripts/lexicon_stage.py crawl-ziydia --book-id 766 --start-page 1 --start-part 1 --delay 2
```

Ziydia pages are split into tagged body and footnote segments:

```text
[BODY]
...

[FOOTNOTES]
[FOOTNOTE ١]
...
```

The same split is stored structurally in `page_segments.segment_type` as `body` or `footnote`, with `footnote_no` when detected. Chunk locator JSON also includes `segment_type` and `footnote_no`.

If the site returns `429`, stop and resume later with a larger delay. The scraper now avoids overwriting an existing raw HTML snapshot with non-fetched responses.

Nothing in this folder writes directly to canonical tables. Approved chunks can later map to `ar_ling_sources`, `ar_ling_source_editions`, `ar_ling_source_chunks`, `ar_ling_source_index`, `ar_ling_source_toc`, and `ar_ling_evidence_items`.

Source strategy:

```text
Tier 1 lexicons -> Lexicon local staging -> reviewed ar_ling_source_chunks
Qur'an datasets -> Quran local staging -> QR-specific claims only after review
Learning material -> Arabic acquisition staging -> AR learner-facing rows only after review
```

The registry in `source_registry.json` is the working list for major lexicons. Each source should get its own folder under `sources/<family>/<source_slug>/` with the same raw/clean/chunk/stage layout, even when the source starts as XML, JSONL, SQLite, or PDF instead of web pages.
