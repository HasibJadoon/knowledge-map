-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_quran DB — Layers 4, 5 & 7: Literary/Meaning Profiles + Reasoning
-- File   : database/migrations/km-quran/003_meaning_and_reasoning.sql
-- Run    : wrangler d1 execute km_quran --file=... --remote
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 4  LITERARY + SONIC ARCHITECTURE (topic flow + discourse)
-- ─────────────────────────────────────────────────────────────────────────────

-- Topic flow within a surah (how semantic content progresses)
CREATE TABLE IF NOT EXISTS qr_surah_topic_flows (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  flow_index           INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  topic_label          TEXT NOT NULL,
  topic_label_ar       TEXT,
  flow_direction       TEXT,
    -- 'introduce'|'develop'|'escalate'|'contrast'|'return'|'resolve'|'conclude'
  transitions_from_id  TEXT,                -- FK → previous flow segment id
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, flow_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrstf_surah ON qr_surah_topic_flows(surah);

-- Rhetoric profiles (per-surah rhetorical summary)
CREATE TABLE IF NOT EXISTS qr_surah_rhetoric_profiles (
  surah                INTEGER PRIMARY KEY,
  dominant_mode        TEXT,
    -- 'argumentative'|'narrative'|'exhortative'|'legislative'|'consolatory'|'doxological'|'mixed'
  clause_density       TEXT,               -- 'compressed'|'expansive'|'alternating'
  emphasis_patterns    TEXT,               -- JSON array of emphasis types
  suspension_use       TEXT,               -- 'frequent'|'occasional'|'rare'
  contrast_patterns    TEXT,               -- JSON array of contrast mechanisms
  rhetorical_devices   TEXT,               -- JSON array: {device, frequency, examples}
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 5  MEANING PROFILES
-- ─────────────────────────────────────────────────────────────────────────────

-- Topic registry (canonical topic labels usable across surahs)
CREATE TABLE IF NOT EXISTS qr_topic_registry (
  id                   TEXT PRIMARY KEY,     -- ULID
  topic_key            TEXT NOT NULL UNIQUE, -- slug e.g. 'divine_sovereignty', 'covenant_fidelity'
  topic_label_en       TEXT NOT NULL,
  topic_label_ar       TEXT,
  topic_domain         TEXT NOT NULL,
    -- 'theology'|'ethics'|'anthropology'|'eschatology'|'prophethood'|'law'|
    -- 'cosmology'|'psychology'|'sociology'|'history'|'worldview'|'other'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-scope topic assignments (surah / passage / ayah range)
CREATE TABLE IF NOT EXISTS qr_scope_topics (
  id                   TEXT PRIMARY KEY,     -- ULID
  topic_id             TEXT NOT NULL,
  scope_type           TEXT NOT NULL,        -- 'surah'|'passage'|'ayah_range'|'motif_cluster'
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  prominence           TEXT NOT NULL DEFAULT 'secondary',   -- 'primary'|'secondary'|'peripheral'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES qr_topic_registry(id),
  FOREIGN KEY (surah)    REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrst_topic  ON qr_scope_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_qrst_surah  ON qr_scope_topics(surah);

-- Surah-level theme profiles
CREATE TABLE IF NOT EXISTS qr_surah_theme_profiles (
  surah                INTEGER PRIMARY KEY,
  primary_theme        TEXT NOT NULL,
  secondary_themes     TEXT,               -- JSON array
  theological_axis     TEXT,               -- e.g. 'tawhid-shirk', 'iman-kufr', 'adl-zulm'
  ethical_axis         TEXT,               -- e.g. 'sabr-jaza', 'amanah-khiyanah'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Theology profiles
CREATE TABLE IF NOT EXISTS qr_surah_theology_profiles (
  surah                INTEGER PRIMARY KEY,
  divine_attributes    TEXT,               -- JSON array of divine names/attributes emphasized
  prophethood_aspects  TEXT,               -- JSON array
  eschatology_aspects  TEXT,               -- JSON array
  cosmology_aspects    TEXT,               -- JSON array
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Worldview profiles (Quran-internal — not WV module's domain)
CREATE TABLE IF NOT EXISTS qr_surah_worldview_profiles (
  surah                INTEGER PRIMARY KEY,
  anthropology_notes   TEXT,               -- human weakness, dignity, aspiration, etc.
  value_architecture   TEXT,               -- JSON {values: [{label, polarity}]}
  moral_universe       TEXT,               -- reward/warning, seen/unseen, world/afterlife arrangement
  divine_human_rel     TEXT,               -- guidance, covenant, testing, dependence
  worldview_tensions   TEXT,               -- JSON array of tensions: {tension, resolution}
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 7  REASONING + EVIDENCE
-- ─────────────────────────────────────────────────────────────────────────────

-- Analysis scopes (any named analytic target within QR)
CREATE TABLE IF NOT EXISTS qr_analysis_scopes (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_type           TEXT NOT NULL,
    -- 'surah'|'passage'|'ayah_range'|'sentence'|'clause'|'word'|'motif'|
    -- 'structure_unit'|'scholar_position'|'debate'|'theme'|'concept'
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  ref_id               TEXT,                 -- ULID of the specific target row
  label                TEXT,                 -- human label
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qras_surah ON qr_analysis_scopes(surah);
CREATE INDEX IF NOT EXISTS idx_qras_type  ON qr_analysis_scopes(scope_type);

-- Analytical claims (concise statements about structure/theme/rhetoric/worldview/reception)
CREATE TABLE IF NOT EXISTS qr_analysis_claims (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_id             TEXT NOT NULL,        -- FK → qr_analysis_scopes.id
  claim_type           TEXT NOT NULL,
    -- 'structural'|'thematic'|'rhetorical'|'linguistic'|'worldview'|
    -- 'reception'|'historical'|'comparative'|'theological'|'legal'|'other'
  claim_text           TEXT NOT NULL,        -- concise claim statement
  claim_text_ar        TEXT,
  confidence           TEXT NOT NULL DEFAULT 'proposed',
    -- 'proposed'|'contested'|'supported'|'widely_accepted'|'classical_consensus'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES qr_analysis_scopes(id)
);

CREATE INDEX IF NOT EXISTS idx_qrac_scope ON qr_analysis_claims(scope_id);
CREATE INDEX IF NOT EXISTS idx_qrac_type  ON qr_analysis_claims(claim_type);

CREATE VIRTUAL TABLE IF NOT EXISTS qr_analysis_claims_fts USING fts5(
  scope_id   UNINDEXED,
  claim_type,
  claim_text,
  claim_text_ar
);

-- Nuances attached to scopes (qualifications, tensions, limits)
CREATE TABLE IF NOT EXISTS qr_scope_nuances (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_id             TEXT NOT NULL,        -- FK → qr_analysis_scopes.id
  claim_id             TEXT,                 -- FK → qr_analysis_claims.id (optional)
  nuance_type          TEXT NOT NULL DEFAULT 'qualification',
    -- 'qualification'|'tension'|'ambiguity'|'limit'|'ellipsis'|'emphasis'|'other'
  nuance_text          TEXT NOT NULL,
  nuance_text_ar       TEXT,
  discourse_force      TEXT,                 -- local force: 'warning'|'consolation'|'contrast'|etc.
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES qr_analysis_scopes(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsn_scope ON qr_scope_nuances(scope_id);

-- Evidence items — shared typed evidence ontology
CREATE TABLE IF NOT EXISTS qr_evidence_items (
  id                   TEXT PRIMARY KEY,     -- ULID
  evidence_type        TEXT NOT NULL,
    -- 'quran_passage'|'motif_recurrence'|'structural_pattern'|'scholar_quote'|
    -- 'lexical_concentration'|'rhyme_sonic'|'inscription'|'manuscript_datum'|
    -- 'archaeological'|'codicological'|'palaeographic'|'radiocarbon'|
    -- 'comparative_tradition'|'historical_record'|'other'
  provenance           TEXT,                 -- where this evidence comes from
  locator              TEXT,                 -- specific locator: surah:ayah, page:line, folio, etc.
  content_text         TEXT NOT NULL,        -- the evidence text / description
  content_text_ar      TEXT,
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  source_ref           TEXT,                 -- typed ref: QR:<qr_scholar_works.id> or LX:<ar_ling_sources.id>
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrei_type ON qr_evidence_items(evidence_type);

CREATE VIRTUAL TABLE IF NOT EXISTS qr_evidence_items_fts USING fts5(
  evidence_type,
  provenance,
  content_text,
  content_text_ar
);

-- Claim-evidence links
CREATE TABLE IF NOT EXISTS qr_claim_evidence_links (
  id                   TEXT PRIMARY KEY,     -- ULID
  claim_id             TEXT NOT NULL,        -- FK → qr_analysis_claims.id
  evidence_id          TEXT NOT NULL,        -- FK → qr_evidence_items.id
  support_type         TEXT NOT NULL DEFAULT 'supports',
    -- 'supports'|'partially_supports'|'contradicts'|'qualifies'|'is_neutral_to'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (claim_id, evidence_id),
  FOREIGN KEY (claim_id)   REFERENCES qr_analysis_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES qr_evidence_items(id)
);

CREATE INDEX IF NOT EXISTS idx_qrcel_claim    ON qr_claim_evidence_links(claim_id);
CREATE INDEX IF NOT EXISTS idx_qrcel_evidence ON qr_claim_evidence_links(evidence_id);

-- Arguments (larger structured positions built from multiple claims + evidences)
CREATE TABLE IF NOT EXISTS qr_arguments (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER,              -- primary scope surah
  title                TEXT NOT NULL,
  title_ar             TEXT,
  argument_type        TEXT NOT NULL DEFAULT 'analytical',
    -- 'analytical'|'theological'|'historical'|'legal'|'literary'|'comparative'|'other'
  summary_md           TEXT NOT NULL,
  claims_json          TEXT,                 -- JSON array of qr_analysis_claims.id
  evidence_ids_json    TEXT,                 -- JSON array of qr_evidence_items.id
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrarg_surah ON qr_arguments(surah);
CREATE INDEX IF NOT EXISTS idx_qrarg_type  ON qr_arguments(argument_type);

-- Argument relations (support, refutation, qualification, etc.)
CREATE TABLE IF NOT EXISTS qr_argument_relations (
  id                   TEXT PRIMARY KEY,     -- ULID
  from_argument_id     TEXT NOT NULL,
  to_argument_id       TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
    -- 'supports'|'refutes'|'qualifies'|'inherits_from'|'responds_to'|
    -- 'synthesizes'|'narrows'|'reframes'|'parallels'|'contradicts'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_argument_id) REFERENCES qr_arguments(id),
  FOREIGN KEY (to_argument_id)   REFERENCES qr_arguments(id)
);

CREATE INDEX IF NOT EXISTS idx_qrar_from ON qr_argument_relations(from_argument_id);
CREATE INDEX IF NOT EXISTS idx_qrar_to   ON qr_argument_relations(to_argument_id);

-- Debate clusters (grouped controversies linking arguments + scholars + paradigms)
CREATE TABLE IF NOT EXISTS qr_debate_clusters (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER,
  title_en             TEXT NOT NULL,
  title_ar             TEXT,
  cluster_type         TEXT NOT NULL DEFAULT 'theological',
    -- 'theological'|'legal'|'linguistic'|'historical'|'eschatological'|
    -- 'manuscript'|'orientalist'|'civilizational'|'other'
  scope_description    TEXT,
  arguments_json       TEXT,                 -- JSON array of qr_arguments.id
  summary_md           TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrdc_surah ON qr_debate_clusters(surah);
CREATE INDEX IF NOT EXISTS idx_qrdc_type  ON qr_debate_clusters(cluster_type);
