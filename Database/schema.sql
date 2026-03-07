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



--------------------------------------------------------------------------------
-- 0) USERS / CORE
--------------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

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
--------------------------------------------------------------------------------
-- 1) CONTAINER LAYER (Arabic sources + registry)
--------------------------------------------------------------------------------
CREATE TABLE ar_quran_surahs (
  surah        INTEGER PRIMARY KEY,
  name_ar      TEXT NOT NULL,
  name_en      TEXT,
  ayah_count   INTEGER,
  meta_json    JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_ar_quran_surahs_name_ar ON ar_quran_surahs(name_ar);

CREATE TABLE IF NOT EXISTS ar_quran_page_layout_lines (
  page_number   INTEGER NOT NULL,
  line_number   INTEGER NOT NULL,
  line_type     TEXT NOT NULL CHECK (line_type IN ('ayah', 'surah_name', 'basmallah')),
  is_centered   INTEGER NOT NULL DEFAULT 0 CHECK (is_centered IN (0, 1)),
  first_word_id INTEGER,
  last_word_id  INTEGER,
  surah_number  INTEGER,
  PRIMARY KEY (page_number, line_number),
  FOREIGN KEY (surah_number) REFERENCES ar_quran_surahs(surah) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_quran_page_layout_lines_page
  ON ar_quran_page_layout_lines(page_number);

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

CREATE TABLE ar_quran_ayah (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  surah_ayah        INTEGER NOT NULL UNIQUE,
  page              INTEGER,
  juz               INTEGER,
  hizb              INTEGER,
  ruku              INTEGER,
  surah_name_ar     TEXT,
  surah_name_en     TEXT,
  text              TEXT NOT NULL,
  text_simple       TEXT NOT NULL,
  text_normalized   TEXT NOT NULL,
  text_diacritics   TEXT,
  text_non_diacritics TEXT,
  text_no_diacritics TEXT,
  first_word        TEXT,
  last_word         TEXT,
  word_count        INTEGER,
  char_count        INTEGER,
  verse_mark        TEXT,
  verse_full        TEXT,
  words             JSON CHECK (words IS NULL OR json_valid(words)),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  FOREIGN KEY (surah) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT,
  UNIQUE (surah, ayah)
);

CREATE INDEX IF NOT EXISTS idx_ar_quran_ayah_surah_ayah ON ar_quran_ayah(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_ar_quran_ayah_page ON ar_quran_ayah(page);
CREATE INDEX IF NOT EXISTS idx_ar_quran_ayah_juz ON ar_quran_ayah(juz);

CREATE TABLE IF NOT EXISTS ar_u_quran_ayah_words (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id      INTEGER,
  surah        INTEGER NOT NULL,
  ayah         INTEGER NOT NULL,
  position     INTEGER NOT NULL,
  verse_key    TEXT,
  text         TEXT,
  simple       TEXT,
  juz          INTEGER,
  hezb         INTEGER,
  rub          INTEGER,
  page         INTEGER,
  class_name   TEXT,
  line         INTEGER,
  code         TEXT,
  code_v3      TEXT,
  char_type    TEXT,
  audio        TEXT,
  translation  TEXT,
  lemma        TEXT,
  root         TEXT,
  ar_u_root    TEXT,
  meta_json    JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,
  UNIQUE (surah, ayah, position, word_id),
  FOREIGN KEY (surah, ayah) REFERENCES ar_quran_ayah(surah, ayah) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_u_quran_ayah_words_ref
  ON ar_u_quran_ayah_words(surah, ayah, position);
CREATE INDEX IF NOT EXISTS idx_ar_u_quran_ayah_words_root
  ON ar_u_quran_ayah_words(ar_u_root);

CREATE TABLE ar_quran_surah_ayah_meta (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  surah_ayah      INTEGER NOT NULL UNIQUE,
  theme           TEXT,
  keywords        TEXT,
  theme_json      JSON CHECK (theme_json IS NULL OR json_valid(theme_json)),
  matching_json   JSON CHECK (matching_json IS NULL OR json_valid(matching_json)),
  extra_json      JSON CHECK (extra_json IS NULL OR json_valid(extra_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,
  FOREIGN KEY (surah_ayah) REFERENCES ar_quran_ayah(surah_ayah) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_quran_surah_ayah_meta_theme ON ar_quran_surah_ayah_meta(theme);

CREATE TABLE ar_quran_translations (
  surah              INTEGER NOT NULL,
  ayah               INTEGER NOT NULL,
  translation_haleem TEXT,
  footnotes_haleem   TEXT,
  translation_asad   TEXT,
  translation_sahih  TEXT,
  translation_usmani TEXT,
  footnotes_sahih    TEXT,
  footnotes_usmani   TEXT,
  meta_json          JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,
  PRIMARY KEY (surah, ayah)
);

CREATE TABLE ar_quran_translation_sources (
  source_key   TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  translator   TEXT,
  language     TEXT NOT NULL DEFAULT 'en',
  publisher    TEXT,
  year         INTEGER,
  isbn         TEXT,
  edition      TEXT,
  rights       TEXT,
  source_path  TEXT,
  meta_json    JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT
);

CREATE TABLE ar_quran_translation_passages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key    TEXT NOT NULL,
  surah         INTEGER NOT NULL,
  ayah_from     INTEGER NOT NULL,
  ayah_to       INTEGER NOT NULL,
  passage_index INTEGER NOT NULL,
  page_pdf      INTEGER,
  page_book     INTEGER,
  text          TEXT,
  meta_json     JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT,
  FOREIGN KEY (source_key) REFERENCES ar_quran_translation_sources(source_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_quran_translation_passages_range
  ON ar_quran_translation_passages(source_key, surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_ar_quran_translation_passages_page
  ON ar_quran_translation_passages(source_key, page_book, page_pdf);

CREATE TABLE ar_lessons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,
  container_id TEXT,
  unit_id     TEXT,
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

CREATE INDEX IF NOT EXISTS idx_ar_lessons_container_id ON ar_lessons(container_id);
CREATE INDEX IF NOT EXISTS idx_ar_lessons_unit_id ON ar_lessons(unit_id);

CREATE TABLE ar_lesson_unit_link (
  lesson_id     INTEGER NOT NULL,
  container_id  TEXT NOT NULL,
  unit_id       TEXT NOT NULL DEFAULT '',
  order_index   INTEGER NOT NULL DEFAULT 0,
  link_scope    TEXT NOT NULL DEFAULT 'unit',
  role          TEXT,
  note          TEXT,
  link_json     JSON CHECK (link_json IS NULL OR json_valid(link_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (lesson_id, container_id, link_scope, unit_id),
  FOREIGN KEY (lesson_id)   REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  CHECK ((link_scope = 'container' AND unit_id = '') OR (link_scope = 'unit' AND unit_id != ''))
);
CREATE INDEX IF NOT EXISTS idx_ar_lesson_unit_link_lesson_order
  ON ar_lesson_unit_link(lesson_id, link_scope, unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_lesson_unit_link_container
  ON ar_lesson_unit_link(container_id);

-- =====================================================================================
-- 1b) USER LESSON LAYER (empty placeholders removed earlier; add minimal tables here)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS ar_lesson_enrollments (
  lesson_id     INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student',  -- owner | editor | student
  status        TEXT NOT NULL DEFAULT 'active',   -- active | paused | completed | dropped
  settings_json JSON,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT,
  updated_at    TEXT,
  PRIMARY KEY (lesson_id, user_id),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_ar_lesson_enroll_user ON ar_lesson_enrollments(user_id, status);

CREATE TABLE IF NOT EXISTS ar_lesson_user_state (
  lesson_id        INTEGER NOT NULL,
  user_id          INTEGER NOT NULL,
  current_unit_id  TEXT,
  current_step     TEXT,
  state_json       JSON CHECK (state_json IS NULL OR json_valid(state_json)),
  progress_json    JSON CHECK (progress_json IS NULL OR json_valid(progress_json)),
  last_seen_at     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,
  PRIMARY KEY (lesson_id, user_id),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_ar_lesson_user_state_user ON ar_lesson_user_state(user_id, last_seen_at);

CREATE TABLE IF NOT EXISTS ar_lesson_unit_progress (
  lesson_id     INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  container_id  TEXT NOT NULL,
  unit_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'todo',   -- todo | doing | done | skipped
  score         REAL,
  time_spent_s  INTEGER,
  attempts      INTEGER NOT NULL DEFAULT 0,
  progress_json JSON CHECK (progress_json IS NULL OR json_valid(progress_json)),
  started_at    TEXT,
  completed_at  TEXT,
  updated_at    TEXT,
  PRIMARY KEY (lesson_id, user_id, container_id, unit_id),
  FOREIGN KEY (lesson_id)    REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)      REFERENCES ar_container_units(id) ON DELETE CASCADE
);
CREATE INDEX idx_ar_lesson_unit_progress_user
  ON ar_lesson_unit_progress(user_id, lesson_id, status);

CREATE TABLE IF NOT EXISTS ar_container_unit_task (
  task_id    TEXT NOT NULL,
  unit_id    TEXT NOT NULL,

  task_type TEXT NOT NULL CHECK (task_type IN (
  'reading',
  'sentence_structure',
  'morphology',
  'grammar_concepts',
  'expressions',
  'comprehension',
  'passage_structure'
)),

  task_name  TEXT NOT NULL,
  task_json  JSON NOT NULL CHECK (json_valid(task_json)),

  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','published')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (task_id),
  UNIQUE (unit_id, task_type)
);

CREATE INDEX idx_ar_container_unit_task_unit ON ar_container_unit_task(unit_id);
CREATE INDEX idx_ar_container_unit_task_type ON ar_container_unit_task(task_type);

CREATE TRIGGER IF NOT EXISTS trg_ar_container_unit_task_updated_at
AFTER UPDATE ON ar_container_unit_task
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE ar_container_unit_task
  SET updated_at = datetime('now')
  WHERE task_id = OLD.task_id;
END;

--------------------------------------------------------------------------------
-- 1c) NOTES & CITATIONS (scholarly annotations)
--------------------------------------------------------------------------------

CREATE TABLE ar_sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type   TEXT NOT NULL,
  title         TEXT NOT NULL,
  author        TEXT,
  year          INTEGER,
  publisher     TEXT,
  url           TEXT,
  identifier    TEXT,
  notes         TEXT,
  meta_json     JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT
);

CREATE INDEX idx_ar_sources_type ON ar_sources(source_type);
CREATE INDEX idx_ar_sources_title ON ar_sources(title);

CREATE TABLE ar_notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER,
  note_type     TEXT NOT NULL,
  title         TEXT,
  excerpt       TEXT NOT NULL,
  commentary    TEXT,
  source_id     INTEGER,
  locator       TEXT,
  extra_json    JSON CHECK (extra_json IS NULL OR json_valid(extra_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES ar_sources(id) ON DELETE SET NULL
);

CREATE INDEX idx_ar_notes_type ON ar_notes(note_type);
CREATE INDEX idx_ar_notes_source ON ar_notes(source_id);

CREATE TABLE ar_note_targets (
  note_id       INTEGER NOT NULL,
  target_type   TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  relation      TEXT NOT NULL DEFAULT 'about',
  strength      REAL,
  share_scope   TEXT NOT NULL DEFAULT 'private',
  edge_note     TEXT,
  container_id  TEXT,
  unit_id       TEXT,
  ref           TEXT,
  extra_json    JSON CHECK (extra_json IS NULL OR json_valid(extra_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (note_id, target_type, target_id),
  FOREIGN KEY (note_id) REFERENCES ar_notes(id) ON DELETE CASCADE
);

CREATE INDEX idx_ar_note_targets_target ON ar_note_targets(target_type, target_id);
CREATE INDEX idx_ar_note_targets_relation ON ar_note_targets(relation);
CREATE INDEX idx_ar_note_targets_share ON ar_note_targets(share_scope);
CREATE INDEX idx_ar_note_targets_container ON ar_note_targets(container_id, unit_id);

-- =====================================================================================
-- 2) SRS LAYER (per-user spaced repetition)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS ar_srs (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER NOT NULL,
  lesson_id       INTEGER,

  item_type       TEXT NOT NULL,   -- verb | noun | idiom | verb_prep | stanza | etc
  item_key        TEXT NOT NULL,   -- your stable key (e.g. "Q:12:1:root:متع" etc)

  -- SINGLE CARD JSON (front+example+morph+back+tags)
  card_json       JSON NOT NULL CHECK (json_valid(card_json)),

  -- scheduler
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','archived')),

  due_at          TEXT NOT NULL,
  last_review_at  TEXT,

  interval_days   REAL NOT NULL DEFAULT 0,
  ease            REAL NOT NULL DEFAULT 2.5,
  reps            INTEGER NOT NULL DEFAULT 0,
  lapses          INTEGER NOT NULL DEFAULT 0,

  again_count     INTEGER NOT NULL DEFAULT 0,
  hard_count      INTEGER NOT NULL DEFAULT 0,
  good_count      INTEGER NOT NULL DEFAULT 0,
  easy_count      INTEGER NOT NULL DEFAULT 0,

  last_rating     TEXT CHECK (last_rating IS NULL OR last_rating IN ('again','hard','good','easy')),
  last_response_ms INTEGER,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id)  REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE SET NULL,

  -- prevent duplicates within a user’s collection
  UNIQUE (user_id, item_type, item_key)
);

-- fast queues (review screen)
CREATE INDEX IF NOT EXISTS idx_ar_srs_user_due
  ON ar_srs(user_id, status, due_at);

-- quick filtering
CREATE INDEX IF NOT EXISTS idx_ar_srs_user_lesson
  ON ar_srs(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_ar_srs_type_key
  ON ar_srs(item_type, item_key);

CREATE TRIGGER IF NOT EXISTS trg_ar_srs_updated_at
AFTER UPDATE ON ar_srs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE ar_srs
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

--------------------------------------------------------------------------------
-- 1d) DOCUMENTATION TABLES (Markdown knowledge)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wiki_docs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  body_md     TEXT NOT NULL,
  body_json   JSON CHECK (body_json IS NULL OR json_valid(body_json)),
  tags_json   JSON CHECK (tags_json IS NULL OR json_valid(tags_json)),
  status      TEXT NOT NULL DEFAULT 'published',
  parent_slug TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  CHECK (status IN ('draft', 'published'))
);
CREATE INDEX IF NOT EXISTS idx_wiki_docs_status ON wiki_docs(status);

--------------------------------------------------------------------------------
-- 1e) UNIVERSAL + OCCURRENCE (ar_u_* / ar_occ_*)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ar_u_roots (
  ar_u_root        TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  root             TEXT NOT NULL,
  root_norm        TEXT NOT NULL UNIQUE,

  arabic_trilateral TEXT,
  english_trilateral TEXT,
  root_latn         TEXT,

  alt_latn_json     JSON CHECK (alt_latn_json IS NULL OR json_valid(alt_latn_json)),
  search_keys_norm  TEXT,

  status            TEXT NOT NULL DEFAULT 'active',
  difficulty        INTEGER,
  frequency         TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  extracted_at      TEXT,
  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json))
);

CREATE INDEX IF NOT EXISTS idx_ar_u_roots_root_norm ON ar_u_roots(root_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_roots_root ON ar_u_roots(root);

CREATE TABLE IF NOT EXISTS ar_u_tokens (
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

CREATE INDEX IF NOT EXISTS idx_ar_u_tokens_lemma_norm ON ar_u_tokens(lemma_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_tokens_pos ON ar_u_tokens(pos);
CREATE INDEX IF NOT EXISTS idx_ar_u_tokens_root_norm ON ar_u_tokens(root_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_tokens_ar_u_root ON ar_u_tokens(ar_u_root);

CREATE TABLE IF NOT EXISTS ar_u_sentences (
  ar_u_sentence    TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  sentence_kind    TEXT NOT NULL,
  sequence_json    JSON CHECK (sequence_json IS NULL OR json_valid(sequence_json)),
  text_ar          TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_ar_u_sentences_kind ON ar_u_sentences(sentence_kind);

CREATE TABLE IF NOT EXISTS ar_u_expressions (
  ar_u_expression  TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  ar_u_lexicon     TEXT,
  surah            INTEGER,
  ayah             INTEGER,

  label            TEXT,
  text_ar          TEXT,
  sequence_json    JSON CHECK (sequence_json IS NULL OR json_valid(sequence_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  CHECK (
    (surah IS NULL AND ayah IS NULL)
    OR (surah BETWEEN 1 AND 114 AND ayah >= 1)
  ),

  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE SET NULL,
  FOREIGN KEY (surah, ayah) REFERENCES ar_quran_ayah(surah, ayah) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_u_expressions_label ON ar_u_expressions(label);
CREATE INDEX IF NOT EXISTS idx_ar_u_expressions_lexicon ON ar_u_expressions(ar_u_lexicon);
CREATE INDEX IF NOT EXISTS idx_ar_u_expressions_ref ON ar_u_expressions(surah, ayah);

CREATE TABLE IF NOT EXISTS ar_u_grammar (
  ar_u_grammar     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  grammar_id       TEXT NOT NULL UNIQUE,
  category         TEXT,
  sub_category     TEXT,
  title            TEXT,
  title_ar         TEXT,
  definition       TEXT,
  definition_ar    TEXT,

  lookup_keys_json JSON CHECK (lookup_keys_json IS NULL OR json_valid(lookup_keys_json)),
  canonical_norm   TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_category ON ar_u_grammar(category);
CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_grammar_id ON ar_u_grammar(grammar_id);
CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_canonical_norm ON ar_u_grammar(canonical_norm);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_u_grammar_canonical_norm
  ON ar_u_grammar(canonical_norm)
  WHERE canonical_norm IS NOT NULL AND canonical_norm <> '';

CREATE TABLE IF NOT EXISTS ar_u_grammar_relations (
  id                 TEXT PRIMARY KEY,
  parent_ar_u_grammar TEXT NOT NULL,
  child_ar_u_grammar  TEXT NOT NULL,
  relation_type       TEXT NOT NULL,
  order_index         INTEGER,
  meta_json           JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,

  FOREIGN KEY (parent_ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE CASCADE,
  FOREIGN KEY (child_ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE CASCADE,
  UNIQUE (parent_ar_u_grammar, child_ar_u_grammar, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_rel_parent ON ar_u_grammar_relations(parent_ar_u_grammar);
CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_rel_child ON ar_u_grammar_relations(child_ar_u_grammar);

CREATE TABLE IF NOT EXISTS ar_occ_token (
  ar_token_occ_id  TEXT PRIMARY KEY,
  user_id          INTEGER,
  container_id     TEXT,
  unit_id          TEXT,

  pos_index        INTEGER NOT NULL,
  surface_ar       TEXT NOT NULL,
  norm_ar          TEXT NOT NULL,
  lemma_ar         TEXT,
  pos              TEXT,

  ar_u_token       TEXT,
  ar_u_root        TEXT,

  features_json    JSON CHECK (features_json IS NULL OR json_valid(features_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_token) REFERENCES ar_u_tokens(ar_u_token) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_occ_token_unit ON ar_occ_token(container_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_occ_token_u_token ON ar_occ_token(ar_u_token);

CREATE TABLE IF NOT EXISTS ar_u_morphology (
  ar_u_morphology  TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  -- the form being described
  surface_ar       TEXT NOT NULL,
  surface_norm     TEXT NOT NULL,

  -- top POS bucket
  pos2             TEXT NOT NULL CHECK (pos2 IN ('verb','noun','prep','particle')),

  -- JAMID / MUSHTAQ
  derivation_type  TEXT CHECK (derivation_type IN ('jamid','mushtaq')),

  -- noun summary
  noun_number      TEXT CHECK (noun_number IN ('singular','plural','dual')),

  -- verb summary
  verb_form        TEXT CHECK (verb_form IN ('I','II','III','IV','V','VI','VII','VIII','IX','X')),

  -- derived noun intelligence
  derived_from_verb_form TEXT CHECK (
    derived_from_verb_form IN ('I','II','III','IV','V','VI','VII','VIII','IX','X')
  ),
  derived_pattern  TEXT CHECK (derived_pattern IN (
    'ism_fael','ism_mafool','masdar','sifah_mushabbahah','ism_mubalaghah',
    'ism_zaman','ism_makan','ism_ala','tafdeel','nisbah','other'
  )),

  -- optional global summary
  transitivity     TEXT CHECK (transitivity IN ('lazim','mutaaddi','both')),
  obj_count        INTEGER CHECK (obj_count IS NULL OR obj_count BETWEEN 0 AND 3),

  -- UI tags (not hashed)
  tags_ar_json     JSON CHECK (tags_ar_json IS NULL OR json_valid(tags_ar_json)),
  tags_en_json     JSON CHECK (tags_en_json IS NULL OR json_valid(tags_en_json)),

  notes            TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_ar_u_morph_surface_norm ON ar_u_morphology(surface_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_morph_pos2         ON ar_u_morphology(pos2);
CREATE INDEX IF NOT EXISTS idx_ar_u_morph_pattern      ON ar_u_morphology(derived_pattern);
CREATE INDEX IF NOT EXISTS idx_ar_u_morph_verb_form    ON ar_u_morphology(verb_form);

CREATE TABLE IF NOT EXISTS ar_occ_sentence (
  ar_sentence_occ_id  TEXT PRIMARY KEY,
  user_id             INTEGER,
  container_id        TEXT,
  unit_id             TEXT,

  sentence_order      INTEGER,
  text_ar             TEXT NOT NULL,
  translation         TEXT,
  notes               TEXT,

  ar_u_sentence       TEXT,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_sentence) REFERENCES ar_u_sentences(ar_u_sentence) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_occ_sentence_unit ON ar_occ_sentence(container_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_occ_sentence_u_sentence ON ar_occ_sentence(ar_u_sentence);

CREATE TABLE IF NOT EXISTS ar_occ_grammar (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER,
  container_id    TEXT,
  unit_id         TEXT,

  ar_u_grammar    TEXT NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,

  note            TEXT,
  meta_json       JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_occ_grammar_target ON ar_occ_grammar(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ar_occ_grammar_unit ON ar_occ_grammar(container_id, unit_id);

CREATE TABLE IF NOT EXISTS ar_token_lexicon_link (
  ar_token_occ_id  TEXT NOT NULL,
  ar_u_lexicon     TEXT NOT NULL,

  confidence       REAL,
  is_primary       INTEGER NOT NULL DEFAULT 1 CHECK (is_primary IN (0, 1)),
  source           TEXT,
  note             TEXT,

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (ar_token_occ_id, ar_u_lexicon),
  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_token_lexicon_link_lexicon ON ar_token_lexicon_link(ar_u_lexicon);

CREATE TABLE IF NOT EXISTS ar_token_pair_links (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER,
  container_id    TEXT,
  unit_id         TEXT,

  link_type       TEXT NOT NULL,
  from_token_occ  TEXT NOT NULL,
  to_token_occ    TEXT NOT NULL,

  ar_u_valency    TEXT,
  note            TEXT,
  meta_json       JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (from_token_occ) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (to_token_occ) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_token_pair_links_unit ON ar_token_pair_links(container_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_token_pair_links_type ON ar_token_pair_links(link_type);

CREATE TABLE IF NOT EXISTS quran_ayah_lemmas (
  lemma_id                 INTEGER PRIMARY KEY,
  lemma_text               TEXT NOT NULL,
  lemma_text_clean         TEXT NOT NULL,
  words_count              INTEGER,
  uniq_words_count         INTEGER,
  primary_ar_u_token       TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (primary_ar_u_token) REFERENCES ar_u_tokens(ar_u_token)
);

CREATE TABLE IF NOT EXISTS quran_ayah_lemma_location (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_id       INTEGER NOT NULL REFERENCES quran_ayah_lemmas(lemma_id) ON DELETE CASCADE,
  word_location  TEXT NOT NULL,
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  token_index    INTEGER NOT NULL,
  ar_token_occ_id TEXT,
  ar_u_token     TEXT,
  word_simple    TEXT,
  word_diacritic TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id),
  FOREIGN KEY (ar_u_token) REFERENCES ar_u_tokens(ar_u_token)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quran_ayah_lemma_location_unique
  ON quran_ayah_lemma_location (lemma_id, word_location);

CREATE INDEX IF NOT EXISTS idx_quran_ayah_lemma_location_ref
  ON quran_ayah_lemma_location (surah, ayah);

--------------------------------------------------------------------------------
-- ar_u_lexicon (UPDATED) — captures LexicalUnit (Word | KeyTerm | VerbalIdiom | Expression)
-- Keeps your canonical_input + root FK + sense_key, but expands to:
--   UnitType, Surface/Normalized, Meanings/Synonyms/Antonyms,
--   Morphology (Pattern/Features/Derivations),
--   Expression (ExpressionType/Text/TokenRange/Meaning),
--   References, Flags
--------------------------------------------------------------------------------


CREATE TABLE IF NOT EXISTS ar_u_lexicon (
  ar_u_lexicon         TEXT PRIMARY KEY,
  canonical_input      TEXT NOT NULL UNIQUE,

  -- Type
  unit_type            TEXT NOT NULL
                       CHECK (unit_type IN ('word','key_term','verbal_idiom','expression')),

  -- Representative surface (single word OR representative form for expression)
  surface_ar           TEXT NOT NULL,
  surface_norm         TEXT NOT NULL,

  -- Core lexeme identity
  lemma_ar             TEXT,
  lemma_norm           TEXT,
  pos                  TEXT,

  -- Root linkage
  root_norm            TEXT,
  ar_u_root            TEXT,

  -- Sense partitioning
  valency_id           TEXT,
  sense_key            TEXT NOT NULL,

  -- Meanings / synonyms / antonyms
  meanings_json        TEXT CHECK (meanings_json IS NULL OR json_valid(meanings_json)),
  synonyms_json        TEXT CHECK (synonyms_json IS NULL OR json_valid(synonyms_json)),
  antonyms_json        TEXT CHECK (antonyms_json IS NULL OR json_valid(antonyms_json)),

  -- Convenience gloss fields
  gloss_primary        TEXT,
  gloss_secondary_json TEXT CHECK (gloss_secondary_json IS NULL OR json_valid(gloss_secondary_json)),
  usage_notes          TEXT,

  -- Morphology
  morph_pattern        TEXT,
  morph_features_json  TEXT CHECK (morph_features_json IS NULL OR json_valid(morph_features_json)),
  morph_derivations_json TEXT CHECK (morph_derivations_json IS NULL OR json_valid(morph_derivations_json)),

  -- Expression block (only for unit_type IN ('expression','verbal_idiom'))
  expression_type      TEXT,
  expression_text      TEXT,
  expression_token_range_json TEXT CHECK (expression_token_range_json IS NULL OR json_valid(expression_token_range_json)),
  expression_meaning   TEXT,

  -- References + flags
  references_json      TEXT CHECK (references_json IS NULL OR json_valid(references_json)),
  flags_json           TEXT CHECK (flags_json IS NULL OR json_valid(flags_json)),

  -- Payload buckets
  cards_json           TEXT CHECK (cards_json IS NULL OR json_valid(cards_json)),
  meta_json            TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),

  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('draft','active','deprecated')),

  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT,

  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL,

  -- If expression/idiom: must have expression_text
  CHECK (
    unit_type NOT IN ('expression','verbal_idiom')
    OR (expression_text IS NOT NULL AND length(trim(expression_text)) > 0)
  ),

  -- If NOT expression/idiom: expression fields must be NULL
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      expression_type IS NULL
      AND expression_text IS NULL
      AND expression_token_range_json IS NULL
      AND expression_meaning IS NULL
    )
  ),

  -- For word/key_term: require lemma_norm or root_norm
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      (lemma_norm IS NOT NULL AND length(trim(lemma_norm)) > 0)
      OR (root_norm IS NOT NULL AND length(trim(root_norm)) > 0)
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_surface_norm
  ON ar_u_lexicon(surface_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_lemma_norm
  ON ar_u_lexicon(lemma_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_root_norm
  ON ar_u_lexicon(root_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_unit_type
  ON ar_u_lexicon(unit_type);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_ar_u_root
  ON ar_u_lexicon(ar_u_root);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_u_lexicon_sense_valency
  ON ar_u_lexicon(sense_key, ifnull(valency_id, ''));

CREATE TRIGGER IF NOT EXISTS trg_ar_u_lexicon_updated_at
AFTER UPDATE ON ar_u_lexicon
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = NEW.ar_u_lexicon;
END;

CREATE TABLE IF NOT EXISTS ar_u_lexicon_morphology (
  ar_u_lexicon    TEXT NOT NULL,
  ar_u_morphology TEXT NOT NULL,

  link_role       TEXT NOT NULL DEFAULT 'primary'
    CHECK (link_role IN ('primary','inflection','derived','variant')),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),

  PRIMARY KEY (ar_u_lexicon, ar_u_morphology),
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_morphology) REFERENCES ar_u_morphology(ar_u_morphology) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_morph_morph
  ON ar_u_lexicon_morphology(ar_u_morphology);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_morph_role
  ON ar_u_lexicon_morphology(link_role);

--------------------------------------------------------------------------------
-- ar_u_sources + chunk/evidence search (book-level search backbone)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ar_u_sources (
  ar_u_source       TEXT PRIMARY KEY,
  canonical_input   TEXT NOT NULL UNIQUE,
  source_code       TEXT NOT NULL UNIQUE,  -- e.g. SRC:HDO_2008

  title             TEXT NOT NULL,
  author            TEXT,
  publisher         TEXT,
  publication_year  INTEGER,
  language          TEXT,
  type              TEXT NOT NULL DEFAULT 'book',

  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT
);

CREATE TABLE IF NOT EXISTS ar_source_chunks (
  chunk_id       TEXT PRIMARY KEY,    -- e.g. SRC:HDO_2008:p:0167
  ar_u_source    TEXT NOT NULL,

  page_no        INTEGER,
  locator        TEXT,                -- e.g. pdf_page:167
  heading_raw    TEXT,
  heading_norm   TEXT,
  sub_heading    TEXT,
  chunk_type     TEXT NOT NULL DEFAULT 'lexicon'
                 CHECK (chunk_type IN ('grammar', 'literature', 'lexicon', 'reference', 'other')),

  text           TEXT NOT NULL,       -- display/raw text
  text_search    TEXT NOT NULL,       -- normalized text for search/FTS
  content_json   JSON CHECK (content_json IS NULL OR json_valid(content_json)),
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,

  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source)
);

CREATE TABLE IF NOT EXISTS ar_source_toc (
  toc_id         TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,

  depth          INTEGER NOT NULL,
  index_path     TEXT NOT NULL,
  title_raw      TEXT NOT NULL,
  title_norm     TEXT NOT NULL,

  page_no        INTEGER,
  locator        TEXT,
  pdf_page_index INTEGER,

  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,

  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source)
);

CREATE TABLE IF NOT EXISTS ar_source_index (
  index_id         TEXT PRIMARY KEY,
  ar_u_source      TEXT NOT NULL,

  term_raw         TEXT NOT NULL,
  term_norm        TEXT NOT NULL,
  term_ar          TEXT,
  term_ar_guess    TEXT,

  head_chunk_id    TEXT,

  index_page_no    INTEGER,
  index_locator    TEXT,

  page_refs_json   JSON NOT NULL CHECK (json_valid(page_refs_json)),
  variants_json    JSON CHECK (variants_json IS NULL OR json_valid(variants_json)),

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source),
  FOREIGN KEY (head_chunk_id) REFERENCES ar_source_chunks(chunk_id)
);

CREATE TABLE IF NOT EXISTS ar_u_lexicon_evidence (
  ar_u_lexicon        TEXT NOT NULL,
  evidence_id         TEXT NOT NULL,

  -- Locator mode
  locator_type        TEXT NOT NULL DEFAULT 'chunk'
                      CHECK (locator_type IN ('chunk','app','url')),

  -- Source identity (optional for app mode)
  source_id           TEXT,
  source_type         TEXT NOT NULL DEFAULT 'book'
                      CHECK (source_type IN (
                        'book','tafsir','quran','hadith',
                        'paper','website','notes','app'
                      )),

  -- Chunk-based locator (optional)
  chunk_id            TEXT,
  page_no             INTEGER,
  heading_raw         TEXT,
  heading_norm        TEXT,

  -- URL-based locator (optional)
  url                 TEXT,

  -- App-native structured payload
  app_payload_json    TEXT CHECK (app_payload_json IS NULL OR json_valid(app_payload_json)),

  -- Evidence classification
  link_role           TEXT NOT NULL DEFAULT 'supports'
                      CHECK (link_role IN (
                        'headword','definition','usage','example',
                        'mentions','grouped_with','crossref_target',
                        'index_redirect','supports','disputes','variant'
                      )),

  evidence_kind       TEXT NOT NULL DEFAULT 'lexical'
                      CHECK (evidence_kind IN (
                        'lexical','morphological','semantic',
                        'thematic','valency','historical',
                        'comparative','editorial'
                      )),

  evidence_strength   TEXT NOT NULL DEFAULT 'supporting'
                      CHECK (evidence_strength IN (
                        'primary','supporting','contextual','weak'
                      )),

  -- Optional content
  extract_text        TEXT,
  note_md             TEXT,

  meta_json           TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,

  PRIMARY KEY (ar_u_lexicon, evidence_id),

  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE,

  -- CHUNK mode: must have source_id + chunk_id
  CHECK (
    locator_type != 'chunk'
    OR (source_id IS NOT NULL AND chunk_id IS NOT NULL)
  ),

  -- URL mode: must have url
  CHECK (
    locator_type != 'url'
    OR url IS NOT NULL
  ),

  -- APP mode: must have structured payload
  CHECK (
    locator_type != 'app'
    OR app_payload_json IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_chunks_source_page
  ON ar_source_chunks(ar_u_source, page_no);

CREATE INDEX IF NOT EXISTS idx_chunks_source_heading
  ON ar_source_chunks(ar_u_source, heading_norm);

CREATE INDEX IF NOT EXISTS idx_chunks_source_type
  ON ar_source_chunks(ar_u_source, chunk_type);

CREATE INDEX IF NOT EXISTS idx_ar_source_toc_source_depth
  ON ar_source_toc(ar_u_source, depth);
CREATE INDEX IF NOT EXISTS idx_ar_source_toc_source_page
  ON ar_source_toc(ar_u_source, page_no);

CREATE INDEX IF NOT EXISTS idx_ar_source_index_source_norm
  ON ar_source_index(ar_u_source, term_norm);
CREATE INDEX IF NOT EXISTS idx_ar_source_index_source_page
  ON ar_source_index(ar_u_source, index_page_no);

CREATE INDEX IF NOT EXISTS idx_lex_ev_source_page
  ON ar_u_lexicon_evidence(source_id, page_no);

CREATE INDEX IF NOT EXISTS idx_lex_ev_chunk
  ON ar_u_lexicon_evidence(chunk_id);

CREATE INDEX IF NOT EXISTS idx_lex_ev_locator_type
  ON ar_u_lexicon_evidence(locator_type);

CREATE INDEX IF NOT EXISTS idx_lex_ev_link_role
  ON ar_u_lexicon_evidence(link_role);

CREATE TRIGGER IF NOT EXISTS trg_ar_u_lexicon_evidence_updated_at
AFTER UPDATE ON ar_u_lexicon_evidence
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon_evidence
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = NEW.ar_u_lexicon
    AND evidence_id = NEW.evidence_id;
END;

-- FTS5 (contentful): stores searchable and filter columns directly
--------------------------------------------------------------------------------

CREATE VIRTUAL TABLE IF NOT EXISTS ar_source_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  source_code,
  heading_norm,
  text_search
);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_u_lexicon_evidence_fts USING fts5(
  ar_u_lexicon UNINDEXED,
  evidence_id UNINDEXED,
  chunk_id UNINDEXED,
  source_code,
  extract_text,
  note_md
);

CREATE TABLE ar_grammar_units (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT,
  unit_type   TEXT NOT NULL,
  order_index INTEGER,
  title       TEXT,
  title_ar    TEXT,
  source_id   INTEGER,
  start_page  INTEGER,
  end_page    INTEGER,
  meta_json   JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  FOREIGN KEY (parent_id) REFERENCES ar_grammar_units(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES ar_sources(id) ON DELETE SET NULL
);

CREATE TABLE ar_grammar_unit_items (
  id          TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL,
  item_type   TEXT NOT NULL,
  title       TEXT,
  content     TEXT NOT NULL,
  content_ar  TEXT,
  order_index INTEGER,
  meta_json   JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  FOREIGN KEY (unit_id) REFERENCES ar_grammar_units(id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 4) WORLDVIEW (wv_) + PLANNER (sp_)
-- WV knowledge tables use SHA IDs + canonical_input
--------------------------------------------------------------------------------



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

CREATE TABLE IF NOT EXISTS sp_weekly_plans (
  week_start    TEXT NOT NULL,
  user_id       INTEGER,

  notes         TEXT,
  planned_count INTEGER NOT NULL DEFAULT 0,
  done_count    INTEGER NOT NULL DEFAULT 0,

  week_json     JSON NOT NULL CHECK (json_valid(week_json)),

  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT,

  PRIMARY KEY (week_start, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_weekly_plans_user_week
  ON sp_weekly_plans(user_id, week_start);

CREATE TABLE IF NOT EXISTS sp_weekly_tasks (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER,

  week_start         TEXT NOT NULL,
  title              TEXT NOT NULL,

  task_type          TEXT NOT NULL,
  kanban_state       TEXT NOT NULL DEFAULT 'backlog',
  status             TEXT NOT NULL DEFAULT 'planned',
  priority           INTEGER NOT NULL DEFAULT 3,
  points             REAL,
  due_date           TEXT,
  order_index        INTEGER NOT NULL DEFAULT 0,

  task_json          JSON NOT NULL CHECK (json_valid(task_json)),

  ar_lesson_id       INTEGER,
  wv_claim_id        TEXT,
  wv_content_item_id TEXT,
  source_task_id     TEXT,

  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (week_start, user_id) REFERENCES sp_weekly_plans(week_start, user_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_lesson_id) REFERENCES ar_lessons(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_user_week
  ON sp_weekly_tasks(user_id, week_start, kanban_state);
CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_week_order
  ON sp_weekly_tasks(week_start, user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_lesson
  ON sp_weekly_tasks(ar_lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sp_weekly_tasks_source_task
  ON sp_weekly_tasks(user_id, week_start, source_task_id)
  WHERE source_task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sp_sprint_reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,

  period_start TEXT NOT NULL,
  period_end   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','archived')),

  review_json  JSON NOT NULL CHECK (json_valid(review_json)),

  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_sprint_reviews_user_period
  ON sp_sprint_reviews(user_id, period_start, period_end);

CREATE TRIGGER IF NOT EXISTS trg_sp_weekly_tasks_ensure_week_plan
BEFORE INSERT ON sp_weekly_tasks
FOR EACH ROW
BEGIN
  INSERT OR IGNORE INTO sp_weekly_plans (
    week_start, user_id, week_json, created_at, updated_at
  )
  VALUES (
    NEW.week_start,
    NEW.user_id,
    json_object(
      'schema_version', 1,
      'title', 'Week Sprint — ' || NEW.week_start,
      'fixed_rhythm', json_object('lessons', 2, 'podcasts', 3),
      'planning_state', json_object('is_planned', json('false'), 'planned_at', NULL, 'defer_until', NULL),
      'intent', 'Learn + produce',
      'weekly_goals', json_array(),
      'time_budget', json_object(
        'lesson_min', 120,
        'podcast_min', 135,
        'review_min', 30,
        'study_minutes', 120,
        'podcast_minutes', 135,
        'review_minutes', 30
      ),
      'lanes', json_array(
        json_object('key', 'lesson', 'label', 'Lesson'),
        json_object('key', 'podcast', 'label', 'Podcast'),
        json_object('key', 'notes', 'label', 'Notes'),
        json_object('key', 'admin', 'label', 'Admin')
      ),
      'definition_of_done', json_array(),
      'metrics', json_object('tasks_done_target', 5, 'minutes_target', 285)
    ),
    datetime('now'),
    datetime('now')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_unit_task_auto_weekly_task
AFTER INSERT ON ar_container_unit_task
FOR EACH ROW
WHEN json_extract(NEW.task_json, '$.auto_weekly') = 1
BEGIN
  INSERT OR IGNORE INTO sp_weekly_tasks (
    user_id,
    week_start,
    title,
    task_type,
    kanban_state,
    status,
    priority,
    points,
    due_date,
    order_index,
    task_json,
    ar_lesson_id,
    source_task_id,
    created_at,
    updated_at
  )
  VALUES (
    json_extract(NEW.task_json, '$.user_id'),
    json_extract(NEW.task_json, '$.week_start'),
    NEW.task_name,
    'lesson_unit_task',
    'backlog',
    'planned',
    COALESCE(json_extract(NEW.task_json, '$.priority'), 3),
    json_extract(NEW.task_json, '$.points'),
    json_extract(NEW.task_json, '$.due_date'),
    COALESCE(json_extract(NEW.task_json, '$.order_index'), 0),
    json_object(
      'schema_version', 1,
      'source', 'ar_container_unit_task',
      'task_id', NEW.task_id,
      'unit_id', NEW.unit_id,
      'task_type', NEW.task_type,
      'task_name', NEW.task_name,
      'ref', json_extract(NEW.task_json, '$.ref'),
      'raw_task_json', json(NEW.task_json)
    ),
    json_extract(NEW.task_json, '$.ar_lesson_id'),
    NEW.task_id,
    datetime('now'),
    datetime('now')
  );
END;

CREATE TABLE IF NOT EXISTS sp_planner (
  id              TEXT PRIMARY KEY,        -- sha / uuid
  canonical_input TEXT NOT NULL UNIQUE,    -- stable hash

  user_id         INTEGER NOT NULL,

  -- planner identity
  item_type       TEXT NOT NULL
    CHECK (item_type IN ('week_plan','task','sprint_review')),

  -- temporal anchors
  week_start      TEXT,    -- for week_plan + task
  period_start    TEXT,    -- for sprint_review
  period_end      TEXT,    -- for sprint_review

  -- linking / references
  related_type    TEXT,    -- ar_lesson | wv_claim | wv_content_item
  related_id      TEXT,

  -- unified payload
  item_json       JSON NOT NULL CHECK (json_valid(item_json)),

  -- lifecycle
  status          TEXT NOT NULL DEFAULT 'active',

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
-- ar_quran_synonym_topics / ar_quran_synonym_topic_words
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ar_quran_synonym_topics (
  topic_id   TEXT PRIMARY KEY,
  topic_en   TEXT NOT NULL,
  topic_ur   TEXT,
  meta_json  JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ar_quran_synonym_topic_words (
  topic_id    TEXT NOT NULL,
  word_norm   TEXT NOT NULL,
  word_ar     TEXT,
  word_en     TEXT,
  root_norm   TEXT,
  root_ar     TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  meta_json   JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  PRIMARY KEY (topic_id, word_norm),
  FOREIGN KEY (topic_id) REFERENCES ar_quran_synonym_topics(topic_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_syn_topic_words_word
  ON ar_quran_synonym_topic_words(word_norm);

CREATE INDEX IF NOT EXISTS idx_syn_topic_words_topic
  ON ar_quran_synonym_topic_words(topic_id);

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



CREATE INDEX idx_ar_lessons_user_id  ON ar_lessons(user_id);
CREATE INDEX idx_ar_lessons_status   ON ar_lessons(status);
CREATE INDEX idx_ar_lessons_type     ON ar_lessons(lesson_type);

CREATE INDEX idx_ar_containers_type_key ON ar_containers(container_type, container_key);
CREATE INDEX idx_ar_units_container_order ON ar_container_units(container_id, order_index);

CREATE INDEX idx_ar_grammar_units_parent ON ar_grammar_units(parent_id);
CREATE INDEX idx_ar_grammar_units_type ON ar_grammar_units(unit_type);
CREATE INDEX idx_ar_grammar_units_source ON ar_grammar_units(source_id);
CREATE INDEX idx_ar_grammar_unit_items_unit ON ar_grammar_unit_items(unit_id);
CREATE INDEX idx_ar_grammar_unit_items_type ON ar_grammar_unit_items(item_type);

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

CREATE INDEX idx_sp_planner_user_type
  ON sp_planner(user_id, item_type);
CREATE INDEX idx_sp_planner_week
  ON sp_planner(user_id, week_start);
CREATE INDEX idx_sp_planner_period
  ON sp_planner(user_id, period_start, period_end);
CREATE INDEX idx_sp_planner_related
  ON sp_planner(related_type, related_id);
