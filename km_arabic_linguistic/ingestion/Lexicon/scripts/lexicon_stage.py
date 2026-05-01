#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import subprocess
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas" / "stage_schema.sql"
USER_AGENT = "KMapsResearchBot/0.1; personal research; polite page archiving"


class MainTextParser(HTMLParser):
    SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "noscript", "svg"}
    BLOCK_TAGS = {
        "address",
        "article",
        "blockquote",
        "br",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "main",
        "p",
        "section",
        "td",
        "th",
        "tr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.SKIP_TAGS:
            self._skip_depth += 1
        if self._skip_depth == 0 and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1
        if self._skip_depth == 0 and tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self.parts.append(data)

    def text(self) -> str:
        return "\n".join(part.strip() for part in self.parts if part.strip())


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ensure_source_dirs(source_dir: Path) -> None:
    for name in ("raw_html", "raw_text", "clean_text", "chunks", "logs", "exports"):
        (source_dir / name).mkdir(parents=True, exist_ok=True)


def init_db(source_dir: Path) -> Path:
    ensure_source_dirs(source_dir)
    db_path = source_dir / "stage.sqlite"
    con = sqlite3.connect(db_path)
    con.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    con.commit()
    con.close()
    return db_path


def page_key(page_no: int, part_no: int) -> str:
    return f"page_{page_no:04d}_{part_no:03d}"


def fetch_url(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as res:
        charset = res.headers.get_content_charset() or "utf-8"
        return res.read().decode(charset, errors="replace")


def parse_next_ziydia_page(raw_html: str, book_id: str) -> tuple[int, int] | None:
    pagination = re.search(
        r'<div\s+id=["\']pagination-container["\'][^>]*>(?P<body>.*?)<div\s+id=["\']floating-menu["\']',
        raw_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    html_block = pagination.group("body") if pagination else raw_html
    for anchor in re.finditer(r"<a\s+[^>]*href=[\"'][^\"']+[\"'][^>]*>.*?</a>", html_block, re.DOTALL | re.IGNORECASE):
        anchor_html = anchor.group(0)
        anchor_text = normalize_arabic_text(re.sub(r"<[^>]+>", " ", anchor_html))
        if "الصفحة التالية" not in anchor_text:
            continue
        href = re.search(
            rf'href=["\']/book/{re.escape(book_id)}/page/(\d+)/(\d+)["\']',
            anchor_html,
            flags=re.IGNORECASE,
        )
        if href:
            return int(href.group(1)), int(href.group(2))
    return None


def extract_main_text(raw_html: str) -> str:
    raw_html = extract_book_content_html(raw_html) or raw_html
    parser = MainTextParser()
    parser.feed(raw_html)
    text = html.unescape(parser.text())
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def extract_book_content_html(raw_html: str) -> str | None:
    match = re.search(
        r'<div\s+id=["\']bookContent["\'][^>]*>(?P<body>.*?)<div\s+id=["\']pagination-container["\']',
        raw_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    return match.group("body") if match else None


def strip_html(fragment: str) -> str:
    parser = MainTextParser()
    parser.feed(fragment)
    return normalize_arabic_text(html.unescape(parser.text()))


def extract_ziydia_segments(raw_html: str) -> tuple[str, list[dict[str, object]]]:
    book_html = extract_book_content_html(raw_html)
    if not book_html:
        text = normalize_arabic_text(extract_main_text(raw_html))
        return text, [{"segment_type": "body", "footnote_no": None, "heading": None, "text_ar": text}]

    segments: list[dict[str, object]] = []
    body_parts: list[str] = []
    footnotes: list[dict[str, object]] = []
    in_footnotes = False

    for match in re.finditer(r"<p\b(?P<attrs>[^>]*)>(?P<body>.*?)</p>", book_html, flags=re.IGNORECASE | re.DOTALL):
        attrs = match.group("attrs")
        body_html = match.group("body")
        if "<hr" in body_html.lower():
            in_footnotes = True
            continue
        text = strip_html(body_html)
        if not text:
            continue
        footnote_no_match = re.match(r"^\(?([0-9٠-٩۰-۹]+)\)?\s*(.*)$", text, flags=re.DOTALL)
        is_footnote = in_footnotes or "text-indent" in attrs or "font-size: 0.8em" in attrs
        if is_footnote and footnote_no_match:
            footnotes.append(
                {
                    "segment_type": "footnote",
                    "footnote_no": footnote_no_match.group(1),
                    "heading": f"footnote:{footnote_no_match.group(1)}",
                    "text_ar": normalize_arabic_text(footnote_no_match.group(2)),
                }
            )
        elif is_footnote:
            if footnotes:
                footnotes[-1]["text_ar"] = normalize_arabic_text(f"{footnotes[-1]['text_ar']}\n{text}")
            else:
                footnotes.append(
                    {
                        "segment_type": "footnote",
                        "footnote_no": None,
                        "heading": "footnote",
                        "text_ar": text,
                    }
                )
        else:
            body_parts.append(text)

    body_text = normalize_arabic_text("\n".join(body_parts))
    if body_text:
        segments.append({"segment_type": "body", "footnote_no": None, "heading": "body", "text_ar": body_text})
    segments.extend(footnotes)

    tagged_parts: list[str] = []
    if body_text:
        tagged_parts.append("[BODY]\n" + body_text)
    if footnotes:
        tagged_parts.append(
            "[FOOTNOTES]\n"
            + "\n\n".join(
                f"[FOOTNOTE {item['footnote_no'] or '?'}]\n{item['text_ar']}" for item in footnotes
            )
        )
    clean_text = normalize_arabic_text("\n\n".join(tagged_parts))
    return clean_text, segments


def normalize_arabic_text(text: str) -> str:
    text = text.replace("\u2028", "\n").replace("\u2029", "\n")
    text = text.replace("\u200f", "").replace("\u200e", "")
    text = text.replace("\u2063", "")
    text = text.replace("\ufeff", "").replace("\xa0", " ")
    text = text.replace("&nbsp", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, max_chars: int) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n{1,}", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if not current:
            current = paragraph
        elif len(current) + len(paragraph) + 1 <= max_chars:
            current = f"{current}\n{paragraph}"
        else:
            chunks.append(current)
            current = paragraph
    if current:
        chunks.append(current)
    return chunks


def chunk_segments(segments: list[dict[str, object]], max_chars: int) -> list[dict[str, object]]:
    chunked: list[dict[str, object]] = []
    for segment in segments:
        text = str(segment["text_ar"])
        if not text:
            continue
        for part_index, part in enumerate(chunk_text(text, max_chars=max_chars), start=1):
            chunked.append(
                {
                    "segment_type": segment["segment_type"],
                    "footnote_no": segment.get("footnote_no"),
                    "heading": segment.get("heading"),
                    "segment_part": part_index,
                    "text_ar": part,
                }
            )
    return chunked


def write_chunks_json(path: Path, chunks: list[dict[str, object]]) -> None:
    path.write_text(json.dumps(chunks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stage_text_document(
    source_dir: Path,
    source_slug: str,
    book_id: str,
    doc_id: str,
    source_url: str,
    local_key: str,
    raw_path: Path,
    raw_text: str,
    max_chars: int,
    segments: list[dict[str, object]] | None = None,
) -> None:
    init_db(source_dir)
    raw_text = raw_text.replace("\u2028", "\n").replace("\u2029", "\n")
    if segments is None:
        body_text = normalize_arabic_text(raw_text)
        segments = [{"segment_type": "body", "footnote_no": None, "heading": "body", "text_ar": body_text}]
    body_segments = [s for s in segments if s["segment_type"] == "body"]
    footnote_segments = [s for s in segments if s["segment_type"] == "footnote"]
    body_text = normalize_arabic_text("\n\n".join(str(s["text_ar"]) for s in body_segments))
    tagged_parts = ["[BODY]\n" + body_text] if body_text else []
    if footnote_segments:
        tagged_parts.append(
            "[FOOTNOTES]\n"
            + "\n\n".join(
                f"[FOOTNOTE {item['footnote_no']}]\n{item['text_ar']}" for item in footnote_segments
            )
        )
    clean_text = normalize_arabic_text("\n\n".join(tagged_parts))
    clean_path = source_dir / "clean_text" / f"{doc_id}.clean.txt"
    raw_text_path = source_dir / "raw_text" / f"{doc_id}.raw.txt"
    chunks_path = source_dir / "chunks" / f"{doc_id}.chunks.json"
    raw_text_path.write_text(raw_text.rstrip() + "\n", encoding="utf-8")
    clean_path.write_text(clean_text + "\n", encoding="utf-8")

    raw_page_id = f"raw:{source_slug}:{doc_id}"
    chunks = chunk_text(clean_text, max_chars=max_chars)
    chunk_rows: list[dict[str, object]] = []
    con = sqlite3.connect(source_dir / "stage.sqlite")
    con.execute(
        """
        INSERT OR REPLACE INTO raw_pages (
          id, source_slug, source_type, book_id, page_no, part_no, url, local_key,
          raw_html_path, raw_text_path, clean_text_path, html_sha256, text_sha256,
          fetch_status, clean_status, fetched_at
        ) VALUES (?, ?, 'downloaded_document', ?, NULL, 1, ?, ?, ?, ?, ?, ?, ?, 'fetched', 'cleaned', ?)
        """,
        (
            raw_page_id,
            source_slug,
            book_id,
            source_url,
            local_key,
            str(raw_path.relative_to(source_dir)),
            str(raw_text_path.relative_to(source_dir)),
            str(clean_path.relative_to(source_dir)),
            sha256_text(raw_path.read_bytes().hex()),
            sha256_text(clean_text),
            utc_now(),
        ),
    )
    con.execute("DELETE FROM clean_chunks WHERE raw_page_id = ?", (raw_page_id,))
    con.execute("DELETE FROM page_segments WHERE raw_page_id = ?", (raw_page_id,))
    staged_chunks: list[dict[str, object]] = []
    segment_cursor = 0
    for segment_index, segment in enumerate(segments, start=1):
        segment_text = normalize_arabic_text(str(segment["text_ar"]))
        if not segment_text:
            continue
        segment_start = clean_text.find(segment_text, segment_cursor)
        segment_end = segment_start + len(segment_text)
        segment_cursor = segment_end
        segment_locator = {
            "source_slug": source_slug,
            "book_id": book_id,
            "doc_id": doc_id,
            "segment_index": segment_index,
            "segment_type": segment["segment_type"],
            "footnote_no": segment.get("footnote_no"),
            "source_url": source_url,
            "local_key": local_key,
            "raw_document_path": str(raw_path.relative_to(source_dir)),
            "clean_text_path": str(clean_path.relative_to(source_dir)),
        }
        con.execute(
            """
            INSERT INTO page_segments (
              id, raw_page_id, source_slug, book_id, page_no, part_no, segment_index,
              segment_type, footnote_no, heading, text_ar, locator_json, char_start, char_end
            ) VALUES (?, ?, ?, ?, NULL, 1, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"segment:{source_slug}:{doc_id}:{segment_index}",
                raw_page_id,
                source_slug,
                book_id,
                segment_index,
                segment["segment_type"],
                segment.get("footnote_no"),
                segment.get("heading"),
                segment_text,
                json.dumps(segment_locator, ensure_ascii=False),
                segment_start,
                segment_end,
            ),
        )
        for part_index, chunk in enumerate(chunk_text(segment_text, max_chars=max_chars), start=1):
            staged_chunks.append(
                {
                    "segment_type": segment["segment_type"],
                    "footnote_no": segment.get("footnote_no"),
                    "heading": segment.get("heading"),
                    "segment_part": part_index,
                    "text_ar": chunk,
                }
            )
    cursor = 0
    for index, chunk in enumerate(staged_chunks, start=1):
        chunk_text_ar = str(chunk["text_ar"])
        start = clean_text.find(chunk_text_ar, cursor)
        end = start + len(chunk_text_ar)
        cursor = end
        chunk_id = f"chunk:{source_slug}:{doc_id}:{index}"
        locator = {
            "source_slug": source_slug,
            "book_id": book_id,
            "doc_id": doc_id,
            "chunk_index": index,
            "segment_type": chunk["segment_type"],
            "footnote_no": chunk.get("footnote_no"),
            "segment_part": chunk.get("segment_part"),
            "source_url": source_url,
            "local_key": local_key,
            "raw_document_path": str(raw_path.relative_to(source_dir)),
            "clean_text_path": str(clean_path.relative_to(source_dir)),
        }
        row = {
            "id": chunk_id,
            "raw_page_id": raw_page_id,
            "source_slug": source_slug,
            "book_id": book_id,
            "page_no": None,
            "part_no": 1,
            "chunk_index": index,
            "heading": f"{doc_id}:{chunk.get('heading') or chunk['segment_type']}",
            "text_ar": chunk_text_ar,
            "text_norm": normalize_arabic_text(chunk_text_ar),
            "source_url": source_url,
            "locator_json": locator,
            "char_start": start,
            "char_end": end,
            "token_count": len(chunk_text_ar.split()),
            "review_status": "pending",
        }
        chunk_rows.append(row)
        con.execute(
            """
            INSERT INTO clean_chunks (
              id, raw_page_id, source_slug, book_id, page_no, part_no, chunk_index,
              heading, text_ar, text_norm, source_url, locator_json, char_start,
              char_end, token_count
            ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["id"],
                row["raw_page_id"],
                row["source_slug"],
                row["book_id"],
                row["part_no"],
                row["chunk_index"],
                row["heading"],
                row["text_ar"],
                row["text_norm"],
                row["source_url"],
                json.dumps(locator, ensure_ascii=False),
                row["char_start"],
                row["char_end"],
                row["token_count"],
            ),
        )
    con.commit()
    con.close()
    write_chunks_json(chunks_path, chunk_rows)
    print(f"{doc_id}: {len(clean_text)} chars, {len(staged_chunks)} chunks, {len(footnote_segments)} footnotes")


def replace_empty_note_refs(body_text: str, count: int) -> str:
    note_no = 0

    def repl(_: re.Match[str]) -> str:
        nonlocal note_no
        note_no += 1
        return f"({note_no})" if note_no <= count else "()"

    return re.sub(r"\(\)", repl, body_text)


def extract_word_html_segments(html_text: str) -> list[dict[str, object]]:
    body_parts: list[str] = []
    footnotes: list[dict[str, object]] = []
    in_footnotes = False
    for match in re.finditer(r"<p\b[^>]*>(.*?)</p>", html_text, flags=re.IGNORECASE | re.DOTALL):
        text = strip_html(match.group(1))
        if not text:
            continue
        if text.startswith("()"):
            in_footnotes = True
            note_text = normalize_arabic_text(text[2:])
            footnotes.append(
                {
                    "segment_type": "footnote",
                    "footnote_no": str(len(footnotes) + 1),
                    "heading": f"footnote:{len(footnotes) + 1}",
                    "text_ar": note_text,
                }
            )
        elif in_footnotes and footnotes:
            footnotes[-1]["text_ar"] = normalize_arabic_text(f"{footnotes[-1]['text_ar']}\n{text}")
        else:
            body_parts.append(text)

    body_text = normalize_arabic_text("\n".join(body_parts))
    body_text = replace_empty_note_refs(body_text, len(footnotes))
    segments: list[dict[str, object]] = []
    if body_text:
        segments.append({"segment_type": "body", "footnote_no": None, "heading": "body", "text_ar": body_text})
    segments.extend(footnotes)
    return segments


def ingest_saaid_zip(source_dir: Path, url: str, source_slug: str, book_id: str, max_chars: int) -> None:
    ensure_source_dirs(source_dir)
    (source_dir / "raw_zip").mkdir(parents=True, exist_ok=True)
    (source_dir / "raw_docs").mkdir(parents=True, exist_ok=True)
    zip_path = source_dir / "raw_zip" / "saaid_479.zip"
    if not zip_path.exists():
        print(f"downloading {url}")
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=120) as res:
            zip_path.write_bytes(res.read())
    else:
        print(f"using cached {zip_path}")

    with ZipFile(zip_path) as archive:
        docs = [info for info in archive.infolist() if not info.is_dir()]
        for index, info in enumerate(docs, start=1):
            doc_id = f"volume_{index:02d}"
            doc_path = source_dir / "raw_docs" / f"{doc_id}.doc"
            html_path = source_dir / "raw_html" / f"{doc_id}.html"
            doc_path.write_bytes(archive.read(info))
            txt_path = source_dir / "raw_text" / f"{doc_id}.raw.txt"
            subprocess.run(
                [
                    "textutil",
                    "-convert",
                    "txt",
                    "-encoding",
                    "UTF-8",
                    "-output",
                    str(txt_path),
                    str(doc_path),
                ],
                check=True,
            )
            subprocess.run(
                [
                    "textutil",
                    "-convert",
                    "html",
                    "-encoding",
                    "UTF-8",
                    "-output",
                    str(html_path),
                    str(doc_path),
                ],
                check=True,
            )
            raw_text = txt_path.read_text(encoding="utf-8", errors="replace")
            html_text = html_path.read_text(encoding="utf-8", errors="replace")
            stage_text_document(
                source_dir=source_dir,
                source_slug=source_slug,
                book_id=book_id,
                doc_id=doc_id,
                source_url=url,
                local_key=f"saaid/maqayis/{doc_id}",
                raw_path=doc_path,
                raw_text=raw_text,
                max_chars=max_chars,
                segments=extract_word_html_segments(html_text),
            )


def fetch_ziydia_page(
    source_dir: Path,
    book_id: str,
    page_no: int,
    part_no: int,
    max_chars: int,
    raw_html_override: str | None = None,
    fetch_status_override: str | None = None,
) -> dict[str, object]:
    init_db(source_dir)
    url = f"https://ziydia.com/book/{book_id}/page/{page_no}/{part_no}"
    key = page_key(page_no, part_no)
    source_slug = f"ziydia_book_{book_id}"
    raw_page_id = f"raw:{source_slug}:{page_no}:{part_no}"
    local_key = f"ziydia/book_{book_id}/{key}"

    html_path = source_dir / "raw_html" / f"{key}.html"
    raw_text_path = source_dir / "raw_text" / f"{key}.raw.txt"
    clean_text_path = source_dir / "clean_text" / f"{key}.clean.txt"
    chunks_path = source_dir / "chunks" / f"{key}.chunks.json"
    log_path = source_dir / "logs" / "fetch.log"

    if raw_html_override is not None:
        raw_html = raw_html_override
        fetch_status = fetch_status_override or "cached"
    else:
        try:
            raw_html = fetch_url(url)
            fetch_status = "fetched"
        except urllib.error.HTTPError as exc:
            raw_html = exc.read().decode("utf-8", errors="replace")
            fetch_status = f"http_{exc.code}"
        except Exception as exc:  # noqa: BLE001 - preserve fetch failure in local DB.
            log_path.open("a", encoding="utf-8").write(f"{utc_now()}\t{url}\tERROR\t{exc}\n")
            raise

    if fetch_status != "fetched" and raw_html_override is None and html_path.exists():
        log_path.open("a", encoding="utf-8").write(
            f"{utc_now()}\t{url}\t{fetch_status}\tskipped_existing_snapshot\n"
        )
        return {
            "url": url,
            "page_no": page_no,
            "part_no": part_no,
            "fetch_status": fetch_status,
            "raw_html": html_path.read_text(encoding="utf-8"),
            "clean_chars": 0,
            "chunk_count": 0,
        }

    html_path.write_text(raw_html, encoding="utf-8")
    raw_text = extract_main_text(raw_html)
    clean_text, segments = extract_ziydia_segments(raw_html)
    raw_text_path.write_text(raw_text + "\n", encoding="utf-8")
    clean_text_path.write_text(clean_text + "\n", encoding="utf-8")

    chunks = chunk_segments(segments, max_chars=max_chars)
    chunk_rows: list[dict[str, object]] = []
    cursor = 0
    con = sqlite3.connect(source_dir / "stage.sqlite")
    con.execute(
        """
        INSERT OR REPLACE INTO raw_pages (
          id, source_slug, source_type, book_id, page_no, part_no, url, local_key,
          raw_html_path, raw_text_path, clean_text_path, html_sha256, text_sha256,
          fetch_status, clean_status, fetched_at
        ) VALUES (?, ?, 'web_book_page', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cleaned', ?)
        """,
        (
            raw_page_id,
            source_slug,
            book_id,
            page_no,
            part_no,
            url,
            local_key,
            str(html_path.relative_to(source_dir)),
            str(raw_text_path.relative_to(source_dir)),
            str(clean_text_path.relative_to(source_dir)),
            sha256_text(raw_html),
            sha256_text(clean_text),
            fetch_status,
            utc_now(),
        ),
    )
    con.execute("DELETE FROM clean_chunks WHERE raw_page_id = ?", (raw_page_id,))
    con.execute("DELETE FROM page_segments WHERE raw_page_id = ?", (raw_page_id,))

    segment_cursor = 0
    for segment_index, segment in enumerate(segments, start=1):
        segment_text = str(segment["text_ar"])
        segment_start = clean_text.find(segment_text, segment_cursor)
        segment_end = segment_start + len(segment_text)
        segment_cursor = segment_end
        segment_id = f"segment:{source_slug}:{page_no}:{part_no}:{segment_index}"
        segment_locator = {
            "source_slug": source_slug,
            "book_id": book_id,
            "page_no": page_no,
            "part_no": part_no,
            "segment_index": segment_index,
            "segment_type": segment["segment_type"],
            "footnote_no": segment.get("footnote_no"),
            "source_url": url,
            "local_key": local_key,
            "raw_html_path": str(html_path.relative_to(source_dir)),
            "clean_text_path": str(clean_text_path.relative_to(source_dir)),
        }
        con.execute(
            """
            INSERT INTO page_segments (
              id, raw_page_id, source_slug, book_id, page_no, part_no, segment_index,
              segment_type, footnote_no, heading, text_ar, locator_json, char_start, char_end
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                segment_id,
                raw_page_id,
                source_slug,
                book_id,
                page_no,
                part_no,
                segment_index,
                segment["segment_type"],
                segment.get("footnote_no"),
                segment.get("heading"),
                segment_text,
                json.dumps(segment_locator, ensure_ascii=False),
                segment_start,
                segment_end,
            ),
        )

    for index, chunk in enumerate(chunks, start=1):
        chunk_text_ar = str(chunk["text_ar"])
        start = clean_text.find(chunk_text_ar, cursor)
        end = start + len(chunk_text_ar)
        cursor = end
        chunk_id = f"chunk:{source_slug}:{page_no}:{part_no}:{index}"
        locator = {
            "source_slug": source_slug,
            "book_id": book_id,
            "page_no": page_no,
            "part_no": part_no,
            "chunk_index": index,
            "segment_type": chunk["segment_type"],
            "footnote_no": chunk.get("footnote_no"),
            "segment_part": chunk.get("segment_part"),
            "source_url": url,
            "local_key": local_key,
            "raw_html_path": str(html_path.relative_to(source_dir)),
            "clean_text_path": str(clean_text_path.relative_to(source_dir)),
        }
        row = {
            "id": chunk_id,
            "raw_page_id": raw_page_id,
            "source_slug": source_slug,
            "book_id": book_id,
            "page_no": page_no,
            "part_no": part_no,
            "chunk_index": index,
            "heading": chunk.get("heading"),
            "text_ar": chunk_text_ar,
            "text_norm": normalize_arabic_text(chunk_text_ar),
            "source_url": url,
            "locator_json": locator,
            "char_start": start,
            "char_end": end,
            "token_count": len(chunk_text_ar.split()),
            "review_status": "pending",
        }
        chunk_rows.append(row)
        con.execute(
            """
            INSERT INTO clean_chunks (
              id, raw_page_id, source_slug, book_id, page_no, part_no, chunk_index,
              heading, text_ar, text_norm, source_url, locator_json, char_start,
              char_end, token_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["id"],
                row["raw_page_id"],
                row["source_slug"],
                row["book_id"],
                row["page_no"],
                row["part_no"],
                row["chunk_index"],
                row["heading"],
                row["text_ar"],
                row["text_norm"],
                row["source_url"],
                json.dumps(locator, ensure_ascii=False),
                row["char_start"],
                row["char_end"],
                row["token_count"],
            ),
        )
    con.commit()
    con.close()

    write_chunks_json(chunks_path, chunk_rows)
    log_path.open("a", encoding="utf-8").write(
        f"{utc_now()}\t{url}\t{fetch_status}\tchars={len(clean_text)}\tchunks={len(chunks)}\n"
    )
    print(f"{key}: {fetch_status}, {len(clean_text)} chars, {len(chunks)} chunks")
    return {
        "url": url,
        "page_no": page_no,
        "part_no": part_no,
        "fetch_status": fetch_status,
        "raw_html": raw_html,
        "clean_chars": len(clean_text),
        "chunk_count": len(chunks),
    }


def reprocess_ziydia_source(source_dir: Path, book_id: str, max_chars: int) -> None:
    init_db(source_dir)
    html_files = sorted((source_dir / "raw_html").glob("page_*.html"))
    processed = 0
    skipped = 0
    for html_file in html_files:
        match = re.match(r"page_(\d{4})_(\d{3})\.html$", html_file.name)
        if not match:
            continue
        raw_html = html_file.read_text(encoding="utf-8", errors="replace")
        if not extract_book_content_html(raw_html):
            skipped += 1
            print(f"{html_file.name}: skipped, no cached bookContent block")
            continue
        fetch_ziydia_page(
            source_dir,
            book_id,
            int(match.group(1)),
            int(match.group(2)),
            max_chars,
            raw_html_override=raw_html,
            fetch_status_override="cached",
        )
        processed += 1
    print(f"reprocessed {processed} cached raw HTML pages; skipped {skipped}")


def crawl_ziydia(
    source_dir: Path,
    book_id: str,
    start_page: int,
    start_part: int,
    max_chars: int,
    delay: float,
    max_pages: int,
    retry_429: int,
    retry_wait: float,
) -> None:
    seen: set[tuple[int, int]] = set()
    page_no = start_page
    part_no = start_part
    count = 0
    while count < max_pages:
        current = (page_no, part_no)
        if current in seen:
            raise RuntimeError(f"crawler loop detected at page={page_no} part={part_no}")
        seen.add(current)
        result = fetch_ziydia_page(source_dir, book_id, page_no, part_no, max_chars)
        attempts_left = retry_429
        while result["fetch_status"] == "http_429" and attempts_left > 0:
            print(f"rate limited at page={page_no} part={part_no}; waiting {retry_wait}s ({attempts_left} retries left)")
            time.sleep(retry_wait)
            result = fetch_ziydia_page(source_dir, book_id, page_no, part_no, max_chars)
            attempts_left -= 1
        if result["fetch_status"] != "fetched":
            print(f"stopping on non-fetched status: {result['fetch_status']}")
            break
        count += 1
        next_page = parse_next_ziydia_page(str(result["raw_html"]), book_id)
        if not next_page:
            print(f"crawl complete: {count} pages, last page={page_no}, part={part_no}")
            break
        page_no, part_no = next_page
        if delay:
            time.sleep(delay)
    else:
        print(f"stopped at max_pages={max_pages}; last page={page_no}, part={part_no}")


def find_cached_next(source_dir: Path, book_id: str, page_no: int, part_no: int) -> tuple[int, int] | None:
    html_path = source_dir / "raw_html" / f"{page_key(page_no, part_no)}.html"
    if not html_path.exists():
        return None
    raw_html = html_path.read_text(encoding="utf-8", errors="replace")
    if not extract_book_content_html(raw_html):
        return None
    return parse_next_ziydia_page(raw_html, book_id)


def review(source_dir: Path, limit: int) -> None:
    db_path = init_db(source_dir)
    con = sqlite3.connect(db_path)
    pages = con.execute(
        """
        SELECT page_no, part_no, fetch_status, clean_status, review_status, url,
               length(coalesce((SELECT text_ar FROM clean_chunks c WHERE c.raw_page_id = raw_pages.id LIMIT 1), ''))
        FROM raw_pages
        ORDER BY page_no, part_no
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    print("raw_pages:")
    for page in pages:
        print(page)
    print("\nclean_chunks:")
    rows = con.execute(
        """
        SELECT page_no, part_no, chunk_index, token_count, substr(text_ar, 1, 220)
        FROM clean_chunks
        ORDER BY page_no, part_no, chunk_index
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    for row in rows:
        print(json.dumps(row, ensure_ascii=False))
    con.close()


def export_approved(source_dir: Path) -> None:
    db_path = init_db(source_dir)
    export_path = source_dir / "exports" / "approved_chunks.jsonl"
    con = sqlite3.connect(db_path)
    rows = con.execute(
        """
        SELECT id, raw_page_id, source_slug, book_id, page_no, part_no, chunk_index,
               heading, text_ar, text_norm, source_url, locator_json, char_start,
               char_end, token_count
        FROM clean_chunks
        WHERE review_status = 'approved'
        ORDER BY page_no, part_no, chunk_index
        """
    ).fetchall()
    columns = [desc[0] for desc in con.execute("SELECT * FROM clean_chunks LIMIT 0").description]
    selected_columns = columns[:15]
    with export_path.open("w", encoding="utf-8") as out:
        for row in rows:
            out.write(json.dumps(dict(zip(selected_columns, row)), ensure_ascii=False) + "\n")
    con.close()
    print(f"exported {len(rows)} approved chunks to {export_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local-first lexicon source staging.")
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init-db")
    init.add_argument("--source-dir", type=Path, required=True)

    fetch = sub.add_parser("fetch-ziydia")
    fetch.add_argument("--book-id", default="766")
    fetch.add_argument("--page-start", type=int, required=True)
    fetch.add_argument("--page-end", type=int, required=True)
    fetch.add_argument("--part-no", type=int, default=1)
    fetch.add_argument("--delay", type=float, default=0.0)
    fetch.add_argument("--max-chars", type=int, default=1800)
    fetch.add_argument("--source-dir", type=Path)

    crawl = sub.add_parser("crawl-ziydia")
    crawl.add_argument("--book-id", default="766")
    crawl.add_argument("--start-page", type=int, default=1)
    crawl.add_argument("--start-part", type=int, default=1)
    crawl.add_argument("--delay", type=float, default=2.0)
    crawl.add_argument("--max-pages", type=int, default=10000)
    crawl.add_argument("--max-chars", type=int, default=1800)
    crawl.add_argument("--retry-429", type=int, default=0)
    crawl.add_argument("--retry-wait", type=float, default=300.0)
    crawl.add_argument("--source-dir", type=Path)

    rev = sub.add_parser("review")
    rev.add_argument("--source-dir", type=Path, required=True)
    rev.add_argument("--limit", type=int, default=5)

    exp = sub.add_parser("export-approved")
    exp.add_argument("--source-dir", type=Path, required=True)

    saaid = sub.add_parser("ingest-saaid-zip")
    saaid.add_argument("--url", default="https://saaid.org/book/2/479.zip")
    saaid.add_argument("--source-slug", default="saaid_maqayis_al_lugha")
    saaid.add_argument("--book-id", default="479")
    saaid.add_argument("--source-dir", type=Path, default=ROOT / "sources" / "saaid" / "maqayis_al_lugha")
    saaid.add_argument("--max-chars", type=int, default=1800)

    rep = sub.add_parser("reprocess-ziydia")
    rep.add_argument("--book-id", default="766")
    rep.add_argument("--source-dir", type=Path)
    rep.add_argument("--max-chars", type=int, default=1800)

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "init-db":
        print(init_db(args.source_dir))
        return 0
    if args.command == "fetch-ziydia":
        source_dir = args.source_dir or ROOT / "sources" / "ziydia" / f"book_{args.book_id}"
        for page_no in range(args.page_start, args.page_end + 1):
            fetch_ziydia_page(source_dir, args.book_id, page_no, args.part_no, args.max_chars)
            if args.delay and page_no != args.page_end:
                time.sleep(args.delay)
        return 0
    if args.command == "crawl-ziydia":
        source_dir = args.source_dir or ROOT / "sources" / "ziydia" / f"book_{args.book_id}"
        crawl_ziydia(
            source_dir,
            args.book_id,
            args.start_page,
            args.start_part,
            args.max_chars,
            args.delay,
            args.max_pages,
            args.retry_429,
            args.retry_wait,
        )
        return 0
    if args.command == "review":
        review(args.source_dir, args.limit)
        return 0
    if args.command == "export-approved":
        export_approved(args.source_dir)
        return 0
    if args.command == "ingest-saaid-zip":
        ingest_saaid_zip(args.source_dir, args.url, args.source_slug, args.book_id, args.max_chars)
        return 0
    if args.command == "reprocess-ziydia":
        source_dir = args.source_dir or ROOT / "sources" / "ziydia" / f"book_{args.book_id}"
        reprocess_ziydia_source(source_dir, args.book_id, args.max_chars)
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
