--------------------------------------------------------------------------------
-- CLEAN 3-LAYER schema.sql (FINAL)
-- Prefix rules:
--   Arabic:    ar_
--   Worldview: wv_
--   Planner:   sp_
--   Universal: ar_u_*
--
-- NOTE (critical): SQLite/D1 cannot compute SHA-256 in SQL.
-- Compute ALL universal IDs in app/worker:
--   id = lower(hex(sha256_utf8(canonical_input)))
--
-- Universal PK columns are TEXT(64 hex). canonical_input is UNIQUE.
--------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;


--------------------------------------------------------------------------------
-- 0) USERS / CORE
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS user_activity_logs;
DROP TABLE IF EXISTS user_state;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin', -- admin | editor | user

  settings_json JSON,
  last_seen_at  TEXT,

  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT
);

CREATE TABLE user_state (
  user_id         INTEGER PRIMARY KEY,

  current_type    TEXT,        -- ar_lesson | wv_claim | wv_content_item | wv_brainstorm | wv_library_entry
  current_id      TEXT,
  current_unit_id TEXT,

  focus_mode      TEXT,        -- reading | extracting | memorizing | writing | reviewing
  state_json      JSON,

  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_activity_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,

  event_type  TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,

  ref         TEXT,
  note        TEXT,
  event_json  JSON,

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 1) CONTAINER LAYER (Arabic sources + registry)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS ar_quran_text;
DROP TABLE IF EXISTS ar_lessons;
DROP TABLE IF EXISTS ar_docs;
DROP TABLE IF EXISTS wiki_docs;

DROP TABLE IF EXISTS ar_doc_surah_link;
DROP TABLE IF EXISTS ar_lesson_surah_link;
DROP TABLE IF EXISTS ar_containers;
DROP TABLE IF EXISTS ar_surahs;

-- Quran text (container content)
CREATE TABLE ar_quran_text (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sura            INTEGER NOT NULL,
  aya             INTEGER NOT NULL,
  surah_ayah      INTEGER NOT NULL,
  page            INTEGER,
  juz             INTEGER,
  hizb            INTEGER,
  ruku            INTEGER,
  surah_name      TEXT,
  surah_verse     TEXT,
  verse_mark      TEXT,

  text            TEXT NOT NULL,
  text_simple     TEXT NOT NULL,
  text_normalized TEXT NOT NULL,

  first_word      TEXT,
  last_word       TEXT,
  word_count      INTEGER,
  char_count      INTEGER,

  UNIQUE (surah_ayah),
  UNIQUE (sura, aya)
);

-- Lessons (Arabic stream)
CREATE TABLE ar_lessons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,

  title       TEXT NOT NULL,
  title_ar    TEXT,
  lesson_type TEXT NOT NULL,
  subtype     TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  difficulty  INTEGER,
  source      TEXT,

  lesson_json JSON NOT NULL CHECK (json_valid(lesson_json)),

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Docs (Arabic stream docs/notes/articles)
CREATE TABLE ar_docs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL,
  body_json   JSON,
  tags_json   JSON,
  status      TEXT NOT NULL DEFAULT 'published',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  parent_slug TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Wiki docs (markdown-based docs mirrored from legacy .md files)
CREATE TABLE wiki_docs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL,
  body_json   JSON,
  tags_json   JSON,
  status      TEXT NOT NULL DEFAULT 'published',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  parent_slug TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Surah registry
CREATE TABLE ar_surahs (
  surah        INTEGER PRIMARY KEY,
  name_ar      TEXT,
  name_en      TEXT,
  ayah_count   INTEGER,
  meta_json    JSON,

  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT
);

-- Container registry
CREATE TABLE ar_containers (
  id             TEXT PRIMARY KEY,
  container_type TEXT NOT NULL,
  container_key  TEXT NOT NULL,
  title          TEXT,
  meta_json      JSON,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,

  UNIQUE(container_type, container_key)
);

