PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'user')),
  settings_json JSON CHECK (settings_json IS NULL OR json_valid(settings_json)),
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE user_state (
  user_id INTEGER PRIMARY KEY,
  current_type TEXT,
  current_id TEXT,
  current_unit_id TEXT,
  focus_mode TEXT,
  state_json JSON CHECK (state_json IS NULL OR json_valid(state_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ref TEXT,
  note TEXT,
  event_json JSON CHECK (event_json IS NULL OR json_valid(event_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  workspace_type TEXT NOT NULL CHECK (workspace_type IN ('personal', 'family', 'team', 'study_group', 'organization')),
  owner_user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'suspended')),
  settings_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE workspace_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member' CHECK (membership_role IN ('owner', 'admin', 'member', 'viewer', 'guest')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'paused', 'left', 'removed')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  invited_by INTEGER,
  settings_json JSON CHECK (settings_json IS NULL OR json_valid(settings_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, user_id),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE workspace_groups (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  group_type TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'hidden')),
  order_index INTEGER NOT NULL DEFAULT 0,
  settings_json JSON CHECK (settings_json IS NULL OR json_valid(settings_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, slug),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE workspace_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'left', 'removed')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, group_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, group_id) REFERENCES workspace_groups(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id) REFERENCES workspace_members(workspace_id, user_id) ON DELETE CASCADE
);

CREATE TABLE workspace_roles (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  title TEXT NOT NULL,
  permissions_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(permissions_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, role_key),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE workspace_member_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  workspace_member_id INTEGER NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workspace_id, workspace_member_id, role_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, workspace_member_id) REFERENCES workspace_members(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, role_id) REFERENCES workspace_roles(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE workspace_group_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workspace_id, group_id, role_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, group_id) REFERENCES workspace_groups(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, role_id) REFERENCES workspace_roles(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE ar_quran_surahs (
  surah                  INTEGER PRIMARY KEY,
  name_ar                TEXT    NOT NULL,
  name_en                TEXT,
  name_transliteration   TEXT,              -- "Al-Yusuf", "Al-Baqarah"
  ayah_count             INTEGER,
  revelation_place       TEXT    CHECK (revelation_place IS NULL OR revelation_place IN ('meccan', 'medinan', 'both')),
  revelation_order       INTEGER,           -- chronological order of revelation
  juz_start              INTEGER,
  juz_end                INTEGER,
  theme_summary          TEXT,              -- one-line thematic summary
  meta_json              JSON    CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT
);

CREATE TABLE ar_quran_page_layout_lines (
  page_number INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  line_type TEXT NOT NULL CHECK (line_type IN ('ayah', 'surah_name', 'basmallah')),
  is_centered INTEGER NOT NULL DEFAULT 0 CHECK (is_centered IN (0, 1)),
  first_word_id INTEGER,
  last_word_id INTEGER,
  surah_number INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (page_number, line_number),
  FOREIGN KEY (surah_number) REFERENCES ar_quran_surahs(surah) ON DELETE SET NULL
);

CREATE TABLE ar_containers (
  id TEXT PRIMARY KEY,
  container_type TEXT NOT NULL,
  container_key TEXT NOT NULL,
  title TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (container_type, container_key)
);

CREATE TABLE ar_container_units (
  id           TEXT    PRIMARY KEY,
  container_id TEXT    NOT NULL,
  unit_type    TEXT    NOT NULL,       -- 'chapter', 'passage', 'surah'
  order_index  INTEGER NOT NULL DEFAULT 0,
  ayah_from    INTEGER,
  ayah_to      INTEGER,
  surah        INTEGER,                -- denormalised for fast lookup
  surah_ref    TEXT,                   -- "12:1-7" display reference
  start_ref    TEXT,
  end_ref      TEXT,
  text_cache   TEXT,
  meta_json    JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────────────────────
-- TEXT COLUMN STANDARD (critical — read before using any text column)
--
--  Column               Diacritics  Verse Mark  Use
--  -------------------  ----------  ----------  ----------------------------
--  text                 YES         YES(embed)  RAW SOURCE — never display
--  text_uthmani_clean   YES         NO          → DISPLAY (diacritic mode)
--  text_simple          NO          NO          → DISPLAY (clean mode)
--  text_bare            NO          NO          → SEARCH / normalization
--  text_normalized      NO          UNCLEAR     legacy — use text_bare
--  text_diacritics      YES         UNCLEAR     legacy — use text_uthmani_clean
--  text_non_diacritics  NO          UNCLEAR     legacy — use text_simple
--  text_no_diacritics   NO          UNCLEAR     DEPRECATED dup — use text_simple
--  verse_mark           —           ISOLATED    display circle separately
--  verse_full           YES         YES         raw full-verse reference
--
--  Verse mark Unicode:
--    U+06DD ۝  END OF AYAH
--    U+06DE ۞  RUB EL HIZB (section marker)
--    U+0660–U+0669  Arabic-Indic digits after mark
--    Strip pattern: /[\u06DD\u06DE][\u0660-\u0669]*/g
-- ──────────────────────────────────────────────────────────────
CREATE TABLE ar_quran_ayah (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  surah_ayah           INTEGER NOT NULL UNIQUE,
  page                 INTEGER,
  juz                  INTEGER,
  hizb                 INTEGER,
  ruku                 INTEGER,
  surah_name_ar        TEXT,
  surah_name_en        TEXT,

  -- RAW SOURCE (has embedded verse mark U+06DD) — do not use for display
  text                 TEXT    NOT NULL,

  -- CANONICAL DISPLAY COLUMNS
  text_uthmani_clean   TEXT,              -- ✓ Uthmani + diacritics, NO verse mark → USE FOR DIACRITIC DISPLAY
  text_simple          TEXT    NOT NULL,  -- ✓ simple script, no diacritics, no mark → USE FOR CLEAN DISPLAY
  text_bare            TEXT,              -- ✓ fully normalised, no diacritics, no marks → USE FOR SEARCH

  -- LEGACY (kept for backward compat — do not use in new code)
  text_normalized      TEXT    NOT NULL,  -- legacy: use text_bare instead
  text_diacritics      TEXT,              -- legacy: use text_uthmani_clean instead
  text_non_diacritics  TEXT,              -- legacy: use text_simple instead
  text_no_diacritics   TEXT,              -- DEPRECATED: duplicate of text_non_diacritics

  -- Word boundaries
  first_word           TEXT,
  last_word            TEXT,
  word_count           INTEGER,
  char_count           INTEGER,

  -- Verse mark (isolated — for rendering the end-of-ayah circle separately)
  verse_mark           TEXT,              -- isolated U+06DD + Arabic-Indic digit(s)
  verse_full           TEXT,              -- full raw verse with mark (reference only)

  words                JSON CHECK (words IS NULL OR json_valid(words)),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT,
  UNIQUE (surah, ayah),
  FOREIGN KEY (surah) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

CREATE TABLE ar_quran_surah_ayah_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah_ayah INTEGER NOT NULL UNIQUE,
  theme TEXT,
  keywords TEXT,
  theme_json JSON CHECK (theme_json IS NULL OR json_valid(theme_json)),
  matching_json JSON CHECK (matching_json IS NULL OR json_valid(matching_json)),
  extra_json JSON CHECK (extra_json IS NULL OR json_valid(extra_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (surah_ayah) REFERENCES ar_quran_ayah(surah_ayah) ON DELETE CASCADE
);

CREATE TABLE ar_quran_translations (
  surah INTEGER NOT NULL,
  ayah INTEGER NOT NULL,
  translation_haleem TEXT,
  footnotes_haleem TEXT,
  translation_asad TEXT,
  translation_sahih TEXT,
  translation_usmani TEXT,
  footnotes_sahih TEXT,
  footnotes_usmani TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (surah, ayah),
  FOREIGN KEY (surah, ayah) REFERENCES ar_quran_ayah(surah, ayah) ON DELETE CASCADE
);

CREATE TABLE ar_quran_translation_sources (
  source_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  translator TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  publisher TEXT,
  year INTEGER,
  isbn TEXT,
  edition TEXT,
  rights TEXT,
  source_path TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE ar_quran_translation_passages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  passage_index INTEGER NOT NULL,
  page_pdf INTEGER,
  page_book INTEGER,
  text TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (source_key) REFERENCES ar_quran_translation_sources(source_key) ON DELETE CASCADE,
  FOREIGN KEY (surah) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

CREATE TABLE ar_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  container_id TEXT,
  unit_id TEXT,
  title TEXT NOT NULL,
  title_ar TEXT,
  lesson_type TEXT NOT NULL,
  subtype TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  difficulty INTEGER,
  source TEXT,
  lesson_json JSON NOT NULL CHECK (json_valid(lesson_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL
);

CREATE TABLE ar_lesson_unit_link (
  lesson_id INTEGER NOT NULL,
  container_id TEXT NOT NULL,
  unit_id TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  link_scope TEXT NOT NULL DEFAULT 'unit' CHECK (link_scope IN ('container', 'unit')),
  role TEXT,
  note TEXT,
  link_json JSON CHECK (link_json IS NULL OR json_valid(link_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (lesson_id, container_id, link_scope, unit_id),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  CHECK ((link_scope = 'container' AND unit_id = '') OR (link_scope = 'unit' AND unit_id <> ''))
);

CREATE TABLE ar_lesson_enrollments (
  lesson_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('owner', 'editor', 'student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'dropped')),
  settings_json JSON CHECK (settings_json IS NULL OR json_valid(settings_json)),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (lesson_id, user_id),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE ar_lesson_user_state (
  lesson_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  current_unit_id TEXT,
  current_step TEXT,
  state_json JSON CHECK (state_json IS NULL OR json_valid(state_json)),
  progress_json JSON CHECK (progress_json IS NULL OR json_valid(progress_json)),
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (lesson_id, user_id),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (current_unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL
);

CREATE TABLE ar_lesson_unit_progress (
  lesson_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  container_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'skipped')),
  score REAL,
  time_spent_s INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  progress_json JSON CHECK (progress_json IS NULL OR json_valid(progress_json)),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (lesson_id, user_id, container_id, unit_id),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE
);

CREATE TABLE ar_container_unit_task (
  task_id    TEXT PRIMARY KEY,
  unit_id    TEXT NOT NULL,
  parent_task_id TEXT,

  -- All task types across all 6 domains
  task_type  TEXT NOT NULL CHECK (task_type IN (
    -- Core Quran passage tasks (kid learning)
    'reading',
    'sentence_structure',
    'morphology',
    'grammar_concepts',
    'expressions',
    'comprehension',
    'passage_structure',
    -- Quranic linguistics & meaning depth
    'worldview',
    'translation_semantics',
    'near_synonyms',
    'surah_analysis',
    -- Cross-domain & comparative
    'cross_corpus',
    -- Children-specific lesson plan
    'children_lesson'
  )),

  task_name  TEXT NOT NULL,
  task_json  JSON NOT NULL CHECK (json_valid(task_json)),

  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ai_generated', 'review', 'approved', 'published', 'archived'
  )),

  version_no INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE
);

CREATE TABLE ar_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  year INTEGER,
  publisher TEXT,
  url TEXT,
  identifier TEXT,
  notes TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE ar_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  note_type TEXT NOT NULL,
  title TEXT,
  excerpt TEXT NOT NULL,
  commentary TEXT,
  source_id INTEGER,
  locator TEXT,
  extra_json JSON CHECK (extra_json IS NULL OR json_valid(extra_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES ar_sources(id) ON DELETE SET NULL
);

CREATE TABLE ar_note_targets (
  note_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'about',
  strength REAL,
  share_scope TEXT NOT NULL DEFAULT 'private',
  edge_note TEXT,
  container_id TEXT,
  unit_id TEXT,
  ref TEXT,
  extra_json JSON CHECK (extra_json IS NULL OR json_valid(extra_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (note_id, target_type, target_id),
  FOREIGN KEY (note_id) REFERENCES ar_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL
);

CREATE TABLE ar_srs (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  lesson_id INTEGER,
  item_type TEXT NOT NULL,
  item_key TEXT NOT NULL,
  card_json JSON NOT NULL CHECK (json_valid(card_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  due_at TEXT NOT NULL,
  last_review_at TEXT,
  interval_days REAL NOT NULL DEFAULT 0,
  ease REAL NOT NULL DEFAULT 2.5,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  again_count INTEGER NOT NULL DEFAULT 0,
  hard_count INTEGER NOT NULL DEFAULT 0,
  good_count INTEGER NOT NULL DEFAULT 0,
  easy_count INTEGER NOT NULL DEFAULT 0,
  last_rating TEXT CHECK (last_rating IS NULL OR last_rating IN ('again', 'hard', 'good', 'easy')),
  last_response_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (user_id, item_type, item_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE SET NULL
);

CREATE TABLE wiki_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  body_json JSON CHECK (body_json IS NULL OR json_valid(body_json)),
  tags_json JSON CHECK (tags_json IS NULL OR json_valid(tags_json)),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  parent_slug TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE ar_u_roots (
  ar_u_root TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  root TEXT NOT NULL,
  root_norm TEXT NOT NULL UNIQUE,
  arabic_trilateral TEXT,
  english_trilateral TEXT,
  root_latn TEXT,
  alt_latn_json JSON CHECK (alt_latn_json IS NULL OR json_valid(alt_latn_json)),
  search_keys_norm TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  difficulty INTEGER,
  frequency TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  extracted_at TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json))
);

CREATE TABLE ar_u_tokens (
  ar_u_token TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  lemma_ar TEXT NOT NULL,
  lemma_norm TEXT NOT NULL,
  pos TEXT NOT NULL,
  root_norm TEXT,
  ar_u_root TEXT,
  features_json JSON CHECK (features_json IS NULL OR json_valid(features_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE TABLE ar_u_sentences (
  ar_u_sentence TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  sentence_kind TEXT NOT NULL,
  sequence_json JSON CHECK (sequence_json IS NULL OR json_valid(sequence_json)),
  text_ar TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE ar_u_morphology (
  ar_u_morphology TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  surface_ar TEXT NOT NULL,
  surface_norm TEXT NOT NULL,
  pos2 TEXT NOT NULL CHECK (pos2 IN ('verb', 'noun', 'prep', 'particle')),
  derivation_type TEXT CHECK (derivation_type IN ('jamid', 'mushtaq')),
  noun_number TEXT CHECK (noun_number IN ('singular', 'plural', 'dual')),
  verb_form TEXT CHECK (verb_form IN ('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X')),
  derived_from_verb_form TEXT CHECK (derived_from_verb_form IN ('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X')),
  derived_pattern TEXT CHECK (derived_pattern IN ('ism_fael', 'ism_mafool', 'masdar', 'sifah_mushabbahah', 'ism_mubalaghah', 'ism_zaman', 'ism_makan', 'ism_ala', 'tafdeel', 'nisbah', 'other')),
  transitivity TEXT CHECK (transitivity IN ('lazim', 'mutaaddi', 'both')),
  obj_count INTEGER CHECK (obj_count IS NULL OR obj_count BETWEEN 0 AND 3),
  tags_ar_json JSON CHECK (tags_ar_json IS NULL OR json_valid(tags_ar_json)),
  tags_en_json JSON CHECK (tags_en_json IS NULL OR json_valid(tags_en_json)),
  notes TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE ar_u_lexicon (
  ar_u_lexicon TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('word', 'key_term', 'verbal_idiom', 'expression')),
  surface_ar TEXT NOT NULL,
  surface_norm TEXT NOT NULL,
  lemma_ar TEXT,
  lemma_norm TEXT,
  pos TEXT,
  root_norm TEXT,
  ar_u_root TEXT,
  valency_id TEXT,
  sense_key TEXT NOT NULL,
  meanings_json JSON CHECK (meanings_json IS NULL OR json_valid(meanings_json)),
  synonyms_json JSON CHECK (synonyms_json IS NULL OR json_valid(synonyms_json)),
  antonyms_json JSON CHECK (antonyms_json IS NULL OR json_valid(antonyms_json)),
  gloss_primary TEXT,
  gloss_secondary_json JSON CHECK (gloss_secondary_json IS NULL OR json_valid(gloss_secondary_json)),
  usage_notes TEXT,
  morph_pattern TEXT,
  morph_features_json JSON CHECK (morph_features_json IS NULL OR json_valid(morph_features_json)),
  morph_derivations_json JSON CHECK (morph_derivations_json IS NULL OR json_valid(morph_derivations_json)),
  expression_type TEXT,
  expression_text TEXT,
  expression_token_range_json JSON CHECK (expression_token_range_json IS NULL OR json_valid(expression_token_range_json)),
  expression_meaning TEXT,
  references_json JSON CHECK (references_json IS NULL OR json_valid(references_json)),
  flags_json JSON CHECK (flags_json IS NULL OR json_valid(flags_json)),
  cards_json JSON CHECK (cards_json IS NULL OR json_valid(cards_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL,
  CHECK (
    unit_type NOT IN ('expression', 'verbal_idiom')
    OR (expression_text IS NOT NULL AND length(trim(expression_text)) > 0)
  ),
  CHECK (
    unit_type IN ('expression', 'verbal_idiom')
    OR (
      expression_type IS NULL
      AND expression_text IS NULL
      AND expression_token_range_json IS NULL
      AND expression_meaning IS NULL
    )
  ),
  CHECK (
    unit_type IN ('expression', 'verbal_idiom')
    OR (
      (lemma_norm IS NOT NULL AND length(trim(lemma_norm)) > 0)
      OR (root_norm IS NOT NULL AND length(trim(root_norm)) > 0)
    )
  )
);

CREATE TABLE ar_u_lexicon_morphology (
  ar_u_lexicon TEXT NOT NULL,
  ar_u_morphology TEXT NOT NULL,
  link_role TEXT NOT NULL DEFAULT 'primary' CHECK (link_role IN ('primary', 'inflection', 'derived', 'variant')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ar_u_lexicon, ar_u_morphology),
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_morphology) REFERENCES ar_u_morphology(ar_u_morphology) ON DELETE CASCADE
);

CREATE TABLE ar_u_expressions (
  ar_u_expression TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  ar_u_lexicon TEXT,
  surah INTEGER,
  ayah INTEGER,
  label TEXT,
  text_ar TEXT,
  sequence_json JSON CHECK (sequence_json IS NULL OR json_valid(sequence_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  CHECK ((surah IS NULL AND ayah IS NULL) OR (surah BETWEEN 1 AND 114 AND ayah >= 1)),
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE SET NULL,
  FOREIGN KEY (surah, ayah) REFERENCES ar_quran_ayah(surah, ayah) ON DELETE SET NULL
);

CREATE TABLE ar_u_grammar (
  ar_u_grammar TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  grammar_id TEXT NOT NULL UNIQUE,
  category TEXT,
  sub_category TEXT,
  title TEXT,
  title_ar TEXT,
  definition TEXT,
  definition_ar TEXT,
  lookup_keys_json JSON CHECK (lookup_keys_json IS NULL OR json_valid(lookup_keys_json)),
  canonical_norm TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE ar_u_grammar_relations (
  id TEXT PRIMARY KEY,
  parent_ar_u_grammar TEXT NOT NULL,
  child_ar_u_grammar TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  order_index INTEGER,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (parent_ar_u_grammar, child_ar_u_grammar, relation_type),
  FOREIGN KEY (parent_ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE CASCADE,
  FOREIGN KEY (child_ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE CASCADE
);

CREATE TABLE ar_u_sources (
  ar_u_source TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  source_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  publication_year INTEGER,
  language TEXT,
  type TEXT NOT NULL DEFAULT 'book',
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE ar_source_chunks (
  chunk_id TEXT PRIMARY KEY,
  ar_u_source TEXT NOT NULL,
  page_no INTEGER,
  locator TEXT,
  heading_raw TEXT,
  heading_norm TEXT,
  sub_heading TEXT,
  chunk_type TEXT NOT NULL DEFAULT 'lexicon' CHECK (chunk_type IN ('grammar', 'literature', 'lexicon', 'reference', 'other')),
  text TEXT NOT NULL,
  text_search TEXT NOT NULL,
  content_json JSON CHECK (content_json IS NULL OR json_valid(content_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source) ON DELETE CASCADE
);

CREATE TABLE ar_source_toc (
  toc_id TEXT PRIMARY KEY,
  ar_u_source TEXT NOT NULL,
  depth INTEGER NOT NULL,
  index_path TEXT NOT NULL,
  title_raw TEXT NOT NULL,
  title_norm TEXT NOT NULL,
  page_no INTEGER,
  locator TEXT,
  pdf_page_index INTEGER,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source) ON DELETE CASCADE
);

CREATE TABLE ar_source_index (
  index_id TEXT PRIMARY KEY,
  ar_u_source TEXT NOT NULL,
  term_raw TEXT NOT NULL,
  term_norm TEXT NOT NULL,
  term_ar TEXT,
  term_ar_guess TEXT,
  head_chunk_id TEXT,
  index_page_no INTEGER,
  index_locator TEXT,
  page_refs_json JSON NOT NULL CHECK (json_valid(page_refs_json)),
  variants_json JSON CHECK (variants_json IS NULL OR json_valid(variants_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source) ON DELETE CASCADE,
  FOREIGN KEY (head_chunk_id) REFERENCES ar_source_chunks(chunk_id) ON DELETE SET NULL
);

CREATE TABLE ar_u_lexicon_evidence (
  ar_u_lexicon TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  locator_type TEXT NOT NULL DEFAULT 'chunk' CHECK (locator_type IN ('chunk', 'app', 'url')),
  source_id TEXT,
  source_type TEXT NOT NULL DEFAULT 'book' CHECK (source_type IN ('book', 'tafsir', 'quran', 'hadith', 'paper', 'website', 'notes', 'app')),
  chunk_id TEXT,
  page_no INTEGER,
  heading_raw TEXT,
  heading_norm TEXT,
  url TEXT,
  app_payload_json JSON CHECK (app_payload_json IS NULL OR json_valid(app_payload_json)),
  link_role TEXT NOT NULL DEFAULT 'supports' CHECK (link_role IN ('headword', 'definition', 'usage', 'example', 'mentions', 'grouped_with', 'crossref_target', 'index_redirect', 'supports', 'disputes', 'variant')),
  evidence_kind TEXT NOT NULL DEFAULT 'lexical' CHECK (evidence_kind IN ('lexical', 'morphological', 'semantic', 'thematic', 'valency', 'historical', 'comparative', 'editorial')),
  evidence_strength TEXT NOT NULL DEFAULT 'supporting' CHECK (evidence_strength IN ('primary', 'supporting', 'contextual', 'weak')),
  extract_text TEXT,
  note_md TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  PRIMARY KEY (ar_u_lexicon, evidence_id),
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES ar_u_sources(ar_u_source) ON DELETE CASCADE,
  FOREIGN KEY (chunk_id) REFERENCES ar_source_chunks(chunk_id) ON DELETE CASCADE,
  CHECK (locator_type <> 'chunk' OR (source_id IS NOT NULL AND chunk_id IS NOT NULL)),
  CHECK (locator_type <> 'url' OR url IS NOT NULL),
  CHECK (locator_type <> 'app' OR app_payload_json IS NOT NULL)
);

CREATE VIRTUAL TABLE ar_source_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  source_code,
  heading_norm,
  text_search
);

CREATE VIRTUAL TABLE ar_u_lexicon_evidence_fts USING fts5(
  ar_u_lexicon UNINDEXED,
  evidence_id UNINDEXED,
  chunk_id UNINDEXED,
  source_code,
  extract_text,
  note_md
);

CREATE TABLE ar_u_quran_ayah_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER,
  surah INTEGER NOT NULL,
  ayah INTEGER NOT NULL,
  position INTEGER NOT NULL,
  verse_key TEXT,
  text TEXT,
  simple TEXT,
  juz INTEGER,
  hezb INTEGER,
  rub INTEGER,
  page INTEGER,
  class_name TEXT,
  line INTEGER,
  code TEXT,
  code_v3 TEXT,
  char_type TEXT,
  audio TEXT,
  translation TEXT,
  lemma TEXT,
  root TEXT,
  ar_u_root TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (surah, ayah, position, word_id),
  FOREIGN KEY (surah, ayah) REFERENCES ar_quran_ayah(surah, ayah) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE TABLE ar_occ_token (
  ar_token_occ_id TEXT PRIMARY KEY,
  user_id INTEGER,
  container_id TEXT,
  unit_id TEXT,
  pos_index INTEGER NOT NULL,
  surface_ar TEXT NOT NULL,
  norm_ar TEXT NOT NULL,
  lemma_ar TEXT,
  pos TEXT,
  ar_u_token TEXT,
  ar_u_root TEXT,
  features_json JSON CHECK (features_json IS NULL OR json_valid(features_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_token) REFERENCES ar_u_tokens(ar_u_token) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE TABLE ar_occ_sentence (
  ar_sentence_occ_id TEXT PRIMARY KEY,
  user_id INTEGER,
  container_id TEXT,
  unit_id TEXT,
  sentence_order INTEGER,
  text_ar TEXT NOT NULL,
  translation TEXT,
  notes TEXT,
  ar_u_sentence TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_sentence) REFERENCES ar_u_sentences(ar_u_sentence) ON DELETE SET NULL
);

CREATE TABLE ar_occ_grammar (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  container_id TEXT,
  unit_id TEXT,
  ar_u_grammar TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_grammar) REFERENCES ar_u_grammar(ar_u_grammar) ON DELETE CASCADE
);

CREATE TABLE ar_token_lexicon_link (
  ar_token_occ_id TEXT NOT NULL,
  ar_u_lexicon TEXT NOT NULL,
  confidence REAL,
  is_primary INTEGER NOT NULL DEFAULT 1 CHECK (is_primary IN (0, 1)),
  source TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ar_token_occ_id, ar_u_lexicon),
  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE
);

CREATE TABLE ar_token_pair_links (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  container_id TEXT,
  unit_id TEXT,
  link_type TEXT NOT NULL,
  from_token_occ TEXT NOT NULL,
  to_token_occ TEXT NOT NULL,
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL,
  FOREIGN KEY (from_token_occ) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE,
  FOREIGN KEY (to_token_occ) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE
);

CREATE TABLE quran_ayah_lemmas (
  lemma_id INTEGER PRIMARY KEY,
  lemma_text TEXT NOT NULL,
  lemma_text_clean TEXT NOT NULL,
  words_count INTEGER,
  uniq_words_count INTEGER,
  primary_ar_u_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (primary_ar_u_token) REFERENCES ar_u_tokens(ar_u_token) ON DELETE SET NULL
);

CREATE TABLE quran_ayah_lemma_location (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_id INTEGER NOT NULL,
  word_location TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah INTEGER NOT NULL,
  token_index INTEGER NOT NULL,
  ar_token_occ_id TEXT,
  ar_u_token TEXT,
  word_simple TEXT,
  word_diacritic TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (lemma_id) REFERENCES quran_ayah_lemmas(lemma_id) ON DELETE CASCADE,
  FOREIGN KEY (surah, ayah) REFERENCES ar_quran_ayah(surah, ayah) ON DELETE CASCADE,
  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE SET NULL,
  FOREIGN KEY (ar_u_token) REFERENCES ar_u_tokens(ar_u_token) ON DELETE SET NULL
);

CREATE TABLE ar_grammar_units (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  unit_type TEXT NOT NULL,
  order_index INTEGER,
  title TEXT,
  title_ar TEXT,
  source_id INTEGER,
  start_page INTEGER,
  end_page INTEGER,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (parent_id) REFERENCES ar_grammar_units(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES ar_sources(id) ON DELETE SET NULL
);

CREATE TABLE ar_grammar_unit_items (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_ar TEXT,
  order_index INTEGER,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (unit_id) REFERENCES ar_grammar_units(id) ON DELETE CASCADE
);

CREATE TABLE wv_brainstorm_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  stage TEXT NOT NULL DEFAULT 'raw',
  schema_version INTEGER NOT NULL DEFAULT 2,
  revision INTEGER,
  session_json JSON NOT NULL CHECK (json_valid(session_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_sources (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('book', 'article', 'lecture', 'podcast', 'video', 'story', 'paper', 'conversation', 'document', 'other')),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  creator TEXT,
  publisher TEXT,
  publication_year INTEGER CHECK (publication_year IS NULL OR publication_year BETWEEN 1 AND 3000),
  language TEXT,
  source_url TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  source_json JSON CHECK (source_json IS NULL OR json_valid(source_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_source_units (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  parent_unit_id TEXT,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('chapter', 'section', 'heading', 'scene', 'timestamp', 'topic', 'passage', 'segment', 'other')),
  title TEXT,
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  start_ref TEXT,
  end_ref TEXT,
  anchor_text TEXT,
  summary TEXT,
  unit_json JSON CHECK (unit_json IS NULL OR json_valid(unit_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_unit_id) REFERENCES wv_source_units(id) ON DELETE CASCADE
);

CREATE TABLE wv_people (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  display_name TEXT NOT NULL,
  sort_name TEXT,
  person_type TEXT NOT NULL DEFAULT 'person' CHECK (person_type IN ('person', 'organization')),
  bio_short TEXT,
  website_url TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_source_people (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('author', 'co_author', 'editor', 'translator', 'speaker', 'host', 'guest', 'interviewer', 'publisher', 'organization', 'narrator', 'reviewer', 'other')),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (source_id, person_id, role, order_index),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES wv_people(id) ON DELETE CASCADE
);

CREATE TABLE wv_source_details (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  detail_key TEXT NOT NULL,
  detail_value TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (source_id, detail_key, order_index),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE
);

CREATE TABLE wv_reading_sessions (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  source_unit_id TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('reading', 'review', 'research', 'extraction')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  focus_mode TEXT,
  last_position TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  session_json JSON CHECK (session_json IS NULL OR json_valid(session_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id) ON DELETE SET NULL
);

CREATE TABLE wv_highlights (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  source_unit_id TEXT,
  session_id TEXT,
  locator TEXT,
  anchor_text TEXT,
  selected_text TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  color TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  CHECK (end_offset IS NULL OR start_offset IS NULL OR end_offset >= start_offset),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES wv_reading_sessions(id) ON DELETE SET NULL
);

CREATE TABLE wv_notes (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT,
  source_unit_id TEXT,
  session_id TEXT,
  highlight_id TEXT,
  note_kind TEXT NOT NULL CHECK (note_kind IN ('quote', 'summary', 'reflection', 'question', 'claim_seed', 'insight', 'observation', 'reference', 'todo', 'idea')),
  title TEXT,
  body_md TEXT NOT NULL,
  excerpt_text TEXT,
  locator TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  note_json JSON CHECK (note_json IS NULL OR json_valid(note_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES wv_reading_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (highlight_id) REFERENCES wv_highlights(id) ON DELETE SET NULL
);

CREATE TABLE wv_note_relations (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  note_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('node', 'source', 'source_unit', 'note', 'document', 'external', 'other')),
  target_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('supports', 'questions', 'distills_to_node', 'references_source', 'references_unit', 'related_note', 'about', 'other')),
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (note_id, target_type, target_id, relation),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (note_id) REFERENCES wv_notes(id) ON DELETE CASCADE
);

CREATE TABLE wv_distill_batches (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('distill', 'review', 'merge', 'insight_generation')),
  title TEXT,
  instructions_md TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'ready', 'approved', 'archived')),
  batch_json JSON CHECK (batch_json IS NULL OR json_valid(batch_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_distill_batch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('note', 'highlight')),
  item_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  role TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (batch_id, item_type, item_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id) ON DELETE CASCADE
);

CREATE TABLE wv_insight_suggestions (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  batch_id TEXT NOT NULL,
  user_id INTEGER,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('node', 'edge', 'cluster', 'output', 'srs')),
  payload_json JSON NOT NULL CHECK (json_valid(payload_json)),
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'edited', 'rejected', 'saved')),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_insight_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  suggestion_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'edit_and_save', 'reject', 'defer')),
  target_type TEXT,
  target_id TEXT,
  edited_payload_json JSON CHECK (edited_payload_json IS NULL OR json_valid(edited_payload_json)),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (suggestion_id) REFERENCES wv_insight_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE wv_documents (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('article', 'lesson', 'podcast_script', 'study_note', 'research_paper', 'reflection', 'draft')),
  title TEXT NOT NULL,
  summary TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'published', 'archived')),
  related_node_id TEXT,
  document_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(document_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (related_node_id) REFERENCES wv_nodes(id) ON DELETE SET NULL
);

CREATE TABLE wv_document_blocks (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  document_id TEXT NOT NULL,
  parent_block_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL CHECK (block_type IN ('heading', 'paragraph', 'quote', 'bullet_item', 'numbered_item', 'callout', 'code', 'image', 'divider')),
  block_level INTEGER,
  text_plain TEXT,
  content_json JSON CHECK (content_json IS NULL OR json_valid(content_json)),
  attrs_json JSON CHECK (attrs_json IS NULL OR json_valid(attrs_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES wv_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_block_id) REFERENCES wv_document_blocks(id) ON DELETE CASCADE
);

CREATE TABLE wv_block_node_links (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  block_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('mentions', 'supports', 'defines', 'references', 'illustrates', 'feeds')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (block_id, node_id, relation),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (block_id) REFERENCES wv_document_blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

CREATE TABLE wv_content_items (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('podcast_episode', 'youtube_episode', 'article', 'newsletter', 'short', 'slides', 'script', 'study_note', 'note', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'published', 'archived')),
  related_type TEXT,
  related_id TEXT,
  refs_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(refs_json)),
  content_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(content_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_nodes (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  node_type TEXT NOT NULL CHECK (node_type IN ('concept', 'claim', 'cluster', 'output', 'theme', 'argument', 'question', 'quote', 'lesson', 'episode', 'source_ref', 'person_ref', 'research_topic', 'other')),
  title TEXT,
  text_plain TEXT,
  summary TEXT,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'merged')),
  data_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_node_edges (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('supports', 'contradicts', 'mentions', 'related_to', 'part_of', 'derived_from', 'feeds_output', 'questions', 'cites', 'about', 'illustrates', 'defines', 'parallels', 'other')),
  strength REAL,
  order_index INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (from_node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

CREATE TABLE wv_evidence_links (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('source', 'source_unit', 'note', 'highlight', 'document', 'document_block', 'external', 'other')),
  source_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('supports', 'questions', 'cites', 'illustrates', 'about', 'other')),
  evidence_text TEXT,
  locator TEXT,
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

CREATE TABLE wv_node_quran_links (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  node_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('ayah', 'surah_ayah_meta', 'translation_passage', 'synonym_topic', 'other')),
  target_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('cites', 'supports', 'about', 'illustrates', 'defines', 'other')),
  quran_evidence_json JSON CHECK (quran_evidence_json IS NULL OR json_valid(quran_evidence_json)),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

CREATE TABLE sp_weekly_plans (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  week_start TEXT NOT NULL,
  notes TEXT,
  planned_count INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  week_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(week_json)),
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sp_kanban_lanes (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  lane_key TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  is_done_lane INTEGER NOT NULL DEFAULT 0 CHECK (is_done_lane IN (0, 1)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL
);

CREATE TABLE sp_weekly_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  created_by INTEGER,
  assigned_user_id INTEGER,
  assigned_group_id TEXT,
  week_start TEXT NOT NULL,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  kanban_lane_id TEXT,
  kanban_state TEXT NOT NULL DEFAULT 'backlog',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'in_progress', 'blocked', 'done', 'cancelled', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  points REAL,
  due_date TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  task_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(task_json)),
  related_node_id TEXT,
  source_task_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (kanban_lane_id) REFERENCES sp_kanban_lanes(id) ON DELETE SET NULL,
  FOREIGN KEY (related_node_id) REFERENCES wv_nodes(id) ON DELETE SET NULL,
  FOREIGN KEY (source_task_id) REFERENCES sp_weekly_tasks(id) ON DELETE SET NULL
);

CREATE TABLE sp_task_assignees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  assigned_user_id INTEGER,
  assigned_group_id TEXT,
  assignment_role TEXT NOT NULL DEFAULT 'assignee' CHECK (assignment_role IN ('assignee', 'owner', 'reviewer', 'watcher')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (assigned_user_id IS NOT NULL AND assigned_group_id IS NULL)
    OR (assigned_user_id IS NULL AND assigned_group_id IS NOT NULL)
  ),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES sp_weekly_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_group_id) REFERENCES workspace_groups(id) ON DELETE CASCADE
);

CREATE TABLE sp_sprint_reviews (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'archived')),
  review_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(review_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sp_planner (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  item_type TEXT NOT NULL CHECK (item_type IN ('week_plan', 'task', 'sprint_review')),
  week_start TEXT,
  period_start TEXT,
  period_end TEXT,
  related_type TEXT,
  related_id TEXT,
  item_json JSON NOT NULL CHECK (json_valid(item_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  CHECK (
    (item_type IN ('week_plan', 'task') AND week_start IS NOT NULL)
    OR (item_type = 'sprint_review' AND period_start IS NOT NULL AND period_end IS NOT NULL)
  ),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE ar_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ──────────────────────────────────────────────────────────────
-- Mutaradifaat al-Qur'an (المترادفات القرآنية)
-- Source: https://qurandev.github.io/synonyms/
-- Book:   Mutaradifaat al-Qur'aan (Urdu primary source)
--         + Tafseer Maariful Qur'aan, Mohar Ali Word-for-Word
--
-- Each topic = a concept (EN + UR label)
-- Each word  = an Arabic near-synonym for that concept
--              with its unique semantic nuance + ayah evidence
-- ──────────────────────────────────────────────────────────────
CREATE TABLE ar_quran_synonym_topics (
  topic_id         TEXT    PRIMARY KEY,   -- "A1", "A3", "k43"…
  topic_en         TEXT    NOT NULL,      -- "To settle"
  topic_ur         TEXT,                  -- "آباد ہونا"
  description_en   TEXT,                  -- brief concept description (EN)
  description_ur   TEXT,                  -- brief concept description (UR)
  source_id        TEXT,                  -- FK ar_u_sources (Mutaradifaat book)
  page_no          INTEGER,               -- page in source book
  cross_refs_json  JSON CHECK (cross_refs_json IS NULL OR json_valid(cross_refs_json)),
                                          -- related topic IDs: ["A7", "k43"]
  surahs_json      JSON CHECK (surahs_json IS NULL OR json_valid(surahs_json)),
                                          -- surah scope: [2, 4, 12]
  word_count       INTEGER NOT NULL DEFAULT 0,  -- denormalised
  deleted_at       TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE TABLE ar_quran_synonym_topic_words (
  topic_id           TEXT    NOT NULL,
  word_norm          TEXT    NOT NULL,   -- normalised Arabic (no diacritics)

  -- Arabic forms
  word_ar            TEXT,              -- with full diacritics (tashkeel)
  word_ar_pattern    TEXT,              -- morphological pattern (مَفعَل etc.)

  -- Root
  root_norm          TEXT,
  root_ar            TEXT,

  -- Multilingual glosses
  word_en            TEXT,              -- English meaning
  word_ur            TEXT,              -- Urdu meaning (from source book)

  -- THE core value of this resource:
  -- what makes THIS word semantically unique vs its near-synonyms
  -- e.g. "سَكَنَ = settlement after migration from elsewhere (≠ inherited dwelling)"
  semantic_nuance_en TEXT,
  semantic_nuance_ur TEXT,

  -- Quranic evidence: ayah refs with context
  -- [{"surah": 2, "ayah": 35, "text_ar": "...", "note": "Allah commanded Adam…"}]
  ayah_refs_json     JSON CHECK (ayah_refs_json IS NULL OR json_valid(ayah_refs_json)),

  -- Link to canonical lexicon entry
  ar_u_lexicon       TEXT,              -- FK ar_u_lexicon

  -- Source tracking within book
  source_id          TEXT,              -- FK ar_u_sources
  page_no            INTEGER,

  order_index        INTEGER NOT NULL DEFAULT 0,

  meta_json          JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  PRIMARY KEY (topic_id, word_norm),
  FOREIGN KEY (topic_id)     REFERENCES ar_quran_synonym_topics(topic_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon)        ON DELETE SET NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_state_current ON user_state(current_type, current_id);
CREATE INDEX idx_user_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_logs_type ON user_activity_logs(event_type);
CREATE INDEX idx_user_logs_target ON user_activity_logs(target_type, target_id);
CREATE INDEX idx_user_logs_created ON user_activity_logs(created_at);

CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspace_members_workspace_user ON workspace_members(workspace_id, user_id);
CREATE INDEX idx_workspace_groups_workspace_order ON workspace_groups(workspace_id, order_index);
CREATE INDEX idx_workspace_group_members_group_user ON workspace_group_members(group_id, user_id);
CREATE INDEX idx_workspace_roles_workspace_role_key ON workspace_roles(workspace_id, role_key);

CREATE INDEX idx_ar_quran_surahs_name_ar ON ar_quran_surahs(name_ar);
CREATE INDEX idx_ar_quran_page_layout_lines_page ON ar_quran_page_layout_lines(page_number);
CREATE INDEX idx_ar_containers_type_key ON ar_containers(container_type, container_key);
CREATE INDEX idx_ar_units_container_order ON ar_container_units(container_id, order_index);
CREATE INDEX idx_ar_quran_ayah_surah_ayah ON ar_quran_ayah(surah, ayah);
CREATE INDEX idx_ar_quran_ayah_page ON ar_quran_ayah(page);
CREATE INDEX idx_ar_quran_ayah_juz ON ar_quran_ayah(juz);
CREATE INDEX idx_ar_quran_surah_ayah_meta_theme ON ar_quran_surah_ayah_meta(theme);
CREATE INDEX idx_ar_quran_translation_passages_range ON ar_quran_translation_passages(source_key, surah, ayah_from, ayah_to);
CREATE INDEX idx_ar_quran_translation_passages_page ON ar_quran_translation_passages(source_key, page_book, page_pdf);
CREATE INDEX idx_ar_lessons_user_id ON ar_lessons(user_id);
CREATE INDEX idx_ar_lessons_status ON ar_lessons(status);
CREATE INDEX idx_ar_lessons_type ON ar_lessons(lesson_type);
CREATE INDEX idx_ar_lessons_container_id ON ar_lessons(container_id);
CREATE INDEX idx_ar_lessons_unit_id ON ar_lessons(unit_id);
CREATE INDEX idx_ar_lesson_unit_link_lesson_order ON ar_lesson_unit_link(lesson_id, link_scope, unit_id);
CREATE INDEX idx_ar_lesson_unit_link_container ON ar_lesson_unit_link(container_id);
CREATE INDEX idx_ar_lesson_enroll_user ON ar_lesson_enrollments(user_id, status);
CREATE INDEX idx_ar_lesson_user_state_user ON ar_lesson_user_state(user_id, last_seen_at);
CREATE INDEX idx_ar_lesson_unit_progress_user ON ar_lesson_unit_progress(user_id, lesson_id, status);
CREATE INDEX idx_ar_container_unit_task_unit ON ar_container_unit_task(unit_id);
CREATE INDEX idx_ar_container_unit_task_parent ON ar_container_unit_task(parent_task_id);
CREATE INDEX idx_ar_container_unit_task_type ON ar_container_unit_task(task_type);
CREATE UNIQUE INDEX idx_ar_container_unit_task_root_type_unique ON ar_container_unit_task(unit_id, task_type)
  WHERE parent_task_id IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_ar_sources_type ON ar_sources(source_type);
CREATE INDEX idx_ar_sources_title ON ar_sources(title);
CREATE INDEX idx_ar_notes_type ON ar_notes(note_type);
CREATE INDEX idx_ar_notes_source ON ar_notes(source_id);
CREATE INDEX idx_ar_note_targets_target ON ar_note_targets(target_type, target_id);
CREATE INDEX idx_ar_note_targets_relation ON ar_note_targets(relation);
CREATE INDEX idx_ar_note_targets_share ON ar_note_targets(share_scope);
CREATE INDEX idx_ar_note_targets_container ON ar_note_targets(container_id, unit_id);
CREATE INDEX idx_ar_srs_user_due ON ar_srs(user_id, status, due_at);
CREATE INDEX idx_ar_srs_user_lesson ON ar_srs(user_id, lesson_id);
CREATE INDEX idx_ar_srs_type_key ON ar_srs(item_type, item_key);
CREATE INDEX idx_wiki_docs_status ON wiki_docs(status);
CREATE INDEX idx_ar_u_roots_root_norm ON ar_u_roots(root_norm);
CREATE INDEX idx_ar_u_roots_root ON ar_u_roots(root);
CREATE INDEX idx_ar_u_tokens_lemma_norm ON ar_u_tokens(lemma_norm);
CREATE INDEX idx_ar_u_tokens_pos ON ar_u_tokens(pos);
CREATE INDEX idx_ar_u_tokens_root_norm ON ar_u_tokens(root_norm);
CREATE INDEX idx_ar_u_tokens_ar_u_root ON ar_u_tokens(ar_u_root);
CREATE INDEX idx_ar_u_sentences_kind ON ar_u_sentences(sentence_kind);
CREATE INDEX idx_ar_u_morph_surface_norm ON ar_u_morphology(surface_norm);
CREATE INDEX idx_ar_u_morph_pos2 ON ar_u_morphology(pos2);
CREATE INDEX idx_ar_u_morph_pattern ON ar_u_morphology(derived_pattern);
CREATE INDEX idx_ar_u_morph_verb_form ON ar_u_morphology(verb_form);
CREATE INDEX idx_ar_u_lexicon_surface_norm ON ar_u_lexicon(surface_norm);
CREATE INDEX idx_ar_u_lexicon_lemma_norm ON ar_u_lexicon(lemma_norm);
CREATE INDEX idx_ar_u_lexicon_root_norm ON ar_u_lexicon(root_norm);
CREATE INDEX idx_ar_u_lexicon_unit_type ON ar_u_lexicon(unit_type);
CREATE INDEX idx_ar_u_lexicon_ar_u_root ON ar_u_lexicon(ar_u_root);
CREATE UNIQUE INDEX ux_ar_u_lexicon_sense_valency ON ar_u_lexicon(sense_key, ifnull(valency_id, ''));
CREATE INDEX idx_ar_u_lexicon_morph_morph ON ar_u_lexicon_morphology(ar_u_morphology);
CREATE INDEX idx_ar_u_lexicon_morph_role ON ar_u_lexicon_morphology(link_role);
CREATE INDEX idx_ar_u_expressions_label ON ar_u_expressions(label);
CREATE INDEX idx_ar_u_expressions_lexicon ON ar_u_expressions(ar_u_lexicon);
CREATE INDEX idx_ar_u_expressions_ref ON ar_u_expressions(surah, ayah);
CREATE INDEX idx_ar_u_grammar_category ON ar_u_grammar(category);
CREATE INDEX idx_ar_u_grammar_grammar_id ON ar_u_grammar(grammar_id);
CREATE INDEX idx_ar_u_grammar_canonical_norm ON ar_u_grammar(canonical_norm);
CREATE UNIQUE INDEX ux_ar_u_grammar_canonical_norm ON ar_u_grammar(canonical_norm) WHERE canonical_norm IS NOT NULL AND canonical_norm <> '';
CREATE INDEX idx_ar_u_grammar_rel_parent ON ar_u_grammar_relations(parent_ar_u_grammar);
CREATE INDEX idx_ar_u_grammar_rel_child ON ar_u_grammar_relations(child_ar_u_grammar);
CREATE INDEX idx_chunks_source_page ON ar_source_chunks(ar_u_source, page_no);
CREATE INDEX idx_chunks_source_heading ON ar_source_chunks(ar_u_source, heading_norm);
CREATE INDEX idx_chunks_source_type ON ar_source_chunks(ar_u_source, chunk_type);
CREATE INDEX idx_ar_source_toc_source_depth ON ar_source_toc(ar_u_source, depth);
CREATE INDEX idx_ar_source_toc_source_page ON ar_source_toc(ar_u_source, page_no);
CREATE INDEX idx_ar_source_index_source_norm ON ar_source_index(ar_u_source, term_norm);
CREATE INDEX idx_ar_source_index_source_page ON ar_source_index(ar_u_source, index_page_no);
CREATE INDEX idx_lex_ev_source_page ON ar_u_lexicon_evidence(source_id, page_no);
CREATE INDEX idx_lex_ev_chunk ON ar_u_lexicon_evidence(chunk_id);
CREATE INDEX idx_lex_ev_locator_type ON ar_u_lexicon_evidence(locator_type);
CREATE INDEX idx_lex_ev_link_role ON ar_u_lexicon_evidence(link_role);
CREATE INDEX idx_ar_u_quran_ayah_words_ref ON ar_u_quran_ayah_words(surah, ayah, position);
CREATE INDEX idx_ar_u_quran_ayah_words_root ON ar_u_quran_ayah_words(ar_u_root);
CREATE INDEX idx_ar_occ_token_unit ON ar_occ_token(container_id, unit_id);
CREATE INDEX idx_ar_occ_token_u_token ON ar_occ_token(ar_u_token);
CREATE INDEX idx_ar_occ_sentence_unit ON ar_occ_sentence(container_id, unit_id);
CREATE INDEX idx_ar_occ_sentence_u_sentence ON ar_occ_sentence(ar_u_sentence);
CREATE INDEX idx_ar_occ_grammar_target ON ar_occ_grammar(target_type, target_id);
CREATE INDEX idx_ar_occ_grammar_unit ON ar_occ_grammar(container_id, unit_id);
CREATE INDEX idx_ar_token_lexicon_link_lexicon ON ar_token_lexicon_link(ar_u_lexicon);
CREATE INDEX idx_ar_token_pair_links_unit ON ar_token_pair_links(container_id, unit_id);
CREATE INDEX idx_ar_token_pair_links_type ON ar_token_pair_links(link_type);
CREATE UNIQUE INDEX idx_quran_ayah_lemma_location_unique ON quran_ayah_lemma_location(lemma_id, word_location);
CREATE INDEX idx_quran_ayah_lemma_location_ref ON quran_ayah_lemma_location(surah, ayah);
CREATE INDEX idx_ar_grammar_units_parent ON ar_grammar_units(parent_id);
CREATE INDEX idx_ar_grammar_units_type ON ar_grammar_units(unit_type);
CREATE INDEX idx_ar_grammar_units_source ON ar_grammar_units(source_id);
CREATE INDEX idx_ar_grammar_unit_items_unit ON ar_grammar_unit_items(unit_id);
CREATE INDEX idx_ar_grammar_unit_items_type ON ar_grammar_unit_items(item_type);

CREATE INDEX idx_wv_brainstorm_user_id ON wv_brainstorm_sessions(user_id);
CREATE INDEX idx_wv_brainstorm_topic ON wv_brainstorm_sessions(topic);
CREATE INDEX idx_wv_brainstorm_status ON wv_brainstorm_sessions(status);
CREATE INDEX idx_wv_brainstorm_stage ON wv_brainstorm_sessions(stage);

CREATE INDEX idx_wv_sources_workspace_type_status ON wv_sources(workspace_id, source_type, status);
CREATE INDEX idx_wv_people_workspace_name ON wv_people(workspace_id, display_name);
CREATE INDEX idx_wv_source_people_source ON wv_source_people(source_id, role, order_index);
CREATE INDEX idx_wv_source_people_person ON wv_source_people(person_id);
CREATE INDEX idx_wv_source_details_source ON wv_source_details(source_id, detail_key);
CREATE INDEX idx_wv_source_units_source_parent_order ON wv_source_units(source_id, parent_unit_id, order_index);
CREATE INDEX idx_wv_reading_sessions_workspace_user_status_started ON wv_reading_sessions(workspace_id, user_id, status, started_at);
CREATE INDEX idx_wv_highlights_workspace_user_created ON wv_highlights(workspace_id, user_id, created_at);
CREATE INDEX idx_wv_highlights_source_scope ON wv_highlights(source_id, source_unit_id, session_id);
CREATE INDEX idx_wv_notes_workspace_user_created ON wv_notes(workspace_id, user_id, created_at);
CREATE INDEX idx_wv_notes_source_kind ON wv_notes(source_id, source_unit_id, note_kind);
CREATE INDEX idx_wv_notes_session ON wv_notes(session_id);
CREATE INDEX idx_wv_notes_highlight ON wv_notes(highlight_id);
CREATE INDEX idx_wv_note_relations_note ON wv_note_relations(note_id);
CREATE INDEX idx_wv_note_relations_target_relation ON wv_note_relations(target_type, target_id, relation);
CREATE INDEX idx_wv_distill_batches_workspace_user_status_created ON wv_distill_batches(workspace_id, user_id, status, created_at);
CREATE INDEX idx_wv_distill_batch_items_batch_order ON wv_distill_batch_items(batch_id, order_index);
CREATE INDEX idx_wv_insight_suggestions_batch_type_status ON wv_insight_suggestions(batch_id, suggestion_type, status);
CREATE INDEX idx_wv_insight_decisions_suggestion_user ON wv_insight_decisions(suggestion_id, user_id);
CREATE INDEX idx_wv_documents_workspace_user_status_created ON wv_documents(workspace_id, user_id, status, created_at);
CREATE INDEX idx_wv_documents_doc_type ON wv_documents(doc_type);
CREATE INDEX idx_wv_document_blocks_document_order ON wv_document_blocks(document_id, order_index);
CREATE INDEX idx_wv_document_blocks_parent ON wv_document_blocks(parent_block_id);
CREATE INDEX idx_wv_document_blocks_block_type ON wv_document_blocks(block_type);
CREATE INDEX idx_wv_block_node_links_block ON wv_block_node_links(block_id);
CREATE INDEX idx_wv_block_node_links_node_relation ON wv_block_node_links(node_id, relation);
CREATE INDEX idx_wv_content_items_user_type_status ON wv_content_items(user_id, content_type, status);
CREATE INDEX idx_wv_content_items_related ON wv_content_items(related_type, related_id);
CREATE INDEX idx_wv_nodes_workspace_group_type_status ON wv_nodes(workspace_id, group_id, node_type, status);
CREATE INDEX idx_wv_nodes_slug ON wv_nodes(slug);
CREATE INDEX idx_wv_nodes_user_created ON wv_nodes(user_id, created_at);
CREATE UNIQUE INDEX ux_wv_nodes_workspace_slug ON wv_nodes(workspace_id, slug) WHERE slug IS NOT NULL AND trim(slug) <> '';
CREATE INDEX idx_wv_node_edges_workspace_relation ON wv_node_edges(workspace_id, relation_type);
CREATE INDEX idx_wv_node_edges_from_relation ON wv_node_edges(from_node_id, relation_type);
CREATE INDEX idx_wv_node_edges_to_relation ON wv_node_edges(to_node_id, relation_type);
CREATE INDEX idx_wv_evidence_links_target_node ON wv_evidence_links(target_node_id, relation);
CREATE INDEX idx_wv_node_quran_links_node ON wv_node_quran_links(node_id, relation);

CREATE INDEX idx_sp_weekly_plans_workspace_week ON sp_weekly_plans(workspace_id, week_start);
CREATE UNIQUE INDEX ux_sp_weekly_plans_scope_week ON sp_weekly_plans(workspace_id, ifnull(group_id, ''), ifnull(user_id, 0), week_start);
CREATE INDEX idx_sp_weekly_tasks_workspace_week_lane ON sp_weekly_tasks(workspace_id, week_start, kanban_state);
CREATE INDEX idx_sp_weekly_tasks_assigned_user_status ON sp_weekly_tasks(assigned_user_id, status);
CREATE INDEX idx_sp_weekly_tasks_assigned_group_status ON sp_weekly_tasks(assigned_group_id, status);
CREATE UNIQUE INDEX ux_sp_weekly_tasks_source_task ON sp_weekly_tasks(workspace_id, week_start, source_task_id) WHERE source_task_id IS NOT NULL;
CREATE INDEX idx_sp_task_assignees_task ON sp_task_assignees(task_id);
CREATE UNIQUE INDEX ux_sp_task_assignees_user ON sp_task_assignees(task_id, assigned_user_id, assignment_role) WHERE assigned_user_id IS NOT NULL;
CREATE UNIQUE INDEX ux_sp_task_assignees_group ON sp_task_assignees(task_id, assigned_group_id, assignment_role) WHERE assigned_group_id IS NOT NULL;
CREATE INDEX idx_sp_kanban_lanes_workspace_group_order ON sp_kanban_lanes(workspace_id, group_id, order_index);
CREATE UNIQUE INDEX ux_sp_kanban_lanes_scope_key ON sp_kanban_lanes(workspace_id, ifnull(group_id, ''), lane_key);
CREATE INDEX idx_sp_sprint_reviews_workspace_period ON sp_sprint_reviews(workspace_id, period_start, period_end);
CREATE INDEX idx_sp_planner_workspace_item_type ON sp_planner(workspace_id, item_type);
CREATE INDEX idx_sp_planner_workspace_week ON sp_planner(workspace_id, week_start);
CREATE INDEX idx_sp_planner_workspace_period ON sp_planner(workspace_id, period_start, period_end);

CREATE INDEX idx_ar_reviews_target ON ar_reviews(target_type, target_id);
CREATE INDEX idx_ar_reviews_user ON ar_reviews(user_id, created_at);
CREATE INDEX idx_syn_topics_source           ON ar_quran_synonym_topics(source_id);
CREATE INDEX idx_syn_topic_words_word         ON ar_quran_synonym_topic_words(word_norm);
CREATE INDEX idx_syn_topic_words_topic_order  ON ar_quran_synonym_topic_words(topic_id, order_index);
CREATE INDEX idx_syn_topic_words_root         ON ar_quran_synonym_topic_words(root_norm);
CREATE INDEX idx_syn_topic_words_lexicon      ON ar_quran_synonym_topic_words(ar_u_lexicon);

CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE users
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_user_state_updated_at
AFTER UPDATE ON user_state
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE user_state
  SET updated_at = datetime('now')
  WHERE user_id = OLD.user_id;
END;

CREATE TRIGGER trg_workspaces_updated_at
AFTER UPDATE ON workspaces
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspaces
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_workspace_members_updated_at
AFTER UPDATE ON workspace_members
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_members
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_workspace_groups_updated_at
AFTER UPDATE ON workspace_groups
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_groups
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_workspace_group_members_updated_at
AFTER UPDATE ON workspace_group_members
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_group_members
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_workspace_roles_updated_at
AFTER UPDATE ON workspace_roles
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_roles
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_lessons_updated_at
AFTER UPDATE ON ar_lessons
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_lessons
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_lesson_enrollments_updated_at
AFTER UPDATE ON ar_lesson_enrollments
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_lesson_enrollments
  SET updated_at = datetime('now')
  WHERE lesson_id = OLD.lesson_id
    AND user_id = OLD.user_id;
END;

CREATE TRIGGER trg_ar_lesson_user_state_updated_at
AFTER UPDATE ON ar_lesson_user_state
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_lesson_user_state
  SET updated_at = datetime('now')
  WHERE lesson_id = OLD.lesson_id
    AND user_id = OLD.user_id;
END;

CREATE TRIGGER trg_ar_lesson_unit_progress_updated_at
AFTER UPDATE ON ar_lesson_unit_progress
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_lesson_unit_progress
  SET updated_at = datetime('now')
  WHERE lesson_id = OLD.lesson_id
    AND user_id = OLD.user_id
    AND container_id = OLD.container_id
    AND unit_id = OLD.unit_id;
END;

CREATE TRIGGER trg_ar_container_unit_task_updated_at
AFTER UPDATE ON ar_container_unit_task
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_container_unit_task
  SET updated_at = datetime('now')
  WHERE task_id = OLD.task_id;
END;

CREATE TRIGGER trg_ar_sources_updated_at
AFTER UPDATE ON ar_sources
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_sources
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_notes_updated_at
AFTER UPDATE ON ar_notes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_notes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_note_targets_updated_at
AFTER UPDATE ON ar_note_targets
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_note_targets
  SET updated_at = datetime('now')
  WHERE note_id = OLD.note_id
    AND target_type = OLD.target_type
    AND target_id = OLD.target_id;
END;

CREATE TRIGGER trg_ar_srs_updated_at
AFTER UPDATE ON ar_srs
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_srs
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wiki_docs_updated_at
AFTER UPDATE ON wiki_docs
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wiki_docs
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_u_roots_updated_at
AFTER UPDATE ON ar_u_roots
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_roots
  SET updated_at = datetime('now')
  WHERE ar_u_root = OLD.ar_u_root;
END;

CREATE TRIGGER trg_ar_u_tokens_updated_at
AFTER UPDATE ON ar_u_tokens
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_tokens
  SET updated_at = datetime('now')
  WHERE ar_u_token = OLD.ar_u_token;
END;

CREATE TRIGGER trg_ar_u_sentences_updated_at
AFTER UPDATE ON ar_u_sentences
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_sentences
  SET updated_at = datetime('now')
  WHERE ar_u_sentence = OLD.ar_u_sentence;
END;

CREATE TRIGGER trg_ar_u_morphology_updated_at
AFTER UPDATE ON ar_u_morphology
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_morphology
  SET updated_at = datetime('now')
  WHERE ar_u_morphology = OLD.ar_u_morphology;
END;

CREATE TRIGGER trg_ar_u_lexicon_updated_at
AFTER UPDATE ON ar_u_lexicon
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = OLD.ar_u_lexicon;
END;

CREATE TRIGGER trg_ar_u_expressions_updated_at
AFTER UPDATE ON ar_u_expressions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_expressions
  SET updated_at = datetime('now')
  WHERE ar_u_expression = OLD.ar_u_expression;
END;

CREATE TRIGGER trg_ar_u_grammar_updated_at
AFTER UPDATE ON ar_u_grammar
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_grammar
  SET updated_at = datetime('now')
  WHERE ar_u_grammar = OLD.ar_u_grammar;
END;

CREATE TRIGGER trg_ar_u_grammar_relations_updated_at
AFTER UPDATE ON ar_u_grammar_relations
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_grammar_relations
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_u_sources_updated_at
AFTER UPDATE ON ar_u_sources
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_sources
  SET updated_at = datetime('now')
  WHERE ar_u_source = OLD.ar_u_source;
END;

CREATE TRIGGER trg_ar_source_chunks_updated_at
AFTER UPDATE ON ar_source_chunks
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_source_chunks
  SET updated_at = datetime('now')
  WHERE chunk_id = OLD.chunk_id;
END;

CREATE TRIGGER trg_ar_source_toc_updated_at
AFTER UPDATE ON ar_source_toc
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_source_toc
  SET updated_at = datetime('now')
  WHERE toc_id = OLD.toc_id;
END;

CREATE TRIGGER trg_ar_source_index_updated_at
AFTER UPDATE ON ar_source_index
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_source_index
  SET updated_at = datetime('now')
  WHERE index_id = OLD.index_id;
END;

CREATE TRIGGER trg_ar_u_lexicon_evidence_updated_at
AFTER UPDATE ON ar_u_lexicon_evidence
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon_evidence
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = OLD.ar_u_lexicon
    AND evidence_id = OLD.evidence_id;
END;

CREATE TRIGGER trg_ar_grammar_units_updated_at
AFTER UPDATE ON ar_grammar_units
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_grammar_units
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_grammar_unit_items_updated_at
AFTER UPDATE ON ar_grammar_unit_items
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_grammar_unit_items
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_sources_updated_at
AFTER UPDATE ON wv_sources
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_sources
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_people_updated_at
AFTER UPDATE ON wv_people
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_people
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_source_people_updated_at
AFTER UPDATE ON wv_source_people
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_people
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_source_details_updated_at
AFTER UPDATE ON wv_source_details
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_details
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_source_units_updated_at
AFTER UPDATE ON wv_source_units
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_units
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_reading_sessions_updated_at
AFTER UPDATE ON wv_reading_sessions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_reading_sessions
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_highlights_updated_at
AFTER UPDATE ON wv_highlights
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_highlights
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_notes_updated_at
AFTER UPDATE ON wv_notes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_notes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_note_relations_updated_at
AFTER UPDATE ON wv_note_relations
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_note_relations
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_distill_batches_updated_at
AFTER UPDATE ON wv_distill_batches
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_distill_batches
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_insight_suggestions_updated_at
AFTER UPDATE ON wv_insight_suggestions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_insight_suggestions
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_insight_decisions_updated_at
AFTER UPDATE ON wv_insight_decisions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_insight_decisions
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_documents_updated_at
AFTER UPDATE ON wv_documents
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_documents
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_document_blocks_updated_at
AFTER UPDATE ON wv_document_blocks
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_document_blocks
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_block_node_links_updated_at
AFTER UPDATE ON wv_block_node_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_block_node_links
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_nodes_updated_at
AFTER UPDATE ON wv_nodes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_nodes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_node_edges_updated_at
AFTER UPDATE ON wv_node_edges
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_edges
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_evidence_links_updated_at
AFTER UPDATE ON wv_evidence_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_evidence_links
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_node_quran_links_updated_at
AFTER UPDATE ON wv_node_quran_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_quran_links
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_sp_weekly_plans_updated_at
AFTER UPDATE ON sp_weekly_plans
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_weekly_plans
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_sp_weekly_tasks_updated_at
AFTER UPDATE ON sp_weekly_tasks
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_weekly_tasks
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_sp_kanban_lanes_updated_at
AFTER UPDATE ON sp_kanban_lanes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_kanban_lanes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_sp_sprint_reviews_updated_at
AFTER UPDATE ON sp_sprint_reviews
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_sprint_reviews
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_sp_planner_updated_at
AFTER UPDATE ON sp_planner
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_planner
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_reviews_updated_at
AFTER UPDATE ON ar_reviews
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_reviews
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_quran_synonym_topics_updated_at
AFTER UPDATE ON ar_quran_synonym_topics
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_synonym_topics
  SET updated_at = datetime('now')
  WHERE topic_id = OLD.topic_id;
END;

CREATE TRIGGER trg_ar_quran_synonym_topic_words_updated_at
AFTER UPDATE ON ar_quran_synonym_topic_words
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_synonym_topic_words
  SET updated_at = datetime('now')
  WHERE topic_id = OLD.topic_id
    AND word_norm = OLD.word_norm;
END;

-- ═══════════════════════════════════════════════════════════════
-- ar_quran_ayah TEXT COLUMN GUIDE (2026-03-22)
-- Use ar_quran_ayah directly — no separate view needed.
--
--   Column              | Use
--   --------------------|----------------------------------------------
--   text_uthmani_clean  | UI diacritic display (Uthmani, no verse mark)
--   text_simple         | UI plain display (no diacritics, no mark)
--   text_bare           | FTS / search / matching
--   verse_mark          | Separate verse marker: ۝١  ۝٢١  ۝٢٨٦
--                       | U+06DD + Arabic-Indic digits
--                       | Renders as decorative medallion in Quran fonts
--   text                | RAW — Uthmani + trailing digit — never display
--   text_no_diacritics  | DEPRECATED — use text_simple instead
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- PASSAGE STRUCTURE INDEPENDENT TABLE (added 2026-03-22)
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- ar_quran_surah_passage
-- Stores parsed passage structure analysis independently of the
-- task system. Populated when passage_structure task is approved.
-- Queryable by surah+range without joining ar_container_unit_task.
--
-- Pushed from: ar_container_unit_task WHERE task_type = 'passage_structure'
-- Sections schema: [{title, type, tone, renderer, data}]
-- Renderer types: keyvalue | chiasm | clusters | timeline
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_quran_surah_passage (
  id               TEXT    PRIMARY KEY,
  canonical_input  TEXT    NOT NULL UNIQUE,

  surah            INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  scope_ref        TEXT,              -- "12:1–7"

  unit_id          TEXT,              -- FK ar_container_units (optional)
  task_id          TEXT,              -- FK ar_container_unit_task (optional)

  passage_title    TEXT,
  sections_json    JSON    NOT NULL DEFAULT '[]' CHECK (json_valid(sections_json)),

  -- Denormalised flags for fast filtering
  has_chiasm       INTEGER NOT NULL DEFAULT 0 CHECK (has_chiasm   IN (0, 1)),
  has_timeline     INTEGER NOT NULL DEFAULT 0 CHECK (has_timeline IN (0, 1)),
  has_clusters     INTEGER NOT NULL DEFAULT 0 CHECK (has_clusters IN (0, 1)),
  has_keyvalue     INTEGER NOT NULL DEFAULT 0 CHECK (has_keyvalue IN (0, 1)),
  section_count    INTEGER NOT NULL DEFAULT 0,

  schema_version   INTEGER NOT NULL DEFAULT 2,
  status           TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'archived'
  )),
  deleted_at       TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, ayah_from, ayah_to),

  FOREIGN KEY (surah)   REFERENCES ar_quran_surahs(surah)          ON DELETE RESTRICT,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id)          ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES ar_container_unit_task(task_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_qsp_surah       ON ar_quran_surah_passage(surah);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_surah_range ON ar_quran_surah_passage(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_status      ON ar_quran_surah_passage(status);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_chiasm      ON ar_quran_surah_passage(has_chiasm) WHERE has_chiasm = 1;
CREATE INDEX IF NOT EXISTS idx_ar_qsp_timeline    ON ar_quran_surah_passage(has_timeline) WHERE has_timeline = 1;

CREATE TRIGGER trg_ar_quran_surah_passage_updated_at
AFTER UPDATE ON ar_quran_surah_passage
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_surah_passage SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ═══════════════════════════════════════════════════════════════
-- 6-DOMAIN LIFELONG TABLES (added 2026-03-22)
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- km_surah_analysis
-- Surah-level analysis: ring composition, arches, worldview,
-- inter-surah parallels (prev surah pairs), translation delta
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS km_surah_analysis (
  surah                  INTEGER PRIMARY KEY,
  structure_json         JSON CHECK (structure_json IS NULL OR json_valid(structure_json)),
  worldview_json         JSON CHECK (worldview_json IS NULL OR json_valid(worldview_json)),
  parallels_json         JSON CHECK (parallels_json IS NULL OR json_valid(parallels_json)),
  unique_concepts_json   JSON CHECK (unique_concepts_json IS NULL OR json_valid(unique_concepts_json)),
  translation_delta_json JSON CHECK (translation_delta_json IS NULL OR json_valid(translation_delta_json)),
  surah_podcast_doc_id   TEXT,
  surah_overview_doc_id  TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published')),
  notes                  TEXT,
  deleted_at             TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah)                 REFERENCES ar_quran_surahs(surah) ON DELETE CASCADE,
  FOREIGN KEY (surah_podcast_doc_id)  REFERENCES wv_documents(id)       ON DELETE SET NULL,
  FOREIGN KEY (surah_overview_doc_id) REFERENCES wv_documents(id)       ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_km_surah_analysis_status ON km_surah_analysis(status);

CREATE TRIGGER trg_km_surah_analysis_updated_at
AFTER UPDATE ON km_surah_analysis
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_surah_analysis SET updated_at = datetime('now') WHERE surah = OLD.surah;
END;


-- ──────────────────────────────────────────────────────────────
-- sp_passage_planner
-- Weekly 3-passage learning tracker with children.
-- Tracks tasks, podcast, study doc and children's lesson per passage.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sp_passage_planner (
  id                   TEXT PRIMARY KEY,
  canonical_input      TEXT NOT NULL UNIQUE,
  workspace_id         TEXT NOT NULL,
  group_id             TEXT,
  user_id              INTEGER,

  week_start           TEXT NOT NULL,   -- ISO Monday: YYYY-MM-DD
  unit_id              TEXT NOT NULL,   -- FK ar_container_units
  container_id         TEXT,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  display_ref          TEXT,            -- "12:1–7"

  with_children        INTEGER NOT NULL DEFAULT 1 CHECK (with_children IN (0, 1)),

  status               TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'tasks_done', 'complete', 'skipped'
  )),
  tasks_done           INTEGER NOT NULL DEFAULT 0,
  tasks_total          INTEGER NOT NULL DEFAULT 0,
  podcast_done         INTEGER NOT NULL DEFAULT 0 CHECK (podcast_done         IN (0, 1)),
  document_done        INTEGER NOT NULL DEFAULT 0 CHECK (document_done        IN (0, 1)),
  children_lesson_done INTEGER NOT NULL DEFAULT 0 CHECK (children_lesson_done IN (0, 1)),

  podcast_doc_id       TEXT,
  study_doc_id         TEXT,
  children_doc_id      TEXT,

  notes                TEXT,
  planner_json         JSON CHECK (planner_json IS NULL OR json_valid(planner_json)),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (workspace_id, week_start, unit_id),

  FOREIGN KEY (workspace_id)    REFERENCES workspaces(id)          ON DELETE CASCADE,
  FOREIGN KEY (group_id)        REFERENCES workspace_groups(id)    ON DELETE SET NULL,
  FOREIGN KEY (user_id)         REFERENCES users(id)               ON DELETE SET NULL,
  FOREIGN KEY (unit_id)         REFERENCES ar_container_units(id)  ON DELETE CASCADE,
  FOREIGN KEY (container_id)    REFERENCES ar_containers(id)       ON DELETE SET NULL,
  FOREIGN KEY (surah)           REFERENCES ar_quran_surahs(surah)  ON DELETE RESTRICT,
  FOREIGN KEY (podcast_doc_id)  REFERENCES wv_documents(id)        ON DELETE SET NULL,
  FOREIGN KEY (study_doc_id)    REFERENCES wv_documents(id)        ON DELETE SET NULL,
  FOREIGN KEY (children_doc_id) REFERENCES wv_documents(id)        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_planner_workspace_week ON sp_passage_planner(workspace_id, week_start);
CREATE INDEX IF NOT EXISTS idx_sp_planner_surah          ON sp_passage_planner(surah);
CREATE INDEX IF NOT EXISTS idx_sp_planner_status         ON sp_passage_planner(status);
CREATE INDEX IF NOT EXISTS idx_sp_planner_user_week      ON sp_passage_planner(user_id, week_start);

CREATE TRIGGER trg_sp_passage_planner_updated_at
AFTER UPDATE ON sp_passage_planner
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_passage_planner SET updated_at = datetime('now') WHERE id = OLD.id;
END;


-- ──────────────────────────────────────────────────────────────
-- km_audio_scenes
-- Arabic language audio/video pipeline.
-- source (book/podcast) → source_unit (episode) → scenes
-- Each scene: transcript → subtitle → translation → annotation
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS km_audio_scenes (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  workspace_id     TEXT NOT NULL,
  group_id         TEXT,
  user_id          INTEGER,

  source_id        TEXT NOT NULL,   -- FK wv_sources
  source_unit_id   TEXT,            -- FK wv_source_units (episode)

  scene_number     INTEGER NOT NULL,
  season_number    INTEGER,
  episode_number   INTEGER,

  timestamp_start  TEXT,
  timestamp_end    TEXT,
  transcript_ar    TEXT,            -- raw Arabic
  subtitle_ar      TEXT,            -- cleaned subtitled Arabic
  translation_en   TEXT,
  transliteration  TEXT,

  linguistic_notes TEXT,
  vocab_json       JSON CHECK (vocab_json   IS NULL OR json_valid(vocab_json)),
  grammar_json     JSON CHECK (grammar_json IS NULL OR json_valid(grammar_json)),

  status           TEXT NOT NULL DEFAULT 'raw' CHECK (status IN (
    'raw', 'transcribed', 'subtitled', 'translated', 'annotated', 'published'
  )),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (source_unit_id, scene_number),

  FOREIGN KEY (workspace_id)   REFERENCES workspaces(id)       ON DELETE CASCADE,
  FOREIGN KEY (group_id)       REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)        REFERENCES users(id)            ON DELETE SET NULL,
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id)       ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id)  ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_source    ON km_audio_scenes(source_id);
CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_unit      ON km_audio_scenes(source_unit_id, scene_number);
CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_status    ON km_audio_scenes(status);
CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_workspace ON km_audio_scenes(workspace_id, status);

CREATE TRIGGER trg_km_audio_scenes_updated_at
AFTER UPDATE ON km_audio_scenes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_audio_scenes SET updated_at = datetime('now') WHERE id = OLD.id;
END;


-- ──────────────────────────────────────────────────────────────
-- km_cross_corpus_links
-- Torah / Tanakh / Gospel / Syriac ↔ Quran cross-mapping.
-- Domain 4 (Jewish WV), Domain 5 (Christian WV), Domain 6 (History).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS km_cross_corpus_links (
  id                     TEXT PRIMARY KEY,
  canonical_input        TEXT NOT NULL UNIQUE,
  workspace_id           TEXT NOT NULL,
  group_id               TEXT,
  user_id                INTEGER,

  quran_target_type      TEXT NOT NULL DEFAULT 'ayah' CHECK (quran_target_type IN (
    'ayah', 'surah', 'passage', 'unit'
  )),
  quran_target_id        TEXT NOT NULL,
  quran_arabic           TEXT,

  corpus                 TEXT NOT NULL CHECK (corpus IN (
    'torah', 'tanakh', 'gospel_matthew', 'gospel_mark',
    'gospel_luke', 'gospel_john', 'pauline', 'revelation', 'nt_other',
    'syriac', 'dead_sea_scrolls', 'rabbinic_midrash', 'talmud',
    'patristic', 'septuagint', 'aramaic_targum', 'other'
  )),
  corpus_ref             TEXT NOT NULL,
  corpus_text            TEXT,
  corpus_text_en         TEXT,

  relation_type          TEXT NOT NULL CHECK (relation_type IN (
    'parallel_narrative', 'transformation', 'correction',
    'allusion', 'cognate_term', 'covenantal_echo',
    'eschatological_parallel', 'typological', 'genealogical',
    'polemical_response', 'shared_tradition', 'other'
  )),
  quranic_transformation TEXT,
  scholarly_note         TEXT,

  wv_node_id             TEXT,
  evidence_source_id     TEXT,

  confidence             TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN (
    'high', 'medium', 'low', 'speculative'
  )),
  deleted_at             TEXT,
  meta_json              JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (workspace_id)       REFERENCES workspaces(id)      ON DELETE CASCADE,
  FOREIGN KEY (group_id)           REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)            REFERENCES users(id)            ON DELETE SET NULL,
  FOREIGN KEY (wv_node_id)         REFERENCES wv_nodes(id)         ON DELETE SET NULL,
  FOREIGN KEY (evidence_source_id) REFERENCES wv_sources(id)       ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_quran     ON km_cross_corpus_links(quran_target_id);
CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_corpus    ON km_cross_corpus_links(corpus, relation_type);
CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_node      ON km_cross_corpus_links(wv_node_id);
CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_workspace ON km_cross_corpus_links(workspace_id);

CREATE TRIGGER trg_km_cross_corpus_links_updated_at
AFTER UPDATE ON km_cross_corpus_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_cross_corpus_links SET updated_at = datetime('now') WHERE id = OLD.id;
END;
