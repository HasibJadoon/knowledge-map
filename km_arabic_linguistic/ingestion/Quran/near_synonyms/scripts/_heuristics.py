#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from typing import Any

from _common import (
    arabic_bare,
    clean_spaces,
    extract_markdown_quote_refs,
    quran_refs_from_text,
    stable_hash,
    stable_token,
    surah_name_to_number,
)


DOMAIN_HINTS = [
    ("rest", "STATE", "TRANQUIL_REST"),
    ("tranquil", "STATE", "TRANQUIL_REST"),
    ("calm", "STATE", "TRANQUIL_REST"),
    ("settle", "RESIDENCE", "SETTLE_LIVE"),
    ("live", "RESIDENCE", "SETTLE_LIVE"),
    ("dwell", "RESIDENCE", "SETTLE_LIVE"),
    ("reside", "RESIDENCE", "SETTLE_LIVE"),
    ("man", "HUMAN", "MAN"),
    ("human", "HUMAN", "MAN"),
    ("people", "HUMAN", "MAN"),
    ("aakhirah", "AFTERLIFE", "AAKHIRAH"),
    ("hereafter", "AFTERLIFE", "AAKHIRAH"),
    ("qiyamah", "AFTERLIFE", "QIYAMAH"),
    ("resurrection", "AFTERLIFE", "QIYAMAH"),
]

URDU_ONLY_LETTERS_RE = re.compile(r"[\u0679\u0688\u0691\u067e\u0686\u0698\u06a9\u06af\u06ba\u06be\u06c1\u06c2\u06d2\u06cc]")
ARABIC_LETTER_RE = re.compile(r"[\u0621-\u063a\u0641-\u064a\u0670]")
LATIN_LETTER_RE = re.compile(r"[A-Za-z]")


def is_usable_arabic_term(term: dict[str, Any]) -> bool:
    display = clean_spaces(str(term.get("arabic_display") or ""))
    if not display:
        return False
    if LATIN_LETTER_RE.search(display) or URDU_ONLY_LETTERS_RE.search(display):
        return False
    if not ARABIC_LETTER_RE.search(display):
        return False
    bare = arabic_bare(term.get("arabic_bare") or display)
    bare_letters = re.sub(r"[^\u0621-\u063a\u0641-\u064a\u0670]+", "", bare)
    if len(bare_letters) < 2:
        return False
    return not (
        term.get("claim_basis") == "inferred_from_source"
        and term.get("confidence") == "needs_review"
    )


def guess_domain_and_concept(title: str, text: str, metadata: dict[str, Any]) -> tuple[str, str]:
    if metadata.get("topic_id") and metadata.get("topic_en"):
        token = stable_token(str(metadata["topic_en"]))
        return token.split("_", 1)[0], token

    priority_text = "\n".join(
        [
            str(metadata.get("topic_en") or ""),
            str(metadata.get("canonical_en") or ""),
            title,
        ]
    ).lower()
    lowered = f"{priority_text}\n{text}\n{json.dumps(metadata, ensure_ascii=False)}".lower()
    for needle, domain, concept in DOMAIN_HINTS:
        if needle in priority_text:
            return domain, concept
    for needle, domain, concept in DOMAIN_HINTS:
        if needle in lowered:
            return domain, concept
    topic = metadata.get("topic_en") or metadata.get("canonical_en") or title or "UNSPECIFIED"
    token = stable_token(topic)
    return token.split("_", 1)[0], token


def guess_canonical_en(title: str, metadata: dict[str, Any]) -> str:
    for key in ("topic_en", "canonical_en", "title"):
        value = metadata.get(key)
        if value:
            return clean_spaces(str(value))
    return clean_spaces(title)


def guess_pos(text: str) -> str:
    lowered = text.lower()
    if lowered.startswith("to "):
        return "verb"
    if any(marker in lowered for marker in ("to ", " verb", " act of ", " action ")):
        return "mixed"
    return "mixed"


