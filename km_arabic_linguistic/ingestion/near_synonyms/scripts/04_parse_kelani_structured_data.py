#!/usr/bin/env python3
from __future__ import annotations

from _common import (
    EXTRACTED_DIR,
    KELANI_DATA_ROOT,
    KELANI_EDITION_ID,
    KELANI_SOURCE_ID,
    chunk_id,
    load_raw_chunks,
    read_json,
    save_raw_chunks,
    sha256_text,
    write_json,
)


def main() -> None:
    data_path = KELANI_DATA_ROOT / "synonyms" / "synonyms_map.json"
    payload = read_json(data_path, default={})
    topics = payload.get("topics") or []

    raw_chunks = []
    parsed_topics = []
    for topic in topics:
        topic_id = str(topic.get("id") or "").strip()
        if not topic_id:
            continue
        topic_en = str(topic.get("topic") or topic.get("word") or "").strip()
        topic_ur = str(topic.get("topic_ur") or "").strip()
        structured_terms = []
        for item in topic.get("synonyms") or []:
            word_ar = str(item.get("word_ar") or "").strip()
            if not word_ar:
                continue
            structured_terms.append(
                {
                    "word": word_ar,
                    "wordEn": str(item.get("word_en") or "").strip(),
                    "root": item.get("root"),
                    "root_ar": item.get("root_ar"),
                    "basic_gloss": topic_en,
                    "basic_gloss_ur": topic_ur,
                    "claim_basis": "direct_source",
                    "confidence": "high",
                }
            )

        refs = []
        for ref in topic.get("verses") or []:
            ref = str(ref).strip()
            if ref and ref not in refs:
                refs.append(ref)
        for ref in (topic.get("topic_verse_map") or {}).get("verses") or []:
            ref = str(ref).strip()
            if ref and ref not in refs:
                refs.append(ref)

        title = f"{topic_id} — {topic_en}"
        raw_text = "\n".join(
            [
                title,
                f"Topic EN: {topic_en}",
                f"Topic UR: {topic_ur}",
                "Arabic near-synonyms:",
                *[
                    f"- {term['word']} | transliteration={term['wordEn']} | root={term.get('root') or ''} | root_ar={term.get('root_ar') or ''} | meaning_en={topic_en} | meaning_ur={topic_ur}"
                    for term in structured_terms
                ],
                "Quran refs:",
                ", ".join(refs) if refs else "(none)",
                "Source files:",
                "- database/data/synonyms/data-master/synonyms/synonyms_map.json",
            ]
        )
        rel_path = f"kelani-structured/topic-bundles/{topic_id}.txt"
        raw_chunks.append(
            {
                "id": chunk_id("KELANI", rel_path),
                "source_id": KELANI_SOURCE_ID,
                "edition_id": KELANI_EDITION_ID,
                "source_name": "مترادفات القرآن - عبد الرحمٰن کیلانی",
                "source_path": rel_path,
                "source_url": str(data_path),
                "published_url": None,
                "title": title,
                "chunk_kind": "semantic",
                "chunk_seq": 1,
                "raw_format": "structured_topic_bundle",
                "raw_text": raw_text,
                "raw_markup": raw_text,
                "checksum": sha256_text(raw_text),
                "metadata": {
                    "ingestion_stage": "04_parse_kelani_structured_data",
                    "topic_id": topic_id,
                    "topic_en": topic_en,
                    "topic_ur": topic_ur,
                    "canonical_ur": topic_ur,
                    "force_heuristic_extraction": True,
                    "quran_refs": refs,
                    "structured_terms": structured_terms,
                    "source_paths": [str(data_path)],
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

    retained = [
        chunk
        for chunk in load_raw_chunks()
        if not (
            chunk.get("source_id") == KELANI_SOURCE_ID
            and chunk.get("metadata", {}).get("ingestion_stage") == "04_parse_kelani_structured_data"
        )
    ]
    save_raw_chunks(retained + raw_chunks)
    write_json(EXTRACTED_DIR / "kelani_structured_topics.json", parsed_topics)
    print(f"Parsed {len(parsed_topics)} Kelani structured topics")


if __name__ == "__main__":
    main()
