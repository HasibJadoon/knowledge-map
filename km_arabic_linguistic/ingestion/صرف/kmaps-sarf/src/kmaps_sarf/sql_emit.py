"""Idempotent INSERTs into the Sarf canonical tables (per technical doc §11).

Outputs SQL strings; the chunker writes them to output/d1_sql/chunks/*.sql.
"""
from __future__ import annotations

import json
from typing import Iterable

from .ids import claim_id, stable_id


def _sql(value):
    if value is None or value == "":
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (dict, list)):
        return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(value).replace("'", "''") + "'"


def _row(table: str, cols: list[str], vals: list, on_conflict_update: list[str] | None) -> str:
    pairs = ", ".join(cols)
    sval = ", ".join(_sql(v) for v in vals)
    if on_conflict_update:
        upd = ", ".join(f"{c}=excluded.{c}" for c in on_conflict_update)
        return f"INSERT INTO {table} ({pairs}) VALUES ({sval}) ON CONFLICT(id) DO UPDATE SET {upd};\n"
    return f"INSERT OR IGNORE INTO {table} ({pairs}) VALUES ({sval});\n"


# ---------- ar_ling_sources / chunks (existing) ----------

def upsert_source(source_id: str, src: dict) -> str:
    note = {"family": src.get("family"), "url": src.get("url")}
    return _row(
        "ar_ling_sources",
        ["id", "title_ar", "title_en", "source_type", "author_name", "period_label", "note_md"],
        [source_id, src["title_ar"], src["title_en"], src["source_type"], None, None, json.dumps(note, ensure_ascii=False)],
        ["title_ar", "title_en", "source_type", "note_md"],
    )


def upsert_chunk(chunk: dict) -> str:
    return _row(
        "ar_ling_source_chunks",
        ["id", "source_id", "chunk_kind", "chunk_seq", "heading_norm", "text_ar", "page_no", "tokens_approx", "meta_json"],
        [
            chunk["id"], chunk["source_id"], chunk.get("chunk_kind", "tafsir"),
            chunk.get("chunk_seq", 0), chunk.get("heading_norm"),
            chunk.get("text_ar", ""), chunk.get("page_no"),
            max(1, len(str(chunk.get("text_ar") or "").split())),
            json.dumps(chunk.get("meta_json") or {}, ensure_ascii=False),
        ],
        ["chunk_kind", "chunk_seq", "heading_norm", "text_ar", "page_no", "tokens_approx", "meta_json"],
    )


# ---------- new Sarf canonical tables (migration 0006) ----------

def upsert_sarf_note(claim: dict, source_id: str, chunk_id: str, surah: int, ayah: int, word_index: int | None) -> str:
    rid = stable_id("AL:SARF:", source_id, chunk_id, claim.get("claim_type"), claim.get("root"), claim.get("lemma"), claim.get("pattern"), surah, ayah, word_index)
    return _row(
        "ar_ling_sarf_notes",
        [
            "id", "claim_id", "word_occurrence_ref", "surah", "ayah", "word_index",
            "root_text", "lemma_text", "pattern", "wazn", "verb_form", "noun_type",
            "derivation_type", "sarf_category", "explanation_ar", "explanation_en",
            "source_id", "chunk_id", "confidence", "review_status",
        ],
        [
            rid, rid,
            f"QR:{surah}:{ayah}:{word_index}" if word_index is not None else None,
            surah, ayah, word_index,
            claim.get("root") or None, claim.get("lemma") or None, claim.get("pattern") or None,
            None, None, None, None,
            claim.get("claim_type"),
            claim.get("claim_ar") or None, claim.get("claim_en") or None,
            source_id, chunk_id,
            claim.get("confidence") or "needs_review", "pending",
        ],
        ["explanation_ar", "explanation_en", "confidence"],
    )


def upsert_sarf_tafsir_note(claim: dict, source_id: str, chunk_id: str, surah: int, ayah_from: int, ayah_to: int, word_index: int | None) -> str:
    rid = stable_id("AL:TFSARF:", source_id, chunk_id, claim.get("claim_type"), claim.get("root"), claim.get("lemma"), surah, ayah_from, ayah_to, word_index)
    locator = {"chunk_id": chunk_id, "source_id": source_id, "surah": surah, "ayah_from": ayah_from, "ayah_to": ayah_to}
    return _row(
        "ar_ling_sarf_tafsir_notes",
        [
            "id", "claim_id", "word_occurrence_ref", "surah", "ayah_from", "ayah_to",
            "root_text", "lemma_text", "pattern", "note_type", "note_ar", "note_en",
            "source_id", "chunk_id", "locator_json", "confidence", "review_status",
        ],
        [
            rid, rid,
            f"QR:{surah}:{ayah_from}:{word_index}" if word_index is not None else None,
            surah, ayah_from, ayah_to,
            claim.get("root") or None, claim.get("lemma") or None, claim.get("pattern") or None,
            claim.get("claim_type"),
            claim.get("claim_ar") or None, claim.get("claim_en") or None,
            source_id, chunk_id,
            json.dumps(locator, ensure_ascii=False),
            claim.get("confidence") or "needs_review", "pending",
        ],
        ["note_ar", "note_en", "confidence"],
    )


