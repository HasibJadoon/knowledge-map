-- Migration 004: Sarf (morphology) canonical tables
-- Domain: km_arabic_linguistics (AL)
-- Created: 2026-04-27
--
-- Six new tables supporting the K-Maps صرف ingestion layer:
--   ar_ling_sarf_notes            - per-word sarf claims (lexicon, grammar, idiom)
--   ar_ling_sarf_tafsir_notes     - tafsir-linked morphology notes
--   ar_ling_verb_frames           - verb + preposition frames with idiomatic meanings
--   ar_ling_verb_frame_evidence   - Quran verse evidence per verb frame
--   ar_ling_antonym_pairs         - antonym/opposition pairs
--   ar_ling_antonym_evidence      - Quran verse evidence per antonym pair
--   ar_ling_sarf_translation_loss - English translation-loss notes
--   ar_ling_sarf_context_activations - tafsir-grounded root-activation notes

-- ── Sarf notes (per-word, non-tafsir sources) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT,                     -- alias for id (same value, for FK references)
    word_occurrence_ref TEXT,          -- "QR:surah:ayah:word_index" typed reference
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    pattern TEXT,                      -- wazn / morphological pattern
    wazn TEXT,                         -- alternate pattern field
    verb_form TEXT,                    -- Form I–X
    noun_type TEXT,
    derivation_type TEXT,
    sarf_category TEXT NOT NULL,       -- claim_type from schema
    explanation_ar TEXT,
    explanation_en TEXT,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asn_surah_ayah ON ar_ling_sarf_notes(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_asn_root ON ar_ling_sarf_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_asn_lemma ON ar_ling_sarf_notes(lemma_text);
CREATE INDEX IF NOT EXISTS idx_asn_word_ref ON ar_ling_sarf_notes(word_occurrence_ref);
CREATE INDEX IF NOT EXISTS idx_asn_confidence ON ar_ling_sarf_notes(confidence);
CREATE INDEX IF NOT EXISTS idx_asn_source ON ar_ling_sarf_notes(source_id);

-- ── Sarf tafsir notes (morphology claims from tafsir sources) ─────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_tafsir_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    word_occurrence_ref TEXT,
    surah INTEGER,
    ayah_from INTEGER,
    ayah_to INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    pattern TEXT,
    note_type TEXT NOT NULL,           -- tafsir_sarf claim_type
    note_ar TEXT,
    note_en TEXT,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    locator_json TEXT,                 -- {chunk_id, source_id, surah, ayah_from, ayah_to}
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_astn_surah ON ar_ling_sarf_tafsir_notes(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_astn_root ON ar_ling_sarf_tafsir_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_astn_lemma ON ar_ling_sarf_tafsir_notes(lemma_text);
CREATE INDEX IF NOT EXISTS idx_astn_note_type ON ar_ling_sarf_tafsir_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_astn_confidence ON ar_ling_sarf_tafsir_notes(confidence);

-- ── Verb frames ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_verb_frames (
    id TEXT PRIMARY KEY,
    root_text TEXT,
    lemma_text TEXT,
    verb_form TEXT,
    preposition TEXT,
    frame_type TEXT NOT NULL,          -- direct/prep_object/double_object/idiom/tadmeen
    literal_meaning_en TEXT,
    idiomatic_meaning_en TEXT,
    idiomatic_meaning_ar TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_avf_root ON ar_ling_verb_frames(root_text);
CREATE INDEX IF NOT EXISTS idx_avf_lemma ON ar_ling_verb_frames(lemma_text);
CREATE INDEX IF NOT EXISTS idx_avf_preposition ON ar_ling_verb_frames(preposition);

-- ── Verb frame evidence ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_verb_frame_evidence (
    id TEXT PRIMARY KEY,
    frame_id TEXT NOT NULL REFERENCES ar_ling_verb_frames(id),
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    quote_ar TEXT,
    translation_en TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    note_md TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_avfe_frame ON ar_ling_verb_frame_evidence(frame_id);
CREATE INDEX IF NOT EXISTS idx_avfe_surah ON ar_ling_verb_frame_evidence(surah, ayah);

-- ── Antonym pairs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_antonym_pairs (
    id TEXT PRIMARY KEY,
    lemma_a_id TEXT,
    lemma_b_id TEXT,
    root_a TEXT,
    root_b TEXT,
    opposition_type TEXT NOT NULL,     -- direct/conceptual/gradational/complementary/directional/moral_charge
    opposition_note TEXT,
    pair_insight TEXT,
    source_status TEXT DEFAULT 'llm',  -- llm / human / classical_source
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aap_root_a ON ar_ling_antonym_pairs(root_a);
CREATE INDEX IF NOT EXISTS idx_aap_root_b ON ar_ling_antonym_pairs(root_b);

-- ── Antonym evidence ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_antonym_evidence (
    id TEXT PRIMARY KEY,
    pair_id TEXT NOT NULL REFERENCES ar_ling_antonym_pairs(id),
    side TEXT NOT NULL CHECK (side IN ('a','b')),
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    arabic_quote TEXT,
    explanation_md TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aae_pair ON ar_ling_antonym_evidence(pair_id);
CREATE INDEX IF NOT EXISTS idx_aae_surah ON ar_ling_antonym_evidence(surah, ayah);

-- ── Translation loss notes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_translation_loss (
    id TEXT PRIMARY KEY,
    word_occurrence_ref TEXT,
    surah INTEGER,
    ayah INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    loss_type TEXT DEFAULT 'general',
    arabic_feature TEXT,               -- what morphological feature is lost
    english_loss_note TEXT,            -- how it collapses in English
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_astl_surah ON ar_ling_sarf_translation_loss(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_astl_root ON ar_ling_sarf_translation_loss(root_text);

-- ── Context activations (tafsir-grounded root sense per ayah) ─────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_context_activations (
    id TEXT PRIMARY KEY,
    root_text TEXT NOT NULL,
    lemma_text TEXT,
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    active_sense_ar TEXT,              -- the root sense activated in this context
    active_sense_en TEXT,
    why_this_sense_md TEXT,            -- tafsir-backed explanation
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asca_root ON ar_ling_sarf_context_activations(root_text);
CREATE INDEX IF NOT EXISTS idx_asca_surah ON ar_ling_sarf_context_activations(surah, ayah);
