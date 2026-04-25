#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from _common import D1Client, EVIDENCE_PATH, MERGED_MEMBERS_PATH, REVIEW_QUEUE_PATH, arabic_bare, chunked, load_local_env, read_json, write_json
from _heuristics import review_id


def db_path() -> Path | None:
    for key in ("KM_QURAN_DB_PATH", "QR_DB_PATH", "D1_QURAN_DB_PATH"):
        value = os.getenv(key)
        if value:
            return Path(value)
    return None


def add_review(reviews: list[dict], row: dict) -> None:
    if row["id"] not in {item["id"] for item in reviews}:
        reviews.append(row)


def approx_contains(needle: str | None, haystack: str | None) -> bool:
    if not needle:
        return True
    needle_bare = arabic_bare(needle, search_key=True)
    haystack_bare = arabic_bare(haystack or "", search_key=True)
    return bool(needle_bare and needle_bare in haystack_bare)


class QuranLookup:
    def __init__(self, path: Path | None) -> None:
        self.conn = None
        self.d1 = None
        self.ayahs: dict[tuple[int, int], dict] = {}
        self.words: dict[tuple[int, int], list[dict]] = {}
        self.lemma_occurrences: dict[tuple[int, int], list[dict]] = {}
        if path and path.exists():
            self.conn = sqlite3.connect(path)
            self.conn.row_factory = sqlite3.Row
        else:
            candidate = D1Client("qr")
            if candidate.is_available():
                self.d1 = candidate

    def available(self) -> bool:
        return self.conn is not None or self.d1 is not None

    def close(self) -> None:
        if self.conn:
            self.conn.close()

    def query(self, sql: str) -> list[dict]:
        if self.conn:
            return [dict(row) for row in self.conn.execute(sql).fetchall()]
        if self.d1:
            return self.d1.query(sql)
        return []

    def prime(self, evidence_rows: list[dict]) -> None:
        refs = sorted(
            {
                (int(row["surah"]), int(row["ayah"]))
                for row in evidence_rows
                if row.get("surah") and row.get("ayah")
            }
        )
        for ref_chunk in chunked(refs, size=200):
            refs_values = ", ".join(f"({surah}, {ayah})" for surah, ayah in ref_chunk)
            refs_cte = f"WITH refs(surah, ayah) AS (VALUES {refs_values}) "
            ayah_sql = (
                refs_cte
                + "SELECT qra.surah, qra.ayah, qra.text_bare, qra.text_uthmani_clean, qra.text "
                "FROM qr_ayah qra "
                "JOIN refs ON refs.surah = qra.surah AND refs.ayah = qra.ayah"
            )
            for row in self.query(ayah_sql):
                self.ayahs[(int(row["surah"]), int(row["ayah"]))] = row

            words_sql = (
                refs_cte
                + "SELECT qwo.id, qwo.surah, qwo.ayah, qwo.word_index, qwo.word_text, qwo.word_text_bare, qwo.lemma "
                "FROM qr_word_occurrences qwo "
                "JOIN refs ON refs.surah = qwo.surah AND refs.ayah = qwo.ayah "
                "ORDER BY qwo.surah, qwo.ayah, qwo.word_index"
            )
            for row in self.query(words_sql):
                key = (int(row["surah"]), int(row["ayah"]))
                self.words.setdefault(key, []).append(row)

            lemma_sql = (
                refs_cte
                + "SELECT lo.surah, lo.ayah, lo.word_index, lo.word_occurrence_id, ql.lemma_text, ql.lx_lemma_ref, "
                "qwo.word_text, qwo.word_text_bare "
                "FROM qr_lemma_occurrences lo "
                "JOIN refs ON refs.surah = lo.surah AND refs.ayah = lo.ayah "
                "JOIN qr_lemmas ql ON ql.id = lo.lemma_id "
                "JOIN qr_word_occurrences qwo ON qwo.id = lo.word_occurrence_id "
                "ORDER BY lo.surah, lo.ayah, lo.word_index"
            )
            for row in self.query(lemma_sql):
                key = (int(row["surah"]), int(row["ayah"]))
                self.lemma_occurrences.setdefault(key, []).append(row)


