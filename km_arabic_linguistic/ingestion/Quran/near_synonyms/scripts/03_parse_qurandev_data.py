#!/usr/bin/env python3
from __future__ import annotations

import csv
from collections import defaultdict

from _common import (
    EXTRACTED_DIR,
    SOURCE_CONFIGS,
    blob_url,
    chunk_id,
    load_loose_json,
    load_raw_chunks,
    quran_refs_from_text,
    read_csv_rows,
    save_raw_chunks,
    sha256_text,
    stable_token,
    write_json,
)


DATA_FILES = [
    "data/SYNONYMS.csv",
    "data/SYNONYMS_DETAILS.csv",
    "data/SYNONYMS_DETAILS.json",
    "data/SYNONYMS_INDEX.json",
    "data/synonyms.json",
    "data/synonymsdetails.json",
    "data/refs.json",
    "data/topicsAyahsMap.json",
]


def topic_paths() -> list[str]:
    return DATA_FILES[:]


def list_to_map(items: list[dict], key_name: str) -> dict[str, dict]:
    return {str(item[key_name]).strip(): item for item in items if item.get(key_name)}


def refs_map(items: list[dict], key_name: str, refs_key: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for item in items:
        key = str(item.get(key_name) or "").strip()
        if not key:
            continue
        refs = item.get(refs_key)
        if isinstance(refs, list):
            out[key] = [str(ref).strip() for ref in refs if ref]
        elif isinstance(refs, str):
            out[key] = quran_refs_from_text(refs)
        else:
            out[key] = []
    return out


def main() -> None:
    config = SOURCE_CONFIGS["qdev"]
    topics = list_to_map(read_csv_rows(config.repo_dir / "data/SYNONYMS.csv"), "id")
    detail_rows = []
    with (config.repo_dir / "data/SYNONYMS_DETAILS.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.reader(handle):
            if len(row) < 3:
                continue
            detail_rows.append(
                {
                    "id": row[0].strip(),
                    "word": row[1].strip(),
                    "wordEn": row[2].strip(),
                    "root": row[3].strip() if len(row) > 3 and row[3].strip() else None,
                }
            )

    details_json = load_loose_json(config.repo_dir / "data/SYNONYMS_DETAILS.json")
    index_json = load_loose_json(config.repo_dir / "data/SYNONYMS_INDEX.json")
    synonyms_json = load_loose_json(config.repo_dir / "data/synonyms.json")
    synonymsdetails_json = load_loose_json(config.repo_dir / "data/synonymsdetails.json")
    refs_json = load_loose_json(config.repo_dir / "data/refs.json")
    topics_ayahs_json = load_loose_json(config.repo_dir / "data/topicsAyahsMap.json")

    refs_by_id = refs_map(refs_json, "id", "v")
    ayahs_by_id = refs_map(topics_ayahs_json, "t", "r")
    terms_by_id: dict[str, list[dict]] = defaultdict(list)
    for row in detail_rows:
        topic_id = str(row["id"]).strip()
        terms_by_id[topic_id].append(
            {
                "word": row["word"].strip(),
                "wordEn": row["wordEn"].strip(),
                "root": (row.get("root") or "").strip() or None,
                "claim_basis": "direct_source",
                "confidence": "medium",
            }
        )

    parsed_topics = []
    raw_chunks = []
    for topic_id, topic in sorted(topics.items()):
        structured_terms = terms_by_id.get(topic_id, [])
        topic_en = topic["topic"].strip()
        topic_ur = topic.get("topicUr", "").strip()
        for term in structured_terms:
            term["basic_gloss"] = topic_en
            term["basic_gloss_ur"] = topic_ur
        refs = []
        for collection in (refs_by_id.get(topic_id, []), ayahs_by_id.get(topic_id, [])):
            for ref in collection:
                if ref and ref not in refs:
                    refs.append(ref)
        title = f"{topic_id} — {topic['topic']}"
        raw_text = "\n".join(
            [
                title,
                f"Topic EN: {topic_en}",
                f"Topic UR: {topic_ur}",
                "Arabic terms:",
                *[
                    f"- {term['word']} | transliteration={term['wordEn']} | root={term.get('root') or ''} | meaning_en={topic_en} | meaning_ur={topic_ur}"
                    for term in structured_terms
                ],
                "Quran refs:",
                ", ".join(refs) if refs else "(none)",
                "Source files:",
                *[f"- {path}" for path in topic_paths()],
            ]
        )
        checksum = sha256_text(raw_text)
        rel_path = f"data/topic-bundles/{topic_id}.txt"
        raw_chunks.append(
            {
                "id": chunk_id("QDEV", rel_path),
                "source_id": config.source_id,
                "edition_id": config.edition_id,
                "source_name": config.source_name,
                "source_path": rel_path,
                "source_url": blob_url(config, "data/SYNONYMS.csv"),
                "published_url": None,
                "title": title,
                "chunk_kind": "semantic",
                "chunk_seq": 1,
                "raw_format": "topic_bundle",
                "raw_text": raw_text,
                "raw_markup": raw_text,
                "checksum": checksum,
                "metadata": {
                    "ingestion_stage": "03_parse_qurandev_data",
                    "topic_id": topic_id,
                    "topic_en": topic_en,
                    "topic_ur": topic_ur,
                    "force_heuristic_extraction": True,
                    "quran_refs": refs,
                    "structured_terms": structured_terms,
                    "source_paths": topic_paths(),
                    "source_urls": [blob_url(config, path) for path in topic_paths()],
                    "data_cross_checks": {
                        "details_csv_terms": len(structured_terms),
                        "details_json_terms": sum(1 for item in details_json if str(item.get("id", "")).strip() == topic_id),
                        "synonyms_json_terms": sum(1 for item in synonyms_json if str(item.get("id", "")).strip() == topic_id),
                        "synonymsdetails_json_terms": sum(
                            1 for item in synonymsdetails_json if str(item.get("id", "")).strip() == topic_id
                        ),
                    },
                    "topic_index_entry": next((item for item in index_json if str(item.get("l", "")).strip() == topic_id), None),
                },
            }
        )
        parsed_topics.append(
            {
                "topic_id": topic_id,
                "topic_en": topic_en,
                "topic_ur": topic_ur,
                "quran_refs": refs,
                "structured_terms": structured_terms,
            }
        )

    retained = []
    for chunk in load_raw_chunks():
        if chunk["source_id"] != config.source_id:
            retained.append(chunk)
            continue
        source_path = chunk.get("source_path", "")
        if source_path.startswith("content/"):
            retained.append(chunk)
            continue
        if chunk.get("metadata", {}).get("ingestion_stage") == "03_parse_qurandev_data":
            continue
    save_raw_chunks(retained + raw_chunks)
    write_json(EXTRACTED_DIR / "qurandev_data_topics.json", parsed_topics)
    print(f"Parsed {len(parsed_topics)} qurandev data topics")


if __name__ == "__main__":
    main()
