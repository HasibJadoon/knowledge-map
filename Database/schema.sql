--------------------------------------------------------------------------------
-- CLEAN 3-LAYER schema.sql (prefix rules)
--   Arabic: ar_
--   Worldview: wv_
--   Sprints/Planner: sp_
--   Universal: ar_u_*
--
-- NOTE (critical): SQLite/D1 cannot compute SHA-256 in SQL.
-- You MUST compute universal IDs in your app/worker:
--   id = lower(hex(sha256_utf8(canonical_input)))
--
-- So in schema: universal PK is TEXT (64 hex chars), canonical_input is UNIQUE.
--------------------------------------------------------------------------------



--------------------------------------------------------------------------------
-- 0) USERS / CORE (keep)
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

  current_type    TEXT,        -- ar_lesson | wv_claim | wv_content_item | brainstorm | library_entry
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
-- 1) CONTAINER LAYER (text sources)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS ar_quran_text;

CREATE TABLE ar_quran_text (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sura            INTEGER NOT NULL,
  aya             INTEGER NOT NULL,
  surah_ayah      INTEGER NOT NULL,     -- sura*1000 + aya or your existing encoding
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

DROP TABLE IF EXISTS ar_lessons;

CREATE TABLE ar_lessons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,

  title       TEXT NOT NULL,
  title_ar    TEXT,
  lesson_type TEXT NOT NULL,                 -- quran | literature | linguistics
  subtype     TEXT,
  status      TEXT NOT NULL DEFAULT 'draft', -- draft | active | published | archived
  difficulty  INTEGER,
  source      TEXT,

  lesson_json JSON NOT NULL CHECK (json_valid(lesson_json)),

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS docs;

CREATE TABLE docs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL,
  body_json   JSON,
  tags_json   JSON,
  status      TEXT NOT NULL DEFAULT 'published', -- draft|published
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  parent_slug TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

--------------------------------------------------------------------------------
-- 2) ARABIC UNIVERSAL LAYER (ar_u_*)  <-- SHA IDs
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS ar_u_grammar;
DROP TABLE IF EXISTS ar_u_valency;
DROP TABLE IF EXISTS ar_u_lexicon;
DROP TABLE IF EXISTS ar_u_sentences;
DROP TABLE IF EXISTS ar_u_spans;
DROP TABLE IF EXISTS ar_u_tokens;
DROP TABLE IF EXISTS ar_u_roots;

-- Root hashed (universal)
CREATE TABLE ar_u_roots (
  ar_u_root        TEXT PRIMARY KEY,         -- sha256 hex (64)
  canonical_input  TEXT NOT NULL UNIQUE,     -- ROOT|<root_norm>

  root             TEXT NOT NULL,            -- display root e.g. دعو
  family           TEXT,                     -- optional legacy

  arabic_trilateral   TEXT,                  -- e.g. د ع و
  english_trilateral  TEXT,                  -- e.g. d-e-w
  root_latn           TEXT,                  -- e.g. D-E-W
  root_norm           TEXT NOT NULL UNIQUE,  -- your normalized key (no tashkeel etc)

  alt_latn_json       JSON CHECK (alt_latn_json IS NULL OR json_valid(alt_latn_json)),
  search_keys_norm    TEXT,

  cards_json          JSON CHECK (cards_json IS NULL OR json_valid(cards_json)),

  status              TEXT NOT NULL DEFAULT 'active', -- active|draft|reviewed|archived
  difficulty          INTEGER,
  frequency           TEXT,                  -- high|medium|low
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,
  extracted_at        TEXT,

  meta_json           JSON CHECK (meta_json IS NULL OR json_valid(meta_json))
);