-- Units inside a container
CREATE TABLE ar_container_units (
  id             TEXT PRIMARY KEY,
  container_id   TEXT NOT NULL,
  unit_type      TEXT NOT NULL,
  order_index    INTEGER NOT NULL DEFAULT 0,

  ayah_from      INTEGER,
  ayah_to        INTEGER,
  start_ref      TEXT,
  end_ref        TEXT,

  text_cache     TEXT,
  meta_json      JSON,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,

  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE
);

-- Doc ↔ Surah
CREATE TABLE ar_doc_surah_link (
  doc_id   INTEGER NOT NULL,
  surah    INTEGER NOT NULL,
  note     TEXT,

  PRIMARY KEY (doc_id, surah),
  FOREIGN KEY (doc_id) REFERENCES ar_docs(id) ON DELETE CASCADE,
  FOREIGN KEY (surah)  REFERENCES ar_surahs(surah) ON DELETE CASCADE
);

-- Lesson ↔ Surah
CREATE TABLE ar_lesson_surah_link (
  lesson_id INTEGER NOT NULL,
  surah     INTEGER NOT NULL,
  note      TEXT,

  PRIMARY KEY (lesson_id, surah),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (surah)     REFERENCES ar_surahs(surah) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 2) UNIVERSAL LAYER (ar_u_*)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS ar_u_grammar;
DROP TABLE IF EXISTS ar_u_valency;
DROP TABLE IF EXISTS ar_u_lexicon;
DROP TABLE IF EXISTS ar_u_expressions;
DROP TABLE IF EXISTS ar_u_sentences;
DROP TABLE IF EXISTS ar_u_spans;
DROP TABLE IF EXISTS ar_u_tokens;
DROP TABLE IF EXISTS ar_u_roots;

CREATE TABLE ar_u_roots (
  ar_u_root        TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  root             TEXT NOT NULL,
  root_norm        TEXT NOT NULL UNIQUE,

  family            TEXT,
  arabic_trilateral TEXT,
  english_trilateral TEXT,
  root_latn         TEXT,

  alt_latn_json     JSON CHECK (alt_latn_json IS NULL OR json_valid(alt_latn_json)),
  search_keys_norm  TEXT,

  cards_json        JSON CHECK (cards_json IS NULL OR json_valid(cards_json)),
  status            TEXT NOT NULL DEFAULT 'active',
  difficulty        INTEGER,
  frequency         TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  extracted_at      TEXT,
  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json))
);

