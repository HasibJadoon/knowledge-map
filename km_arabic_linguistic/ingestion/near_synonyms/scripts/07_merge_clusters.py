#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from _common import (
    EVIDENCE_PATH,
    EXTRACTED_DIR,
    MERGED_MEMBERS_PATH,
    MERGED_SETS_PATH,
    REVIEW_QUEUE_PATH,
    arabic_bare,
    stable_hash,
    stable_token,
    write_json,
)
from _heuristics import cluster_similarity, review_id


CONFIDENCE_ORDER = {"needs_review": 0, "low": 1, "medium": 2, "high": 3}


def best_confidence(values: list[str]) -> str:
    filtered = [value for value in values if value]
    if not filtered:
        return "needs_review"
    return max(filtered, key=lambda value: CONFIDENCE_ORDER.get(value, 0))


class DSU:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, value: int) -> int:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: int, right: int) -> None:
        l_root = self.find(left)
        r_root = self.find(right)
        if l_root != r_root:
            self.parent[r_root] = l_root


def choose_cluster_id(items: list[dict[str, Any]]) -> tuple[str, str, str]:
    suggestions = [item.get("cluster", {}).get("set_id_suggestion") for item in items if item.get("cluster", {}).get("set_id_suggestion")]
    if suggestions:
        parts = suggestions[0].split(":")
        if len(parts) >= 3:
            return suggestions[0], parts[1], parts[2]
    domain = Counter(
        stable_token(item.get("cluster", {}).get("semantic_domain") or "MISC") for item in items
    ).most_common(1)[0][0]
    concept = Counter(
        stable_token(item.get("cluster", {}).get("canonical_en") or item.get("source", {}).get("title") or "UNSPECIFIED")
        for item in items
    ).most_common(1)[0][0]
    return f"NS:{domain}:{concept}", domain, concept


def choose_string(values: list[str]) -> str:
    filtered = [
        value.strip()
        for value in values
        if isinstance(value, str) and value.strip() and value.strip().lower() not in {"todo", "to do", "tbd"}
    ]
    if not filtered:
        return ""
    counts = Counter(filtered)
    return sorted(counts, key=lambda value: (-counts[value], len(value), value))[0]


def choose_longest(values: list[str]) -> str:
    filtered = [
        value.strip()
        for value in values
        if isinstance(value, str) and value.strip() and value.strip().lower() not in {"todo", "to do", "tbd"}
    ]
    if not filtered:
        return ""
    return max(filtered, key=lambda value: (len(value), value))


def choose_canonical(values: list[str], domain: str, concept: str) -> str:
    filtered = [value.strip() for value in values if isinstance(value, str) and value.strip()]
    if not filtered:
        return ""
    concept_parts = [part for part in concept.split("_") if part]
    preferred = []
    for value in filtered:
        token = stable_token(value)
        if value.lower() in {"todo", "to do", "tbd"}:
            continue
        if any(part in token for part in concept_parts) or domain in token:
            preferred.append(value)
    return choose_string(preferred or filtered)


def dedupe_evidence_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    merged_sources: dict[str, set[tuple[str | None, str | None]]] = defaultdict(set)
    for row in rows:
        row_id = row["id"]
        merged_sources[row_id].add((row.get("source_id"), row.get("chunk_id")))
        current = merged.get(row_id)
        if current is None:
            merged[row_id] = dict(row)
            continue
        current["confidence"] = best_confidence([current.get("confidence", "needs_review"), row.get("confidence", "needs_review")])
        for key in ("member_id", "lemma_id", "word_index", "word_occurrence_ref"):
            if current.get(key) in (None, "") and row.get(key) not in (None, ""):
                current[key] = row.get(key)
        for key in ("arabic_quote", "translation_quote", "explanation_md"):
            current[key] = choose_longest([current.get(key, ""), row.get(key, "")]) or None
        if current.get("evidence_type") in (None, "", "source_ref") and row.get("evidence_type") not in (None, ""):
            current["evidence_type"] = row.get("evidence_type")
        if current.get("validation_status") in (None, "", "pending") and row.get("validation_status") not in (None, ""):
            current["validation_status"] = row.get("validation_status")
        if current.get("source_id") in (None, "") and row.get("source_id") not in (None, ""):
            current["source_id"] = row.get("source_id")
        if current.get("chunk_id") in (None, "") and row.get("chunk_id") not in (None, ""):
            current["chunk_id"] = row.get("chunk_id")

    deduped = []
    for row_id, row in merged.items():
        pairs = sorted(merged_sources[row_id])
        if len(pairs) > 1:
            refs = ", ".join(
                f"{source_id or 'unknown'}:{chunk_id or 'unknown'}"
                for source_id, chunk_id in pairs
            )
            row["note_md"] = choose_longest(
                [
                    row.get("note_md", ""),
                    f"Merged duplicate evidence rows from {refs}.",
                ]
            ) or None
        deduped.append(row)
    return deduped


