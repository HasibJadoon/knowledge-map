#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from _common import EXTRACTED_DIR, RAW_CHUNKS_PATH, arabic_bare, load_local_env, load_raw_chunks, read_json, stable_token, surah_name_to_number, write_json
from _heuristics import heuristics_from_chunk


SYSTEM_PROMPT = """You are extracting Quranic near-synonym data for a structured Arabic linguistic database.
Output valid JSON only.
Do not invent data.
Do not add lexicon, tafsir, root, lemma, or Quran references unless the source gives them.
If you infer a nuance from the source wording, mark claim_basis = inferred_from_source.
If unclear, mark confidence = needs_review.
Separate similar words by nuance.
Link Quran evidence to a specific Arabic term only when clear.
If Quran reference is unclear, keep it but add warning.
When Urdu text is present, preserve it in canonical_ur, basic_gloss_ur, nuance_note_ur, contrast_note_ur, usage_rule_ur, or quran_usage_pattern_ur.
When English meaning text is present, preserve it in canonical_en, basic_gloss, nuance_note, contrast_note, usage_rule, or quran_usage_pattern.
Return only the required JSON."""


def extraction_path() -> Path:
    return EXTRACTED_DIR / "near_synonym_extractions.json"


def normalize_extraction(payload: dict[str, Any], chunk: dict[str, Any]) -> dict[str, Any]:
    heuristic = heuristics_from_chunk(chunk)
    payload = payload if isinstance(payload, dict) else {}
    normalized = {
        "source": {},
        "cluster": dict(heuristic.get("cluster") or {}),
        "terms": [],
        "evidence": [],
        "source_claims": [],
        "warnings": list(payload.get("warnings") or []),
    }

    cluster = payload.get("cluster") or {}
    if isinstance(cluster, dict):
        for key in (
            "set_id_suggestion",
            "canonical_en",
            "canonical_ar",
            "canonical_ur",
            "semantic_domain",
            "pos_hint",
            "short_summary",
            "long_summary",
            "confidence",
        ):
            if cluster.get(key):
                normalized["cluster"][key] = cluster[key]
    if payload.get("english_synonyms_list") and not normalized["cluster"].get("short_summary"):
        normalized["cluster"]["short_summary"] = ", ".join(str(item) for item in payload["english_synonyms_list"][:4])

    domain = normalized["cluster"].get("semantic_domain") or "MISC"
    concept = normalized["cluster"].get("set_id_suggestion", f"NS:{domain}:UNSPECIFIED").split(":")[-1]

    source_claims = payload.get("source_claims") if isinstance(payload.get("source_claims"), list) else []
    evidence = payload.get("evidence") if isinstance(payload.get("evidence"), list) else []
    terms = payload.get("terms") if isinstance(payload.get("terms"), list) else []

    def parse_verse_citation(text: str) -> tuple[str | None, int | None, int | None]:
        match = re.search(r"Surah\s+(.+?)\s*-\s*(\d{1,3})\b", text, flags=re.IGNORECASE)
        if not match:
            match = re.search(r"\b(\d{1,3}):(\d{1,3})\b", text)
            if not match:
                return None, None, None
            surah = int(match.group(1))
            ayah = int(match.group(2))
            return f"{surah}:{ayah}", surah, ayah
        surah = surah_name_to_number(match.group(1))
        ayah = int(match.group(2))
        if not surah:
            return None, None, None
        return f"{surah}:{ayah}", surah, ayah

    for index, term in enumerate(terms, start=1):
        if not isinstance(term, dict):
            continue
        arabic_display = term.get("arabic_display") or term.get("word") or term.get("term") or term.get("lemma") or ""
        if not arabic_display:
            continue
        bare = arabic_bare(arabic_display)
        member_id = term.get("member_id_suggestion") or f"NSM:{stable_token(domain)}:{stable_token(concept)}:{stable_token(bare or arabic_display)}"
        normalized_term = {
            "member_id_suggestion": member_id,
            "arabic_display": arabic_display,
            "arabic_bare": bare,
            "transliteration": term.get("transliteration") or term.get("wordEn"),
            "root": term.get("root"),
            "lemma": term.get("lemma") or arabic_display,
            "pos": term.get("pos"),
            "basic_gloss": term.get("basic_gloss") or term.get("definition_en") or "",
            "basic_gloss_ur": term.get("basic_gloss_ur") or term.get("definition_ur") or "",
            "nuance_note": term.get("nuance_note") or term.get("definition_en") or "",
            "nuance_note_ur": term.get("nuance_note_ur") or term.get("definition_ur") or "",
            "contrast_note": term.get("contrast_note") or "",
            "contrast_note_ur": term.get("contrast_note_ur") or "",
            "usage_rule": term.get("usage_rule") or "",
            "usage_rule_ur": term.get("usage_rule_ur") or "",
            "quran_usage_pattern": term.get("quran_usage_pattern") or "",
            "quran_usage_pattern_ur": term.get("quran_usage_pattern_ur") or "",
            "claim_basis": term.get("claim_basis") or "direct_source",
            "confidence": term.get("confidence") or "needs_review",
        }
        normalized["terms"].append(normalized_term)
        source_claims.append(
            {
                "target": "member",
                "target_key": member_id,
                "claim_type": "term_presence",
                "claim_text": arabic_display,
                "claim_basis": normalized_term["claim_basis"],
                "confidence": normalized_term["confidence"],
            }
        )
        if normalized_term["basic_gloss"]:
            source_claims.append(
                {
                    "target": "member",
                    "target_key": member_id,
                    "claim_type": "gloss",
                    "claim_text": normalized_term["basic_gloss"],
                    "claim_basis": normalized_term["claim_basis"],
                    "confidence": normalized_term["confidence"],
                }
            )
        if normalized_term["basic_gloss_ur"]:
            source_claims.append(
                {
                    "target": "member",
                    "target_key": member_id,
                    "claim_type": "gloss_ur",
                    "claim_text": normalized_term["basic_gloss_ur"],
                    "claim_basis": normalized_term["claim_basis"],
                    "confidence": normalized_term["confidence"],
                }
            )
        for evidence_item in term.get("quran_evidence") or []:
            if not isinstance(evidence_item, dict):
                continue
            ref, surah, ayah = parse_verse_citation(str(evidence_item.get("verse_citation") or ""))
            if not ref:
                continue
            evidence.append(
                {
                    "evidence_id_suggestion": f"NSE:{stable_token(domain)}:{stable_token(concept)}:{stable_token(bare or arabic_display)}:{surah}:{ayah}",
                    "term_arabic_display": arabic_display,
                    "qr_ref": ref,
                    "surah": surah,
                    "ayah": ayah,
                    "word_index": None,
                    "arabic_quote": evidence_item.get("quoted_text") or "",
                    "translation_quote": None,
                    "explanation_md": evidence_item.get("evidence_basis") or "",
                    "evidence_type": "source_quote",
                    "confidence": normalized_term["confidence"],
                }
            )

    if not normalized["terms"]:
        normalized["terms"] = heuristic.get("terms") or []
    if not evidence:
        evidence = heuristic.get("evidence") or []
    normalized["evidence"] = evidence
    if not source_claims:
        source_claims = heuristic.get("source_claims") or []
    normalized["source_claims"] = source_claims

    normalized["source"].update(
        {
            "source_id": chunk["source_id"],
            "chunk_id": chunk["id"],
            "source_name": chunk["source_name"],
            "source_path": chunk["source_path"],
            "source_url": chunk["source_url"],
            "title": chunk["title"],
        }
    )
    return normalized