def upsert_verb_frame(frame: dict, source_id: str, chunk_id: str) -> tuple[str, str]:
    fid = stable_id("AL:VF:", frame.get("root"), frame.get("lemma"), frame.get("verb_form"), frame.get("preposition"), frame.get("frame_type"))
    sql_frame = _row(
        "ar_ling_verb_frames",
        [
            "id", "root_text", "lemma_text", "verb_form", "preposition", "frame_type",
            "literal_meaning_en", "idiomatic_meaning_en", "idiomatic_meaning_ar",
            "source_id", "chunk_id", "confidence", "review_status",
        ],
        [
            fid, frame.get("root"), frame.get("lemma"),
            frame.get("verb_form") or None, frame.get("preposition") or None,
            frame.get("frame_type"), frame.get("literal_meaning_en") or None,
            frame.get("idiomatic_meaning_en") or None, frame.get("idiomatic_meaning_ar") or None,
            source_id, chunk_id,
            frame.get("confidence") or "needs_review", "pending",
        ],
        ["literal_meaning_en", "idiomatic_meaning_en", "idiomatic_meaning_ar", "confidence"],
    )
    evidence_sql = ""
    for u in frame.get("quran_uses") or []:
        ref = str(u.get("ref") or "")
        if ":" not in ref:
            continue
        try:
            s, a = ref.split(":", 1)
            s_i, a_i = int(s), int(a)
        except ValueError:
            continue
        eid = stable_id("AL:VFE:", fid, s_i, a_i, u.get("quote_ar"))
        evidence_sql += _row(
            "ar_ling_verb_frame_evidence",
            ["id", "frame_id", "surah", "ayah", "word_index", "quote_ar", "translation_en", "source_id", "chunk_id", "note_md"],
            [eid, fid, s_i, a_i, None, u.get("quote_ar"), None, source_id, chunk_id, None],
            None,
        )
    return sql_frame, evidence_sql


def upsert_antonym(ant: dict, lemma_text: str | None, source_id: str, chunk_id: str) -> tuple[str, str]:
    pid = stable_id("AL:ANT:", lemma_text, ant.get("arabic"), ant.get("opposition_type"))
    sql_pair = _row(
        "ar_ling_antonym_pairs",
        ["id", "lemma_a_id", "lemma_b_id", "root_a", "root_b", "opposition_type", "opposition_note", "pair_insight", "source_status", "confidence", "review_status"],
        [pid, None, None, None, ant.get("root") or None, ant.get("opposition_type"), ant.get("opposition_note") or "", ant.get("pair_insight") or None, "llm", "needs_review", "pending"],
        ["opposition_note", "pair_insight", "confidence"],
    )
    evidence_sql = ""
    for u in ant.get("quran_uses") or []:
        ref = str(u.get("ref") or "")
        if ":" not in ref:
            continue
        try:
            s, a = ref.split(":", 1)
            s_i, a_i = int(s), int(a)
        except ValueError:
            continue
        eid = stable_id("AL:ANTE:", pid, s_i, a_i, u.get("quote_ar"))
        evidence_sql += _row(
            "ar_ling_antonym_evidence",
            ["id", "pair_id", "side", "surah", "ayah", "word_index", "arabic_quote", "explanation_md", "source_id", "chunk_id", "confidence"],
            [eid, pid, "b", s_i, a_i, None, u.get("quote_ar") or "", None, source_id, chunk_id, "needs_review"],
            None,
        )
    return sql_pair, evidence_sql


def upsert_translation_loss(claim: dict, source_id: str, chunk_id: str, surah: int, ayah: int) -> str:
    if claim.get("claim_type") not in {"translation_loss", "tafsir_translation_loss"}:
        return ""
    rid = stable_id("AL:TLOSS:", source_id, chunk_id, claim.get("root"), claim.get("lemma"), surah, ayah)
    return _row(
        "ar_ling_sarf_translation_loss",
        ["id", "word_occurrence_ref", "surah", "ayah", "root_text", "lemma_text", "loss_type", "arabic_feature", "english_loss_note", "source_id", "chunk_id", "confidence", "review_status"],
        [
            rid, None, surah, ayah,
            claim.get("root") or None, claim.get("lemma") or None,
            "general", claim.get("claim_ar") or "(unspecified)",
            claim.get("claim_en") or "(unspecified)",
            source_id, chunk_id, claim.get("confidence") or "needs_review", "pending",
        ],
        ["arabic_feature", "english_loss_note", "confidence"],
    )


def upsert_context_activation(claim: dict, source_id: str, chunk_id: str, surah: int, ayah: int, word_index: int | None) -> str:
    if claim.get("claim_type") != "tafsir_root_activation":
        return ""
    rid = stable_id("AL:CTXACT:", source_id, chunk_id, claim.get("root"), claim.get("lemma"), surah, ayah, word_index)
    return _row(
        "ar_ling_sarf_context_activations",
        ["id", "root_text", "lemma_text", "surah", "ayah", "word_index", "active_sense_ar", "active_sense_en", "why_this_sense_md", "source_id", "chunk_id", "confidence", "review_status"],
        [
            rid, claim.get("root") or "", claim.get("lemma") or None,
            surah, ayah, word_index,
            claim.get("claim_ar") or "", claim.get("claim_en") or None, None,
            source_id, chunk_id, claim.get("confidence") or "needs_review", "pending",
        ],
        ["active_sense_ar", "active_sense_en", "confidence"],
    )


def write_sql_chunks(statements: Iterable[str], out_dir, max_bytes: int = 4_000_000, prefix: str = "sarf-ai") -> list:
    from pathlib import Path

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob(f"{prefix}-*.sql"):
        old.unlink()
    paths = []
    chunk: list[str] = []
    bytes_total = 0
    idx = 1
    for s in statements:
        size = len(s.encode("utf-8"))
        if chunk and bytes_total + size > max_bytes:
            p = out_dir / f"{prefix}-{idx:03d}.sql"
            p.write_text("".join(chunk), encoding="utf-8")
            paths.append(p)
            idx += 1
            chunk = []
            bytes_total = 0
        chunk.append(s)
        bytes_total += size
    if chunk:
        p = out_dir / f"{prefix}-{idx:03d}.sql"
        p.write_text("".join(chunk), encoding="utf-8")
        paths.append(p)
    return paths
