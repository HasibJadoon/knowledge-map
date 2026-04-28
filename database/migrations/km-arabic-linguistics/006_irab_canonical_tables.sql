-- Migration 006: Iʿrāb (إعراب) canonical tables
-- Domain: km_arabic_linguistics (AL)
-- Created: 2026-04-27
--
-- Six new tables for approved irab claims, populated from
-- ar_ling_source_claims (layer='irab') after manual review.

-- ── Per-word i'rab notes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_irab_notes (
    id                    TEXT PRIMARY KEY,
    claim_id              TEXT REFERENCES ar_ling_source_claims(id),
    word_occurrence_ref   TEXT,                      -- "QR:surah:ayah:word_index"
    surah                 INTEGER NOT NULL,
    ayah_from             INTEGER NOT NULL,
    ayah_to               INTEGER,
    word_index            INTEGER,
    irab_role_ar          TEXT,                       -- مبتدأ، خبر، فاعل، مفعول به، حال
    irab_role_en          TEXT,
    case_marking          TEXT,                       -- مرفوع/منصوب/مجرور/مجزوم/مبني
    case_sign             TEXT,                       -- explicit case marker form
    governor_word_ref     TEXT,                       -- governing word reference
    governance_type       TEXT,                       -- ابتداء، خبرية، فعل، حرف جر
    explanation_ar        TEXT,
    explanation_en        TEXT,
    source_quote_ar       TEXT NOT NULL,
    source_id             TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id              TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence            TEXT NOT NULL DEFAULT 'needs_review'
        CHECK(confidence IN ('needs_review','checked','approved','rejected')),
    review_status         TEXT NOT NULL DEFAULT 'pending',
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ain_surah ON ar_ling_irab_notes(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_ain_word  ON ar_ling_irab_notes(word_occurrence_ref);
CREATE INDEX IF NOT EXISTS idx_ain_role  ON ar_ling_irab_notes(irab_role_ar);

-- ── Taʿalluq (attachment of jar-majrur, zarf to governor) ────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_taalluq_notes (
    id                    TEXT PRIMARY KEY,
    claim_id              TEXT REFERENCES ar_ling_source_claims(id),
    surah                 INTEGER NOT NULL,
    ayah                  INTEGER NOT NULL,
    word_index            INTEGER,
    attached_phrase_ar    TEXT,                       -- the jar-majrur or zarf
    governor_ar           TEXT,                       -- explicit or estimated
    governor_is_estimated INTEGER DEFAULT 0,
    explanation_ar        TEXT,
    explanation_en        TEXT,
    source_quote_ar       TEXT NOT NULL,
    source_id             TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id              TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence            TEXT NOT NULL DEFAULT 'needs_review',
    review_status         TEXT NOT NULL DEFAULT 'pending',
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_atn_surah ON ar_ling_taalluq_notes(surah, ayah);

-- ── Taqdir (elision/estimation) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_taqdir_notes (
    id                    TEXT PRIMARY KEY,
    claim_id              TEXT REFERENCES ar_ling_source_claims(id),
    surah                 INTEGER NOT NULL,
    ayah                  INTEGER NOT NULL,
    word_index            INTEGER,
    elided_word_ar        TEXT,                       -- the omitted word
    estimated_full_ar     TEXT,                       -- full estimation
    reason_md             TEXT,                       -- why elision is required
    source_quote_ar       TEXT NOT NULL,
    source_id             TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id              TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence            TEXT NOT NULL DEFAULT 'needs_review',
    review_status         TEXT NOT NULL DEFAULT 'pending',
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_atqn_surah ON ar_ling_taqdir_notes(surah, ayah);

-- ── Qiraat morphological/syntactic variants ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_qiraat_morph_variants (
    id                    TEXT PRIMARY KEY,
    claim_id              TEXT REFERENCES ar_ling_source_claims(id),
    surah                 INTEGER NOT NULL,
    ayah                  INTEGER NOT NULL,
    word_index            INTEGER,
    reader_ar             TEXT,                       -- e.g. "حفص عن عاصم"
    variant_form_ar       TEXT,                       -- variant reading
    affects_case          INTEGER DEFAULT 0,
    affects_meaning       INTEGER DEFAULT 0,
    note_ar               TEXT,
    note_en               TEXT,
    source_quote_ar       TEXT NOT NULL,
    source_id             TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id              TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence            TEXT NOT NULL DEFAULT 'needs_review',
    review_status         TEXT NOT NULL DEFAULT 'pending',
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aqmv_surah ON ar_ling_qiraat_morph_variants(surah, ayah);

-- ── Multiple irab analyses (wajh_irab) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_irab_alternatives (
    id                    TEXT PRIMARY KEY,
    primary_claim_id      TEXT REFERENCES ar_ling_source_claims(id),
    alternative_claim_id  TEXT REFERENCES ar_ling_source_claims(id),
    surah                 INTEGER,
    ayah                  INTEGER,
    word_index            INTEGER,
    relation_type         TEXT NOT NULL CHECK(relation_type IN ('agrees','contradicts','wajh','contested','minority')),
    rationale_md          TEXT,
    source_quote_ar       TEXT,
    source_id             TEXT REFERENCES ar_ling_sources(id),
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aia_primary ON ar_ling_irab_alternatives(primary_claim_id);

-- ── Rule references (link to existing al_nahw_concepts) ─────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_irab_rule_refs (
    id                    TEXT PRIMARY KEY,
    claim_id              TEXT REFERENCES ar_ling_source_claims(id),
    nahw_concept_id       TEXT,                       -- references al_nahw_concepts(id)
    rule_label_ar         TEXT,
    rule_label_en         TEXT,
    application_note_md   TEXT,
    source_quote_ar       TEXT,
    source_id             TEXT REFERENCES ar_ling_sources(id),
    created_at            TEXT DEFAULT (datetime('now'))
);
