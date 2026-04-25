#!/usr/bin/env python3
from __future__ import annotations

import re

from _common import (
    EXTRACTED_DIR,
    SOURCE_CONFIGS,
    blob_url,
    chunk_id,
    extract_markdown_quote_refs,
    first_heading_from_markdown,
    load_raw_chunks,
    markdown_to_text,
    read_text_lossy,
    save_raw_chunks,
    sha256_file,
    split_text_sections,
    write_json,
)


ABSTRACT_TERMS_RE = re.compile(
    r'!!!\s+abstract\s+"Arabic words used for this meaning in Quran"\s*(.+?)(?:\n\s*!!!|\n##|\Z)',
    flags=re.DOTALL,
)


def abstract_terms(raw_markup: str) -> list[dict]:
    match = ABSTRACT_TERMS_RE.search(raw_markup)
    if not match:
        return []
    block = match.group(1)
    line = " ".join(part.strip() for part in block.splitlines())
    pieces = [piece.strip(" -") for piece in re.split(r"\s+-\s+", line) if piece.strip(" -")]
    return [
        {
            "word": piece,
            "wordEn": None,
            "root": None,
            "claim_basis": "direct_source",
            "confidence": "medium",
        }
        for piece in pieces
        if re.search(r"[\u0600-\u06FF]", piece)
    ]


def main() -> None:
    config = SOURCE_CONFIGS["nqcm"]
    raw_chunks = []
    manifest = []

    for file_path in sorted((config.repo_dir / "docs").rglob("*.md")):
        rel_path = file_path.relative_to(config.repo_dir).as_posix()
        raw_markup = read_text_lossy(file_path)
        title = first_heading_from_markdown(raw_markup, file_path.stem)
        cleaned = markdown_to_text(raw_markup)
        refs = extract_markdown_quote_refs(raw_markup)
        terms = abstract_terms(raw_markup)
        skip_extraction = file_path.stem == "index" or rel_path in {
            "docs/index.md",
            "docs/index/index.md",
            "docs/sources.md",
            "docs/synonymy.md",
        }
        sections = split_text_sections(title, cleaned, rel_path, min_len=1400)
        for index, section in enumerate(sections, start=1):
            suffix = section["section_suffix"] or ("article" if len(sections) == 1 else f"part-{index}")
            chunk = {
                "id": chunk_id("NQCM", rel_path, suffix),
                "source_id": config.source_id,
                "edition_id": config.edition_id,
                "source_name": config.source_name,
                "source_path": rel_path,
                "source_url": blob_url(config, rel_path),
                "published_url": None,
                "title": title,
                "chunk_kind": "semantic",
                "chunk_seq": index,
                "raw_format": "markdown",
                "raw_text": section["section_text"],
                "raw_markup": raw_markup,
                "checksum": sha256_file(file_path),
                "metadata": {
                    "ingestion_stage": "05_parse_nqcm_markdown",
                    "article_title": title,
                    "canonical_en": title,
                    "section_title": section["section_title"],
                    "section_suffix": suffix,
                    "topic_slug": file_path.stem,
                    "quran_refs": refs,
                    "structured_terms": terms,
                    "skip_extraction": skip_extraction,
                },
            }
            raw_chunks.append(chunk)
        manifest.append(
            {
                "source_path": rel_path,
                "title": title,
                "chunks": len(sections),
                "quran_ref_count": len(refs),
            }
        )

    retained = []
    for chunk in load_raw_chunks():
        if chunk["source_id"] != config.source_id:
            retained.append(chunk)
            continue
        if not chunk.get("source_path", "").startswith("docs/"):
            retained.append(chunk)
            continue
    save_raw_chunks(retained + raw_chunks)
    write_json(EXTRACTED_DIR / "nqcm_markdown_pages.json", manifest)
    print(f"Parsed {len(manifest)} nqcm markdown articles into {len(raw_chunks)} chunks")


if __name__ == "__main__":
    main()