CREATE TABLE ar_u_tokens (
  ar_u_token       TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  lemma_ar         TEXT NOT NULL,
  lemma_norm       TEXT NOT NULL,
  pos              TEXT NOT NULL,

  root_norm        TEXT,
  ar_u_root        TEXT,

  features_json    JSON CHECK (features_json IS NULL OR json_valid(features_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE TABLE ar_u_spans (
  ar_u_span        TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  span_type        TEXT NOT NULL,
  token_ids_csv    TEXT NOT NULL,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE TABLE ar_u_sentences (
  ar_u_sentence    TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  sentence_kind    TEXT NOT NULL,
  sequence_json    JSON NOT NULL CHECK (json_valid(sequence_json)),

  text_ar          TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE TABLE ar_u_expressions (
  ar_u_expression  TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  label            TEXT,
  text_ar          TEXT,
  sequence_json    JSON NOT NULL CHECK (json_valid(sequence_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE TABLE ar_u_lexicon (
  ar_u_lexicon     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  lemma_ar         TEXT NOT NULL,
  lemma_norm       TEXT NOT NULL,
  pos              TEXT NOT NULL,
  root_norm        TEXT,
  ar_u_root        TEXT,

  valency_id       TEXT,
  sense_key        TEXT NOT NULL,

  gloss_primary    TEXT,
  gloss_secondary_json JSON CHECK (gloss_secondary_json IS NULL OR json_valid(gloss_secondary_json)),
  usage_notes      TEXT,

  cards_json       JSON CHECK (cards_json IS NULL OR json_valid(cards_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE TABLE ar_u_valency (
  ar_u_valency     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  verb_lemma_ar    TEXT NOT NULL,
  verb_lemma_norm  TEXT NOT NULL,

  prep_ar_u_token  TEXT NOT NULL,
  frame_type       TEXT NOT NULL,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (prep_ar_u_token) REFERENCES ar_u_tokens(ar_u_token) ON DELETE RESTRICT
);

CREATE TABLE ar_u_grammar (
  ar_u_grammar     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  grammar_id       TEXT NOT NULL UNIQUE,
  category         TEXT,
  title            TEXT,
  title_ar         TEXT,
  definition       TEXT,
  definition_ar    TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

--------------------------------------------------------------------------------
-- 3) OCCURRENCE LAYER (Arabic transactional)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS ar_token_pair_links;
DROP TABLE IF EXISTS ar_token_valency_link;
DROP TABLE IF EXISTS ar_token_lexicon_link;
DROP TABLE IF EXISTS ar_occ_grammar;
DROP TABLE IF EXISTS ar_occ_expression;
DROP TABLE IF EXISTS ar_occ_sentence;
DROP TABLE IF EXISTS ar_occ_span;
DROP TABLE IF EXISTS ar_occ_token;

CREATE TABLE ar_occ_token (
  ar_token_occ_id  TEXT PRIMARY KEY,
  user_id          INTEGER,

  container_id     TEXT NOT NULL,
  unit_id          TEXT,

  pos_index        INTEGER NOT NULL,
  surface_ar       TEXT NOT NULL,
  norm_ar          TEXT,
  lemma_ar         TEXT,
  pos              TEXT,

  ar_u_token       TEXT NOT NULL,
  ar_u_root        TEXT,

  features_json    JSON CHECK (features_json IS NULL OR json_valid(features_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)      REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_token)   REFERENCES ar_u_tokens(ar_u_token) ON DELETE RESTRICT,
  FOREIGN KEY (ar_u_root)    REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL,

  UNIQUE(container_id, unit_id, pos_index)
);

CREATE TABLE ar_occ_span (
  ar_span_occ_id   TEXT PRIMARY KEY,
  user_id          INTEGER,

  container_id     TEXT NOT NULL,
  unit_id          TEXT,

  start_index      INTEGER NOT NULL,
  end_index        INTEGER NOT NULL,
  text_cache       TEXT,

  ar_u_span        TEXT NOT NULL,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)      REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_span)    REFERENCES ar_u_spans(ar_u_span) ON DELETE RESTRICT
);

CREATE TABLE ar_occ_sentence (
  ar_sentence_occ_id TEXT PRIMARY KEY,
  user_id            INTEGER,

  container_id       TEXT NOT NULL,
  unit_id            TEXT,

  sentence_order     INTEGER,
  text_ar            TEXT,
  translation        TEXT,
  notes              TEXT,

  ar_u_sentence      TEXT NOT NULL,

  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)      REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_sentence) REFERENCES ar_u_sentences(ar_u_sentence) ON DELETE RESTRICT,

  UNIQUE(container_id, unit_id, sentence_order)
);

CREATE TABLE ar_occ_expression (
  ar_expression_occ_id TEXT PRIMARY KEY,
  user_id              INTEGER,

  container_id         TEXT NOT NULL,
  unit_id              TEXT,

  start_index          INTEGER,
  end_index            INTEGER,
  text_cache           TEXT,

  ar_u_expression      TEXT NOT NULL,

  note                 TEXT,
  meta_json            JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT,

  FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id)  REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)       REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_expression) REFERENCES ar_u_expressions(ar_u_expression) ON DELETE RESTRICT
);

CREATE TABLE ar_occ_grammar (
  id               TEXT PRIMARY KEY,
  user_id          INTEGER,

  container_id     TEXT NOT NULL,
  unit_id          TEXT,

  ar_u_grammar     TEXT NOT NULL,

  target_type      TEXT NOT NULL,
  target_id        TEXT NOT NULL,

  note             TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)      REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE RESTRICT
);

CREATE TABLE ar_token_lexicon_link (
  ar_token_occ_id  TEXT NOT NULL,
  ar_u_lexicon     TEXT NOT NULL,

  confidence       REAL,
  is_primary       INTEGER NOT NULL DEFAULT 1,
  source           TEXT,
  note             TEXT,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (ar_token_occ_id, ar_u_lexicon),
  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_lexicon)    REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE RESTRICT
);

CREATE TABLE ar_token_valency_link (
  ar_token_occ_id  TEXT NOT NULL,
  ar_u_valency     TEXT NOT NULL,

  role             TEXT,
  note             TEXT,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (ar_token_occ_id, ar_u_valency),
  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_valency)    REFERENCES ar_u_valency(ar_u_valency) ON DELETE RESTRICT
);

CREATE TABLE ar_token_pair_links (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER,

  container_id    TEXT NOT NULL,
  unit_id         TEXT,

  link_type       TEXT NOT NULL,
  from_token_occ  TEXT NOT NULL,
  to_token_occ    TEXT NOT NULL,

  ar_u_valency    TEXT,
  note            TEXT,
  meta_json       JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id)    REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)         REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (from_token_occ)  REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (to_token_occ)    REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_valency)    REFERENCES ar_u_valency(ar_u_valency) ON DELETE SET NULL
);

