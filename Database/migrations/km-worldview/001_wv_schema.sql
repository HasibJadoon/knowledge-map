-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_worldview DB — Canonical WV Module Schema (vNext)
-- File   : Database/migrations/km-worldview/001_wv_schema.sql
-- DB     : km_worldview   (binding: DB_WV in Workers)
-- Prefix : wv_*
-- Run    : wrangler d1 execute km_worldview --file=... --remote
--
-- Architecture: Layered civilizational reasoning engine
--   L1  Ontology + coordinates
--   L2  Texts, figures, corpora
--   L3  Abrahamic moral-civilizational ontology
--   L4  Structured reasoning (topics, claims, arguments, evidence)
--   L4C Modernity expansion (Enlightenment, psychology, replacement systems)
--   L4D Coloniality, orientalism, propaganda
--   L4E Adversarial + discernment
--   L5  Historical and social world (events, institutions, society)
--   L5B Embodied morality (exemplar cases, memory traditions)
--   L6  Maps and geographies
--   L6C Century timelines, geocultural zones, route layers
--   L7  Graph-native layer (nodes, edges, clusters, projections)
--   L8  Comparison matrices and moral cartography
--   L9  Diagrams, timelines, output artifacts
--   L9B Diagram-native outputs for modernity + Abrahamic comparison
--   L10 Notes, distillation, and approval workflow
--   LB  Cross-module bridges
--
-- Typed refs (no SQL FK across DBs):
--   qr_scope_ref    → 'QR:<surah>:<ayah_from>[-<ayah_to>]'
--   al_concept_ref  → 'AL:<ar_ling_lemma_id>'
--   cm_doc_ref      → 'CM:<cm_documents.id>'
--   core_user_ref   → 'CORE:<core_users.id>'
--   core_ws_ref     → 'CORE:<core_workspaces.id>'
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 1 — ONTOLOGY AND COORDINATES
-- ─────────────────────────────────────────────────────────────────────────────

