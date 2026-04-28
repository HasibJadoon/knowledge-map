-- Migration 007: Balāgha (بلاغة) canonical tables
-- Domain: km_arabic_linguistics (AL)
-- Created: 2026-04-27
--
-- Tafsir-grounded + theory-grounded balagha device claims.

-- ── Balagha device notes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_balagha_notes (
    id                    TEXT PRIMARY KEY,
    claim_id              TEXT REFERENCES ar_ling_source_claims(id),
    surah                 INTEGER NOT NULL,
    ayah_from             INTEGER NOT NULL,
    ayah_to               INTEGER,
    word_index            INTEGER,
    -- Three branches of classical balagha
    device_branch         TEXT NOT NULL
        CHECK(device_branch IN ('maani','bayan','badi','ijaz','other')),
    device_subtype        TEXT,                       -- تقديم وتأخير، التفات، حصر، تشبيه...
    device_label_ar       TEXT,
    device_label_en       TEXT,
    -- Five levels of meaning per Balagha philosophy doc
    surface_text_ar       TEXT,                       -- exact Quran phrase
    rhetorical_effect_ar  TEXT,                       -- what the device does
    rhetorical_effect_en  TEXT,
    surah_movement_role   TEXT,                       -- contribution to passage coherence
    -- Source evidence
    quote_ar              TEXT NOT NULL,
    source_id             TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id              TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence            TEXT NOT NULL DEFAULT 'needs_review'
        CHECK(confidence IN ('needs_review','checked','approved','rejected')),
    review_status         TEXT NOT NULL DEFAULT 'pending',
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_albn_surah ON ar_ling_balagha_notes(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_albn_branch ON ar_ling_balagha_notes(device_branch, device_subtype);
CREATE INDEX IF NOT EXISTS idx_albn_word ON ar_ling_balagha_notes(surah, ayah_from, word_index);

-- ── Balagha evidence (multiple supporting quotes per note) ──────────────────
CREATE TABLE IF NOT EXISTS ar_ling_balagha_evidence (
    id                    TEXT PRIMARY KEY,
    note_id               TEXT NOT NULL REFERENCES ar_ling_balagha_notes(id),
    quote_ar              TEXT NOT NULL,
    explanation_md        TEXT,
    source_id             TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id              TEXT REFERENCES ar_ling_source_chunks(id),
    evidence_kind         TEXT,                       -- tafsir|theory|cross_verse
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_albe_note ON ar_ling_balagha_evidence(note_id);

-- ── Balagha device dictionary (extends al_balagha_terms with device subtypes) ─
CREATE TABLE IF NOT EXISTS ar_ling_balagha_devices (
    id                    TEXT PRIMARY KEY,
    branch                TEXT NOT NULL CHECK(branch IN ('maani','bayan','badi','ijaz','other')),
    subtype               TEXT NOT NULL,              -- تقديم وتأخير
    name_ar               TEXT NOT NULL,
    name_en               TEXT NOT NULL,
    definition_ar         TEXT,
    definition_en         TEXT,
    classical_examples    TEXT,                       -- JSON array of citations
    related_terms_json    TEXT
);

-- ── Surah-level balagha coherence patterns ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_surah_balagha_patterns (
    id                    TEXT PRIMARY KEY,
    surah                 INTEGER NOT NULL,
    pattern_label_ar      TEXT,
    pattern_label_en      TEXT,
    pattern_type          TEXT,                       -- recurrence, opening_closing, theme_chain
    description_md        TEXT,
    evidence_ayat_json    TEXT,                       -- JSON array of [s,a,a]
    source_id             TEXT REFERENCES ar_ling_sources(id),
    confidence            TEXT NOT NULL DEFAULT 'needs_review',
    review_status         TEXT NOT NULL DEFAULT 'pending',
    created_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alsbp_surah ON ar_ling_surah_balagha_patterns(surah);