def build_groups(extractions: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    dsu = DSU(len(extractions))
    for left in range(len(extractions)):
        for right in range(left + 1, len(extractions)):
            left_set = extractions[left].get("cluster", {}).get("set_id_suggestion")
            right_set = extractions[right].get("cluster", {}).get("set_id_suggestion")
            if left_set and right_set and left_set == right_set:
                dsu.union(left, right)
                continue
            if cluster_similarity(extractions[left], extractions[right]) >= 0.95:
                dsu.union(left, right)
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for index, extraction in enumerate(extractions):
        grouped[dsu.find(index)].append(extraction)
    return list(grouped.values())


def main() -> None:
    extractions = EXTRACTED_DIR / "near_synonym_extractions.json"
    payload = extractions.read_text(encoding="utf-8")
    extraction_rows = __import__("json").loads(payload)

    groups = build_groups(extraction_rows)
    merged_sets = []
    merged_members = []
    evidence_rows = []
    review_rows = []
    member_domains: dict[str, set[str]] = defaultdict(set)

    for group in groups:
        set_id, domain, concept = choose_cluster_id(group)
        canonical_en = choose_canonical(
            [item.get("cluster", {}).get("canonical_en", "") for item in group],
            domain,
            concept,
        ) or concept.replace("_", " ").title()
        canonical_ar = choose_string([item.get("cluster", {}).get("canonical_ar", "") for item in group])
        canonical_ur = choose_string([item.get("cluster", {}).get("canonical_ur", "") for item in group])
        short_summary = choose_string([item.get("cluster", {}).get("short_summary", "") for item in group])
        long_summary = choose_longest([item.get("cluster", {}).get("long_summary", "") for item in group])
        set_confidence = best_confidence([item.get("cluster", {}).get("confidence", "needs_review") for item in group])
        set_sources = []
        for item in group:
            source = item["source"]
            set_sources.append(
                {
                    "id": review_id("NSSRC", set_id, source["source_id"], source["chunk_id"]),
                    "set_id": set_id,
                    "source_id": source["source_id"],
                    "chunk_id": source["chunk_id"],
                    "source_role": "evidence",
                    "source_path": source["source_path"],
                    "source_url": source["source_url"],
                    "note_md": None,
                    "confidence": item.get("cluster", {}).get("confidence", "needs_review"),
                }
            )
        merged_set = {
            "id": set_id,
            "set_name": canonical_en,
            "description_md": long_summary or short_summary or canonical_en,
            "slug": canonical_en.lower().replace(" ", "-"),
            "canonical_en": canonical_en,
            "canonical_ar": canonical_ar or None,
            "canonical_ur": canonical_ur or None,
            "semantic_domain_id": f"SF:NS:{domain}",
            "semantic_domain_key": domain,
            "pos_hint": choose_string([item.get("cluster", {}).get("pos_hint", "") for item in group]) or "mixed",
            "short_summary": short_summary or None,
            "source_status": "ai_assisted",
            "confidence": set_confidence,
            "review_status": "draft",
            "updated_at": None,
            "set_sources": set_sources,
        }
        merged_sets.append(merged_set)

        member_map: dict[str, dict[str, Any]] = {}
        for item in group:
            source = item["source"]
            for term in item.get("terms", []):
                bare = arabic_bare(term.get("arabic_bare") or term.get("arabic_display"))
                if not bare:
                    continue
                member_domains[bare].add(domain)
                member = member_map.get(bare)
                if member is None:
                    member_id = term.get("member_id_suggestion") or f"NSM:{domain}:{concept}:{stable_token(bare)}"
                    member = {
                        "id": member_id,
                        "set_id": set_id,
                        "lemma_text": term.get("lemma") or term.get("arabic_display"),
                        "lemma_id": None,
                        "root_text": term.get("root"),
                        "root_id": None,
                        "arabic_display": term.get("arabic_display"),
                        "arabic_bare": bare,
                        "basic_gloss": term.get("basic_gloss") or None,
                        "basic_gloss_ur": term.get("basic_gloss_ur") or None,
                        "nuance_note": term.get("nuance_note") or None,
                        "nuance_note_ur": term.get("nuance_note_ur") or None,
                        "contrast_note": term.get("contrast_note") or None,
                        "contrast_note_ur": term.get("contrast_note_ur") or None,
                        "usage_rule": term.get("usage_rule") or None,
                        "usage_rule_ur": term.get("usage_rule_ur") or None,
                        "quran_usage_pattern": term.get("quran_usage_pattern") or None,
                        "quran_usage_pattern_ur": term.get("quran_usage_pattern_ur") or None,
                        "source_status": "ai_assisted",
                        "claim_basis": term.get("claim_basis") or "direct_source",
                        "confidence": term.get("confidence") or "needs_review",
                        "sort_order": len(member_map) + 1,
                        "source_claims": [],
                    }
                    member_map[bare] = member
                else:
                    member["confidence"] = best_confidence([member["confidence"], term.get("confidence", "needs_review")])
                    for field in (
                        "basic_gloss",
                        "basic_gloss_ur",
                        "nuance_note",
                        "nuance_note_ur",
                        "contrast_note",
                        "contrast_note_ur",
                        "usage_rule",
                        "usage_rule_ur",
                        "quran_usage_pattern",
                        "quran_usage_pattern_ur",
                    ):
                        if not member.get(field) and term.get(field):
                            member[field] = term.get(field)
                member["source_claims"].append(
                    {
                        "id": review_id("NSMSRC", member["id"], source["source_id"], source["chunk_id"], len(member["source_claims"])),
                        "member_id": member["id"],
                        "source_id": source["source_id"],
                        "chunk_id": source["chunk_id"],
                        "claim_type": "nuance",
                        "claim_text": term.get("nuance_note") or term.get("basic_gloss") or term.get("arabic_display"),
                        "claim_basis": term.get("claim_basis") or "direct_source",
                        "confidence": term.get("confidence") or "needs_review",
                        "note_md": None,
                    }
                )
                if (term.get("claim_basis") or "direct_source") != "direct_source":
                    review_rows.append(
                        {
                            "id": review_id("NSRQ", member["id"], "ai_inferred_claim", source["chunk_id"]),
                            "set_id": set_id,
                            "member_id": member["id"],
                            "evidence_id": None,
                            "issue_type": "ai_inferred_claim",
                            "issue_detail": f"{term.get('arabic_display')}: claim basis is {term.get('claim_basis')}",
                            "source_id": source["source_id"],
                            "chunk_id": source["chunk_id"],
                            "status": "open",
                            "updated_at": None,
                        }
                    )

            evidence_lookup = {arabic_bare(member["arabic_display"]): member for member in member_map.values()}
            for evidence in item.get("evidence", []):
                member = evidence_lookup.get(arabic_bare(evidence.get("term_arabic_display")))
                member_id = member["id"] if member else None
                ref = evidence.get("qr_ref")
                if not ref:
                    continue
                try:
                    surah_s, ayah_s = ref.split(":", 1)
                    surah = int(surah_s)
                    ayah = int(ayah_s)
                except ValueError:
                    surah, ayah = 0, 0
                evidence_id = evidence.get("evidence_id_suggestion") or f"NSE:{domain}:{concept}:{stable_token(member['arabic_bare'] if member else 'GENERIC')}:{surah}:{ayah}"
                evidence_rows.append(
                    {
                        "id": evidence_id,
                        "set_id": set_id,
                        "member_id": member_id,
                        "lemma_id": None,
                        "qr_ref": ref,
                        "surah": surah,
                        "ayah": ayah,
                        "word_index": evidence.get("word_index"),
                        "word_occurrence_ref": None,
                        "arabic_quote": evidence.get("arabic_quote") or None,
                        "translation_quote": evidence.get("translation_quote") or None,
                        "explanation_md": evidence.get("explanation_md") or None,
                        "evidence_type": evidence.get("evidence_type") or "source_ref",
                        "source_id": item["source"]["source_id"],
                        "chunk_id": item["source"]["chunk_id"],
                        "confidence": evidence.get("confidence") or "needs_review",
                        "validation_status": "pending",
                        "note_md": None,
                    }
                )
                if member is None and evidence.get("term_arabic_display"):
                    review_rows.append(
                        {
                            "id": review_id("NSRQ", set_id, ref, "ambiguous_term_link"),
                            "set_id": set_id,
                            "member_id": None,
                            "evidence_id": evidence_id,
                            "issue_type": "ambiguous_term_link",
                            "issue_detail": f"Could not link evidence term {evidence.get('term_arabic_display')} to a merged member",
                            "source_id": item["source"]["source_id"],
                            "chunk_id": item["source"]["chunk_id"],
                            "status": "open",
                            "updated_at": None,
                        }
                    )

        for member in sorted(member_map.values(), key=lambda item: (item["sort_order"], item["arabic_bare"])):
            if not member.get("basic_gloss") and canonical_en:
                member["basic_gloss"] = canonical_en
            if not member.get("basic_gloss_ur") and canonical_ur:
                member["basic_gloss_ur"] = canonical_ur
            merged_members.append(member)
            if member["confidence"] in {"low", "needs_review"}:
                review_rows.append(
                    {
                        "id": review_id("NSRQ", member["id"], "needs_scholar_review"),
                        "set_id": set_id,
                        "member_id": member["id"],
                        "evidence_id": None,
                        "issue_type": "needs_scholar_review",
                        "issue_detail": f"{member['arabic_display']} has confidence {member['confidence']}",
                        "source_id": None,
                        "chunk_id": None,
                        "status": "open",
                        "updated_at": None,
                    }
                )

    for bare, domains in sorted(member_domains.items()):
        if len(domains) < 2:
            continue
        for member in merged_members:
            if member["arabic_bare"] == bare:
                review_rows.append(
                    {
                        "id": review_id("NSRQ", member["id"], "same_word_different_domain"),
                        "set_id": member["set_id"],
                        "member_id": member["id"],
                        "evidence_id": None,
                        "issue_type": "same_word_different_domain",
                        "issue_detail": f"{member['arabic_display']} appears across semantic domains: {', '.join(sorted(domains))}",
                        "source_id": None,
                        "chunk_id": None,
                        "status": "open",
                        "updated_at": None,
                    }
                )

    for left in range(len(merged_sets)):
        for right in range(left + 1, len(merged_sets)):
            if merged_sets[left]["semantic_domain_key"] != merged_sets[right]["semantic_domain_key"]:
                continue
            left_members = {item["arabic_bare"] for item in merged_members if item["set_id"] == merged_sets[left]["id"]}
            right_members = {item["arabic_bare"] for item in merged_members if item["set_id"] == merged_sets[right]["id"]}
            overlap = left_members & right_members
            if overlap:
                review_rows.append(
                    {
                        "id": review_id("NSRQ", merged_sets[left]["id"], merged_sets[right]["id"], "duplicate_cluster_possible"),
                        "set_id": merged_sets[left]["id"],
                        "member_id": None,
                        "evidence_id": None,
                        "issue_type": "duplicate_cluster_possible",
                        "issue_detail": f"Cluster overlap with {merged_sets[right]['id']}: {', '.join(sorted(overlap))}",
                        "source_id": None,
                        "chunk_id": None,
                        "status": "open",
                        "updated_at": None,
                    }
                )

    ur_by_bare = {}
    en_by_bare = {}
    for member in merged_members:
        bare = member.get("arabic_bare")
        if not bare:
            continue
        if member.get("basic_gloss_ur"):
            ur_by_bare.setdefault(bare, member["basic_gloss_ur"])
        if member.get("basic_gloss"):
            en_by_bare.setdefault(bare, member["basic_gloss"])

    members_by_set: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for member in merged_members:
        if not member.get("basic_gloss") and member.get("arabic_bare") in en_by_bare:
            member["basic_gloss"] = en_by_bare[member["arabic_bare"]]
        if not member.get("basic_gloss_ur") and member.get("arabic_bare") in ur_by_bare:
            member["basic_gloss_ur"] = ur_by_bare[member["arabic_bare"]]
        members_by_set[member["set_id"]].append(member)

    for merged_set in merged_sets:
        if not merged_set.get("canonical_ur"):
            ur_values = [member.get("basic_gloss_ur", "") for member in members_by_set.get(merged_set["id"], [])]
            merged_set["canonical_ur"] = choose_string(ur_values) or None
        if not merged_set.get("short_summary") and merged_set.get("canonical_ur"):
            merged_set["short_summary"] = merged_set["canonical_ur"]
        if merged_set.get("canonical_ur"):
            for member in members_by_set.get(merged_set["id"], []):
                if not member.get("basic_gloss_ur"):
                    member["basic_gloss_ur"] = merged_set["canonical_ur"]

    evidence_rows = dedupe_evidence_rows(evidence_rows)

    write_json(MERGED_SETS_PATH, merged_sets)
    write_json(MERGED_MEMBERS_PATH, merged_members)
    write_json(EVIDENCE_PATH, evidence_rows)
    write_json(REVIEW_QUEUE_PATH, review_rows)
    print(f"Merged {len(extraction_rows)} chunk extractions into {len(merged_sets)} sets and {len(merged_members)} members")


if __name__ == "__main__":
    main()
