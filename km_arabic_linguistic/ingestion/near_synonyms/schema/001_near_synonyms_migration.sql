-- Near-synonym extension for km_arabic_linguistic
-- Run once against the current AL schema snapshot.
-- Note: SQLite/D1 does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN slug TEXT;
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN canonical_en TEXT;
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN canonical_ar TEXT;
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN canonical_ur TEXT;
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN semantic_domain_id TEXT;
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN pos_hint TEXT DEFAULT 'mixed';
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN short_summary TEXT;
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN source_status TEXT DEFAULT 'manual';
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN confidence TEXT DEFAULT 'needs_review';
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN review_status TEXT DEFAULT 'draft';
ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN updated_at TEXT;

ALTER TABLE ar_ling_near_synonym_members ADD COLUMN arabic_display TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN arabic_bare TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN basic_gloss TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN basic_gloss_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN contrast_note TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN contrast_note_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN usage_rule TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN usage_rule_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN quran_usage_pattern TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN quran_usage_pattern_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN nuance_note_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN source_status TEXT DEFAULT 'manual';
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN claim_basis TEXT DEFAULT 'direct_source';
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN confidence TEXT DEFAULT 'needs_review';
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN sort_order INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS ar_ling_near_synonym_set_sources (
  id              TEXT PRIMARY KEY,
  set_id          TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  chunk_id        TEXT,
  source_role     TEXT NOT NULL DEFAULT 'evidence',
  source_path     TEXT,
  source_url      TEXT,
  note_md         TEXT,
  confidence      TEXT NOT NULL DEFAULT 'needs_review',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (set_id, source_id, chunk_id)
);

CREATE TABLE IF NOT EXISTS ar_ling_near_synonym_member_sources (
  id              TEXT PRIMARY KEY,
  member_id       TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  chunk_id        TEXT,
  claim_type      TEXT NOT NULL DEFAULT 'nuance',
  claim_text      TEXT NOT NULL,
  claim_basis     TEXT NOT NULL DEFAULT 'direct_source',
  confidence      TEXT NOT NULL DEFAULT 'needs_review',
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_ling_near_synonym_evidence (
  id                TEXT PRIMARY KEY,
  set_id            TEXT NOT NULL,
  member_id         TEXT,
  lemma_id          TEXT,
  qr_ref            TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER,
  word_occurrence_ref TEXT,
  arabic_quote      TEXT,
  translation_quote TEXT,
  explanation_md    TEXT,
  evidence_type     TEXT NOT NULL DEFAULT 'source_ref',
  source_id         TEXT,
  chunk_id          TEXT,
  confidence        TEXT NOT NULL DEFAULT 'needs_review',
  validation_status TEXT NOT NULL DEFAULT 'pending',
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_ling_near_synonym_review_queue (
  id              TEXT PRIMARY KEY,
  set_id          TEXT,
  member_id       TEXT,
  evidence_id     TEXT,
  issue_type      TEXT NOT NULL,
  issue_detail    TEXT NOT NULL,
  source_id       TEXT,
  chunk_id        TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_arl_nss_slug          ON ar_ling_near_synonym_sets(slug);
CREATE INDEX IF NOT EXISTS idx_arl_nss_domain        ON ar_ling_near_synonym_sets(semantic_domain_id);
CREATE INDEX IF NOT EXISTS idx_arl_nsm_set_id        ON ar_ling_near_synonym_members(set_id);
CREATE INDEX IF NOT EXISTS idx_arl_nsm_lemma_id      ON ar_ling_near_synonym_members(lemma_id);
CREATE INDEX IF NOT EXISTS idx_arl_nsm_arabic_bare   ON ar_ling_near_synonym_members(arabic_bare);
CREATE INDEX IF NOT EXISTS idx_arl_nse_set_id        ON ar_ling_near_synonym_evidence(set_id);
CREATE INDEX IF NOT EXISTS idx_arl_nse_member_id     ON ar_ling_near_synonym_evidence(member_id);
CREATE INDEX IF NOT EXISTS idx_arl_nse_surah_ayah    ON ar_ling_near_synonym_evidence(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_arl_nse_qr_ref        ON ar_ling_near_synonym_evidence(qr_ref);