def normalize_term_record(term: dict[str, Any], domain: str, concept: str) -> dict[str, Any]:
    display = clean_spaces(str(term.get("arabic_display") or term.get("word") or term.get("term") or ""))
    bare = arabic_bare(display)
    term_key = stable_token(bare or display or term.get("wordEn") or "TERM")
    return {
        "member_id_suggestion": f"NSM:{domain}:{concept}:{term_key}",
        "arabic_display": display,
        "arabic_bare": bare,
        "transliteration": term.get("transliteration") or term.get("wordEn"),
        "root": term.get("root"),
        "lemma": display or None,
        "pos": term.get("pos"),
        "basic_gloss": clean_spaces(str(term.get("basic_gloss") or term.get("gloss") or "")),
        "basic_gloss_ur": clean_spaces(str(term.get("basic_gloss_ur") or term.get("gloss_ur") or "")),
        "nuance_note": clean_spaces(str(term.get("nuance_note") or "")),
        "nuance_note_ur": clean_spaces(str(term.get("nuance_note_ur") or "")),
        "contrast_note": clean_spaces(str(term.get("contrast_note") or "")),
        "contrast_note_ur": clean_spaces(str(term.get("contrast_note_ur") or "")),
        "usage_rule": clean_spaces(str(term.get("usage_rule") or "")),
        "usage_rule_ur": clean_spaces(str(term.get("usage_rule_ur") or "")),
        "quran_usage_pattern": clean_spaces(str(term.get("quran_usage_pattern") or "")),
        "quran_usage_pattern_ur": clean_spaces(str(term.get("quran_usage_pattern_ur") or "")),
        "claim_basis": term.get("claim_basis") or "direct_source",
        "confidence": term.get("confidence") or "needs_review",
    }