--------------------------------------------------------------------------------
-- 4) WORLDVIEW (wv_) + PLANNER (sp_)
-- WV knowledge tables use SHA IDs + canonical_input
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS wv_quran_relations;
DROP TABLE IF EXISTS wv_discourse_edges;
DROP TABLE IF EXISTS wv_concept_sources;
DROP TABLE IF EXISTS wv_concept_anchors;
DROP TABLE IF EXISTS wv_concepts;
DROP TABLE IF EXISTS wv_cross_references;
DROP TABLE IF EXISTS wv_content_items;
DROP TABLE IF EXISTS wv_claims;
DROP TABLE IF EXISTS wv_library_entries;
DROP TABLE IF EXISTS wv_content_library_links;
DROP TABLE IF EXISTS wv_brainstorm_sessions;

DROP TABLE IF EXISTS sp_sprint_reviews;
DROP TABLE IF EXISTS sp_weekly_tasks;
DROP TABLE IF EXISTS sp_weekly_plans;

DROP TABLE IF EXISTS ar_reviews;

CREATE TABLE wv_brainstorm_sessions (
  id             TEXT PRIMARY KEY,
  user_id        INTEGER,

  topic          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open',
  stage          TEXT NOT NULL DEFAULT 'raw',
  schema_version INTEGER NOT NULL DEFAULT 2,
  revision       INTEGER,

  session_json   JSON NOT NULL CHECK (json_valid(session_json)),

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_concepts (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  slug            TEXT NOT NULL UNIQUE,
  label_ar        TEXT,
  label_en        TEXT,
  category        TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT
);

CREATE TABLE wv_concept_anchors (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER,
  concept_id      TEXT NOT NULL,

  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,
  unit_id         TEXT,
  ref             TEXT,
  evidence        TEXT NOT NULL,
  note            TEXT,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (concept_id) REFERENCES wv_concepts(id) ON DELETE CASCADE
);

CREATE TABLE wv_concept_sources (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER,
  concept_id      TEXT NOT NULL,

  scholar_name    TEXT NOT NULL,
  work_title      TEXT NOT NULL,
  work_type       TEXT,
  publisher       TEXT,
  year            INTEGER,

  locator         TEXT,
  lens            TEXT,
  claim_summary   TEXT NOT NULL,

  quote_short     TEXT,
  url             TEXT,
  note            TEXT,
  meta_json       JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (concept_id) REFERENCES wv_concepts(id) ON DELETE CASCADE
);

CREATE TABLE wv_claims (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  claim           JSON NOT NULL CHECK (json_valid(claim)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_content_items (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER,
  title           TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',

  related_type    TEXT,
  related_id      TEXT,

  refs_json       JSON NOT NULL CHECK (json_valid(refs_json)),
  content_json    JSON NOT NULL CHECK (json_valid(content_json)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_cross_references (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER,
  status          TEXT NOT NULL DEFAULT 'active',
  ref_json        JSON NOT NULL CHECK (json_valid(ref_json)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_discourse_edges (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER,

  edge_type       TEXT NOT NULL,
  relation        TEXT NOT NULL,
  strength        REAL,

  from_type       TEXT NOT NULL,
  from_id         TEXT NOT NULL,
  from_unit       TEXT,

  to_type         TEXT NOT NULL,
  to_id           TEXT NOT NULL,
  to_unit         TEXT,

  note            TEXT,
  meta_json       JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_quran_relations (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER,
  concept_id      TEXT NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,

  relation        TEXT NOT NULL,
  quran_evidence_json JSON CHECK (quran_evidence_json IS NULL OR json_valid(quran_evidence_json)),
  note            TEXT,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (concept_id) REFERENCES wv_concepts(id) ON DELETE CASCADE
);

CREATE TABLE sp_weekly_plans (
  week_start    TEXT PRIMARY KEY,
  user_id       INTEGER,

  notes         TEXT,
  planned_count INTEGER NOT NULL DEFAULT 0,
  done_count    INTEGER NOT NULL DEFAULT 0,

  week_json     JSON NOT NULL CHECK (json_valid(week_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sp_weekly_tasks (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER,

  week_start         TEXT NOT NULL,
  title              TEXT NOT NULL,

  task_type          TEXT NOT NULL,
  kanban_state       TEXT NOT NULL DEFAULT 'backlog',
  status             TEXT NOT NULL DEFAULT 'planned',
  priority           INTEGER DEFAULT 3,
  points             REAL,
  due_date           TEXT,
  order_index        INTEGER NOT NULL DEFAULT 0,

  task_json          JSON NOT NULL CHECK (json_valid(task_json)),

  ar_lesson_id       INTEGER,
  wv_claim_id        TEXT,
  wv_content_item_id TEXT,

  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  FOREIGN KEY (user_id)            REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (week_start)         REFERENCES sp_weekly_plans(week_start) ON DELETE CASCADE,
  FOREIGN KEY (ar_lesson_id)       REFERENCES ar_lessons(id) ON DELETE SET NULL
);

CREATE TABLE sp_sprint_reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,

  period_start TEXT NOT NULL,
  period_end   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',

  review_json  JSON NOT NULL CHECK (json_valid(review_json)),

  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE ar_reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,

  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,

  rating      INTEGER,
  note        TEXT,

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

--------------------------------------------------------------------------------
-- INDEXES (minimal + useful)
--------------------------------------------------------------------------------
CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_users_role             ON users(role);
CREATE INDEX idx_user_state_current     ON user_state(current_type, current_id);
CREATE INDEX idx_user_logs_user_id      ON user_activity_logs(user_id);
CREATE INDEX idx_user_logs_type         ON user_activity_logs(event_type);
CREATE INDEX idx_user_logs_target       ON user_activity_logs(target_type, target_id);
CREATE INDEX idx_user_logs_created      ON user_activity_logs(created_at);

CREATE INDEX idx_ar_quran_text_surah_ayah ON ar_quran_text(sura, aya);
CREATE INDEX idx_ar_quran_text_page       ON ar_quran_text(page);

CREATE INDEX idx_ar_docs_slug        ON ar_docs(slug);
CREATE INDEX idx_ar_docs_status      ON ar_docs(status);
CREATE INDEX idx_ar_docs_parent      ON ar_docs(parent_slug);
CREATE INDEX idx_ar_docs_sort        ON ar_docs(sort_order);

CREATE INDEX idx_wiki_docs_slug      ON wiki_docs(slug);
CREATE INDEX idx_wiki_docs_status    ON wiki_docs(status);
CREATE INDEX idx_wiki_docs_parent    ON wiki_docs(parent_slug);
CREATE INDEX idx_wiki_docs_sort      ON wiki_docs(sort_order);

CREATE INDEX idx_ar_lessons_user_id  ON ar_lessons(user_id);
CREATE INDEX idx_ar_lessons_status   ON ar_lessons(status);
CREATE INDEX idx_ar_lessons_type     ON ar_lessons(lesson_type);

CREATE INDEX idx_ar_containers_type_key ON ar_containers(container_type, container_key);
CREATE INDEX idx_ar_units_container_order ON ar_container_units(container_id, order_index);

CREATE INDEX idx_ar_u_roots_root_norm  ON ar_u_roots(root_norm);
CREATE INDEX idx_ar_u_roots_root       ON ar_u_roots(root);
CREATE INDEX idx_ar_u_roots_root_latn  ON ar_u_roots(root_latn);
CREATE INDEX idx_ar_u_roots_status     ON ar_u_roots(status);
CREATE INDEX idx_ar_u_roots_freq       ON ar_u_roots(frequency);

CREATE INDEX idx_ar_u_tokens_lemma_norm ON ar_u_tokens(lemma_norm);
CREATE INDEX idx_ar_u_tokens_pos        ON ar_u_tokens(pos);
CREATE INDEX idx_ar_u_tokens_root_norm  ON ar_u_tokens(root_norm);
CREATE INDEX idx_ar_u_tokens_root_fk    ON ar_u_tokens(ar_u_root);

CREATE INDEX idx_ar_u_spans_type        ON ar_u_spans(span_type);
CREATE INDEX idx_ar_u_sent_kind         ON ar_u_sentences(sentence_kind);

CREATE INDEX idx_ar_u_lex_lemma_norm    ON ar_u_lexicon(lemma_norm);
CREATE INDEX idx_ar_u_lex_pos           ON ar_u_lexicon(pos);
CREATE INDEX idx_ar_u_lex_root_norm     ON ar_u_lexicon(root_norm);
CREATE INDEX idx_ar_u_lex_root_fk       ON ar_u_lexicon(ar_u_root);

CREATE INDEX idx_ar_u_valency_verb_norm ON ar_u_valency(verb_lemma_norm);
CREATE INDEX idx_ar_u_valency_prep      ON ar_u_valency(prep_ar_u_token);
CREATE INDEX idx_ar_u_valency_frame     ON ar_u_valency(frame_type);

CREATE INDEX idx_ar_u_grammar_grammar_id ON ar_u_grammar(grammar_id);

CREATE INDEX idx_ar_occ_token_container_unit ON ar_occ_token(container_id, unit_id);
CREATE INDEX idx_ar_occ_token_order          ON ar_occ_token(container_id, unit_id, pos_index);
CREATE INDEX idx_ar_occ_token_u_token        ON ar_occ_token(ar_u_token);

CREATE INDEX idx_ar_occ_span_container_unit  ON ar_occ_span(container_id, unit_id);
CREATE INDEX idx_ar_occ_span_range           ON ar_occ_span(container_id, unit_id, start_index, end_index);
CREATE INDEX idx_ar_occ_span_u_span          ON ar_occ_span(ar_u_span);

CREATE INDEX idx_ar_occ_sentence_container_unit ON ar_occ_sentence(container_id, unit_id);
CREATE INDEX idx_ar_occ_sentence_u_sent        ON ar_occ_sentence(ar_u_sentence);

CREATE INDEX idx_ar_occ_expression_container_unit ON ar_occ_expression(container_id, unit_id);
CREATE INDEX idx_ar_occ_expression_expression    ON ar_occ_expression(ar_u_expression);

CREATE INDEX idx_ar_occ_grammar_container_unit ON ar_occ_grammar(container_id, unit_id);
CREATE INDEX idx_ar_occ_grammar_u_grammar      ON ar_occ_grammar(ar_u_grammar);
CREATE INDEX idx_ar_occ_grammar_target         ON ar_occ_grammar(target_type, target_id);

CREATE INDEX idx_ar_token_lexicon_link_lex     ON ar_token_lexicon_link(ar_u_lexicon);
CREATE INDEX idx_ar_token_valency_link_val     ON ar_token_valency_link(ar_u_valency);

CREATE INDEX idx_ar_pair_links_container_unit  ON ar_token_pair_links(container_id, unit_id);
CREATE INDEX idx_ar_pair_links_type            ON ar_token_pair_links(link_type);

CREATE INDEX idx_wv_brainstorm_user_id ON wv_brainstorm_sessions(user_id);
CREATE INDEX idx_wv_brainstorm_topic   ON wv_brainstorm_sessions(topic);
CREATE INDEX idx_wv_brainstorm_status  ON wv_brainstorm_sessions(status);
CREATE INDEX idx_wv_brainstorm_stage   ON wv_brainstorm_sessions(stage);

CREATE INDEX idx_wv_concepts_slug        ON wv_concepts(slug);
CREATE INDEX idx_wv_concepts_category    ON wv_concepts(category);
CREATE INDEX idx_wv_concepts_status      ON wv_concepts(status);

CREATE INDEX idx_wv_concept_anchors_concept ON wv_concept_anchors(concept_id);
CREATE INDEX idx_wv_concept_anchors_target  ON wv_concept_anchors(target_type, target_id);
CREATE INDEX idx_wv_concept_anchors_unit    ON wv_concept_anchors(unit_id);

CREATE INDEX idx_wv_concept_sources_concept ON wv_concept_sources(concept_id);
CREATE INDEX idx_wv_concept_sources_scholar ON wv_concept_sources(scholar_name);
CREATE INDEX idx_wv_concept_sources_lens    ON wv_concept_sources(lens);

CREATE INDEX idx_wv_claims_status        ON wv_claims(status);

CREATE INDEX idx_wv_content_items_type   ON wv_content_items(content_type);
CREATE INDEX idx_wv_content_items_status ON wv_content_items(status);
CREATE INDEX idx_wv_content_items_related ON wv_content_items(related_type, related_id);

CREATE INDEX idx_wv_cross_references_status ON wv_cross_references(status);

CREATE INDEX idx_wv_discourse_edges_type     ON wv_discourse_edges(edge_type);
CREATE INDEX idx_wv_discourse_edges_relation ON wv_discourse_edges(relation);
CREATE INDEX idx_wv_discourse_edges_from     ON wv_discourse_edges(from_type, from_id);
CREATE INDEX idx_wv_discourse_edges_to       ON wv_discourse_edges(to_type, to_id);

CREATE INDEX idx_wv_quran_relations_concept  ON wv_quran_relations(concept_id);
CREATE INDEX idx_wv_quran_relations_target   ON wv_quran_relations(target_type, target_id);
CREATE INDEX idx_wv_quran_relations_relation ON wv_quran_relations(relation);

CREATE INDEX idx_sp_weekly_plans_user_id        ON sp_weekly_plans(user_id);

CREATE INDEX idx_sp_weekly_tasks_user_id        ON sp_weekly_tasks(user_id);
CREATE INDEX idx_sp_weekly_tasks_week           ON sp_weekly_tasks(week_start);
CREATE INDEX idx_sp_weekly_tasks_type           ON sp_weekly_tasks(task_type);
CREATE INDEX idx_sp_weekly_tasks_kanban_state   ON sp_weekly_tasks(kanban_state);
CREATE INDEX idx_sp_weekly_tasks_status         ON sp_weekly_tasks(status);
CREATE INDEX idx_sp_weekly_tasks_order          ON sp_weekly_tasks(week_start, kanban_state, order_index);

CREATE INDEX idx_sp_sprint_reviews_user_id      ON sp_sprint_reviews(user_id);
CREATE INDEX idx_sp_sprint_reviews_period       ON sp_sprint_reviews(period_start, period_end);
CREATE INDEX idx_sp_sprint_reviews_status       ON sp_sprint_reviews(status);

COMMIT;