-- § 1.1  Analytical domains (top-level framing categories)
CREATE TABLE IF NOT EXISTS wv_domains (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  title_ar      TEXT,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO wv_domains (id, slug, title) VALUES
  ('01DOMAIN0000000000000000001', 'scriptural',    'Scriptural'),
  ('01DOMAIN0000000000000000002', 'theological',   'Theological'),
  ('01DOMAIN0000000000000000003', 'philosophical',  'Philosophical'),
  ('01DOMAIN0000000000000000004', 'historical',    'Historical'),
  ('01DOMAIN0000000000000000005', 'sociological',  'Sociological'),
  ('01DOMAIN0000000000000000006', 'anthropological','Anthropological'),
  ('01DOMAIN0000000000000000007', 'ideological',   'Ideological'),
  ('01DOMAIN0000000000000000008', 'legal',         'Legal'),
  ('01DOMAIN0000000000000000009', 'ethical',       'Ethical');

-- § 1.2  Traditions (Judaism, Christianity, Islam, comparative streams)
CREATE TABLE IF NOT EXISTS wv_traditions (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_type  TEXT NOT NULL DEFAULT 'religion',
    -- 'religion'|'philosophy'|'ideology'|'cultural'|'spiritual'|'other'
  domain_id       TEXT,
  parent_id       TEXT,                           -- sub-traditions
  founded_period  TEXT,
  geographic_origin TEXT,
  scripture_refs  TEXT,                           -- JSON [{title,lang,canon_status}]
  core_beliefs    TEXT,                           -- JSON [string]
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (domain_id)  REFERENCES wv_domains(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_trad_type   ON wv_traditions(tradition_type);
CREATE INDEX IF NOT EXISTS idx_wv_trad_parent ON wv_traditions(parent_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_traditions_fts USING fts5(
  title, title_ar, description_md, content='wv_traditions', content_rowid='rowid'
);

-- § 1.3  Tradition branches (Rabbinic, Catholic, Sunni, Shi'i, etc.)
CREATE TABLE IF NOT EXISTS wv_tradition_branches (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  title_ar       TEXT,
  tradition_id   TEXT NOT NULL,
  branch_type    TEXT NOT NULL DEFAULT 'doctrinal',
    -- 'doctrinal'|'legal'|'liturgical'|'ethnic'|'regional'|'reform'|'other'
  parent_id      TEXT,
  description_md TEXT,
  period_range   TEXT,                            -- e.g. '10th century–present'
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (parent_id)    REFERENCES wv_tradition_branches(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_tb_trad ON wv_tradition_branches(tradition_id);

-- § 1.4  Schools (legal, theological, philosophical, interpretive)
CREATE TABLE IF NOT EXISTS wv_schools (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  title_ar       TEXT,
  school_type    TEXT NOT NULL DEFAULT 'theological',
    -- 'theological'|'legal'|'philosophical'|'interpretive'|'denominational'|'other'
  tradition_id   TEXT,
  branch_id      TEXT,
  founded_year   INTEGER,
  founder_name   TEXT,
  description_md TEXT,
  meta_json      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (branch_id)    REFERENCES wv_tradition_branches(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_sch_trad ON wv_schools(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_sch_type ON wv_schools(school_type);

-- § 1.5  Movements (revival, reform, monastic, missionary, ideological)
CREATE TABLE IF NOT EXISTS wv_movements (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  movement_type   TEXT NOT NULL DEFAULT 'revival',
    -- 'revival'|'reform'|'monastic'|'missionary'|'nationalist'|'secular'|
    -- 'liberation'|'ideological'|'modern'|'other'
  tradition_id    TEXT,
  period_id       TEXT,
  region_id       TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_mov_trad ON wv_movements(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_mov_type ON wv_movements(movement_type);

-- § 1.6  Periods (time frames with civilizational labels)
CREATE TABLE IF NOT EXISTS wv_periods (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  period_type     TEXT NOT NULL DEFAULT 'era',
    -- 'era'|'century'|'epoch'|'generation'|'reign'|'phase'
  start_year      INTEGER,
  end_year        INTEGER,
  is_approximate  INTEGER NOT NULL DEFAULT 0,
  civilizational_label TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_per_years ON wv_periods(start_year, end_year);

-- § 1.7  Regions (civilizational zones and macro-regions)
CREATE TABLE IF NOT EXISTS wv_regions (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  region_type    TEXT NOT NULL DEFAULT 'macro',
    -- 'macro'|'civilizational'|'geopolitical'|'cultural'|'diaspora'
  parent_id      TEXT,
  description_md TEXT,
  bounding_box   TEXT,                            -- JSON {north,south,east,west}
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES wv_regions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_reg_parent ON wv_regions(parent_id);

-- § 1.8  Locations (cities, sites, institutions, pilgrimage nodes)
CREATE TABLE IF NOT EXISTS wv_locations (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  location_type   TEXT NOT NULL DEFAULT 'city',
    -- 'city'|'site'|'institution'|'pilgrimage_node'|'debate_center'|
    -- 'monastery'|'seminary'|'court'|'university'|'region'|'other'
  region_id       TEXT,
  latitude        REAL,
  longitude       REAL,
  modern_name     TEXT,
  modern_country  TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (region_id) REFERENCES wv_regions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_loc_type   ON wv_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_wv_loc_region ON wv_locations(region_id);

-- § 1.9  Institutions (temple, mosque, seminary, court, university)
CREATE TABLE IF NOT EXISTS wv_institutions (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  title_ar         TEXT,
  institution_type TEXT NOT NULL DEFAULT 'religious',
    -- 'religious'|'educational'|'legal'|'charitable'|'political'|
    -- 'monastic'|'missionary'|'court'|'council'|'waqf'|'other'
  tradition_id     TEXT,
  location_id      TEXT,
  period_id        TEXT,
  founded_year     INTEGER,
  dissolved_year   INTEGER,
  description_md   TEXT,
  meta_json        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_inst_type ON wv_institutions(institution_type);
CREATE INDEX IF NOT EXISTS idx_wv_inst_trad ON wv_institutions(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_inst_loc  ON wv_institutions(location_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 2 — TEXTS, FIGURES, AND CORPORA
-- ─────────────────────────────────────────────────────────────────────────────

-- § 2.1  Scriptural corpora
CREATE TABLE IF NOT EXISTS wv_scriptural_corpora (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  corpus_type     TEXT NOT NULL DEFAULT 'scripture',
    -- 'scripture'|'hadith'|'commentary'|'creed'|'liturgy'|'apocrypha'|'other'
  language        TEXT,
  canon_status    TEXT,                           -- 'canonical'|'deuterocanonical'|'disputed'|'rejected'
  date_range      TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_sc_trad ON wv_scriptural_corpora(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_sc_type ON wv_scriptural_corpora(corpus_type);

-- § 2.2  Corpus units (books, chapters, passages, pericopes, episodes)
CREATE TABLE IF NOT EXISTS wv_corpus_units (
  id              TEXT PRIMARY KEY,
  corpus_id       TEXT NOT NULL,
  parent_id       TEXT,
  unit_type       TEXT NOT NULL DEFAULT 'chapter',
    -- 'book'|'chapter'|'passage'|'pericope'|'episode'|'scene'|'verse_range'|'other'
  title           TEXT,
  unit_index      INTEGER,
  start_ref       TEXT,
  end_ref         TEXT,
  text_excerpt    TEXT,
  description_md  TEXT,
  qr_scope_ref    TEXT,                           -- 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (corpus_id) REFERENCES wv_scriptural_corpora(id),
  FOREIGN KEY (parent_id) REFERENCES wv_corpus_units(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cu_corpus ON wv_corpus_units(corpus_id);
CREATE INDEX IF NOT EXISTS idx_wv_cu_parent ON wv_corpus_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_wv_cu_type   ON wv_corpus_units(unit_type);

-- § 2.3  People (canonical person registry)
CREATE TABLE IF NOT EXISTS wv_people (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  person_type     TEXT NOT NULL DEFAULT 'scholar',
    -- 'prophet'|'companion'|'scholar'|'jurist'|'theologian'|'philosopher'|
    -- 'ruler'|'reformer'|'critic'|'contemporary'|'historical_figure'|'other'
  tradition_id    TEXT,
  era             TEXT,
  birth_year      INTEGER,
  death_year      INTEGER,
  birth_location_id TEXT,
  death_location_id TEXT,
  nationality     TEXT,
  affiliation     TEXT,
  bio_md          TEXT,
  visibility      TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ppl_type ON wv_people(person_type);
CREATE INDEX IF NOT EXISTS idx_wv_ppl_trad ON wv_people(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_ppl_era  ON wv_people(era);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_people_fts USING fts5(
  name, name_ar, bio_md, content='wv_people', content_rowid='rowid'
);

-- § 2.4  People aliases (name variants, transliterations, honorifics)
CREATE TABLE IF NOT EXISTS wv_people_aliases (
  id         TEXT PRIMARY KEY,
  person_id  TEXT NOT NULL,
  alias      TEXT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'transliteration',
    -- 'transliteration'|'honorific'|'title'|'kunya'|'nisba'|'laqab'|'other'
  language   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (person_id) REFERENCES wv_people(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_pa_person ON wv_people_aliases(person_id);

-- § 2.5  People relations (teacher-student, influence, opponent, lineage)
CREATE TABLE IF NOT EXISTS wv_people_relations (
  id            TEXT PRIMARY KEY,
  from_person_id TEXT NOT NULL,
  to_person_id   TEXT NOT NULL,
  relation_type  TEXT NOT NULL DEFAULT 'influenced',
    -- 'teacher_of'|'student_of'|'influenced'|'opponent_of'|'successor_of'|
    -- 'lineage'|'contemporary_of'|'responded_to'|'collaborated_with'|'other'
  note          TEXT,
  source_ref    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_person_id) REFERENCES wv_people(id),
  FOREIGN KEY (to_person_id)   REFERENCES wv_people(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_pr_from ON wv_people_relations(from_person_id);
CREATE INDEX IF NOT EXISTS idx_wv_pr_to   ON wv_people_relations(to_person_id);

-- § 2.6  Organizations (church bodies, councils, courts, seminaries)
CREATE TABLE IF NOT EXISTS wv_organizations (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  org_type         TEXT NOT NULL DEFAULT 'religious_body',
    -- 'religious_body'|'council'|'seminary'|'missionary_agency'|'court'|
    -- 'movement_office'|'academic'|'government'|'media'|'other'
  tradition_id     TEXT,
  location_id      TEXT,
  period_id        TEXT,
  description_md   TEXT,
  meta_json        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_org_type ON wv_organizations(org_type);
CREATE INDEX IF NOT EXISTS idx_wv_org_trad ON wv_organizations(tradition_id);

-- § 2.7  Affiliations (person/work → school/institution/confession)
CREATE TABLE IF NOT EXISTS wv_affiliations (
  id              TEXT PRIMARY KEY,
  entity_ref      TEXT NOT NULL,                  -- WV:person|WV:organization|WV:source id
  entity_type     TEXT NOT NULL,                  -- 'person'|'organization'|'source'
  target_type     TEXT NOT NULL,                  -- 'school'|'tradition'|'branch'|'institution'|'movement'
  target_id       TEXT NOT NULL,
  affil_role      TEXT,                           -- e.g. 'founder','member','critic','convert'
  period_label    TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_aff_entity ON wv_affiliations(entity_ref, entity_type);
CREATE INDEX IF NOT EXISTS idx_wv_aff_target ON wv_affiliations(target_type, target_id);

-- § 2.8  Sources (books, articles, lectures, manuscripts, videos)
CREATE TABLE IF NOT EXISTS wv_sources (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  source_type     TEXT NOT NULL DEFAULT 'book',
    -- 'book'|'article'|'lecture'|'talk'|'manuscript'|'video'|'podcast'|
    -- 'classical_text'|'fatwa'|'document'|'other'
  source_domain   TEXT NOT NULL DEFAULT 'general',
    -- 'general'|'classical_text'|'academic'|'journalistic'|'media'|'other'
  tradition_id    TEXT,
  language        TEXT,
  published_year  INTEGER,
  publisher       TEXT,
  doi             TEXT,
  url             TEXT,
  cover_blob      TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_src_type   ON wv_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_wv_src_trad   ON wv_sources(tradition_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_sources_fts USING fts5(
  title, title_ar, description_md, content='wv_sources', content_rowid='rowid'
);

-- § 2.9  Source units (structured segments for evidence provenance)
CREATE TABLE IF NOT EXISTS wv_source_units (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  parent_id       TEXT,
  unit_type       TEXT NOT NULL DEFAULT 'chapter',
    -- 'volume'|'chapter'|'section'|'paragraph'|'footnote'|'appendix'|'other'
  title           TEXT,
  unit_index      INTEGER,
  page_start      INTEGER,
  page_end        INTEGER,
  text_excerpt    TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES wv_sources(id),
  FOREIGN KEY (parent_id) REFERENCES wv_source_units(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_su_source ON wv_source_units(source_id);

-- § 2.10  Source people (author, editor, translator, speaker, guest roles)
CREATE TABLE IF NOT EXISTS wv_source_people (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL,
  person_id   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'author',
    -- 'author'|'editor'|'translator'|'speaker'|'host'|'guest'|'compiler'|'contributor'
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES wv_sources(id),
  FOREIGN KEY (person_id) REFERENCES wv_people(id),
  UNIQUE (source_id, person_id, role)
);
CREATE INDEX IF NOT EXISTS idx_wv_sp_source ON wv_source_people(source_id);
CREATE INDEX IF NOT EXISTS idx_wv_sp_person ON wv_source_people(person_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 3 — ABRAHAMIC MORAL-CIVILIZATIONAL ONTOLOGY
-- ─────────────────────────────────────────────────────────────────────────────

-- § 3.1  Moral axes (revelation, prophecy, covenant, law, mercy, etc.)
CREATE TABLE IF NOT EXISTS wv_moral_axes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  axis_type       TEXT NOT NULL DEFAULT 'relational',
    -- 'relational'|'virtue'|'obligation'|'eschatological'|'structural'|'other'
  description_md  TEXT,
  domain_id       TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES wv_domains(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ma_type ON wv_moral_axes(axis_type);

INSERT OR IGNORE INTO wv_moral_axes (id, slug, title, axis_type) VALUES
  ('01MAXS0000000000000000001', 'revelation',          'Revelation',             'relational'),
  ('01MAXS0000000000000000002', 'prophecy',            'Prophecy',               'relational'),
  ('01MAXS0000000000000000003', 'covenant',            'Covenant',               'relational'),
  ('01MAXS0000000000000000004', 'law',                 'Law',                    'obligation'),
  ('01MAXS0000000000000000005', 'mercy',               'Mercy',                  'relational'),
  ('01MAXS0000000000000000006', 'justice',             'Justice',                'obligation'),
  ('01MAXS0000000000000000007', 'sacrifice',           'Sacrifice',              'obligation'),
  ('01MAXS0000000000000000008', 'salvation',           'Salvation / Redemption', 'eschatological'),
  ('01MAXS0000000000000000009', 'family',              'Family',                 'structural'),
  ('01MAXS0000000000000000010', 'authority',           'Authority',              'structural'),
  ('01MAXS0000000000000000011', 'hospitality',         'Hospitality / Stranger', 'obligation'),
  ('01MAXS0000000000000000012', 'repentance',          'Repentance',             'relational'),
  ('01MAXS0000000000000000013', 'stewardship',         'Stewardship',            'obligation'),
  ('01MAXS0000000000000000014', 'truthfulness',        'Truthfulness',           'virtue'),
  ('01MAXS0000000000000000015', 'obedience',           'Obedience',              'obligation');

-- § 3.2  Moral norms (specific moral commands, ideals, duties, prohibitions)
CREATE TABLE IF NOT EXISTS wv_moral_norms (
  id              TEXT PRIMARY KEY,
  moral_axis_id   TEXT,
  tradition_id    TEXT,
  title           TEXT NOT NULL,
  norm_type       TEXT NOT NULL DEFAULT 'duty',
    -- 'duty'|'prohibition'|'ideal'|'counsel'|'custom'|'taboo'|'other'
  scope           TEXT,                           -- 'universal'|'community'|'individual'|'ritual'
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_mn_axis ON wv_moral_norms(moral_axis_id);
CREATE INDEX IF NOT EXISTS idx_wv_mn_trad ON wv_moral_norms(tradition_id);

-- § 3.3  Norm sources (scripture, commentary, institution, thinker)
CREATE TABLE IF NOT EXISTS wv_norm_sources (
  id             TEXT PRIMARY KEY,
  norm_id        TEXT NOT NULL,
  source_type    TEXT NOT NULL DEFAULT 'scripture',
    -- 'scripture'|'commentary'|'institution'|'thinker'|'tradition'|'legal'
  source_ref     TEXT NOT NULL,                   -- WV:source_id or external ref
  locator        TEXT,
  excerpt        TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (norm_id) REFERENCES wv_moral_norms(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ns_norm ON wv_norm_sources(norm_id);

-- § 3.4  Virtue profiles
CREATE TABLE IF NOT EXISTS wv_virtue_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  description_md  TEXT,
  scripture_refs  TEXT,                           -- JSON [ref_string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_vp_trad ON wv_virtue_profiles(tradition_id);

INSERT OR IGNORE INTO wv_virtue_profiles (id, slug, title) VALUES
  ('01VIRT000000000000000001', 'faith',       'Faith'),
  ('01VIRT000000000000000002', 'justice',     'Justice'),
  ('01VIRT000000000000000003', 'patience',    'Patience'),
  ('01VIRT000000000000000004', 'mercy',       'Mercy'),
  ('01VIRT000000000000000005', 'obedience',   'Obedience'),
  ('01VIRT000000000000000006', 'courage',     'Courage'),
  ('01VIRT000000000000000007', 'humility',    'Humility'),
  ('01VIRT000000000000000008', 'truthfulness','Truthfulness'),
  ('01VIRT000000000000000009', 'chastity',    'Chastity'),
  ('01VIRT000000000000000010', 'charity',     'Charity');

-- § 3.5  Vice profiles
CREATE TABLE IF NOT EXISTS wv_vice_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

INSERT OR IGNORE INTO wv_vice_profiles (id, slug, title) VALUES
  ('01VICE000000000000000001', 'idolatry',        'Idolatry / Shirk'),
  ('01VICE000000000000000002', 'arrogance',       'Arrogance'),
  ('01VICE000000000000000003', 'betrayal',        'Betrayal'),
  ('01VICE000000000000000004', 'greed',           'Greed'),
  ('01VICE000000000000000005', 'injustice',       'Injustice / Oppression'),
  ('01VICE000000000000000006', 'hypocrisy',       'Hypocrisy'),
  ('01VICE000000000000000007', 'forgetfulness',   'Forgetfulness of God'),
  ('01VICE000000000000000008', 'despair',         'Despair / Loss of Hope');

-- § 3.6  Covenant frameworks (promise, obligation, sign, election, memory)
CREATE TABLE IF NOT EXISTS wv_covenant_frameworks (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  parties         TEXT,                           -- JSON [{role,identity}]
  covenant_type   TEXT NOT NULL DEFAULT 'bilateral',
    -- 'unilateral'|'bilateral'|'universal'|'communal'|'conditional'|'eternal'
  key_sign        TEXT,
  key_obligation  TEXT,
  memory_practice TEXT,
  renewal_pattern TEXT,
  description_md  TEXT,
  corpus_refs     TEXT,                           -- JSON [corpus_unit_id]
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cf_trad ON wv_covenant_frameworks(tradition_id);

-- § 3.7  Sacrifice frameworks (testing, surrender, atonement, ritual)
CREATE TABLE IF NOT EXISTS wv_sacrifice_frameworks (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  sacrifice_type  TEXT NOT NULL DEFAULT 'ritual',
    -- 'ritual'|'moral'|'communal'|'testing'|'substitution'|'atonement'|
    -- 'surrender'|'remembrance'|'other'
  key_example     TEXT,
  theological_role TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_sf_trad ON wv_sacrifice_frameworks(tradition_id);

-- § 3.8  Revelation models (word, law, spirit, scripture, prophecy)
CREATE TABLE IF NOT EXISTS wv_revelation_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  revelation_type TEXT NOT NULL DEFAULT 'prophetic',
    -- 'prophetic'|'scriptural'|'incarnational'|'recitational'|'mystical'|
    -- 'legal'|'natural'|'spirit_based'|'other'
  medium          TEXT,                           -- word, law, person, spirit, scripture
  continuity      TEXT,                           -- ongoing|closed|progressive|final
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_rm_trad ON wv_revelation_models(tradition_id);

-- § 3.9  Prophetic models (messenger profile, exemplar, lawgiver, reformer)
CREATE TABLE IF NOT EXISTS wv_prophetic_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  model_role      TEXT NOT NULL DEFAULT 'messenger',
    -- 'messenger'|'exemplar'|'mediator'|'lawgiver'|'suffering_servant'|
    -- 'reformer'|'warner'|'intercessor'|'other'
  key_attributes  TEXT,                           -- JSON [string]
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_pm_trad ON wv_prophetic_models(tradition_id);

-- § 3.10  Divine-human relations (holiness, nearness, transcendence)
CREATE TABLE IF NOT EXISTS wv_divine_human_relations (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  relation_type   TEXT NOT NULL DEFAULT 'covenantal',
    -- 'covenantal'|'filial'|'servant'|'mystical'|'contractual'|'fearful'|'other'
  key_qualities   TEXT,                           -- JSON [string]: holiness, nearness, etc.
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 3.11  Law-morality links (legal frameworks → moral pedagogy + public order)
CREATE TABLE IF NOT EXISTS wv_law_morality_links (
  id              TEXT PRIMARY KEY,
  tradition_id    TEXT,
  law_system      TEXT NOT NULL,
  morality_domain TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'grounds',
    -- 'grounds'|'expresses'|'teaches'|'enforces'|'supplements'|'transcends'|'other'
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 3.12  Salvation / redemption models (sin, repentance, forgiveness, judgment)
CREATE TABLE IF NOT EXISTS wv_salvation_redemption_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  model_type      TEXT NOT NULL DEFAULT 'moral',
    -- 'moral'|'substitutionary'|'participatory'|'progressive'|'restorative'|
    -- 'covenantal'|'mystical'|'other'
  sin_diagnosis   TEXT,
  remedy          TEXT,
  final_hope      TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_srm_trad ON wv_salvation_redemption_models(tradition_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 4 — STRUCTURED REASONING (TOPICS, CLAIMS, ARGUMENTS, EVIDENCE)
-- ─────────────────────────────────────────────────────────────────────────────

-- § 4.1  Topics (canonical discourse topics)
CREATE TABLE IF NOT EXISTS wv_topics (
  id              TEXT PRIMARY KEY,
  topic_key       TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  topic_domain    TEXT NOT NULL DEFAULT 'theology',
    -- 'theology'|'ethics'|'anthropology'|'eschatology'|'prophethood'|'law'|
    -- 'cosmology'|'psychology'|'sociology'|'history'|'worldview'|'modernity'|
    -- 'coloniality'|'discernment'|'other'
  parent_id       TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_top_domain ON wv_topics(topic_domain);
CREATE INDEX IF NOT EXISTS idx_wv_top_trad   ON wv_topics(tradition_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_topics_fts USING fts5(
  title, title_ar, description_md, content='wv_topics', content_rowid='rowid'
);

-- § 4.2  Claims (doctrinal, historical, moral, civilizational)
CREATE TABLE IF NOT EXISTS wv_claims (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  claim_text      TEXT NOT NULL,
  claim_type      TEXT NOT NULL DEFAULT 'doctrinal',
    -- 'doctrinal'|'historical'|'moral'|'sociological'|'civilizational'|
    -- 'comparative'|'theological'|'interpretive'|'other'
  topic_id        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  person_id       TEXT,
  school_id       TEXT,
  certainty_level TEXT NOT NULL DEFAULT 'position',
    -- 'assertion'|'position'|'hypothesis'|'question'|'consensus'|'contested'
  status          TEXT NOT NULL DEFAULT 'active',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)      REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (person_id)     REFERENCES wv_people(id),
  FOREIGN KEY (school_id)     REFERENCES wv_schools(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cl_topic  ON wv_claims(topic_id);
CREATE INDEX IF NOT EXISTS idx_wv_cl_trad   ON wv_claims(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_cl_type   ON wv_claims(claim_type);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_claims_fts USING fts5(
  title, claim_text, content='wv_claims', content_rowid='rowid'
);

-- § 4.3  Claim types registry
CREATE TABLE IF NOT EXISTS wv_claim_types (
  id    TEXT PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 4.4  Arguments (multi-step positions)
CREATE TABLE IF NOT EXISTS wv_arguments (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  argument_text   TEXT NOT NULL,
  argument_type   TEXT NOT NULL DEFAULT 'deductive',
    -- 'deductive'|'inductive'|'abductive'|'analogical'|'historical'|'moral'|'other'
  topic_id        TEXT,
  tradition_id    TEXT,
  person_id       TEXT,
  school_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (person_id)    REFERENCES wv_people(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_arg_topic ON wv_arguments(topic_id);
CREATE INDEX IF NOT EXISTS idx_wv_arg_trad  ON wv_arguments(tradition_id);

-- § 4.5  Argument relations (supports, contradicts, qualifies, inherits)
CREATE TABLE IF NOT EXISTS wv_argument_relations (
  id             TEXT PRIMARY KEY,
  from_arg_id    TEXT NOT NULL,
  to_arg_id      TEXT,                            -- NULL if relates to a claim
  to_claim_id    TEXT,
  relation_type  TEXT NOT NULL DEFAULT 'supports',
    -- 'supports'|'contradicts'|'reframes'|'qualifies'|'synthesizes'|
    -- 'inherits'|'answers'|'presupposes'|'other'
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_arg_id) REFERENCES wv_arguments(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ar_from ON wv_argument_relations(from_arg_id);

-- § 4.6  Evidence items (normalized evidence records)
CREATE TABLE IF NOT EXISTS wv_evidence_items (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  evidence_type   TEXT NOT NULL DEFAULT 'scriptural',
    -- 'scriptural'|'historical'|'archaeological'|'testimonial'|'logical'|
    -- 'statistical'|'comparative'|'traditional'|'other'
  source_id       TEXT,
  source_unit_id  TEXT,
  locator         TEXT,                           -- page, verse, timestamp
  excerpt         TEXT,
  qr_scope_ref    TEXT,                           -- 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  al_concept_ref  TEXT,                           -- 'AL:<lemma_id>'
  cm_doc_ref      TEXT,                           -- 'CM:<doc_id>'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ei_source ON wv_evidence_items(source_id);
CREATE INDEX IF NOT EXISTS idx_wv_ei_type   ON wv_evidence_items(evidence_type);

-- § 4.7  Claim evidence links (support, question, illustrate, counter)
CREATE TABLE IF NOT EXISTS wv_claim_evidence_links (
  id            TEXT PRIMARY KEY,
  claim_id      TEXT NOT NULL,
  evidence_id   TEXT NOT NULL,
  link_role     TEXT NOT NULL DEFAULT 'supports',
    -- 'supports'|'questions'|'illustrates'|'cites'|'counters'|'contextualizes'
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (claim_id)    REFERENCES wv_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES wv_evidence_items(id),
  UNIQUE (claim_id, evidence_id, link_role)
);
CREATE INDEX IF NOT EXISTS idx_wv_cel_claim    ON wv_claim_evidence_links(claim_id);
CREATE INDEX IF NOT EXISTS idx_wv_cel_evidence ON wv_claim_evidence_links(evidence_id);

-- § 4.8  Questions (open problems, comparison prompts, tensions)
CREATE TABLE IF NOT EXISTS wv_questions (
  id              TEXT PRIMARY KEY,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'open',
    -- 'open'|'comparative'|'unresolved_tension'|'research_gap'|'polemical'|'other'
  topic_id        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'open',   -- 'open'|'partially_answered'|'closed'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_q_topic ON wv_questions(topic_id);

-- § 4.9  Debate clusters (named rival claim pressure zones)
CREATE TABLE IF NOT EXISTS wv_debate_clusters (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  topic_id        TEXT,
  moral_axis_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);

CREATE TABLE IF NOT EXISTS wv_debate_cluster_members (
  id          TEXT PRIMARY KEY,
  cluster_id  TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'claim'|'argument'|'question'|'value_position'
  entity_id   TEXT NOT NULL,
  stance      TEXT,          -- 'supporting'|'opposing'|'neutral'|'moderating'
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cluster_id) REFERENCES wv_debate_clusters(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_dcm_cluster ON wv_debate_cluster_members(cluster_id);

-- § 4.10  Value positions (where tradition/school/thinker stands on moral axis)
CREATE TABLE IF NOT EXISTS wv_value_positions (
  id              TEXT PRIMARY KEY,
  moral_axis_id   TEXT NOT NULL,
  tradition_id    TEXT,
  school_id       TEXT,
  person_id       TEXT,
  position_title  TEXT NOT NULL,
  position_text   TEXT NOT NULL,
  position_type   TEXT NOT NULL DEFAULT 'normative',
    -- 'normative'|'descriptive'|'critical'|'revisionist'|'comparative'
  evidence_refs   TEXT,                           -- JSON [evidence_item_id]
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (school_id)     REFERENCES wv_schools(id),
  FOREIGN KEY (person_id)     REFERENCES wv_people(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_vp_axis ON wv_value_positions(moral_axis_id);
CREATE INDEX IF NOT EXISTS idx_wv_vp_trad ON wv_value_positions(tradition_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 4C — MODERNITY EXPANSION
-- ─────────────────────────────────────────────────────────────────────────────

-- § 4C.1  Modernity streams (liberal, secular, nationalist, socialist, etc.)
CREATE TABLE IF NOT EXISTS wv_modernity_streams (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  stream_type     TEXT NOT NULL DEFAULT 'secular',
    -- 'liberal'|'secular'|'nationalist'|'socialist'|'technocratic'|
    -- 'consumer'|'platform'|'progressive'|'reactionary'|'other'
  origin_period_id TEXT,
  description_md  TEXT,
  key_values      TEXT,                           -- JSON [string]
  key_tensions    TEXT,                           -- JSON [string]
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_ms_type ON wv_modernity_streams(stream_type);

-- § 4C.2  Enlightenment currents (lineages and successor formations)
CREATE TABLE IF NOT EXISTS wv_enlightenment_currents (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  stream_id       TEXT,
  key_thinkers    TEXT,                           -- JSON [person_id]
  key_texts       TEXT,                           -- JSON [source_id]
  period_range    TEXT,
  origin_region   TEXT,
  description_md  TEXT,
  successor_of    TEXT,                           -- self-ref: id
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id)    REFERENCES wv_modernity_streams(id),
  FOREIGN KEY (successor_of) REFERENCES wv_enlightenment_currents(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ec_stream ON wv_enlightenment_currents(stream_id);

-- § 4C.3  Epistemic regimes (truth-claim models: revelation, rationalism, empiricism)
CREATE TABLE IF NOT EXISTS wv_epistemic_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'rationalist',
    -- 'revelatory'|'rationalist'|'empiricist'|'skeptical'|'scientistic'|
    -- 'technocratic'|'media_consensus'|'algorithmic'|'other'
  tradition_id    TEXT,                           -- optional: belongs to tradition
  period_id       TEXT,
  description_md  TEXT,
  key_claims      TEXT,                           -- JSON [string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 4C.4  Authority models (divine law, church, state, market, algorithm)
CREATE TABLE IF NOT EXISTS wv_authority_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  authority_type  TEXT NOT NULL DEFAULT 'institutional',
    -- 'divine_law'|'church'|'ummah'|'state'|'market'|'expert_class'|
    -- 'platform'|'algorithm'|'popular'|'other'
  tradition_id    TEXT,
  stream_id       TEXT,
  description_md  TEXT,
  legitimacy_claim TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (stream_id)    REFERENCES wv_modernity_streams(id)
);

-- § 4C.5  Human image profiles (competing pictures of the human being)
CREATE TABLE IF NOT EXISTS wv_human_image_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  image_type      TEXT NOT NULL DEFAULT 'covenantal',
    -- 'soul_bearing'|'covenantal'|'rational_agent'|'expressive_self'|
    -- 'economic_actor'|'therapeutic_self'|'platform_user'|'other'
  tradition_id    TEXT,
  stream_id       TEXT,
  description_md  TEXT,
  key_attributes  TEXT,                           -- JSON [string]
  moral_implications TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (stream_id)    REFERENCES wv_modernity_streams(id)
);

-- § 4C.6  Psychology schools (modern schools and their civilizational anthropology)
CREATE TABLE IF NOT EXISTS wv_psychology_schools (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  founder_name    TEXT,
  period_range    TEXT,
  origin_region   TEXT,
  human_image_id  TEXT,
  key_concepts    TEXT,                           -- JSON [string]
  civilizational_role TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (human_image_id) REFERENCES wv_human_image_profiles(id)
);

-- § 4C.7  Identity regimes (how identity is structured, policed, performed)
CREATE TABLE IF NOT EXISTS wv_identity_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'political',
    -- 'political'|'racial'|'sexual'|'religious'|'national'|'platform'|'other'
  stream_id       TEXT,
  period_id       TEXT,
  description_md  TEXT,
  key_mechanisms  TEXT,                           -- JSON [string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

-- § 4C.8  Ideology profiles (canonical ideological formations)
CREATE TABLE IF NOT EXISTS wv_ideology_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  ideology_type   TEXT NOT NULL DEFAULT 'political',
    -- 'political'|'economic'|'social'|'religious'|'ecological'|'other'
  stream_id       TEXT,
  key_claims      TEXT,                           -- JSON [string]
  key_virtues     TEXT,                           -- operative virtues
  key_taboos      TEXT,                           -- operative taboos
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 4C.9  Secular moralities (non-theological moral systems)
CREATE TABLE IF NOT EXISTS wv_secular_moralities (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  moral_type      TEXT NOT NULL DEFAULT 'utilitarian',
    -- 'utilitarian'|'deontological'|'virtue'|'contractarian'|
    -- 'care'|'rights_based'|'nihilist'|'relativist'|'other'
  stream_id       TEXT,
  key_values      TEXT,                           -- JSON [string]
  legitimacy_claim TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

-- § 4C.10  Civilizational crises (nihilism, atomization, meaning loss, polarization)
CREATE TABLE IF NOT EXISTS wv_civilizational_crises (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  crisis_type     TEXT NOT NULL DEFAULT 'moral',
    -- 'moral'|'epistemic'|'social'|'political'|'spiritual'|'psychological'|'other'
  stream_id       TEXT,
  period_range    TEXT,
  description_md  TEXT,
  diagnostic_claims TEXT,                         -- JSON [claim_id]
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 4D — COLONIALITY, ORIENTALISM, MEDIA, AND PROPAGANDA
-- ─────────────────────────────────────────────────────────────────────────────

-- § 4D.1  Colonial projects (concrete colonial formations)
CREATE TABLE IF NOT EXISTS wv_colonial_projects (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  colonizer       TEXT,
  colonized       TEXT,
  period_id       TEXT,
  region_id       TEXT,
  project_type    TEXT NOT NULL DEFAULT 'territorial',
    -- 'territorial'|'economic'|'missionary'|'educational'|'legal'|'combined'
  key_institutions TEXT,                          -- JSON [institution_id]
  moral_narrative TEXT,                           -- self-justifying moral claim
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (period_id)  REFERENCES wv_periods(id),
  FOREIGN KEY (region_id)  REFERENCES wv_regions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cp_type ON wv_colonial_projects(project_type);

-- § 4D.2  Colonial methods taxonomy
CREATE TABLE IF NOT EXISTS wv_colonial_methods (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  method_type     TEXT NOT NULL DEFAULT 'extraction',
    -- 'extraction'|'schooling'|'codification'|'racial_ordering'|
    -- 'missionary_translation'|'archive_control'|'administrative'|'other'
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 4D.3  Orientalist frames (named representational frames)
CREATE TABLE IF NOT EXISTS wv_orientalist_frames (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  target_tradition TEXT,
  target_region    TEXT,
  period_range    TEXT,
  key_stereotypes TEXT,                           -- JSON [string]
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 4D.4  Image regimes (how populations are pictured and narrated)
CREATE TABLE IF NOT EXISTS wv_image_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'colonial',
    -- 'colonial'|'wartime'|'media'|'cinematic'|'digital'|'algorithmic'
  colonial_project_id TEXT,
  orientalist_frame_id TEXT,
  description_md  TEXT,
  key_mechanisms  TEXT,                           -- JSON [string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (colonial_project_id) REFERENCES wv_colonial_projects(id),
  FOREIGN KEY (orientalist_frame_id) REFERENCES wv_orientalist_frames(id)
);

-- § 4D.5  Propaganda systems (state, wartime, media, platform architectures)
CREATE TABLE IF NOT EXISTS wv_propaganda_systems (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  system_type     TEXT NOT NULL DEFAULT 'state',
    -- 'state'|'wartime'|'media'|'ideological'|'commercial'|'platform'
  period_id       TEXT,
  region_id       TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 4D.6  Media regimes (print, broadcast, cinematic, digital, platform)
CREATE TABLE IF NOT EXISTS wv_media_regimes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  regime_type     TEXT NOT NULL DEFAULT 'print',
    -- 'print'|'broadcast'|'cinematic'|'digital'|'social_platform'|'algorithmic'
  period_id       TEXT,
  description_md  TEXT,
  key_characteristics TEXT,                       -- JSON [string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 4D.7  Narrative scripts (repeatable scripts for consent, fear, aspiration)
CREATE TABLE IF NOT EXISTS wv_narrative_scripts (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  script_type     TEXT NOT NULL DEFAULT 'consent',
    -- 'consent'|'fear'|'aspiration'|'enemy_image'|'civilizational_stereotype'|'other'
  propaganda_system_id TEXT,
  media_regime_id TEXT,
  description_md  TEXT,
  key_moves       TEXT,                           -- JSON [string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (propaganda_system_id) REFERENCES wv_propaganda_systems(id),
  FOREIGN KEY (media_regime_id)      REFERENCES wv_media_regimes(id)
);

-- § 4D.8  Memory rewrites (deliberate reframing, erasure, moral inversion)
CREATE TABLE IF NOT EXISTS wv_memory_rewrites (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  rewrite_type    TEXT NOT NULL DEFAULT 'erasure',
    -- 'erasure'|'selective_remembrance'|'reframing'|'moral_inversion'|'myth_substitution'
  target_tradition TEXT,
  target_event_id TEXT,
  agent           TEXT,                           -- who performed the rewrite
  period_range    TEXT,
  description_md  TEXT,
  evidence_refs   TEXT,                           -- JSON [evidence_item_id]
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 4E — ADVERSARIAL PATTERNS AND DISCERNMENT
-- ─────────────────────────────────────────────────────────────────────────────

-- § 4E.1  Spiritual agents (angels, demons, adversarial beings — tradition-scoped)
CREATE TABLE IF NOT EXISTS wv_spiritual_agents (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT NOT NULL,
  agent_type      TEXT NOT NULL DEFAULT 'angelic',
    -- 'angelic'|'demonic'|'satanic'|'adversarial'|'divine'|'other'
  description_md  TEXT,
  scriptural_basis TEXT,                          -- JSON [corpus_unit_id]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 4E.2  Adversarial patterns (pride, accusation, temptation, beautification of evil)
CREATE TABLE IF NOT EXISTS wv_adversarial_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  pattern_type    TEXT NOT NULL DEFAULT 'pride',
    -- 'pride'|'accusation'|'temptation'|'beautification_of_evil'|
    -- 'despair'|'division'|'false_liberation'|'distraction'|'other'
  description_md  TEXT,
  scriptural_refs TEXT,                           -- JSON [corpus_unit_id]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ap_trad ON wv_adversarial_patterns(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_ap_type ON wv_adversarial_patterns(pattern_type);

-- § 4E.3  Temptation modes (appetitive, intellectual, political, ideological)
CREATE TABLE IF NOT EXISTS wv_temptation_modes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  mode_type       TEXT NOT NULL DEFAULT 'appetitive',
    -- 'appetitive'|'intellectual'|'political'|'erotic'|'economic'|
    -- 'ideological'|'technological'|'other'
  tradition_id    TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 4E.4  Moral inversion patterns (vice recoded as virtue)
CREATE TABLE IF NOT EXISTS wv_moral_inversion_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  inverted_virtue TEXT,                           -- the virtue being recoded
  replacement_virtue TEXT,                        -- the counterfeit it becomes
  mechanism       TEXT,
  adversarial_pattern_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)          REFERENCES wv_traditions(id),
  FOREIGN KEY (adversarial_pattern_id) REFERENCES wv_adversarial_patterns(id)
);

-- § 4E.5  Deception signatures (detectable markers of counterfeit truth claims)
CREATE TABLE IF NOT EXISTS wv_deception_signatures (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  signature_type  TEXT NOT NULL DEFAULT 'doctrinal',
    -- 'doctrinal'|'moral'|'political'|'social'|'spiritual'|'other'
  description_md  TEXT,
  warning_signs   TEXT,                           -- JSON [string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 4E.6  False transcendence profiles (political/racial/erotic substitutes for divine ultimacy)
CREATE TABLE IF NOT EXISTS wv_false_transcendence_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  profile_type    TEXT NOT NULL DEFAULT 'political',
    -- 'political'|'racial'|'erotic'|'national'|'technological'|'consumer'|'other'
  stream_id       TEXT,
  description_md  TEXT,
  how_it_mimics   TEXT,                           -- what divine attribute it mimics
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

-- § 4E.7  Counterfeit redemption claims (projects promising salvation while displacing divine)
CREATE TABLE IF NOT EXISTS wv_counterfeit_redemption_claims (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  claim_text      TEXT NOT NULL,
  stream_id       TEXT,
  project_type    TEXT NOT NULL DEFAULT 'revolutionary',
    -- 'revolutionary'|'therapeutic'|'technocratic'|'racial'|'national'|'other'
  redemption_promise TEXT,
  displacement_mechanism TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id) REFERENCES wv_modernity_streams(id)
);

-- § 4E.8  Discernment rules (tradition-specific hermeneutic tests and warning signs)
CREATE TABLE IF NOT EXISTS wv_discernment_rules (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT NOT NULL,
  rule_type       TEXT NOT NULL DEFAULT 'hermeneutic',
    -- 'hermeneutic'|'moral'|'spiritual'|'social'|'political'|'other'
  rule_text       TEXT NOT NULL,
  scriptural_basis TEXT,                          -- JSON [corpus_unit_id]
  warning_indicators TEXT,                        -- JSON [string]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_dr_trad ON wv_discernment_rules(tradition_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 5 — HISTORICAL AND SOCIAL WORLD
-- ─────────────────────────────────────────────────────────────────────────────

-- § 5.1  Prophetic episodes (narrative episodes traditions morally reuse)
CREATE TABLE IF NOT EXISTS wv_prophetic_episodes (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  tradition_id    TEXT,
  prophet_id      TEXT,                           -- person_id of the prophet
  moral_axis_id   TEXT,
  episode_type    TEXT NOT NULL DEFAULT 'testing',
    -- 'testing'|'sacrifice'|'covenant'|'mission'|'rejection'|'reform'|
    -- 'miracle'|'intercession'|'judgment'|'hospitality'|'repentance'|'other'
  narrative_text  TEXT,
  moral_lesson    TEXT,
  qr_scope_ref    TEXT,                           -- 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  corpus_unit_id  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (prophet_id)   REFERENCES wv_people(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_pe_trad   ON wv_prophetic_episodes(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_pe_type   ON wv_prophetic_episodes(episode_type);
CREATE INDEX IF NOT EXISTS idx_wv_pe_prophet ON wv_prophetic_episodes(prophet_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_prophetic_episodes_fts USING fts5(
  title, title_ar, narrative_text, moral_lesson,
  content='wv_prophetic_episodes', content_rowid='rowid'
);

-- § 5.2  Prophetic episode links (episode → corpora, claims, moral axes, traditions)
CREATE TABLE IF NOT EXISTS wv_prophetic_episode_links (
  id              TEXT PRIMARY KEY,
  episode_id      TEXT NOT NULL,
  target_type     TEXT NOT NULL,
    -- 'corpus_unit'|'claim'|'moral_axis'|'tradition'|'event'|'covenant'|'sacrifice'
  target_id       TEXT NOT NULL,
  link_role       TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES wv_prophetic_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_pel_episode ON wv_prophetic_episode_links(episode_id);
CREATE INDEX IF NOT EXISTS idx_wv_pel_target  ON wv_prophetic_episode_links(target_type, target_id);

-- § 5.3  Events (councils, schisms, reforms, wars, encounters, codifications)
CREATE TABLE IF NOT EXISTS wv_events (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  event_type_id   TEXT,
  tradition_id    TEXT,
  period_id       TEXT,
  location_id     TEXT,
  start_year      INTEGER,
  end_year        INTEGER,
  is_approximate  INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  moral_significance TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (period_id)    REFERENCES wv_periods(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ev_trad  ON wv_events(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_ev_years ON wv_events(start_year, end_year);
CREATE INDEX IF NOT EXISTS idx_wv_ev_loc   ON wv_events(location_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_events_fts USING fts5(
  title, description_md, content='wv_events', content_rowid='rowid'
);

-- § 5.4  Event types taxonomy
CREATE TABLE IF NOT EXISTS wv_event_types (
  id    TEXT PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO wv_event_types (id, slug, title) VALUES
  ('01EVTYP0000000000000000001', 'council',             'Council / Synod'),
  ('01EVTYP0000000000000000002', 'schism',              'Schism'),
  ('01EVTYP0000000000000000003', 'reform_movement',     'Reform Movement'),
  ('01EVTYP0000000000000000004', 'war_conflict',        'War / Conflict'),
  ('01EVTYP0000000000000000005', 'migration',           'Migration / Exodus'),
  ('01EVTYP0000000000000000006', 'publication',         'Publication / Translation Moment'),
  ('01EVTYP0000000000000000007', 'colonial_encounter',  'Colonial Encounter'),
  ('01EVTYP0000000000000000008', 'legal_codification',  'Legal Codification'),
  ('01EVTYP0000000000000000009', 'revival',             'Revival / Awakening'),
  ('01EVTYP0000000000000000010', 'political_founding',  'Political Founding');


-- § 5.5  Event participants (people, organizations, institutions in events)
CREATE TABLE IF NOT EXISTS wv_event_participants (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL,
  entity_type     TEXT NOT NULL,  -- 'person'|'organization'|'institution'|'movement'
  entity_id       TEXT NOT NULL,
  role            TEXT,           -- 'initiator'|'supporter'|'opponent'|'witness'|'other'
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES wv_events(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ep_event  ON wv_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_wv_ep_entity ON wv_event_participants(entity_type, entity_id);

-- § 5.6  Event locations (spatial anchoring)
CREATE TABLE IF NOT EXISTS wv_event_locations (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL,
  location_id TEXT NOT NULL,
  role        TEXT,               -- 'primary'|'secondary'|'origin'|'destination'|'venue'
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id)    REFERENCES wv_events(id),
  FOREIGN KEY (location_id) REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_el_event ON wv_event_locations(event_id);
CREATE INDEX IF NOT EXISTS idx_wv_el_loc   ON wv_event_locations(location_id);

-- § 5.7  Practices (ritual, devotional, legal, social, embodied)
CREATE TABLE IF NOT EXISTS wv_practices (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  practice_type   TEXT NOT NULL DEFAULT 'ritual',
    -- 'ritual'|'devotional'|'educational'|'legal'|'social'|'embodied'|'communal'|'other'
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  period_id       TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_pr_trad ON wv_practices(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_pr_type ON wv_practices(practice_type);

-- § 5.8  Social patterns (family structure, authority, educational transmission)
CREATE TABLE IF NOT EXISTS wv_social_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  pattern_type    TEXT NOT NULL DEFAULT 'family',
    -- 'family'|'authority_order'|'class'|'educational'|'media_ecology'|
    -- 'gender'|'kinship'|'economic'|'other'
  tradition_id    TEXT,
  period_id       TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 5.9  Anthropology profiles (body, soul, desire, fitrah, sin, vocation)
CREATE TABLE IF NOT EXISTS wv_anthropology_profiles (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  human_image_id  TEXT,
  body_view       TEXT,
  soul_view       TEXT,
  desire_view     TEXT,
  sin_view        TEXT,
  vocation_view   TEXT,
  conscience_view TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (human_image_id) REFERENCES wv_human_image_profiles(id)
);

-- § 5.10  Institution profiles (detailed moral and civilizational role)
CREATE TABLE IF NOT EXISTS wv_institution_profiles (
  id              TEXT PRIMARY KEY,
  institution_id  TEXT NOT NULL,
  moral_role      TEXT,
  civilizational_role TEXT,
  key_functions   TEXT,                           -- JSON [string]
  notable_periods TEXT,                           -- JSON [period_id]
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (institution_id) REFERENCES wv_institutions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ip_inst ON wv_institution_profiles(institution_id);

-- § 5.11  Civilizational contributions (evidence-backed contribution claims)
CREATE TABLE IF NOT EXISTS wv_civilizational_contributions (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  domain_id       TEXT,
  contrib_type    TEXT NOT NULL DEFAULT 'intellectual',
    -- 'intellectual'|'legal'|'educational'|'charitable'|'artistic'|
    -- 'governance'|'scientific'|'literary'|'architectural'|'other'
  period_id       TEXT,
  location_id     TEXT,
  description_md  TEXT,
  significance_md TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (domain_id)    REFERENCES wv_domains(id),
  FOREIGN KEY (period_id)    REFERENCES wv_periods(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cc_trad ON wv_civilizational_contributions(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_cc_type ON wv_civilizational_contributions(contrib_type);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_civilizational_contributions_fts USING fts5(
  title, description_md, significance_md,
  content='wv_civilizational_contributions', content_rowid='rowid'
);

-- § 5.12  Contribution evidence links (evidence and contest for contributions)
CREATE TABLE IF NOT EXISTS wv_contribution_evidence_links (
  id              TEXT PRIMARY KEY,
  contrib_id      TEXT NOT NULL,
  evidence_id     TEXT NOT NULL,
  link_role       TEXT NOT NULL DEFAULT 'supports',
    -- 'supports'|'contests'|'qualifies'|'illustrates'
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contrib_id)  REFERENCES wv_civilizational_contributions(id),
  FOREIGN KEY (evidence_id) REFERENCES wv_evidence_items(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cel2_contrib ON wv_contribution_evidence_links(contrib_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 5B — EMBODIED MORALITY AND CASE MEMORY
-- ─────────────────────────────────────────────────────────────────────────────

-- § 5B.1  Exemplar cases (canonical remembered moral examples)
CREATE TABLE IF NOT EXISTS wv_exemplar_cases (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  case_type       TEXT NOT NULL DEFAULT 'prophetic_episode',
    -- 'prophetic_episode'|'community_covenant'|'legal_case'|'martyrdom'|
    -- 'repentance'|'hospitality'|'charity'|'household'|'other'
  narrative_text  TEXT,
  moral_lesson    TEXT,
  qr_scope_ref    TEXT,
  period_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ec_trad ON wv_exemplar_cases(tradition_id);
CREATE INDEX IF NOT EXISTS idx_wv_ec_type ON wv_exemplar_cases(case_type);

-- § 5B.2  Case scope links (case → prophet, tradition, event, institution)
CREATE TABLE IF NOT EXISTS wv_case_scope_links (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL,
  scope_type  TEXT NOT NULL, -- 'prophet'|'tradition'|'school'|'event'|'institution'|'corpus_unit'
  scope_id    TEXT NOT NULL,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES wv_exemplar_cases(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_csl_case  ON wv_case_scope_links(case_id);
CREATE INDEX IF NOT EXISTS idx_wv_csl_scope ON wv_case_scope_links(scope_type, scope_id);

-- § 5B.3  Moral case patterns (reusable moral patterns)
CREATE TABLE IF NOT EXISTS wv_moral_case_patterns (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  pattern_type    TEXT NOT NULL DEFAULT 'sacrifice',
    -- 'sacrifice'|'migration'|'repentance'|'charity'|'covenant_fidelity'|
    -- 'resistance_to_tyranny'|'hospitality'|'forgiveness'|'other'
  description_md  TEXT,
  traditions_using TEXT,                          -- JSON [tradition_id]
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 5B.4  Household models (family and child formation, moral organization)
CREATE TABLE IF NOT EXISTS wv_household_models (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  period_id       TEXT,
  authority_structure TEXT,
  formation_methods TEXT,                         -- JSON [string]
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 5B.5  Charity infrastructures (waqf, parish relief, communal care)
CREATE TABLE IF NOT EXISTS wv_charity_infrastructures (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  infra_type      TEXT NOT NULL DEFAULT 'waqf',
    -- 'waqf'|'parish_relief'|'communal_care'|'orphan_support'|'widow_support'|
    -- 'hospital'|'scholarship'|'food_distribution'|'other'
  period_id       TEXT,
  location_id     TEXT,
  institution_id  TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (institution_id) REFERENCES wv_institutions(id)
);

-- § 5B.6  Memory traditions (liturgical, textual, educational, institutional memory)
CREATE TABLE IF NOT EXISTS wv_memory_traditions (
  id              TEXT PRIMARY KEY,
  case_id         TEXT,
  tradition_id    TEXT,
  memory_type     TEXT NOT NULL DEFAULT 'liturgical',
    -- 'liturgical'|'textual'|'educational'|'institutional'|'oral'|'artistic'|'other'
  description_md  TEXT,
  vehicle         TEXT,                           -- specific practice/text/institution
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id)      REFERENCES wv_exemplar_cases(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 6 — MAPS AND GEOGRAPHIES
-- ─────────────────────────────────────────────────────────────────────────────

-- § 6.1  Map layers (named map programs)
CREATE TABLE IF NOT EXISTS wv_map_layers (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  layer_type      TEXT NOT NULL DEFAULT 'prophetic_routes',
    -- 'prophetic_routes'|'institutional_centers'|'migration_waves'|
    -- 'contribution_zones'|'colonial_spread'|'modern_ideological'|
    -- 'reform_circulation'|'other'
  tradition_id    TEXT,
  period_id       TEXT,
  description_md  TEXT,
  renderer_hint   TEXT,                           -- e.g. 'heatmap'|'route'|'polygon'|'points'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 6.2  Map features (points, routes, polygons, overlays tied to canonical rows)
CREATE TABLE IF NOT EXISTS wv_map_features (
  id              TEXT PRIMARY KEY,
  map_layer_id    TEXT NOT NULL,
  feature_type    TEXT NOT NULL DEFAULT 'point',
    -- 'point'|'route'|'polygon'|'overlay'|'marker'|'corridor'
  title           TEXT,
  location_id     TEXT,
  latitude        REAL,
  longitude       REAL,
  geometry_json   TEXT,                           -- GeoJSON for polygons/routes
  linked_entity   TEXT,                           -- typed ref to event/person/institution/contribution
  period_label    TEXT,
  label           TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (map_layer_id) REFERENCES wv_map_layers(id),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_mf_layer ON wv_map_features(map_layer_id);

-- § 6.3  Route segments (travel, migration, mission, trade, exile, pilgrimage)
CREATE TABLE IF NOT EXISTS wv_route_segments (
  id              TEXT PRIMARY KEY,
  map_layer_id    TEXT,
  title           TEXT,
  route_type      TEXT NOT NULL DEFAULT 'pilgrimage',
    -- 'pilgrimage'|'migration'|'mission'|'trade'|'exile'|'conquest'|
    -- 'manuscript'|'reform'|'colonial_expansion'|'other'
  from_location_id TEXT,
  to_location_id  TEXT,
  waypoints_json  TEXT,                           -- JSON [location_id]
  period_label    TEXT,
  tradition_id    TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (map_layer_id)      REFERENCES wv_map_layers(id),
  FOREIGN KEY (from_location_id)  REFERENCES wv_locations(id),
  FOREIGN KEY (to_location_id)    REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_rs_layer ON wv_route_segments(map_layer_id);

-- § 6.4  Location role links (how a location functions in context)
CREATE TABLE IF NOT EXISTS wv_location_role_links (
  id            TEXT PRIMARY KEY,
  location_id   TEXT NOT NULL,
  role          TEXT NOT NULL,
    -- 'temple_city'|'scholarly_center'|'court_seat'|'reform_node'|
    -- 'frontier'|'diaspora_site'|'missionary_hub'|'pilgrimage'|'other'
  tradition_id  TEXT,
  period_id     TEXT,
  institution_id TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id)   REFERENCES wv_locations(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (institution_id) REFERENCES wv_institutions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_lrl_loc  ON wv_location_role_links(location_id);
CREATE INDEX IF NOT EXISTS idx_wv_lrl_trad ON wv_location_role_links(tradition_id);

-- § 6.5  Geo-timeline links (geographies across periods or events)
CREATE TABLE IF NOT EXISTS wv_geo_timeline_links (
  id            TEXT PRIMARY KEY,
  location_id   TEXT NOT NULL,
  entity_type   TEXT NOT NULL, -- 'period'|'event'|'movement'|'tradition'
  entity_id     TEXT NOT NULL,
  role          TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_gtl_loc ON wv_geo_timeline_links(location_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 6C — CENTURY TIMELINES AND GEOCULTURAL ZONES
-- ─────────────────────────────────────────────────────────────────────────────

-- § 6C.1  Century profiles (17th–21st century summary rows)
CREATE TABLE IF NOT EXISTS wv_century_profiles (
  id              TEXT PRIMARY KEY,
  century         INTEGER NOT NULL UNIQUE,        -- e.g. 17, 18, 19, 20, 21
  label           TEXT NOT NULL,                  -- e.g. '17th Century CE'
  dominant_transitions TEXT,                      -- JSON [string]
  dominant_crises TEXT,                           -- JSON [string]
  key_regions     TEXT,                           -- JSON [region_id]
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO wv_century_profiles (id, century, label) VALUES
  ('01CENT0000000000000000017', 17, '17th Century CE'),
  ('01CENT0000000000000000018', 18, '18th Century CE'),
  ('01CENT0000000000000000019', 19, '19th Century CE'),
  ('01CENT0000000000000000020', 20, '20th Century CE'),
  ('01CENT0000000000000000021', 21, '21st Century CE');

-- § 6C.2  Transition sequences (ordered chains of civilizational/moral shifts)
CREATE TABLE IF NOT EXISTS wv_transition_sequences (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  from_regime     TEXT,                           -- epistemic/moral regime being left
  to_regime       TEXT,                           -- regime being entered
  century_from    INTEGER,
  century_to      INTEGER,
  steps_json      TEXT,                           -- JSON [{step, description, key_actors}]
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 6C.3  Thinker period links (person → century + transition)
CREATE TABLE IF NOT EXISTS wv_thinker_period_links (
  id                  TEXT PRIMARY KEY,
  person_id           TEXT NOT NULL,
  century_profile_id  TEXT,
  period_id           TEXT,
  transition_id       TEXT,
  role                TEXT,  -- 'founder'|'critic'|'synthesizer'|'popularizer'|'challenger'
  note                TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (person_id)          REFERENCES wv_people(id),
  FOREIGN KEY (century_profile_id) REFERENCES wv_century_profiles(id),
  FOREIGN KEY (period_id)          REFERENCES wv_periods(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_tpl_person ON wv_thinker_period_links(person_id);

-- § 6C.4  Geocultural zones (Atlantic world, Ottoman sphere, colonial India, etc.)
CREATE TABLE IF NOT EXISTS wv_geocultural_zones (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  zone_type       TEXT NOT NULL DEFAULT 'civilizational',
    -- 'civilizational'|'colonial'|'diaspora'|'trade'|'ideological'|'other'
  parent_region_id TEXT,
  period_range    TEXT,
  description_md  TEXT,
  bounding_json   TEXT,                           -- GeoJSON
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_region_id) REFERENCES wv_regions(id)
);

-- § 6C.5  Route layers (reusable route layers for empire, trade, mission)
CREATE TABLE IF NOT EXISTS wv_route_layers (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  route_category  TEXT NOT NULL DEFAULT 'trade',
    -- 'empire'|'trade'|'mission'|'translation'|'migration'|'media'|'reform'
  period_range    TEXT,
  tradition_id    TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 6C.6  Route features (concrete route points, corridors, ports, capitals)
CREATE TABLE IF NOT EXISTS wv_route_features (
  id              TEXT PRIMARY KEY,
  route_layer_id  TEXT NOT NULL,
  feature_type    TEXT NOT NULL DEFAULT 'waypoint',
    -- 'waypoint'|'corridor'|'port'|'capital'|'seminary'|'hub'|'terminus'
  title           TEXT,
  location_id     TEXT,
  latitude        REAL,
  longitude       REAL,
  sequence_order  INTEGER,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (route_layer_id) REFERENCES wv_route_layers(id),
  FOREIGN KEY (location_id)    REFERENCES wv_locations(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_rf_layer ON wv_route_features(route_layer_id);

-- § 6C.7  Expansion maps (colonial spread, institutional spread, reform circulation)
CREATE TABLE IF NOT EXISTS wv_expansion_maps (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  map_type        TEXT NOT NULL DEFAULT 'colonial',
    -- 'colonial'|'institutional'|'missionary'|'reform'|'intellectual'|'other'
  tradition_id    TEXT,
  colonial_project_id TEXT,
  period_range    TEXT,
  description_md  TEXT,
  map_features_json TEXT,                         -- JSON [{location_id, role, label}]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)         REFERENCES wv_traditions(id),
  FOREIGN KEY (colonial_project_id)  REFERENCES wv_colonial_projects(id)
);

-- § 6C.8  Timeline events (event rows optimized for long-range timeline assembly)
CREATE TABLE IF NOT EXISTS wv_timeline_events (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  event_type      TEXT NOT NULL DEFAULT 'historical',
    -- 'historical'|'intellectual'|'political'|'religious'|'civilizational'|
    -- 'colonial'|'modern'|'other'
  year_exact      INTEGER,
  year_start      INTEGER,
  year_end        INTEGER,
  is_approximate  INTEGER NOT NULL DEFAULT 0,
  century         INTEGER,
  location_id     TEXT,
  tradition_id    TEXT,
  person_id       TEXT,
  wv_event_id     TEXT,                           -- link to wv_events if exists
  description_md  TEXT,
  significance    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id)  REFERENCES wv_locations(id),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (person_id)    REFERENCES wv_people(id),
  FOREIGN KEY (wv_event_id)  REFERENCES wv_events(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_te_year ON wv_timeline_events(year_exact, year_start);
CREATE INDEX IF NOT EXISTS idx_wv_te_cent ON wv_timeline_events(century);
CREATE INDEX IF NOT EXISTS idx_wv_te_trad ON wv_timeline_events(tradition_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 7 — GRAPH-NATIVE LAYER
-- ─────────────────────────────────────────────────────────────────────────────

-- § 7.1  Nodes (concepts, claims, actors, events, institutions, evidences)
CREATE TABLE IF NOT EXISTS wv_nodes (
  id              TEXT PRIMARY KEY,
  node_type       TEXT NOT NULL DEFAULT 'concept',
    -- 'concept'|'claim'|'claim_cluster'|'actor'|'event'|'institution'|
    -- 'evidence'|'theme'|'tafsir_view'|'anchor'|'other'
  title           TEXT NOT NULL,
  summary         TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  data_json       TEXT,                           -- arbitrary extra payload
  canonical_ref   TEXT,                           -- typed ref to source row
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_nd_type ON wv_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_wv_nd_trad ON wv_nodes(tradition_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_nodes_fts USING fts5(
  title, summary, content='wv_nodes', content_rowid='rowid'
);

-- § 7.2  Node edges (typed relations between nodes)
CREATE TABLE IF NOT EXISTS wv_node_edges (
  id              TEXT PRIMARY KEY,
  from_node_id    TEXT NOT NULL,
  to_node_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL DEFAULT 'related_to',
    -- 'supports'|'contradicts'|'mentions'|'related_to'|'part_of'|'derived_from'|
    -- 'feeds_output'|'questions'|'cites'|'about'|'illustrates'|'defines'|
    -- 'parallels'|'sequence'|'leads_to'|'resolves'|'echoes'|'contrasts_with'|
    -- 'completes'|'dovetails_with'|'center_of'|'framed_by'|'mirrors'|
    -- 'anticipates'|'fulfilled_by'|'reforms'|'institutionalizes'|'localizes'|'other'
  note            TEXT,
  weight          REAL NOT NULL DEFAULT 1.0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_node_id) REFERENCES wv_nodes(id),
  FOREIGN KEY (to_node_id)   REFERENCES wv_nodes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ne_from ON wv_node_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_wv_ne_to   ON wv_node_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_wv_ne_rel  ON wv_node_edges(relation_type);

-- § 7.3  Clusters (named node groupings distinct from generic payloads)
CREATE TABLE IF NOT EXISTS wv_clusters (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  cluster_type    TEXT NOT NULL DEFAULT 'thematic',
    -- 'thematic'|'tradition'|'moral'|'historical'|'geographic'|'argument'|'other'
  description_md  TEXT,
  tradition_id    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 7.4  Cluster members (nodes, claims, events, institutions in clusters)
CREATE TABLE IF NOT EXISTS wv_cluster_members (
  id            TEXT PRIMARY KEY,
  cluster_id    TEXT NOT NULL,
  entity_type   TEXT NOT NULL, -- 'node'|'claim'|'event'|'person'|'institution'|'contribution'
  entity_id     TEXT NOT NULL,
  role          TEXT,          -- 'center'|'supporting'|'peripheral'|'contrast'
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cluster_id) REFERENCES wv_clusters(id),
  UNIQUE (cluster_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cm_cluster ON wv_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_wv_cm_entity  ON wv_cluster_members(entity_type, entity_id);

-- § 7.5  Graph projections (saved graph builds from canonical rows)
CREATE TABLE IF NOT EXISTS wv_graph_projections (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  projection_type TEXT NOT NULL DEFAULT 'thematic',
    -- 'thematic'|'tradition'|'person'|'moral_axis'|'event'|'comparison'|'other'
  root_entity     TEXT,                           -- typed ref to seed entity
  filter_json     TEXT,                           -- query filter used to build
  node_ids_json   TEXT,                           -- JSON [node_id]
  edge_ids_json   TEXT,                           -- JSON [node_edge_id]
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 7.6  Graph views (user-facing layout and renderer configs)
CREATE TABLE IF NOT EXISTS wv_graph_views (
  id              TEXT PRIMARY KEY,
  projection_id   TEXT NOT NULL,
  title           TEXT NOT NULL,
  layout_type     TEXT NOT NULL DEFAULT 'force',
    -- 'force'|'hierarchical'|'radial'|'timeline'|'constellation'|'debate_tree'|'other'
  renderer_hint   TEXT,
  filter_json     TEXT,
  viewport_json   TEXT,                           -- saved camera/zoom state
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (projection_id) REFERENCES wv_graph_projections(id)
);

-- § 7.7  Node scope links (back-links from nodes to canonical rows)
CREATE TABLE IF NOT EXISTS wv_node_scope_links (
  id            TEXT PRIMARY KEY,
  node_id       TEXT NOT NULL,
  scope_type    TEXT NOT NULL, -- 'claim'|'event'|'institution'|'corpus_unit'|'external'
  scope_ref     TEXT NOT NULL, -- typed ref or local ID
  link_role     TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_nsl_node  ON wv_node_scope_links(node_id);
CREATE INDEX IF NOT EXISTS idx_wv_nsl_scope ON wv_node_scope_links(scope_type, scope_ref);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 8 — COMPARISON MATRICES AND MORAL CARTOGRAPHY
-- ─────────────────────────────────────────────────────────────────────────────

-- § 8.1  Comparisons (high-level comparison objects)
CREATE TABLE IF NOT EXISTS wv_comparisons (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  comparison_type TEXT NOT NULL DEFAULT 'tradition',
    -- 'tradition'|'school'|'period'|'person'|'text'|'institution'|'practice'|'other'
  description_md  TEXT,
  template_id     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_comparisons_fts USING fts5(
  title, description_md, content='wv_comparisons', content_rowid='rowid'
);

-- § 8.2  Comparison axes (covenant, sacrifice, law, mercy, authority)
CREATE TABLE IF NOT EXISTS wv_comparison_axes (
  id              TEXT PRIMARY KEY,
  comparison_id   TEXT NOT NULL,
  moral_axis_id   TEXT,
  axis_label      TEXT NOT NULL,
  axis_description TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (comparison_id) REFERENCES wv_comparisons(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cax_comp ON wv_comparison_axes(comparison_id);

-- § 8.3  Comparison rows (compared entities: traditions, schools, thinkers)
CREATE TABLE IF NOT EXISTS wv_comparison_rows (
  id              TEXT PRIMARY KEY,
  comparison_id   TEXT NOT NULL,
  entity_type     TEXT NOT NULL,  -- 'tradition'|'school'|'person'|'period'|'text'
  entity_id       TEXT NOT NULL,
  row_label       TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (comparison_id) REFERENCES wv_comparisons(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cr_comp ON wv_comparison_rows(comparison_id);

-- § 8.4  Comparison cells (cell-level summary, stance, evidence payload)
CREATE TABLE IF NOT EXISTS wv_comparison_cells (
  id              TEXT PRIMARY KEY,
  comparison_id   TEXT NOT NULL,
  row_id          TEXT NOT NULL,
  axis_id         TEXT NOT NULL,
  cell_text       TEXT,
  stance          TEXT,                           -- 'affirms'|'denies'|'nuances'|'absent'|'contested'
  evidence_ids    TEXT,                           -- JSON [evidence_item_id]
  tension_note    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (comparison_id) REFERENCES wv_comparisons(id),
  FOREIGN KEY (row_id)        REFERENCES wv_comparison_rows(id),
  FOREIGN KEY (axis_id)       REFERENCES wv_comparison_axes(id),
  UNIQUE (row_id, axis_id)
);
CREATE INDEX IF NOT EXISTS idx_wv_cc2_comp ON wv_comparison_cells(comparison_id);
CREATE INDEX IF NOT EXISTS idx_wv_cc2_row  ON wv_comparison_cells(row_id);

-- § 8.5  Comparison templates (reusable comparison skeletons)
CREATE TABLE IF NOT EXISTS wv_comparison_templates (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  axes_json       TEXT NOT NULL,                  -- JSON [{label, moral_axis_slug}]
  row_types       TEXT NOT NULL,                  -- JSON [entity_type strings]
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 8.6  Moral arc views (timeline-like views of how moral question develops)
CREATE TABLE IF NOT EXISTS wv_moral_arc_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  moral_axis_id   TEXT,
  tradition_id    TEXT,
  century_from    INTEGER,
  century_to      INTEGER,
  arc_steps_json  TEXT,                           -- JSON [{century, label, claim_ids, person_ids}]
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_mav_axis ON wv_moral_arc_views(moral_axis_id);

-- § 8.7  Civilizational matrices (what streams contributed, contested, institutionalized)
CREATE TABLE IF NOT EXISTS wv_civilizational_matrices (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  streams_json    TEXT,                           -- JSON [modernity_stream_id | tradition_id]
  axes_json       TEXT,                           -- JSON [moral_axis_id]
  cells_json      TEXT,                           -- JSON matrix
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 8.8  Prophetic exemplars (canonical exemplars and virtues they embody)
CREATE TABLE IF NOT EXISTS wv_prophetic_exemplars (
  id              TEXT PRIMARY KEY,
  person_id       TEXT NOT NULL,
  tradition_id    TEXT,
  prophetic_model_id TEXT,
  virtues_embodied TEXT,                          -- JSON [virtue_profile_id]
  key_episodes    TEXT,                           -- JSON [prophetic_episode_id]
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (person_id)           REFERENCES wv_people(id),
  FOREIGN KEY (tradition_id)        REFERENCES wv_traditions(id),
  FOREIGN KEY (prophetic_model_id)  REFERENCES wv_prophetic_models(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_pex_person ON wv_prophetic_exemplars(person_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 9 — DIAGRAMS, TIMELINES, AND OUTPUT ARTIFACTS
-- ─────────────────────────────────────────────────────────────────────────────

-- § 9.1  Timeline views (saved timeline configurations)
CREATE TABLE IF NOT EXISTS wv_timeline_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  timeline_theme  TEXT NOT NULL DEFAULT 'general',
    -- 'general'|'moral_development'|'secularization'|'psychology'|
    -- 'coloniality'|'identity'|'prophetic'|'abrahamic_morality'|'other'
  tradition_id    TEXT,
  century_from    INTEGER,
  century_to      INTEGER,
  filter_json     TEXT,                           -- event_type, tradition, moral_axis filters
  event_ids_json  TEXT,                           -- JSON [timeline_event_id]
  renderer_hint   TEXT,                           -- 'layered'|'vertical'|'gantt'|'scrolling'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id)
);

-- § 9.2  Diagram specs (reusable diagram definitions)
CREATE TABLE IF NOT EXISTS wv_diagram_specs (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  diagram_type    TEXT NOT NULL DEFAULT 'graph',
    -- 'graph'|'matrix'|'flow'|'map'|'timeline'|'tree'|'constellation'|
    -- 'heatmap'|'debate_tree'|'moral_flow'|'other'
  scope_rule      TEXT,                           -- how to select data
  selection_json  TEXT,                           -- explicit ids or filter
  layout_rule     TEXT,
  renderer_hint   TEXT,
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 9.3  Diagram instances (saved / rendered diagram instances)
CREATE TABLE IF NOT EXISTS wv_diagram_instances (
  id              TEXT PRIMARY KEY,
  spec_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  render_data     TEXT,                           -- serialized D3/render state JSON
  thumbnail_url   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (spec_id) REFERENCES wv_diagram_specs(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_di_spec ON wv_diagram_instances(spec_id);

-- § 9.4  Output artifacts (cluster briefs, comparison sheets, map exports)
CREATE TABLE IF NOT EXISTS wv_output_artifacts (
  id              TEXT PRIMARY KEY,
  artifact_type   TEXT NOT NULL DEFAULT 'cluster_brief',
    -- 'cluster_brief'|'comparison_sheet'|'map_export'|'study_packet'|
    -- 'explainer'|'timeline_export'|'diagram_export'|'other'
  title           TEXT NOT NULL,
  source_spec     TEXT,                           -- typed ref to diagram/comparison/cluster
  cm_doc_ref      TEXT,                           -- 'CM:<doc_id>' if exported to km_content
  content_json    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft'|'ready'|'exported'
  core_user_ref   TEXT,                           -- 'CORE:<user_id>'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_oa_type   ON wv_output_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_wv_oa_status ON wv_output_artifacts(status);

-- § 9.5  Renderer presets (D3/UI renderer hints)
CREATE TABLE IF NOT EXISTS wv_renderer_presets (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  renderer_type   TEXT NOT NULL DEFAULT 'graph',
    -- 'graph'|'constellation'|'debate_tree'|'moral_flow'|'layered_timeline'|'other'
  config_json     TEXT NOT NULL,
  description     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 9.6  Storyline specs (narrative sequences for guided explainers)
CREATE TABLE IF NOT EXISTS wv_storyline_specs (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  topic_id        TEXT,
  steps_json      TEXT NOT NULL,                  -- JSON [{step, type, entity_ref, narration}]
  description_md  TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 9B — DIAGRAM-NATIVE OUTPUTS FOR MODERNITY + ABRAHAMIC COMPARISON
-- ─────────────────────────────────────────────────────────────────────────────

-- § 9B.1  Abrahamic morality matrices (structured comparison: covenant, sacrifice, law)
CREATE TABLE IF NOT EXISTS wv_abrahamic_morality_matrices (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  axes_json       TEXT NOT NULL,                  -- JSON [moral_axis_id]
  traditions_json TEXT NOT NULL,                  -- JSON [tradition_id]
  cells_json      TEXT,                           -- JSON matrix payload
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- § 9B.2  Replacement bedrock views (how modern orders replace sacred foundations)
CREATE TABLE IF NOT EXISTS wv_replacement_bedrock_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  abrahamic_foundation TEXT NOT NULL,             -- what is being replaced
  stream_id       TEXT,
  replacement_mechanism TEXT,
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (stream_id)       REFERENCES wv_modernity_streams(id),
  FOREIGN KEY (diagram_spec_id) REFERENCES wv_diagram_specs(id)
);

-- § 9B.3  Moral civilization maps (tie moral institutions to real places)
CREATE TABLE IF NOT EXISTS wv_moral_civilization_maps (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT,
  period_id       TEXT,
  institution_types TEXT,                         -- JSON [institution_type]
  map_layer_id    TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (map_layer_id) REFERENCES wv_map_layers(id)
);

-- § 9B.4  Propaganda flow maps (trace narrative production to public imagination)
CREATE TABLE IF NOT EXISTS wv_propaganda_flow_maps (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  propaganda_system_id TEXT,
  media_regime_id TEXT,
  flow_steps_json TEXT,                           -- JSON [{step, agent, channel, target}]
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (propaganda_system_id) REFERENCES wv_propaganda_systems(id),
  FOREIGN KEY (media_regime_id)      REFERENCES wv_media_regimes(id)
);

-- § 9B.5  Orientalism image chains (how stereotypes are produced and circulated)
CREATE TABLE IF NOT EXISTS wv_orientalism_image_chains (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  orientalist_frame_id TEXT,
  chain_steps_json TEXT,                          -- JSON [{step, producer, medium, audience}]
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (orientalist_frame_id) REFERENCES wv_orientalist_frames(id)
);

-- § 9B.6  Exemplar case timelines (prophetic/saintly case timelines across traditions)
CREATE TABLE IF NOT EXISTS wv_exemplar_case_timelines (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  case_ids_json   TEXT NOT NULL,                  -- JSON [exemplar_case_id]
  tradition_ids   TEXT,                           -- JSON [tradition_id]
  timeline_view_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (timeline_view_id) REFERENCES wv_timeline_views(id)
);

-- § 9B.7  Discernment diagram views (tradition-specific deception/inversion views)
CREATE TABLE IF NOT EXISTS wv_discernment_diagram_views (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  tradition_id    TEXT NOT NULL,
  adversarial_pattern_ids TEXT,                   -- JSON [adversarial_pattern_id]
  moral_inversion_ids TEXT,                       -- JSON [moral_inversion_pattern_id]
  counterfeit_ids TEXT,                           -- JSON [counterfeit_redemption_claim_id]
  diagram_spec_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id)    REFERENCES wv_traditions(id),
  FOREIGN KEY (diagram_spec_id) REFERENCES wv_diagram_specs(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 10 — NOTES, DISTILLATION, AND APPROVAL WORKFLOW
-- ─────────────────────────────────────────────────────────────────────────────

-- § 10.1  Highlights (anchored reading highlights)
CREATE TABLE IF NOT EXISTS wv_highlights (
  id              TEXT PRIMARY KEY,
  source_id       TEXT,
  source_unit_id  TEXT,
  corpus_unit_id  TEXT,
  locator         TEXT,                           -- page, verse, timestamp
  text_excerpt    TEXT NOT NULL,
  note            TEXT,
  highlight_type  TEXT NOT NULL DEFAULT 'general',
    -- 'general'|'key_claim'|'evidence'|'question'|'contradiction'|'insight'
  color           TEXT,
  moral_axis_id   TEXT,
  topic_id        TEXT,
  core_user_ref   TEXT NOT NULL,                  -- 'CORE:<user_id>'
  core_ws_ref     TEXT,                           -- 'CORE:<workspace_id>'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id),
  FOREIGN KEY (moral_axis_id)  REFERENCES wv_moral_axes(id),
  FOREIGN KEY (topic_id)       REFERENCES wv_topics(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_hl_source   ON wv_highlights(source_id);
CREATE INDEX IF NOT EXISTS idx_wv_hl_user     ON wv_highlights(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_wv_hl_axis     ON wv_highlights(moral_axis_id);

-- § 10.2  Notes (human notes, seeds, summaries, questions, reflections)
CREATE TABLE IF NOT EXISTS wv_notes (
  id              TEXT PRIMARY KEY,
  note_type       TEXT NOT NULL DEFAULT 'reflection',
    -- 'reflection'|'summary'|'question'|'seed'|'critique'|'connection'|'other'
  title           TEXT,
  body_md         TEXT NOT NULL,
  tradition_id    TEXT,
  topic_id        TEXT,
  moral_axis_id   TEXT,
  core_user_ref   TEXT NOT NULL,                  -- 'CORE:<user_id>'
  core_ws_ref     TEXT,
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tradition_id) REFERENCES wv_traditions(id),
  FOREIGN KEY (topic_id)     REFERENCES wv_topics(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_nt_user  ON wv_notes(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_wv_nt_topic ON wv_notes(topic_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_notes_fts USING fts5(
  title, body_md, content='wv_notes', content_rowid='rowid'
);

-- § 10.3  Note relations (notes → claims, topics, people, events, outputs)
CREATE TABLE IF NOT EXISTS wv_note_relations (
  id            TEXT PRIMARY KEY,
  note_id       TEXT NOT NULL,
  target_type   TEXT NOT NULL,
    -- 'claim'|'topic'|'person'|'event'|'evidence'|'node'|'comparison'|
    -- 'prophetic_episode'|'contribution'|'output_artifact'|'other'
  target_id     TEXT NOT NULL,
  relation_role TEXT,                             -- 'about'|'supports'|'questions'|'other'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES wv_notes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_nr_note   ON wv_note_relations(note_id);
CREATE INDEX IF NOT EXISTS idx_wv_nr_target ON wv_note_relations(target_type, target_id);

-- § 10.4  Brainstorm sessions (loose ideation and research capture)
CREATE TABLE IF NOT EXISTS wv_brainstorm_sessions (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  topic_id        TEXT,
  tradition_id    TEXT,
  moral_axis_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'active'|'paused'|'complete'|'archived'
  body_md         TEXT,
  tags_json       TEXT,                           -- JSON [string]
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id)      REFERENCES wv_topics(id),
  FOREIGN KEY (tradition_id)  REFERENCES wv_traditions(id),
  FOREIGN KEY (moral_axis_id) REFERENCES wv_moral_axes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_bs_user   ON wv_brainstorm_sessions(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_wv_bs_topic  ON wv_brainstorm_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_wv_bs_status ON wv_brainstorm_sessions(status);

-- § 10.5  Distill batches (batch processing of notes, highlights, AI suggestions)
CREATE TABLE IF NOT EXISTS wv_distill_batches (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  batch_type      TEXT NOT NULL DEFAULT 'manual',
    -- 'manual'|'ai_extraction'|'auto_cluster'|'review_run'
  source_id       TEXT,                           -- optional: source being distilled
  status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending'|'running'|'complete'|'failed'
  item_count      INTEGER NOT NULL DEFAULT 0,
  approved_count  INTEGER NOT NULL DEFAULT 0,
  rejected_count  INTEGER NOT NULL DEFAULT 0,
  core_user_ref   TEXT,
  core_ws_ref     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES wv_sources(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_db_status ON wv_distill_batches(status);
CREATE INDEX IF NOT EXISTS idx_wv_db_source ON wv_distill_batches(source_id);

-- § 10.6  Distill items (per-item workflow rows in a batch)
CREATE TABLE IF NOT EXISTS wv_distill_items (
  id              TEXT PRIMARY KEY,
  batch_id        TEXT NOT NULL,
  item_type       TEXT NOT NULL DEFAULT 'insight',
    -- 'insight'|'claim'|'node'|'evidence'|'question'|'connection'|'other'
  source_note_id  TEXT,
  source_highlight_id TEXT,
  content_md      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending'|'approved'|'edited'|'rejected'|'saved'
  approved_as_type TEXT,                          -- what entity was created
  approved_as_id   TEXT,                          -- id of created entity
  core_user_ref   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_di2_batch  ON wv_distill_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_wv_di2_status ON wv_distill_items(status);

-- § 10.7  Insight suggestions (AI-proposed claims, nodes, evidence, maps, diagrams)
CREATE TABLE IF NOT EXISTS wv_insight_suggestions (
  id              TEXT PRIMARY KEY,
  batch_id        TEXT,
  source_chunk_ref TEXT,                          -- 'AL:<chunk_id>' or 'WV:<source_id>'
  suggestion_type TEXT NOT NULL DEFAULT 'node',
    -- 'node'|'edge'|'claim'|'evidence'|'cluster'|'map'|'diagram'|'other'
  payload_json    TEXT NOT NULL,                  -- full proposed entity payload
  confidence      REAL,
  model_used      TEXT,
  status          TEXT NOT NULL DEFAULT 'suggested',
    -- 'suggested'|'approved'|'edited'|'rejected'|'saved'
  target_table    TEXT,                           -- where it will be written on approval
  target_id       TEXT,                           -- set after approval/write
  core_user_ref   TEXT,                           -- who reviewed
  reviewed_at     TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_is_status ON wv_insight_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_wv_is_batch  ON wv_insight_suggestions(batch_id);
CREATE INDEX IF NOT EXISTS idx_wv_is_type   ON wv_insight_suggestions(suggestion_type);

-- § 10.8  Insight decisions (approve / reject / edit audit log)
CREATE TABLE IF NOT EXISTS wv_insight_decisions (
  id              TEXT PRIMARY KEY,
  suggestion_id   TEXT NOT NULL,
  decision        TEXT NOT NULL,                  -- 'approved'|'edited'|'rejected'
  original_json   TEXT,                           -- snapshot before edit
  final_json      TEXT,                           -- final payload applied
  decision_note   TEXT,
  core_user_ref   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (suggestion_id) REFERENCES wv_insight_suggestions(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_id_suggestion ON wv_insight_decisions(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_wv_id_user       ON wv_insight_decisions(core_user_ref);

-- § 10.9  Doc links (typed links out to shared authored artifacts in km_content)
CREATE TABLE IF NOT EXISTS wv_doc_links (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL,
    -- 'tradition'|'person'|'source'|'claim'|'node'|'comparison'|
    -- 'contribution'|'exemplar_case'|'brainstorm'|'diagram_spec'|'other'
  entity_id       TEXT NOT NULL,
  cm_doc_ref      TEXT NOT NULL,                  -- 'CM:<doc_id>'
  link_role       TEXT NOT NULL DEFAULT 'related',
    -- 'related'|'explainer'|'evidence'|'export'|'study_packet'
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_dl_entity ON wv_doc_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wv_dl_doc    ON wv_doc_links(cm_doc_ref);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER LB — CROSS-MODULE BRIDGES (TYPED REFS — NO SQL FK ACROSS DBS)
-- ─────────────────────────────────────────────────────────────────────────────

-- § LB.1  Node ↔ Quran scope links (WV → QR)
CREATE TABLE IF NOT EXISTS wv_node_quran_links (
  id              TEXT PRIMARY KEY,
  node_id         TEXT NOT NULL,
  qr_scope_ref    TEXT NOT NULL,                  -- 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  link_type       TEXT NOT NULL DEFAULT 'illustrates',
    -- 'illustrates'|'cites'|'grounds'|'questions'|'parallels'|'other'
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_nql_node ON wv_node_quran_links(node_id);
CREATE INDEX IF NOT EXISTS idx_wv_nql_qr   ON wv_node_quran_links(qr_scope_ref);

-- § LB.2  WV ↔ Arabic linguistic term links (WV → AL)
CREATE TABLE IF NOT EXISTS wv_term_links (
  id              TEXT PRIMARY KEY,
  entity_type     TEXT NOT NULL,  -- 'node'|'claim'|'moral_axis'|'topic'|'virtue'|'other'
  entity_id       TEXT NOT NULL,
  al_concept_ref  TEXT NOT NULL,  -- 'AL:<lemma_id>'
  link_type       TEXT NOT NULL DEFAULT 'key_term',
    -- 'key_term'|'definition'|'semantic_pivot'|'etymological'|'rhetorical'
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_tl_entity ON wv_term_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wv_tl_al     ON wv_term_links(al_concept_ref);

-- § LB.3  Prophetic episode ↔ QR scope
CREATE TABLE IF NOT EXISTS wv_episode_quran_links (
  id              TEXT PRIMARY KEY,
  episode_id      TEXT NOT NULL,
  qr_scope_ref    TEXT NOT NULL,                  -- 'QR:<surah>:<ayah_from>[-<ayah_to>]'
  link_type       TEXT NOT NULL DEFAULT 'narrates',
    -- 'narrates'|'alludes_to'|'cites'|'grounds'|'parallels'|'other'
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_id) REFERENCES wv_prophetic_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_wv_eql_ep ON wv_episode_quran_links(episode_id);
CREATE INDEX IF NOT EXISTS idx_wv_eql_qr ON wv_episode_quran_links(qr_scope_ref);

-- § LB.4  Evidence items ↔ QR / AL / CM (stored inline on evidence_items already,
--         this table captures multi-target evidence links for a single evidence row)
CREATE TABLE IF NOT EXISTS wv_evidence_scope_links (
  id              TEXT PRIMARY KEY,
  evidence_id     TEXT NOT NULL,
  scope_module    TEXT NOT NULL, -- 'QR'|'AL'|'AR'|'CM'|'PL'
  scope_ref       TEXT NOT NULL, -- typed ref
  link_role       TEXT NOT NULL DEFAULT 'reference',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (evidence_id) REFERENCES wv_evidence_items(id),
  UNIQUE (evidence_id, scope_ref)
);
CREATE INDEX IF NOT EXISTS idx_wv_esl_evidence ON wv_evidence_scope_links(evidence_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ SUPPLEMENTARY — AI PIPELINE SUPPORT
-- ─────────────────────────────────────────────────────────────────────────────

-- § S.1  Source chunks (text chunks for embedding pipeline)
CREATE TABLE IF NOT EXISTS wv_source_chunks (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  source_unit_id  TEXT,
  chunk_index     INTEGER NOT NULL,
  heading_norm    TEXT,
  page_no         INTEGER,
  char_start      INTEGER,
  char_end        INTEGER,
  token_count     INTEGER,
  text_content    TEXT NOT NULL,
  chunk_kind      TEXT,
    -- 'theology'|'moral'|'legal'|'historical'|'narrative'|'comparative'|'other'
  is_embedded     INTEGER NOT NULL DEFAULT 0,
  qdrant_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id),
  UNIQUE (source_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_wv_sc_source   ON wv_source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_wv_sc_embedded ON wv_source_chunks(is_embedded);
CREATE INDEX IF NOT EXISTS idx_wv_sc_kind     ON wv_source_chunks(source_id, chunk_kind);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_source_chunks_fts USING fts5(
  heading_norm, text_content,
  content='wv_source_chunks', content_rowid='rowid'
);
