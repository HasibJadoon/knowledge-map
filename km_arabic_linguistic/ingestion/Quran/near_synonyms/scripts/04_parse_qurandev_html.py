#!/usr/bin/env python3
from __future__ import annotations

import re

from _common import (
    EXTRACTED_DIR,
    SOURCE_CONFIGS,
    blob_url,
    find_title_from_html,
    load_raw_chunks,
    published_url,
    read_json,
    read_text_lossy,
    save_raw_chunks,
    sha256_file,
    strip_html,
    write_json,
)


TOPIC_RE = re.compile(r"^[A-Za-z]{1,3}\d+(?:\.\d+)?$")


def main() -> None:
    config = SOURCE_CONFIGS["qdev"]
    topic_index = {item["topic_id"]: item for item in read_json(EXTRACTED_DIR / "qurandev_data_topics.json", default=[])}
    parsed_pages = []
    raw_chunks = []

    for file_path in sorted((config.repo_dir / "content").rglob("*.html")):
        rel_path = file_path.relative_to(config.repo_dir).as_posix()
        raw_markup = read_text_lossy(file_path)
        title = find_title_from_html(raw_markup, file_path.stem)
        cleaned = strip_html(raw_markup)
        topic_id = file_path.stem if TOPIC_RE.match(file_path.stem) else None
        topic = topic_index.get(topic_id) if topic_id else None
        source_url = published_url(config, rel_path) or blob_url(config, rel_path)
        metadata = {
            "ingestion_stage": "04_parse_qurandev_html",
            "topic_id": topic_id,
            "topic_en": topic.get("topic_en") if topic else None,
            "topic_ur": topic.get("topic_ur") if topic else None,
            "quran_refs": topic.get("quran_refs", []) if topic else [],
            "structured_terms": topic.get("structured_terms", []) if topic else [],
            "source_blob_url": blob_url(config, rel_path),
            "skip_extraction": True,
        }
        chunk = {
            "id": f"CHK:QDEV:{rel_path.replace('/', '--').replace('.html', '').upper()}",
            "source_id": config.source_id,
            "edition_id": config.edition_id,
            "source_name": config.source_name,
            "source_path": rel_path,
            "source_url": source_url,
            "published_url": published_url(config, rel_path),
            "title": title,
            "chunk_kind": "semantic",
            "chunk_seq": 1,
            "raw_format": "html",
            "raw_text": cleaned,
            "raw_markup": raw_markup,
            "checksum": sha256_file(file_path),
            "metadata": metadata,
        }
        raw_chunks.append(chunk)
        parsed_pages.append(
            {
                "chunk_id": chunk["id"],
                "source_path": rel_path,
                "title": title,
                "topic_id": topic_id,
                "quran_ref_count": len(metadata["quran_refs"]),
            }
        )

    retained = []
    for chunk in load_raw_chunks():
        if chunk["source_id"] != config.source_id:
            retained.append(chunk)
            continue
        if not chunk.get("source_path", "").startswith("content/"):
            retained.append(chunk)
            continue
    save_raw_chunks(retained + raw_chunks)
    write_json(EXTRACTED_DIR / "qurandev_html_pages.json", parsed_pages)
    print(f"Parsed {len(parsed_pages)} qurandev HTML pages")


if __name__ == "__main__":
    main()
