#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import fitz

from _common import (
    KELANI_EDITION_ID,
    KELANI_PDF_PATH,
    KELANI_SOURCE_ID,
    chunk_id,
    dedup_chunks_by_checksum,
    sha256_text,
    upsert_raw_chunks,
)


def int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    return int(value)


def ocr_page(page: fitz.Page, page_no: int, dpi_scale: float, lang: str, psm: str) -> str:
    pix = page.get_pixmap(matrix=fitz.Matrix(dpi_scale, dpi_scale), alpha=False)
    image_path = Path(tempfile.gettempdir()) / f"km_kelani_page_{page_no}.png"
    pix.save(image_path)
    try:
        result = subprocess.run(
            ["tesseract", str(image_path), "stdout", "-l", lang, "--psm", psm],
            check=True,
            capture_output=True,
            text=True,
            timeout=int_env("KELANI_OCR_TIMEOUT_SECONDS", 90),
        )
        return result.stdout.strip()
    finally:
        image_path.unlink(missing_ok=True)


def main() -> None:
    if not KELANI_PDF_PATH.exists():
        raise FileNotFoundError(KELANI_PDF_PATH)

    start_page = int_env("KELANI_START_PAGE", 1)
    end_page = int_env("KELANI_END_PAGE", 0)
    pages_per_chunk = int_env("KELANI_PAGES_PER_CHUNK", 2)
    dpi_scale = float(os.getenv("KELANI_OCR_DPI_SCALE", "2.5"))
    lang = os.getenv("KELANI_OCR_LANG", "urd+ara+eng")
    psm = os.getenv("KELANI_OCR_PSM", "6")

    doc = fitz.open(KELANI_PDF_PATH)
    total_pages = doc.page_count
    if end_page <= 0 or end_page > total_pages:
        end_page = total_pages
    if start_page < 1 or start_page > end_page:
        raise ValueError(f"Invalid page range: {start_page}-{end_page}")

    chunks = []
    page_buffer: list[tuple[int, str]] = []
    seq = 1
    for page_no in range(start_page, end_page + 1):
        page_text = ocr_page(doc[page_no - 1], page_no, dpi_scale, lang, psm)
        page_buffer.append((page_no, page_text))
        if len(page_buffer) < pages_per_chunk and page_no != end_page:
            continue

        first_page = page_buffer[0][0]
        last_page = page_buffer[-1][0]
        raw_text = "\n\n".join(f"[PDF page {n}]\n{text}" for n, text in page_buffer if text)
        rel_path = f"kelani-pdf/pages-{first_page:04d}-{last_page:04d}.ocr.txt"
        chunks.append(
            {
                "id": chunk_id("KELANI", rel_path),
                "source_id": KELANI_SOURCE_ID,
                "edition_id": KELANI_EDITION_ID,
                "source_name": "مترادفات القرآن - عبد الرحمٰن کیلانی",
                "source_path": rel_path,
                "source_url": str(KELANI_PDF_PATH),
                "published_url": None,
                "title": f"مترادفات القرآن OCR pages {first_page}-{last_page}",
                "chunk_kind": "semantic",
                "chunk_seq": seq,
                "raw_format": "pdf_ocr",
                "raw_text": raw_text,
                "raw_markup": raw_text,
                "checksum": sha256_text(raw_text),
                "metadata": {
                    "ingestion_stage": "06_extract_kelani_pdf_ocr",
                    "pdf_path": str(KELANI_PDF_PATH),
                    "page_start": first_page,
                    "page_end": last_page,
                    "ocr_lang": lang,
                    "ocr_psm": psm,
                    "ocr_dpi_scale": dpi_scale,
                    "extraction_focus": [
                        "arabic near-synonym terms",
                        "English meaning",
                        "Urdu meaning and nuance",
                    ],
                },
            }
        )
        seq += 1
        page_buffer = []

    # Deduplicate within this batch: PDF pages with identical OCR content get
    # merged into one canonical chunk; duplicate page ranges are recorded in
    # metadata["source_refs"] / metadata["duplicate_page_ranges"] instead of
    # being stored as separate records.
    deduped = dedup_chunks_by_checksum(chunks)
    n_dupes = len(chunks) - len(deduped)
    if n_dupes:
        print(f"  Deduplicated {n_dupes} duplicate PDF page chunk(s) — references merged into canonical records")

    # Upsert into the store: existing records with the same id are updated in
    # place; new records are appended.  This replaces the old filter-and-append
    # pattern and makes re-runs fully idempotent.
    upsert_raw_chunks(deduped)
    print(f"OCR chunked {len(deduped)} unique Kelani PDF chunks from pages {start_page}-{end_page} ({len(chunks)} total scanned)")


if __name__ == "__main__":
    main()