-- Token hashed (universal)
CREATE TABLE ar_u_tokens (
  ar_u_token       TEXT PRIMARY KEY,         -- sha256 hex
  canonical_input  TEXT NOT NULL UNIQUE,     -- TOK|<lemma_norm>|<pos>|<root_norm_or_empty>

  lemma_ar         TEXT NOT NULL,            -- canonical lemma (Arabic)
  lemma_norm       TEXT NOT NULL,            -- normalized lemma
  pos              TEXT NOT NULL,            -- verb|noun|adj|particle|phrase

  root_norm        TEXT,                     -- nullable for particles etc
  ar_u_root        TEXT,                     -- FK (nullable)

  features_json    JSON CHECK (features_json IS NULL OR json_valid(features_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

-- Span hashed (universal) [noun-based phrases only]
CREATE TABLE ar_u_spans (
  ar_u_span        TEXT PRIMARY KEY,         -- sha256 hex
  canonical_input  TEXT NOT NULL UNIQUE,     -- SPAN|<span_type>|<tok_uuid,tok_uuid,...>

  span_type        TEXT NOT NULL,            -- COMP_JAR_MAJRUR | COMP_IDAFI | COMP_WASFI | ...
  token_ids_csv    TEXT NOT NULL,            -- ordered ar_u_token list CSV (stable ordering)

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

-- Sentence hashed (universal)
CREATE TABLE ar_u_sentences (
  ar_u_sentence    TEXT PRIMARY KEY,         -- sha256 hex
  canonical_input  TEXT NOT NULL UNIQUE,     -- SENT|<sentence_kind>|<sequence>

  sentence_kind    TEXT NOT NULL,            -- SIMPLE|COMPLEX|CLAUSE|PHRASE_NODE (your choice)
  sequence_json    JSON NOT NULL CHECK (json_valid(sequence_json)),
  -- sequence_json example: ["T:<uuid>","S:<uuid>",...]

  text_ar          TEXT,                     -- cached display text (optional)
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

-- Lexicon hashed (universal): “shade of meaning” bundle
CREATE TABLE ar_u_lexicon (
  ar_u_lexicon     TEXT PRIMARY KEY,         -- sha256 hex
  canonical_input  TEXT NOT NULL UNIQUE,     -- LEX|<lemma_norm>|<pos>|<root_norm>|<valency_id_or_empty>|<sense_key>

  lemma_ar         TEXT NOT NULL,
  lemma_norm       TEXT NOT NULL,
  pos              TEXT NOT NULL,
  root_norm        TEXT,
  ar_u_root        TEXT,

  valency_id       TEXT,                     -- optional ar_u_valency
  sense_key        TEXT NOT NULL,            -- gloss_key / sense_key stable
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

-- Verb+prep semantic unit hashed (universal) (NOT a span)
CREATE TABLE ar_u_valency (
  ar_u_valency     TEXT PRIMARY KEY,         -- sha256 hex
  canonical_input  TEXT NOT NULL UNIQUE,     -- VAL|<verb_lemma_norm>|<prep_token_uuid>|<frame_type>

  verb_lemma_ar    TEXT NOT NULL,
  verb_lemma_norm  TEXT NOT NULL,

  prep_ar_u_token  TEXT NOT NULL,            -- token UUID for the prep particle
  frame_type       TEXT NOT NULL,            -- REQ_PREP|ALT_PREP|OPTIONAL_PREP

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (prep_ar_u_token) REFERENCES ar_u_tokens(ar_u_token) ON DELETE RESTRICT
);

-- Grammar hashed (universal)
CREATE TABLE ar_u_grammar (
  ar_u_grammar     TEXT PRIMARY KEY,         -- sha256 hex
  canonical_input  TEXT NOT NULL UNIQUE,     -- GRAM|<grammar_id>

  grammar_id       TEXT NOT NULL UNIQUE,     -- e.g. GRAM_NAHW_001 (your catalog key)
  category         TEXT,                     -- syntax|morphology|rhetoric|...
  title            TEXT,
  title_ar         TEXT,
  definition       TEXT,
  definition_ar    TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

--------------------------------------------------------------------------------
-- 3) ARABIC OCCURRENCE LAYER (transactional)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS ar_token_valency_link;
DROP TABLE IF EXISTS ar_token_lexicon_link;
DROP TABLE IF EXISTS ar_grammar_occ;
DROP TABLE IF EXISTS ar_sentence_occ;
DROP TABLE IF EXISTS ar_span_occ;
DROP TABLE IF EXISTS ar_token_occ;

-- Token occurrences inside containers (Qur'an / lesson / docs)
CREATE TABLE ar_token_occ (
  ar_token_occ_id   TEXT PRIMARY KEY,          -- random UUID ok (transactional)
  user_id           INTEGER,

  container_type    TEXT NOT NULL,             -- quran_ayah | ar_lesson | doc
  container_id      TEXT NOT NULL,             -- e.g. "12:7" OR lesson id OR doc slug
  unit_id           TEXT,                      -- optional: U_12_7 etc

  pos_index         INTEGER NOT NULL,          -- order in container unit
  surface_ar        TEXT NOT NULL,
  norm_ar           TEXT,
  lemma_ar          TEXT,
  pos               TEXT,                      -- cached; truth is in ar_u_tokens

  ar_u_token        TEXT NOT NULL,             -- universal token UUID
  ar_u_root         TEXT,                      -- optional shortcut

  features_json     JSON CHECK (features_json IS NULL OR json_valid(features_json)),

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_token) REFERENCES ar_u_tokens(ar_u_token) ON DELETE RESTRICT,
  FOREIGN KEY (ar_u_root)  REFERENCES ar_u_roots(ar_u_root)   ON DELETE SET NULL
);

-- Span occurrences (only noun-based phrase spans)
CREATE TABLE ar_span_occ (
  ar_span_occ_id    TEXT PRIMARY KEY,          -- random UUID
  user_id           INTEGER,

  container_type    TEXT NOT NULL,
  container_id      TEXT NOT NULL,
  unit_id           TEXT,

  start_index       INTEGER NOT NULL,
  end_index         INTEGER NOT NULL,          -- inclusive
  text_cache        TEXT,

  ar_u_span         TEXT NOT NULL,             -- universal span UUID

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_span) REFERENCES ar_u_spans(ar_u_span) ON DELETE RESTRICT
);

-- Sentence occurrences (tree nodes linked to container)
CREATE TABLE ar_sentence_occ (
  ar_sentence_occ_id  TEXT PRIMARY KEY,        -- random UUID
  user_id             INTEGER,

  container_type      TEXT NOT NULL,
  container_id        TEXT NOT NULL,
  unit_id             TEXT,

  sentence_order      INTEGER,                 -- within unit
  text_ar             TEXT,
  translation         TEXT,
  notes               TEXT,

  ar_u_sentence       TEXT NOT NULL,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_sentence) REFERENCES ar_u_sentences(ar_u_sentence) ON DELETE RESTRICT
);

-- Grammar occurrence attaches grammar concept to a span_occ or sentence_occ
CREATE TABLE ar_grammar_occ (
  ar_grammar_occ_id  TEXT PRIMARY KEY,         -- random UUID
  user_id            INTEGER,

  container_type     TEXT NOT NULL,
  container_id       TEXT NOT NULL,
  unit_id            TEXT,

  ar_u_grammar       TEXT NOT NULL,

  target_type        TEXT NOT NULL,            -- span|sentence|token
  target_id          TEXT NOT NULL,            -- ar_span_occ_id | ar_sentence_occ_id | ar_token_occ_id

  note               TEXT,
  meta_json          JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at         TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE RESTRICT
);

-- Token -> Lexicon universal (occurrence mapping)
CREATE TABLE ar_token_lexicon_link (
  ar_token_occ_id  TEXT NOT NULL,
  ar_u_lexicon     TEXT NOT NULL,

  confidence       REAL,
  is_primary       INTEGER NOT NULL DEFAULT 1,  -- 0/1
  source           TEXT,                         -- manual|auto|import
  note             TEXT,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (ar_token_occ_id, ar_u_lexicon),

  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_token_occ(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_lexicon)    REFERENCES ar_u_lexicon(ar_u_lexicon)     ON DELETE RESTRICT
);

-- Token -> Valency universal (occurrence mapping)
CREATE TABLE ar_token_valency_link (
  ar_token_occ_id  TEXT NOT NULL,
  ar_u_valency     TEXT NOT NULL,

  role             TEXT,      -- e.g. verb_head|prep_partner|object_slot etc (optional)
  note             TEXT,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (ar_token_occ_id, ar_u_valency),

  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_token_occ(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_valency)    REFERENCES ar_u_valency(ar_u_valency)     ON DELETE RESTRICT
);

--------------------------------------------------------------------------------
-- 4) ARABIC SUPPORT TABLES (keep your catalog table but fix naming)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS ar_grammatical_concepts;

CREATE TABLE ar_grammatical_concepts (
  id                TEXT PRIMARY KEY,           -- GRAM_NAHW_001 etc (catalog source)
  user_id           INTEGER,

  category          TEXT NOT NULL,              -- syntax | morphology | particle | rhetoric | discourse | semantics
  title             TEXT NOT NULL,
  title_ar          TEXT,
  difficulty        INTEGER,
  status            TEXT NOT NULL DEFAULT 'active',

  definition        TEXT NOT NULL,
  definition_ar     TEXT,

  signals_json      JSON,
  mistakes_json     JSON,
  examples_json     JSON,
  capture_refs_json JSON,
  cards_json        JSON,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

--------------------------------------------------------------------------------
-- 5) WORLDVIEW (wv_) + PLANNER (sp_) (keep, but ensure names are wv_/sp_)
--------------------------------------------------------------------------------
DROP TABLE IF EXISTS brainstorm_sessions;
DROP TABLE IF EXISTS library_entries;
DROP TABLE IF EXISTS wv_claims;
DROP TABLE IF EXISTS wv_content_items;
DROP TABLE IF EXISTS wv_content_library_links;
DROP TABLE IF EXISTS wv_cross_references;
DROP TABLE IF EXISTS wv_concepts;
DROP TABLE IF EXISTS wv_concept_anchors;
DROP TABLE IF EXISTS wv_discourse_edges;
DROP TABLE IF EXISTS ar_quran_relations;
DROP TABLE IF EXISTS sp_weekly_plans;
DROP TABLE IF EXISTS sp_weekly_tasks;
DROP TABLE IF EXISTS sp_sprint_reviews;
DROP TABLE IF EXISTS ar_reviews;

CREATE TABLE brainstorm_sessions (
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

CREATE TABLE library_entries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,

  entry_type   TEXT NOT NULL,
  category     TEXT,

  title        TEXT NOT NULL,
  title_ar     TEXT,
  summary      TEXT,

  url          TEXT,
  language     TEXT,
  format       TEXT,

  topics_json  JSON,
  qa_json      JSON,
  entry_json   JSON,

  status       TEXT NOT NULL DEFAULT 'active',

  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_claims (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,

  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  claim       JSON NOT NULL CHECK (json_valid(claim)),

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_content_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,

  title        TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',

  related_type TEXT,
  related_id   TEXT,

  refs_json    JSON NOT NULL CHECK (json_valid(refs_json)),
  content_json JSON NOT NULL CHECK (json_valid(content_json)),

  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_content_library_links (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,

  library_id   INTEGER NOT NULL,
  target_type  TEXT NOT NULL,          -- ar_lesson | wv_claim | wv_content_item
  target_id    TEXT NOT NULL,

  note         TEXT,
  link_qa_json JSON,

  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (library_id) REFERENCES library_entries(id) ON DELETE CASCADE
);

CREATE TABLE wv_cross_references (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,

  status     TEXT NOT NULL DEFAULT 'active',
  ref_json   JSON NOT NULL CHECK (json_valid(ref_json)),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_concepts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,

  slug        TEXT NOT NULL UNIQUE,
  label_ar    TEXT,
  label_en    TEXT,
  category    TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'active',

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_concept_anchors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,

  concept_id  INTEGER NOT NULL,

  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  unit_id     TEXT,
  ref         TEXT,
  evidence    TEXT NOT NULL,
  note        TEXT,

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (concept_id) REFERENCES wv_concepts(id) ON DELETE CASCADE
);

CREATE TABLE wv_discourse_edges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,

  edge_type   TEXT NOT NULL,
  relation    TEXT NOT NULL,
  strength    REAL,

  from_type   TEXT NOT NULL,
  from_id     TEXT NOT NULL,
  from_unit   TEXT,

  to_type     TEXT NOT NULL,
  to_id       TEXT NOT NULL,
  to_unit     TEXT,

  note        TEXT,
  meta_json   JSON,

  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Quran relations (worldview ↔ quran evidence)
CREATE TABLE ar_quran_relations (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER,

  concept_id         INTEGER NOT NULL,         -- wv_concepts.id

  target_type        TEXT NOT NULL,            -- wv_claim | library_entry | wv_content_item
  target_id          TEXT NOT NULL,

  relation           TEXT NOT NULL,            -- align | partial | contradict | unknown
  quran_evidence_json JSON,
  note               TEXT,

  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (concept_id) REFERENCES wv_concepts(id) ON DELETE CASCADE
);

-- Planner
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
  wv_claim_id        INTEGER,
  wv_content_item_id INTEGER,

  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (week_start) REFERENCES sp_weekly_plans(week_start) ON DELETE CASCADE,
  FOREIGN KEY (ar_lesson_id) REFERENCES ar_lessons(id) ON DELETE SET NULL,
  FOREIGN KEY (wv_claim_id) REFERENCES wv_claims(id) ON DELETE SET NULL,
  FOREIGN KEY (wv_content_item_id) REFERENCES wv_content_items(id) ON DELETE SET NULL
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
-- core
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);
CREATE INDEX idx_user_state_current ON user_state(current_type, current_id);
CREATE INDEX idx_user_logs_user_id  ON user_activity_logs(user_id);
CREATE INDEX idx_user_logs_type     ON user_activity_logs(event_type);
CREATE INDEX idx_user_logs_target   ON user_activity_logs(target_type, target_id);
CREATE INDEX idx_user_logs_created  ON user_activity_logs(created_at);

-- container
CREATE INDEX idx_ar_quran_text_surah_ayah ON ar_quran_text(sura, aya);
CREATE INDEX idx_ar_quran_text_page ON ar_quran_text(page);

CREATE INDEX idx_docs_slug   ON docs(slug);
CREATE INDEX idx_docs_status ON docs(status);
CREATE INDEX idx_docs_parent ON docs(parent_slug);
CREATE INDEX idx_docs_sort   ON docs(sort_order);

CREATE INDEX idx_ar_lessons_user_id ON ar_lessons(user_id);
CREATE INDEX idx_ar_lessons_status  ON ar_lessons(status);
CREATE INDEX idx_ar_lessons_type    ON ar_lessons(lesson_type);

-- universal
CREATE INDEX idx_ar_u_roots_root_norm ON ar_u_roots(root_norm);
CREATE INDEX idx_ar_u_roots_root      ON ar_u_roots(root);
CREATE INDEX idx_ar_u_roots_root_latn ON ar_u_roots(root_latn);
CREATE INDEX idx_ar_u_roots_status    ON ar_u_roots(status);
CREATE INDEX idx_ar_u_roots_freq      ON ar_u_roots(frequency);
CREATE INDEX idx_ar_u_roots_ar_tri     ON ar_u_roots(arabic_trilateral);
CREATE INDEX idx_ar_u_roots_en_tri     ON ar_u_roots(english_trilateral);

CREATE INDEX idx_ar_u_tokens_lemma_norm ON ar_u_tokens(lemma_norm);
CREATE INDEX idx_ar_u_tokens_pos        ON ar_u_tokens(pos);
CREATE INDEX idx_ar_u_tokens_root_norm  ON ar_u_tokens(root_norm);
CREATE INDEX idx_ar_u_tokens_root_fk    ON ar_u_tokens(ar_u_root);

CREATE INDEX idx_ar_u_spans_type ON ar_u_spans(span_type);

CREATE INDEX idx_ar_u_sent_kind ON ar_u_sentences(sentence_kind);

CREATE INDEX idx_ar_u_lex_lemma_norm ON ar_u_lexicon(lemma_norm);
CREATE INDEX idx_ar_u_lex_pos        ON ar_u_lexicon(pos);
CREATE INDEX idx_ar_u_lex_root_norm  ON ar_u_lexicon(root_norm);
CREATE INDEX idx_ar_u_lex_root_fk    ON ar_u_lexicon(ar_u_root);

CREATE INDEX idx_ar_u_valency_verb_norm ON ar_u_valency(verb_lemma_norm);
CREATE INDEX idx_ar_u_valency_prep      ON ar_u_valency(prep_ar_u_token);
CREATE INDEX idx_ar_u_valency_frame     ON ar_u_valency(frame_type);

CREATE INDEX idx_ar_u_grammar_grammar_id ON ar_u_grammar(grammar_id);

-- occurrence
CREATE INDEX idx_ar_token_occ_container ON ar_token_occ(container_type, container_id, unit_id);
CREATE INDEX idx_ar_token_occ_order     ON ar_token_occ(container_type, container_id, unit_id, pos_index);
CREATE INDEX idx_ar_token_occ_u_token   ON ar_token_occ(ar_u_token);

CREATE INDEX idx_ar_span_occ_container  ON ar_span_occ(container_type, container_id, unit_id);
CREATE INDEX idx_ar_span_occ_range      ON ar_span_occ(container_type, container_id, unit_id, start_index, end_index);
CREATE INDEX idx_ar_span_occ_u_span     ON ar_span_occ(ar_u_span);

CREATE INDEX idx_ar_sentence_occ_container ON ar_sentence_occ(container_type, container_id, unit_id);
CREATE INDEX idx_ar_sentence_occ_u_sent    ON ar_sentence_occ(ar_u_sentence);

CREATE INDEX idx_ar_grammar_occ_container ON ar_grammar_occ(container_type, container_id, unit_id);
CREATE INDEX idx_ar_grammar_occ_u_grammar  ON ar_grammar_occ(ar_u_grammar);
CREATE INDEX idx_ar_grammar_occ_target     ON ar_grammar_occ(target_type, target_id);

CREATE INDEX idx_ar_token_lexicon_link_lex ON ar_token_lexicon_link(ar_u_lexicon);
CREATE INDEX idx_ar_token_valency_link_val ON ar_token_valency_link(ar_u_valency);

-- worldview
CREATE INDEX idx_brainstorm_user_id ON brainstorm_sessions(user_id);
CREATE INDEX idx_brainstorm_topic   ON brainstorm_sessions(topic);
CREATE INDEX idx_brainstorm_status  ON brainstorm_sessions(status);
CREATE INDEX idx_brainstorm_stage   ON brainstorm_sessions(stage);

CREATE INDEX idx_library_user_id    ON library_entries(user_id);
CREATE INDEX idx_library_entry_type ON library_entries(entry_type);
CREATE INDEX idx_library_category   ON library_entries(category);
CREATE INDEX idx_library_title      ON library_entries(title);
CREATE INDEX idx_library_status     ON library_entries(status);

CREATE INDEX idx_wv_claims_user_id ON wv_claims(user_id);
CREATE INDEX idx_wv_claims_status  ON wv_claims(status);

CREATE INDEX idx_wv_concepts_user_id  ON wv_concepts(user_id);
CREATE INDEX idx_wv_concepts_category ON wv_concepts(category);
CREATE INDEX idx_wv_concepts_status   ON wv_concepts(status);
CREATE INDEX idx_wv_concepts_slug     ON wv_concepts(slug);

CREATE INDEX idx_wv_concept_anchors_user_id ON wv_concept_anchors(user_id);
CREATE INDEX idx_wv_concept_anchors_concept ON wv_concept_anchors(concept_id);
CREATE INDEX idx_wv_concept_anchors_target  ON wv_concept_anchors(target_type, target_id);
CREATE INDEX idx_wv_concept_anchors_ref     ON wv_concept_anchors(ref);
CREATE INDEX idx_wv_concept_anchors_unit_id ON wv_concept_anchors(unit_id);

CREATE INDEX idx_wv_content_items_user_id  ON wv_content_items(user_id);
CREATE INDEX idx_wv_content_items_type     ON wv_content_items(content_type);
CREATE INDEX idx_wv_content_items_status   ON wv_content_items(status);
CREATE INDEX idx_wv_content_items_related  ON wv_content_items(related_type, related_id);

CREATE INDEX idx_wv_content_library_links_user_id    ON wv_content_library_links(user_id);
CREATE INDEX idx_wv_content_library_links_library_id ON wv_content_library_links(library_id);
CREATE INDEX idx_wv_content_library_links_target     ON wv_content_library_links(target_type, target_id);

CREATE INDEX idx_wv_cross_references_user_id ON wv_cross_references(user_id);
CREATE INDEX idx_wv_cross_references_status  ON wv_cross_references(status);

CREATE INDEX idx_wv_discourse_edges_user_id  ON wv_discourse_edges(user_id);
CREATE INDEX idx_wv_discourse_edges_type     ON wv_discourse_edges(edge_type);
CREATE INDEX idx_wv_discourse_edges_relation ON wv_discourse_edges(relation);
CREATE INDEX idx_wv_discourse_edges_from     ON wv_discourse_edges(from_type, from_id);
CREATE INDEX idx_wv_discourse_edges_to       ON wv_discourse_edges(to_type, to_id);

CREATE INDEX idx_ar_quran_relations_user_id  ON ar_quran_relations(user_id);
CREATE INDEX idx_ar_quran_relations_concept  ON ar_quran_relations(concept_id);
CREATE INDEX idx_ar_quran_relations_target   ON ar_quran_relations(target_type, target_id);
CREATE INDEX idx_ar_quran_relations_relation ON ar_quran_relations(relation);

-- planner
CREATE INDEX idx_sp_weekly_plans_user_id ON sp_weekly_plans(user_id);

CREATE INDEX idx_sp_weekly_tasks_user_id      ON sp_weekly_tasks(user_id);
CREATE INDEX idx_sp_weekly_tasks_week         ON sp_weekly_tasks(week_start);
CREATE INDEX idx_sp_weekly_tasks_type         ON sp_weekly_tasks(task_type);
CREATE INDEX idx_sp_weekly_tasks_kanban_state ON sp_weekly_tasks(kanban_state);
CREATE INDEX idx_sp_weekly_tasks_status       ON sp_weekly_tasks(status);
CREATE INDEX idx_sp_weekly_tasks_order        ON sp_weekly_tasks(week_start, kanban_state, order_index);

CREATE INDEX idx_sp_sprint_reviews_user_id ON sp_sprint_reviews(user_id);
CREATE INDEX idx_sp_sprint_reviews_period  ON sp_sprint_reviews(period_start, period_end);
CREATE INDEX idx_sp_sprint_reviews_status  ON sp_sprint_reviews(status);