def heuristics_from_chunk(chunk: dict[str, Any]) -> dict[str, Any]:
    metadata = chunk.get("metadata") or {}
    source = {
        "source_id": chunk["source_id"],
        "chunk_id": chunk["id"],
        "source_name": chunk["source_name"],
        "source_path": chunk["source_path"],
        "source_url": chunk["source_url"],
        "title": chunk["title"],
    }
    title = str(chunk.get("title") or "")
    raw_text = str(chunk.get("raw_text") or "")
    domain, concept = guess_domain_and_concept(title, raw_text, metadata)
    canonical_en = guess_canonical_en(title, metadata)
    cluster_id = f"NS:{domain}:{concept}"
    warnings: list[str] = []

    terms: list[dict[str, Any]] = []
    term_candidates = metadata.get("structured_terms") or []
    for term in term_candidates:
        normalized = normalize_term_record(term, domain, concept)
        if is_usable_arabic_term(normalized):
            terms.append(normalized)
    if not terms:
        for match in re.findall(r"[\u0600-\u06FF][\u0600-\u06FF\s\u064B-\u065F\u0670]{1,30}", raw_text):
            display = clean_spaces(match)
            bare = arabic_bare(display)
            if len(bare) < 2:
                continue
            term_key = stable_token(bare)
            maybe_term = {
                "member_id_suggestion": f"NSM:{domain}:{concept}:{term_key}",
                "arabic_display": display,
                "arabic_bare": bare,
                "transliteration": None,
                "root": None,
                "lemma": display,
                "pos": None,
                "basic_gloss": "",
                "basic_gloss_ur": "",
                "nuance_note": "",
                "nuance_note_ur": "",
                "contrast_note": "",
                "contrast_note_ur": "",
                "usage_rule": "",
                "usage_rule_ur": "",
                "quran_usage_pattern": "",
                "quran_usage_pattern_ur": "",
                "claim_basis": "inferred_from_source",
                "confidence": "needs_review",
            }
            if (
                is_usable_arabic_term(maybe_term)
                and maybe_term["arabic_bare"] not in {item["arabic_bare"] for item in terms}
            ):
                terms.append(maybe_term)
            if len(terms) >= 8:
                break
        if terms:
            warnings.append("heuristic_terms_only")

    refs = []
    refs.extend(quran_refs_from_text(raw_text))
    refs.extend(metadata.get("quran_refs") or [])
    if chunk.get("raw_format") == "markdown":
        refs.extend(extract_markdown_quote_refs(chunk.get("raw_markup", raw_text)))
    seen = set()
    deduped_refs = []
    for ref in refs:
        if not ref or ref in seen:
            continue
        seen.add(ref)
        deduped_refs.append(ref)

    evidence: list[dict[str, Any]] = []
    member_lookup = {item["arabic_display"]: item for item in terms}
    fallback_member = terms[0] if terms else None
    for ref in deduped_refs[:24]:
        try:
            surah_s, ayah_s = ref.split(":", 1)
            surah = int(surah_s)
            ayah = int(ayah_s)
        except ValueError:
            warnings.append(f"unparseable_quran_ref:{ref}")
            continue
        linked = fallback_member
        evidence.append(
            {
                "evidence_id_suggestion": f"NSE:{domain}:{concept}:{stable_token(linked['arabic_bare'] if linked else 'GENERIC')}:{surah}:{ayah}",
                "term_arabic_display": linked["arabic_display"] if linked else "",
                "qr_ref": ref,
                "surah": surah,
                "ayah": ayah,
                "word_index": None,
                "arabic_quote": "",
                "translation_quote": None,
                "explanation_md": "",
                "evidence_type": "source_ref",
                "confidence": "needs_review",
            }
        )

    source_claims: list[dict[str, Any]] = []
    if metadata.get("topic_en"):
        source_claims.append(
            {
                "target": "set",
                "target_key": cluster_id,
                "claim_type": "summary",
                "claim_text": f"Topic label: {metadata['topic_en']}",
                "claim_basis": "direct_source",
                "confidence": "medium",
            }
        )
    for term in terms:
        source_claims.append(
            {
                "target": "member",
                "target_key": term["member_id_suggestion"],
                "claim_type": "term_presence",
                "claim_text": term["arabic_display"],
                "claim_basis": term["claim_basis"],
                "confidence": term["confidence"],
            }
        )
        if term["root"]:
            source_claims.append(
                {
                    "target": "member",
                    "target_key": term["member_id_suggestion"],
                    "claim_type": "root",
                    "claim_text": str(term["root"]),
                    "claim_basis": "direct_source",
                    "confidence": "medium",
                }
            )
    for ref in deduped_refs[:24]:
        source_claims.append(
            {
                "target": "evidence",
                "target_key": ref,
                "claim_type": "quran_example",
                "claim_text": ref,
                "claim_basis": "direct_source",
                "confidence": "medium",
            }
        )

    if not deduped_refs:
        warnings.append("no_quran_refs_detected")
    if not terms:
        warnings.append("no_terms_detected")

    return {
        "source": source,
        "cluster": {
            "set_id_suggestion": cluster_id,
            "canonical_en": canonical_en,
            "canonical_ar": metadata.get("canonical_ar"),
            "canonical_ur": metadata.get("topic_ur") or metadata.get("canonical_ur"),
            "semantic_domain": domain,
            "pos_hint": metadata.get("pos_hint") or guess_pos(canonical_en),
            "short_summary": metadata.get("short_summary") or clean_spaces(canonical_en),
            "long_summary": metadata.get("long_summary") or "",
            "confidence": "needs_review",
        },
        "terms": terms,
        "evidence": evidence,
        "source_claims": source_claims,
        "warnings": warnings,
    }


def cluster_similarity(a: dict[str, Any], b: dict[str, Any]) -> float:
    a_cluster = a.get("cluster") or {}
    b_cluster = b.get("cluster") or {}
    if (a_cluster.get("semantic_domain") or "").upper() != (b_cluster.get("semantic_domain") or "").upper():
        return 0.0

    a_terms = {arabic_bare(item.get("arabic_display")) for item in a.get("terms", []) if item.get("arabic_display")}
    b_terms = {arabic_bare(item.get("arabic_display")) for item in b.get("terms", []) if item.get("arabic_display")}
    overlap = len(a_terms & b_terms)
    ref_a = {item.get("qr_ref") for item in a.get("evidence", []) if item.get("qr_ref")}
    ref_b = {item.get("qr_ref") for item in b.get("evidence", []) if item.get("qr_ref")}
    ref_overlap = len(ref_a & ref_b)
    canonical_a = stable_token(a_cluster.get("canonical_en") or "")
    canonical_b = stable_token(b_cluster.get("canonical_en") or "")

    score = 0.0
    if overlap:
        score += 0.7
    if ref_overlap:
        score += 0.2
    if canonical_a and canonical_a == canonical_b:
        score += 0.1
    return score


def review_id(prefix: str, *parts: Any) -> str:
    return f"{prefix}:{stable_hash(prefix, *parts, length=16)}"