def openai_extract(chunk: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-5-mini")
    timeout = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "120"))
    max_chars = int(os.getenv("NS_AI_MAX_CHARS", "6000"))
    max_completion_tokens = int(os.getenv("NS_AI_MAX_COMPLETION_TOKENS", "1400"))
    raw_text = str(chunk.get("raw_text") or "")[:max_chars]

    user_prompt = {
        "source": {
            "source_id": chunk["source_id"],
            "chunk_id": chunk["id"],
            "source_name": chunk["source_name"],
            "source_path": chunk["source_path"],
            "source_url": chunk["source_url"],
            "title": chunk["title"],
        },
        "metadata": chunk.get("metadata") or {},
        "raw_text": raw_text,
    }
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
        "reasoning_effort": "low",
        "max_completion_tokens": max_completion_tokens,
    }
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = json.loads(response.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    if isinstance(content, list):
        content = "".join(part.get("text", "") for part in content if isinstance(part, dict))
    parsed = json.loads(content)
    return normalize_extraction(parsed, chunk)


def main() -> None:
    load_local_env()
    raw_chunks = load_raw_chunks()
    max_chunks = int(os.getenv("NS_MAX_CHUNKS", "0"))
    save_every = int(os.getenv("NS_SAVE_EVERY", "1"))
    if max_chunks > 0:
        raw_chunks = raw_chunks[:max_chunks]

    existing_items = read_json(extraction_path(), default=[])
    existing_by_chunk = {
        item["source"]["chunk_id"]: item
        for item in existing_items
        if isinstance(item, dict) and isinstance(item.get("source"), dict) and item["source"].get("chunk_id")
    }

    target_chunks = [chunk for chunk in raw_chunks if not chunk.get("metadata", {}).get("skip_extraction")]
    output: list[dict[str, Any]] = []
    dirty = False
    for index, chunk in enumerate(target_chunks, start=1):
        if chunk.get("metadata", {}).get("skip_extraction"):
            continue
        if chunk.get("metadata", {}).get("force_heuristic_extraction"):
            extracted = heuristics_from_chunk(chunk)
            extracted = normalize_extraction(extracted, chunk)
            extracted["source"]["checksum"] = chunk.get("checksum")
            output.append(extracted)
            dirty = True
            print(f"[{index}/{len(target_chunks)}] heuristic {chunk['id']}", flush=True)
            if dirty and (index % save_every == 0 or index == len(target_chunks)):
                write_json(extraction_path(), output)
                dirty = False
            continue
        prior = existing_by_chunk.get(chunk["id"])
        if prior and prior.get("source", {}).get("checksum") == chunk.get("checksum"):
            output.append(prior)
            if index == 1 or index % 25 == 0 or index == len(target_chunks):
                print(f"[{index}/{len(target_chunks)}] reused {chunk['id']}", flush=True)
            continue
        try:
            extracted = openai_extract(chunk)
            mode = "ai"
        except (RuntimeError, urllib.error.URLError, KeyError, json.JSONDecodeError) as exc:
            extracted = heuristics_from_chunk(chunk)
            extracted["warnings"].append(f"ai_fallback:{type(exc).__name__}")
            mode = "fallback"
        extracted = normalize_extraction(extracted, chunk)
        extracted["source"]["checksum"] = chunk.get("checksum")
        output.append(extracted)
        dirty = True
        print(f"[{index}/{len(target_chunks)}] {mode} {chunk['id']}", flush=True)
        if dirty and (index % save_every == 0 or index == len(target_chunks)):
            write_json(extraction_path(), output)
            dirty = False

    if dirty:
        write_json(extraction_path(), output)
    print(f"Wrote {len(output)} extraction payloads to {extraction_path().relative_to(EXTRACTED_DIR.parent.parent)}")


if __name__ == "__main__":
    main()