def main() -> None:
    load_local_env()
    evidence_rows = read_json(EVIDENCE_PATH, default=[])
    members = {row["id"]: row for row in read_json(MERGED_MEMBERS_PATH, default=[])}
    reviews = read_json(REVIEW_QUEUE_PATH, default=[])

    lookup = QuranLookup(db_path())
    if not lookup.available():
        write_json(EVIDENCE_PATH, evidence_rows)
        write_json(REVIEW_QUEUE_PATH, reviews)
        print("No km_quran SQLite export or D1 access provided; validation left as pending")
        return

    lookup.prime(evidence_rows)
    for evidence in evidence_rows:
        if not evidence.get("surah") or not evidence.get("ayah"):
            evidence["validation_status"] = "pending"
            add_review(
                reviews,
                {
                    "id": review_id("NSRQ", evidence["id"], "missing_surah_number"),
                    "set_id": evidence.get("set_id"),
                    "member_id": evidence.get("member_id"),
                    "evidence_id": evidence["id"],
                    "issue_type": "missing_surah_number",
                    "issue_detail": f"Evidence {evidence['id']} is missing a usable surah/ayah",
                    "source_id": evidence.get("source_id"),
                    "chunk_id": evidence.get("chunk_id"),
                    "status": "open",
                    "updated_at": None,
                },
            )
            continue

        key = (int(evidence["surah"]), int(evidence["ayah"]))
        ayah = lookup.ayahs.get(key)
        if ayah is None:
            evidence["validation_status"] = "ayah_not_found"
            add_review(
                reviews,
                {
                    "id": review_id("NSRQ", evidence["id"], "ayah_not_found"),
                    "set_id": evidence.get("set_id"),
                    "member_id": evidence.get("member_id"),
                    "evidence_id": evidence["id"],
                    "issue_type": "missing_surah_number",
                    "issue_detail": f"Ayah {evidence['qr_ref']} not found in qr_ayah",
                    "source_id": evidence.get("source_id"),
                    "chunk_id": evidence.get("chunk_id"),
                    "status": "open",
                    "updated_at": None,
                },
            )
            continue

        if evidence.get("arabic_quote") and not (
            approx_contains(evidence.get("arabic_quote"), ayah["text_bare"])
            or approx_contains(evidence.get("arabic_quote"), ayah["text_uthmani_clean"])
            or approx_contains(evidence.get("arabic_quote"), ayah["text"])
        ):
            evidence["validation_status"] = "quote_mismatch"
            add_review(
                reviews,
                {
                    "id": review_id("NSRQ", evidence["id"], "quote_mismatch"),
                    "set_id": evidence.get("set_id"),
                    "member_id": evidence.get("member_id"),
                    "evidence_id": evidence["id"],
                    "issue_type": "quote_mismatch",
                    "issue_detail": f"Quote did not match qr_ayah for {evidence['qr_ref']}",
                    "source_id": evidence.get("source_id"),
                    "chunk_id": evidence.get("chunk_id"),
                    "status": "open",
                    "updated_at": None,
                },
            )
            continue

        member = members.get(evidence.get("member_id"))
        term = member.get("arabic_display") if member else None
        if member and member.get("lemma_id") and not evidence.get("lemma_id"):
            evidence["lemma_id"] = member["lemma_id"]
        term_bare = arabic_bare(term, search_key=True)
        words = lookup.words.get(key, [])
        lemma_occurrences = lookup.lemma_occurrences.get(key, [])
        matches = []
        for word in words:
            if not term_bare:
                continue
            if arabic_bare(word["word_text_bare"] or word["word_text"], search_key=True) == term_bare:
                matches.append(word)
                continue
            if arabic_bare(word["lemma"], search_key=True) == term_bare:
                matches.append(word)

        expected_lx_ref = f"LX:{member['lemma_id']}" if member and member.get("lemma_id") else None
        if expected_lx_ref:
            for occurrence in lemma_occurrences:
                if occurrence.get("lx_lemma_ref") == expected_lx_ref:
                    matches.append(
                        {
                            "id": occurrence["word_occurrence_id"],
                            "word_index": occurrence["word_index"],
                            "word_text": occurrence.get("word_text"),
                            "word_text_bare": occurrence.get("word_text_bare"),
                            "lemma": occurrence.get("lemma_text"),
                        }
                    )

        deduped_matches = {}
        for match in matches:
            deduped_matches[match["id"]] = match
        matches = list(deduped_matches.values())

        if term_bare and not matches:
            evidence["validation_status"] = "term_not_found"
            add_review(
                reviews,
                {
                    "id": review_id("NSRQ", evidence["id"], "term_not_found_in_ayah"),
                    "set_id": evidence.get("set_id"),
                    "member_id": evidence.get("member_id"),
                    "evidence_id": evidence["id"],
                    "issue_type": "term_not_found_in_ayah",
                    "issue_detail": f"Could not find {term} in {evidence['qr_ref']}",
                    "source_id": evidence.get("source_id"),
                    "chunk_id": evidence.get("chunk_id"),
                    "status": "open",
                    "updated_at": None,
                },
            )
            continue

        if len(matches) == 1:
            evidence["word_index"] = matches[0]["word_index"]
            evidence["word_occurrence_ref"] = f"QR:WO:{matches[0]['id']}"
            evidence["validation_status"] = "valid"
        elif len(matches) > 1:
            evidence["validation_status"] = "pending"
            add_review(
                reviews,
                {
                    "id": review_id("NSRQ", evidence["id"], "ambiguous_term_link"),
                    "set_id": evidence.get("set_id"),
                    "member_id": evidence.get("member_id"),
                    "evidence_id": evidence["id"],
                    "issue_type": "ambiguous_term_link",
                    "issue_detail": f"Multiple occurrences of {term} found in {evidence['qr_ref']}",
                    "source_id": evidence.get("source_id"),
                    "chunk_id": evidence.get("chunk_id"),
                    "status": "open",
                    "updated_at": None,
                },
            )
        else:
            evidence["validation_status"] = "valid"

    lookup.close()
    write_json(EVIDENCE_PATH, evidence_rows)
    write_json(REVIEW_QUEUE_PATH, reviews)
    print(f"Validated {len(evidence_rows)} evidence rows against km_quran")


if __name__ == "__main__":
    main()
