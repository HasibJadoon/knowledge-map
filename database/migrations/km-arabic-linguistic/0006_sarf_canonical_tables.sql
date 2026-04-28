-- Migration 0006: Sarf canonical tables.
-- See km_arabic_linguistic/ingestion/صرف/k_maps_sarf_MASTER_technical_v5.docx §11.
-- D1 is canonical truth. Qdrant is retrieval only.

CREATE TABLE IF NOT EXISTS ar_ling_sarf_notes (
    id                  TEXT PRIMARY KEY,
    claim_id            TEXT,
    word_occurrence_ref TEXT NOT NULL,
    surah               INTEGER NOT NULL,
    ayah                INTEGER NOT NULL,
    word_index          INTEGER,
    root_text           TEXT,
    lemma_text          TEXT,
    pattern             TEXT,
    wazn                TEXT,
    verb_form           TEXT,
    noun_type           TEXT,
    derivation_type     TEXT,
    sarf_category       TEXT NOT NULL,
    explanation_ar      TEXT,
    explanation_en      TEXT,
    source_id           TEXT,
    chunk_id            TEXT,
    confidence          TEXT NOT NULL DEFAULT 'needs_review',
    review_status       TEXT NOT NULL DEFAULT 'pending',
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_notes_sa ON ar_ling_sarf_notes(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_notes_root ON ar_ling_sarf_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_notes_lemma ON ar_ling_sarf_notes(lemma_text);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_notes_review ON ar_ling_sarf_notes(review_status);

CREATE TABLE IF NOT EXISTS ar_ling_verb_frames (
    id                   TEXT PRIMARY KEY,
    root_text            TEXT NOT NULL,
    lemma_text           TEXT NOT NULL,
    verb_form            TEXT,
    preposition          TEXT,
    frame_type           TEXT NOT NULL,
    literal_meaning_en   TEXT,
    idiomatic_meaning_en TEXT,
    idiomatic_meaning_ar TEXT,
    source_id            TEXT,
    chunk_id             TEXT,
    confidence           TEXT NOT NULL DEFAULT 'needs_review',
    review_status        TEXT NOT NULL DEFAULT 'pending',
    created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_verb_frames_root ON ar_ling_verb_frames(root_text);
CREATE INDEX IF NOT EXISTS idx_ar_ling_verb_frames_lemma ON ar_ling_verb_frames(lemma_text);
CREATE INDEX IF NOT EXISTS idx_ar_ling_verb_frames_prep ON ar_ling_verb_frames(preposition);

CREATE TABLE IF NOT EXISTS ar_ling_verb_frame_evidence (
    id             TEXT PRIMARY KEY,
    frame_id       TEXT NOT NULL,
    surah          INTEGER NOT NULL,
    ayah           INTEGER NOT NULL,
    word_index     INTEGER,
    quote_ar       TEXT NOT NULL,
    translation_en TEXT,
    source_id      TEXT,
    chunk_id       TEXT,
    note_md        TEXT,
    FOREIGN KEY (frame_id) REFERENCES ar_ling_verb_frames(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_verb_frame_ev_sa ON ar_ling_verb_frame_evidence(surah, ayah);

CREATE TABLE IF NOT EXISTS ar_ling_antonym_pairs (
    id               TEXT PRIMARY KEY,
    lemma_a_id       TEXT,
    lemma_b_id       TEXT,
    root_a           TEXT,
    root_b           TEXT,
    opposition_type  TEXT NOT NULL,
    opposition_note  TEXT NOT NULL,
    pair_insight     TEXT,
    source_status    TEXT DEFAULT 'manual',
    confidence       TEXT DEFAULT 'needs_review',
    review_status    TEXT DEFAULT 'pending',
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_antonym_pairs_root ON ar_ling_antonym_pairs(root_a, root_b);

CREATE TABLE IF NOT EXISTS ar_ling_antonym_evidence (
    id             TEXT PRIMARY KEY,
    pair_id        TEXT NOT NULL,
    side           TEXT NOT NULL,
    surah          INTEGER NOT NULL,
    ayah           INTEGER NOT NULL,
    word_index     INTEGER,
    arabic_quote   TEXT NOT NULL,
    explanation_md TEXT,
    source_id      TEXT,
    chunk_id       TEXT,
    confidence     TEXT DEFAULT 'needs_review',
    FOREIGN KEY (pair_id) REFERENCES ar_ling_antonym_pairs(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_antonym_ev_sa ON ar_ling_antonym_evidence(surah, ayah);

CREATE TABLE IF NOT EXISTS ar_ling_sarf_tafsir_notes (
    id                  TEXT PRIMARY KEY,
    claim_id            TEXT,
    word_occurrence_ref TEXT,
    surah               INTEGER NOT NULL,
    ayah_from           INTEGER NOT NULL,
    ayah_to             INTEGER NOT NULL,
    root_text           TEXT,
    lemma_text          TEXT,
    pattern             TEXT,
    note_type           TEXT NOT NULL,
    note_ar             TEXT NOT NULL,
    note_en             TEXT,
    source_id           TEXT NOT NULL,
    chunk_id            TEXT NOT NULL,
    locator_json        TEXT CHECK (locator_json IS NULL OR json_valid(locator_json)),
    confidence          TEXT NOT NULL DEFAULT 'needs_review',
    review_status       TEXT NOT NULL DEFAULT 'pending',
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_tafsir_sa ON ar_ling_sarf_tafsir_notes(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_tafsir_root ON ar_ling_sarf_tafsir_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_tafsir_type ON ar_ling_sarf_tafsir_notes(note_type);

CREATE TABLE IF NOT EXISTS ar_ling_sarf_context_activations (
    id                TEXT PRIMARY KEY,
    root_text         TEXT NOT NULL,
    lemma_text        TEXT,
    surah             INTEGER NOT NULL,
    ayah              INTEGER NOT NULL,
    word_index        INTEGER,
    active_sense_ar   TEXT NOT NULL,
    active_sense_en   TEXT,
    why_this_sense_md TEXT,
    source_id         TEXT NOT NULL,
    chunk_id          TEXT NOT NULL,
    confidence        TEXT DEFAULT 'needs_review',
    review_status     TEXT DEFAULT 'pending',
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_ctx_sa ON ar_ling_sarf_context_activations(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_ctx_root ON ar_ling_sarf_context_activations(root_text);

CREATE TABLE IF NOT EXISTS ar_ling_sarf_translation_loss (
    id                  TEXT PRIMARY KEY,
    word_occurrence_ref TEXT,
    surah               INTEGER NOT NULL,
    ayah                INTEGER NOT NULL,
    root_text           TEXT,
    lemma_text          TEXT,
    loss_type           TEXT NOT NULL,
    arabic_feature      TEXT NOT NULL,
    english_loss_note   TEXT NOT NULL,
    source_id           TEXT,
    chunk_id            TEXT,
    confidence          TEXT DEFAULT 'needs_review',
    review_status       TEXT DEFAULT 'pending',
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_ling_sarf_tloss_sa ON ar_ling_sarf_translation_loss(surah, ayah);
