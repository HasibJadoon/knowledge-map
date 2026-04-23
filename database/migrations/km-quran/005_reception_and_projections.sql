-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_quran DB — Layers 8, 9, 10 & 11: Reception + Cross-surah + Projections + Outer Horizon
-- File   : database/migrations/km-quran/005_reception_and_projections.sql
-- Run    : wrangler d1 execute km_quran --file=... --remote
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 8  TAFSIR + PARADIGMS + RECEPTION + MATERIAL WITNESSES
-- (Scholar / work / position tables live here — shared across all QR layers)
-- ─────────────────────────────────────────────────────────────────────────────

-- Already created in 2026-08-04_phase_q5_qr_scholar_analysis.sql in the legacy DB.
-- In km_quran these are the canonical single-DB versions.

-- Tafsir entries (legacy table — retained and extended with scholar/work linkage)
CREATE TABLE IF NOT EXISTS qr_tafsir_entries (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  entry_type           TEXT NOT NULL DEFAULT 'explanation',
    -- 'explanation'|'hukm'|'asbab_nuzul'|'nasikh_mansukh'|'linguistic'|'other'
  scholar_id           TEXT,                 -- FK → qr_scholar_profiles.id
  work_id              TEXT,                 -- FK → qr_scholar_works.id
  content_ar           TEXT NOT NULL,
  content_en           TEXT,
  source_page          TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrte_surah   ON qr_tafsir_entries(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_qrte_scholar ON qr_tafsir_entries(scholar_id);

-- Scholar profiles
CREATE TABLE IF NOT EXISTS qr_scholar_profiles (
  id                   TEXT PRIMARY KEY,     -- ULID
  name_ar              TEXT NOT NULL,
  name_en              TEXT,
  kunya                TEXT,
  laqab                TEXT,
  nisba                TEXT,
  birth_year_hijri     INTEGER,
  death_year_hijri     INTEGER,
  birth_year_ce        INTEGER,
  death_year_ce        INTEGER,
  era                  TEXT,
    -- 'sahaba'|'tabiun'|'taba_tabiun'|'classical'|'medieval'|'pre_modern'|'modern'|'contemporary'
  madhab               TEXT,
  kalam_school         TEXT,
  specialization       TEXT,
  biography_md         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrschp_era    ON qr_scholar_profiles(era);
CREATE INDEX IF NOT EXISTS idx_qrschp_madhab ON qr_scholar_profiles(madhab);

CREATE VIRTUAL TABLE IF NOT EXISTS qr_scholar_profiles_fts USING fts5(
  name_ar, name_en, laqab, nisba, biography_md
);

-- Scholar works
CREATE TABLE IF NOT EXISTS qr_scholar_works (
  id                   TEXT PRIMARY KEY,     -- ULID
  scholar_id           TEXT NOT NULL,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  work_type            TEXT NOT NULL DEFAULT 'tafsir',
  composition_year_hijri INTEGER,
  composition_year_ce  INTEGER,
  lx_source_ref        TEXT,                 -- typed ref: LX:<ar_ling_sources.id>
  volumes              INTEGER,
  is_complete          INTEGER NOT NULL DEFAULT 1,
  print_edition        TEXT,
  summary              TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scholar_id) REFERENCES qr_scholar_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_qrschw_scholar ON qr_scholar_works(scholar_id);

-- Scholarly paradigms
CREATE TABLE IF NOT EXISTS qr_scholarly_paradigms (
  id                   TEXT PRIMARY KEY,     -- ULID
  name_ar              TEXT NOT NULL,
  name_en              TEXT NOT NULL,
  paradigm_type        TEXT NOT NULL,
    -- 'classical_tafsir'|'kalam_theological'|'legal_usuli'|'mystical_ishari'|
    -- 'literary_coherence'|'confessional_academic'|'orientalist'|'revisionist'|
    -- 'civilizational_critique'|'manuscript_codicological'|'epigraphic'|
    -- 'archaeological_late_antique'|'radiocarbon_material'|'qiraat_rasm'|'other'
  description_md       TEXT,
  era_range            TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Scholar → paradigm links
CREATE TABLE IF NOT EXISTS qr_scholar_paradigm_links (
  scholar_id           TEXT NOT NULL,
  paradigm_id          TEXT NOT NULL,
  affiliation_type     TEXT NOT NULL DEFAULT 'primary',
  note_md              TEXT,
  PRIMARY KEY (scholar_id, paradigm_id),
  FOREIGN KEY (scholar_id)  REFERENCES qr_scholar_profiles(id),
  FOREIGN KEY (paradigm_id) REFERENCES qr_scholarly_paradigms(id)
);

-- Scholar positions
CREATE TABLE IF NOT EXISTS qr_scholar_positions (
  id                   TEXT PRIMARY KEY,     -- ULID
  scholar_id           TEXT NOT NULL,
  work_id              TEXT,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  position_type        TEXT NOT NULL DEFAULT 'meaning',
  position_text_ar     TEXT NOT NULL,
  position_text_en     TEXT,
  position_summary     TEXT,
  original_page        TEXT,
  is_minority_view     INTEGER NOT NULL DEFAULT 0,
  is_contested         INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scholar_id) REFERENCES qr_scholar_profiles(id),
  FOREIGN KEY (work_id)    REFERENCES qr_scholar_works(id)
);

CREATE INDEX IF NOT EXISTS idx_qrscpos_scholar ON qr_scholar_positions(scholar_id);
CREATE INDEX IF NOT EXISTS idx_qrscpos_scope   ON qr_scholar_positions(surah, ayah_from);

CREATE VIRTUAL TABLE IF NOT EXISTS qr_scholar_positions_fts USING fts5(
  scholar_id UNINDEXED, surah UNINDEXED, position_type,
  position_text_ar, position_text_en, position_summary
);

-- Surah reception histories
CREATE TABLE IF NOT EXISTS qr_surah_reception_histories (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  era                  TEXT NOT NULL,
  dominant_methodology TEXT,
  dominant_themes      TEXT,
  notable_scholars     TEXT,
  tendencies_md        TEXT,
  notable_shifts_md    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, era),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Interpretive differences
CREATE TABLE IF NOT EXISTS qr_interpretive_differences (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  question_ar          TEXT NOT NULL,
  question_en          TEXT,
  difference_type      TEXT NOT NULL DEFAULT 'meaning',
  positions_summary    TEXT,
  majority_view        TEXT,
  minority_view        TEXT,
  resolution_note      TEXT,
  is_doctrinally_significant INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrid_surah ON qr_interpretive_differences(surah, ayah_from);

-- Material witnesses (manuscripts, inscriptions, codices, fragments, palimpsests)
CREATE TABLE IF NOT EXISTS qr_material_witnesses (
  id                   TEXT PRIMARY KEY,     -- ULID
  witness_type         TEXT NOT NULL,
    -- 'manuscript'|'inscription'|'fragment'|'codex'|'palimpsest'|
    -- 'papyrus'|'stone_inscription'|'coin_inscription'|'other'
  siglum               TEXT,                 -- standard scholarly abbreviation
  common_name          TEXT,
  location             TEXT,                 -- institution / archive
  date_range_ce        TEXT,                 -- e.g. '650–700 CE'
  dating_method        TEXT,
    -- 'radiocarbon'|'palaeographic'|'codicological'|'historical'|'mixed'
  script_style         TEXT,                 -- e.g. 'hijazi', 'kufic', 'abbasid'
  rasm_notes           TEXT,                 -- consonantal skeleton observations
  qiraat_notes         TEXT,                 -- textual variant notes
  digitized_url        TEXT,
  cm_document_ref      TEXT,                 -- typed ref: CM:<cm_documents.id>
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrmw_type ON qr_material_witnesses(witness_type);

-- Material witness observations (typed observations per witness)
CREATE TABLE IF NOT EXISTS qr_material_witness_observations (
  id                   TEXT PRIMARY KEY,     -- ULID
  witness_id           TEXT NOT NULL,
  observation_type     TEXT NOT NULL,
    -- 'codicological'|'palaeographic'|'radiocarbon'|'archaeological_context'|
    -- 'textual_variant'|'lacuna'|'correction'|'marginalia'|'provenance'|'other'
  surah                INTEGER,              -- which surah this observation relates to
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  observation_text     TEXT NOT NULL,
  source_ref           TEXT,                 -- typed ref: QR:<qr_scholar_works.id>
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (witness_id) REFERENCES qr_material_witnesses(id)
);

CREATE INDEX IF NOT EXISTS idx_qrmwo_witness ON qr_material_witness_observations(witness_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 9  CROSS-SURAH + COMPARATIVE
-- ─────────────────────────────────────────────────────────────────────────────

-- Surah relations (already in legacy DB as qr_surah_relations)
CREATE TABLE IF NOT EXISTS qr_surah_relations (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah_a              INTEGER NOT NULL,
  surah_b              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
    -- 'pair'|'sequence'|'thematic_link'|'lexical_link'|'narrative_continuation'|
    -- 'contrast'|'opening_closing'|'parallel'|'other'
  description          TEXT,
  evidence_summary     TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah_a) REFERENCES qr_surahs(id),
  FOREIGN KEY (surah_b) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsr_surah_a ON qr_surah_relations(surah_a);
CREATE INDEX IF NOT EXISTS idx_qrsr_surah_b ON qr_surah_relations(surah_b);

-- Quran-bil-Quran relations (intra-Quranic cross-references)
CREATE TABLE IF NOT EXISTS qr_quran_bil_quran_relations (
  id                   TEXT PRIMARY KEY,     -- ULID
  from_surah           INTEGER NOT NULL,
  from_ayah            INTEGER NOT NULL,
  to_surah             INTEGER NOT NULL,
  to_ayah              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
    -- 'explanation'|'repetition'|'contrast'|'fulfillment'|'return'|
    -- 'elaboration'|'parallel'|'anticipation'|'other'
  scholar_ref          TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_surah) REFERENCES qr_surahs(id),
  FOREIGN KEY (to_surah)   REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrqbq_from ON qr_quran_bil_quran_relations(from_surah, from_ayah);
CREATE INDEX IF NOT EXISTS idx_qrqbq_to   ON qr_quran_bil_quran_relations(to_surah, to_ayah);

-- Tradition sources (inter-scriptural comparison: Torah, Gospel, etc.)
CREATE TABLE IF NOT EXISTS qr_tradition_sources (
  id                   TEXT PRIMARY KEY,     -- ULID
  tradition_name       TEXT NOT NULL,        -- 'torah'|'injeel'|'psalms'|'zoroastrian'|'other'
  source_text          TEXT NOT NULL,        -- e.g. 'Genesis 1:1-3'
  source_content       TEXT,
  relevance_note       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Comparative claims (Quran vs. other traditions)
CREATE TABLE IF NOT EXISTS qr_comparative_claims (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  tradition_source_id  TEXT,
  claim_type           TEXT NOT NULL DEFAULT 'parallel',
    -- 'parallel'|'contrast'|'fulfillment'|'correction'|'independent_attestation'|'other'
  claim_text           TEXT NOT NULL,
  evidence_ids_json    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Civilizational claims
CREATE TABLE IF NOT EXISTS qr_civilizational_claims (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER,
  topic                TEXT NOT NULL,
  claim_text           TEXT NOT NULL,
  civilization_context TEXT,                 -- which civilization context this addresses
  debate_cluster_id    TEXT,                 -- FK → qr_debate_clusters.id
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 10  PROJECTIONS + BRIDGES
-- ─────────────────────────────────────────────────────────────────────────────

-- Quran-native worldview nodes (QR-owned — not WV module's rows)
CREATE TABLE IF NOT EXISTS qr_worldview_nodes (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER,
  node_type            TEXT NOT NULL,
    -- 'concept'|'value'|'anthropological_claim'|'theological_claim'|
    -- 'moral_principle'|'worldview_tension'|'divine_attribute'|'other'
  label_en             TEXT NOT NULL,
  label_ar             TEXT,
  summary_md           TEXT,
  source_claim_id      TEXT,                 -- FK → qr_analysis_claims.id
  wv_node_ref          TEXT,                 -- typed ref: WV:<wv_nodes.id> (outward projection)
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrwvn_surah ON qr_worldview_nodes(surah);
CREATE INDEX IF NOT EXISTS idx_qrwvn_type  ON qr_worldview_nodes(node_type);

-- Edges between QR worldview nodes
CREATE TABLE IF NOT EXISTS qr_worldview_edges (
  id                   TEXT PRIMARY KEY,     -- ULID
  from_node_id         TEXT NOT NULL,
  to_node_id           TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
    -- 'supports'|'contrasts_with'|'implies'|'qualifies'|'resolves'|
    -- 'defines'|'depends_on'|'parallels'|'other'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_node_id) REFERENCES qr_worldview_nodes(id),
  FOREIGN KEY (to_node_id)   REFERENCES qr_worldview_nodes(id)
);

-- Diagram specifications (reusable diagram grammars)
CREATE TABLE IF NOT EXISTS qr_diagram_specs (
  id                   TEXT PRIMARY KEY,     -- ULID
  spec_key             TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  diagram_grammar      TEXT NOT NULL,
    -- 'linear_sequence'|'tree_hierarchy'|'force_graph'|'matrix_comparative'|
    -- 'd3_radial_tree'|'d3_arc'|'d3_chord'|'d3_heatmap'|'d3_custom'
  renderer_key         TEXT NOT NULL,        -- e.g. 'd3_tidy_tree', 'd3_force_graph'
  data_sources_json    TEXT,                 -- JSON array of QR table families this diagram reads from
  description_md       TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Diagram instances (concrete diagram projections per surah / debate / scholar)
CREATE TABLE IF NOT EXISTS qr_diagram_instances (
  id                   TEXT PRIMARY KEY,     -- ULID
  spec_id              TEXT NOT NULL,
  scope_type           TEXT NOT NULL,        -- 'surah'|'passage'|'debate'|'scholar_comparison'|'other'
  scope_ref            TEXT NOT NULL,        -- surah number or ULID of target
  title                TEXT,
  payload_json         TEXT NOT NULL,        -- serialized D3-ready data
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  is_stale             INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (spec_id) REFERENCES qr_diagram_specs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrdi_spec  ON qr_diagram_instances(spec_id);
CREATE INDEX IF NOT EXISTS idx_qrdi_scope ON qr_diagram_instances(scope_type, scope_ref);

-- Doc links (attach QR rows to CM documents without moving ownership to CM)
CREATE TABLE IF NOT EXISTS qr_doc_links (
  id                   TEXT PRIMARY KEY,     -- ULID
  qr_scope_type        TEXT NOT NULL,        -- 'surah'|'passage'|'sentence'|'debate_cluster'|etc.
  qr_scope_id          TEXT NOT NULL,
  cm_doc_ref           TEXT NOT NULL,        -- typed ref: CM:<cm_documents.id>
  link_type            TEXT NOT NULL DEFAULT 'discusses',
    -- 'discusses'|'analyzes'|'annotates'|'references'|'quotes'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrdl_scope ON qr_doc_links(qr_scope_type, qr_scope_id);

-- Analysis caches (surah and passage)
CREATE TABLE IF NOT EXISTS qr_surah_analysis_cache (
  surah                INTEGER PRIMARY KEY,
  cache_version        INTEGER NOT NULL DEFAULT 1,
  cache_generated_at   TEXT,
  payload_json         TEXT,                 -- cached analysis payload
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE IF NOT EXISTS qr_passage_analysis_cache (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  passage_id           TEXT NOT NULL,        -- FK → qr_surah_passages.id
  cache_version        INTEGER NOT NULL DEFAULT 1,
  cache_generated_at   TEXT,
  payload_json         TEXT,
  FOREIGN KEY (surah)      REFERENCES qr_surahs(id),
  FOREIGN KEY (passage_id) REFERENCES qr_surah_passages(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 11  OUTER HISTORICAL + TEXTUAL + CIVILIZATIONAL HORIZON
-- ─────────────────────────────────────────────────────────────────────────────

-- Context topic registry (canonical topics for the outer horizon)
CREATE TABLE IF NOT EXISTS qr_context_topics (
  id                   TEXT PRIMARY KEY,     -- ULID
  topic_key            TEXT NOT NULL UNIQUE,
  topic_label          TEXT NOT NULL,
  topic_domain         TEXT NOT NULL,
    -- 'late_antique'|'inter_scriptural'|'arabian_milieu'|'political_context'|
    -- 'material_textual'|'preservation_discourse'|'academic_debate'|'other'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Context topic links (which surahs / scopes are illuminated by which context topic)
CREATE TABLE IF NOT EXISTS qr_context_topic_links (
  id                   TEXT PRIMARY KEY,     -- ULID
  topic_id             TEXT NOT NULL,
  scope_type           TEXT NOT NULL,        -- 'surah'|'passage'|'ayah_range'|'claim'
  surah                INTEGER,
  scope_ref            TEXT,
  relevance_note       TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES qr_context_topics(id)
);

-- Contextual claims (claims specific to the outer horizon)
CREATE TABLE IF NOT EXISTS qr_context_claims (
  id                   TEXT PRIMARY KEY,     -- ULID
  topic_id             TEXT NOT NULL,
  claim_text           TEXT NOT NULL,
  claim_type           TEXT NOT NULL DEFAULT 'historical',
    -- 'historical'|'archaeological'|'inter_scriptural'|'political'|
    -- 'material_textual'|'preservation'|'late_antique_context'
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES qr_context_topics(id)
);

-- Context evidence items (evidence specific to outer horizon claims)
CREATE TABLE IF NOT EXISTS qr_context_evidence_items (
  id                   TEXT PRIMARY KEY,     -- ULID
  evidence_type        TEXT NOT NULL,
  provenance           TEXT,
  locator              TEXT,
  content_text         TEXT NOT NULL,
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Context evidence links
CREATE TABLE IF NOT EXISTS qr_context_evidence_links (
  claim_id             TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  PRIMARY KEY (claim_id, evidence_id),
  FOREIGN KEY (claim_id)    REFERENCES qr_context_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES qr_context_evidence_items(id)
);

-- Historical context profiles (per-surah)
CREATE TABLE IF NOT EXISTS qr_historical_context_profiles (
  surah                INTEGER PRIMARY KEY,
  arabian_milieu       TEXT,
  political_context    TEXT,
  late_antique_setting TEXT,
  inter_scriptural_env TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Academic question registry
CREATE TABLE IF NOT EXISTS qr_academic_question_registry (
  id                   TEXT PRIMARY KEY,     -- ULID
  question_text        TEXT NOT NULL,
  question_domain      TEXT NOT NULL,
    -- 'manuscript_studies'|'epigraphy'|'archaeology'|'radiocarbon'|
    -- 'late_antique_studies'|'reception_history'|'comparative_religion'|'other'
  linked_surah         INTEGER,
  debate_cluster_id    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Academic positions on registered questions
CREATE TABLE IF NOT EXISTS qr_academic_positions (
  id                   TEXT PRIMARY KEY,     -- ULID
  question_id          TEXT NOT NULL,
  scholar_id           TEXT,                 -- FK → qr_scholar_profiles.id
  paradigm_id          TEXT,                 -- FK → qr_scholarly_paradigms.id
  position_text        TEXT NOT NULL,
  evidence_ids_json    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (question_id) REFERENCES qr_academic_question_registry(id)
);

CREATE INDEX IF NOT EXISTS idx_qrap_question ON qr_academic_positions(question_id);
