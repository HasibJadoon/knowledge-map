-- Migration 005: Irab/Tibyan staging tables (per K-Maps Tibyan ingestion spec)
-- Domain: km_arabic_linguistics (AL)
-- Created: 2026-04-27
--
-- These tables form the staging layer for AI-extracted claims from
-- classical irab + balagha sources. Promoted records eventually flow
-- into km_quran (qr_evidence_items, qr_ss_scope_*).

-- ── Source editions (extends ar_ling_sources with concrete editions) ─────────
CREATE TABLE IF NOT EXISTS ar_ling_source_editions (
    id          TEXT PRIMARY KEY,
    source_id   TEXT NOT NULL REFERENCES ar_ling_sources(id),
    platform    TEXT NOT NULL,            -- shamela|wayback|archive_org|hawramani
    source_url  TEXT,
    edition_label TEXT,
    editor_name TEXT,
    publisher   TEXT,
    year_published TEXT,
    language    TEXT DEFAULT 'ar',
    note_md     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alse_source ON ar_ling_source_editions(source_id);

-- ── Ingestion run audit (one row per scrape/extract sweep) ───────────────────
CREATE TABLE IF NOT EXISTS ar_ling_ingestion_runs (
    id          TEXT PRIMARY KEY,
    layer       TEXT NOT NULL CHECK(layer IN ('sarf','irab','balagha')),
    source_id   TEXT NOT NULL REFERENCES ar_ling_sources(id),
    edition_id  TEXT REFERENCES ar_ling_source_editions(id),
    scope_label TEXT,                      -- "S1", "S2:1-20", "ALL"
    started_at  TEXT DEFAULT (datetime('now')),
    finished_at TEXT,
    status      TEXT NOT NULL CHECK(status IN ('running','succeeded','failed','partial')),
    stats_json  TEXT,                      -- {chunks, claims, errors, elapsed_s}
    note_md     TEXT
);

-- ── Chunk → Quran scope link (which ayat does this raw chunk discuss?) ──────
CREATE TABLE IF NOT EXISTS ar_ling_source_quran_links (
    id            TEXT PRIMARY KEY,
    chunk_id      TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    source_id     TEXT NOT NULL REFERENCES ar_ling_sources(id),
    surah         INTEGER NOT NULL,
    ayah_from     INTEGER NOT NULL,
    ayah_to       INTEGER NOT NULL,
    word_index    INTEGER,                 -- nullable (whole-ayah scope)
    detection     TEXT NOT NULL CHECK(detection IN ('explicit','heading','heuristic','llm')),
    detection_note TEXT,
    confidence    TEXT DEFAULT 'medium',
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asql_surah ON ar_ling_source_quran_links(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_asql_chunk ON ar_ling_source_quran_links(chunk_id);

-- ── Generic AI-extracted claims (sarf/irab/balagha all flow through) ────────
CREATE TABLE IF NOT EXISTS ar_ling_source_claims (
    id              TEXT PRIMARY KEY,
    layer           TEXT NOT NULL CHECK(layer IN ('sarf','irab','balagha')),
    claim_type      TEXT NOT NULL,         -- per-layer type dictionary
    source_id       TEXT NOT NULL REFERENCES ar_ling_sources(id),
    edition_id      TEXT REFERENCES ar_ling_source_editions(id),
    chunk_id        TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    surah           INTEGER NOT NULL,
    ayah_from       INTEGER NOT NULL,
    ayah_to         INTEGER NOT NULL,
    word_index      INTEGER,
    source_quote_ar TEXT NOT NULL,         -- exact substring of chunk - REQUIRED
    locator_json    TEXT,                  -- {chunk_id, page, char_offset}
    claim_payload   TEXT NOT NULL,         -- normalized JSON per claim_type
    confidence      TEXT NOT NULL DEFAULT 'pending'
        CHECK(confidence IN ('high','medium','low','pending')),
    review_status   TEXT NOT NULL DEFAULT 'pending'
        CHECK(review_status IN ('pending','approved','rejected','needs_fix','flagged')),
    reviewer        TEXT,
    review_note     TEXT,
    promoted_evidence_id TEXT,             -- qr_evidence_items.id once promoted
    promoted_reading_id  TEXT,             -- qr_ss_scope_reading.id once promoted
    run_id          TEXT REFERENCES ar_ling_ingestion_runs(id),
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aslc_layer  ON ar_ling_source_claims(layer, surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_aslc_chunk  ON ar_ling_source_claims(chunk_id);
CREATE INDEX IF NOT EXISTS idx_aslc_status ON ar_ling_source_claims(review_status);
CREATE INDEX IF NOT EXISTS idx_aslc_type   ON ar_ling_source_claims(layer, claim_type);

-- ── Beginner/intermediate/advanced/research notes per claim ─────────────────
CREATE TABLE IF NOT EXISTS ar_ling_ai_sense_notes (
    id            TEXT PRIMARY KEY,
    claim_id      TEXT NOT NULL REFERENCES ar_ling_source_claims(id),
    note_level    TEXT NOT NULL CHECK(note_level IN ('basic','intermediate','advanced','research')),
    note_md       TEXT NOT NULL,
    teaching_focus TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending',
    created_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aisn_claim ON ar_ling_ai_sense_notes(claim_id);
