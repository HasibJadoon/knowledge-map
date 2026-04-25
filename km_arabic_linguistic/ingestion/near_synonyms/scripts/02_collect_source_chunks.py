#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from _common import (
    OUTPUT_DIR,
    SOURCE_CONFIGS,
    blob_url,
    chunk_id,
    find_title_from_html,
    first_heading_from_markdown,
    load_raw_chunks,
    markdown_to_text,
    published_url,
    read_text_lossy,
    save_raw_chunks,
    sha256_file,
    strip_html,
    write_json,
)


QDEV_DATA_FILES = {
    "data/SYNONYMS.csv",
    "data/SYNONYMS_DETAILS.csv",
    "data/SYNONYMS_DETAILS.json",
    "data/SYNONYMS_INDEX.json",
    "data/synonyms.json",
    "data/synonymsdetails.json",
    "data/refs.json",
    "data/topicsAyahsMap.json",
}


def generic_chunk(config_key: str, file_path: Path) -> dict:
    config = SOURCE_CONFIGS[config_key]
    rel_path = file_path.relative_to(config.repo_dir).as_posix()
    raw_markup = read_text_lossy(file_path)
    if file_path.suffix.lower() == ".html":
        title = find_title_from_html(raw_markup, rel_path)
        raw_text = strip_html(raw_markup)
        raw_format = "html"
    elif file_path.suffix.lower() == ".md":
        title = first_heading_from_markdown(raw_markup, rel_path)
        raw_text = markdown_to_text(raw_markup)
        raw_format = "markdown"
    else:
        title = rel_path
        raw_text = raw_markup.strip()
        raw_format = file_path.suffix.lower().lstrip(".") or "text"
    return {
        "id": chunk_id("QDEV" if config_key == "qdev" else "NQCM", rel_path),
        "source_id": config.source_id,
        "edition_id": config.edition_id,
        "source_name": config.source_name,
        "source_path": rel_path,
        "source_url": blob_url(config, rel_path),
        "published_url": published_url(config, rel_path),
        "title": title,
        "chunk_kind": "semantic",
        "chunk_seq": 1,
        "raw_format": raw_format,
        "raw_text": raw_text,
        "raw_markup": raw_markup,
        "checksum": sha256_file(file_path),
        "metadata": {
            "ingestion_stage": "02_collect_source_chunks",
            "source_rel_path": rel_path,
            "published_url": published_url(config, rel_path),
        },
    }


def collect_qdev() -> list[dict]:
    config = SOURCE_CONFIGS["qdev"]
    chunks = []
    for rel_path in sorted(QDEV_DATA_FILES):
        file_path = config.repo_dir / rel_path
        if file_path.exists():
            chunks.append(generic_chunk("qdev", file_path))
    for file_path in sorted((config.repo_dir / "content").rglob("*.html")):
        chunks.append(generic_chunk("qdev", file_path))
    return chunks


def collect_nqcm() -> list[dict]:
    config = SOURCE_CONFIGS["nqcm"]
    chunks = []
    for file_path in sorted((config.repo_dir / "docs").rglob("*.md")):
        chunks.append(generic_chunk("nqcm", file_path))
    return chunks


def main() -> None:
    existing = [
        chunk
        for chunk in load_raw_chunks()
        if not (
            chunk["source_id"] in {SOURCE_CONFIGS["qdev"].source_id, SOURCE_CONFIGS["nqcm"].source_id}
            and chunk.get("metadata", {}).get("ingestion_stage") == "02_collect_source_chunks"
        )
    ]
    chunks = collect_qdev() + collect_nqcm()
    payload = existing + chunks
    save_raw_chunks(payload)
    write_json(OUTPUT_DIR / "source_catalog.json", payload)
    print(f"Wrote {len(chunks)} generic source chunks to {OUTPUT_DIR / 'raw_chunks.json'}")


if __name__ == "__main__":
    main()
