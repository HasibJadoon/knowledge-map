PRAGMA foreign_keys = ON;



CREATE TABLE ar_balagha (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  term_ar     TEXT    NOT NULL,
  term_en     TEXT    NOT NULL,
  branch      TEXT    NOT NULL CHECK(branch IN ('bayan','maani','badi')),
  definition  TEXT    NOT NULL,
  examples    TEXT,  -- JSON array of example strings
  quran_refs  TEXT,  -- JSON array of {surah, ayah} objects
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_container_unit_task" (
  task_id        TEXT PRIMARY KEY,
  unit_id        TEXT NOT NULL,
  parent_task_id TEXT,

  task_type      TEXT NOT NULL CHECK (task_type IN (
    -- Core Quran passage tasks
    'reading', 'sentence_structure', 'morphology',
    'grammar_concepts', 'expressions', 'comprehension', 'passage_structure',
    -- Quranic linguistics & meaning
    'worldview', 'translation_semantics', 'near_synonyms', 'surah_analysis',
    -- Cross-domain
    'cross_corpus',
    -- Children-specific
    'children_lesson',
    -- Arabic Literature (books, videos, podcasts)
    'vocabulary', 'reaction'
  )),

  task_name      TEXT NOT NULL,
  task_json      JSON NOT NULL CHECK (json_valid(task_json)),

  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ai_generated', 'review', 'approved', 'published', 'archived'
  )),

  version_no     INTEGER NOT NULL DEFAULT 1,
  step_no        INTEGER,
  deleted_at     TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE
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
  updated_at     TEXT, surah     INTEGER, surah_ref TEXT, parent_unit_id TEXT, audio_url TEXT,

  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE
);

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

CREATE TABLE ar_domain (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  name_ar     TEXT    NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_domain_phrase (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id       INTEGER NOT NULL REFERENCES ar_domain(id),
  phrase_ar       TEXT    NOT NULL,
  phrase_en       TEXT    NOT NULL,
  transliteration TEXT,
  audio_url       TEXT,
  level           TEXT    NOT NULL DEFAULT 'beginner' CHECK(level IN ('beginner','intermediate','advanced')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE ar_lesson_enrollments (
  lesson_id     INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student',
  status        TEXT NOT NULL DEFAULT 'active',
  settings_json JSON,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT,
  updated_at    TEXT,
  PRIMARY KEY (lesson_id, user_id),
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE ar_lesson_unit_progress (
  lesson_id     INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  container_id  TEXT NOT NULL,
  unit_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'todo',
  score         REAL,
  time_spent_s  INTEGER,
  attempts      INTEGER NOT NULL DEFAULT 0,
  progress_json JSON CHECK (progress_json IS NULL OR json_valid(progress_json)),
  started_at    TEXT,
  completed_at  TEXT,
  updated_at    TEXT,
  PRIMARY KEY (lesson_id, user_id, unit_id),
  FOREIGN KEY (lesson_id)    REFERENCES ar_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id)      REFERENCES ar_container_units(id) ON DELETE CASCADE
);

CREATE TABLE ar_lesson_user_state (
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
  updated_at  TEXT, container_id TEXT, unit_id TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

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

CREATE TABLE ar_occ_grammar (
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

CREATE TABLE ar_occ_sentence (
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

CREATE TABLE ar_occ_token (
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
  text_no_diacritics TEXT,
  first_word        TEXT,
  last_word         TEXT,
  word_count        INTEGER,
  char_count        INTEGER,
  verse_mark        TEXT,
  verse_full        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT, text_non_diacritics TEXT, words JSON CHECK (words IS NULL OR json_valid(words)), text_uthmani_clean TEXT, text_bare          TEXT,
  FOREIGN KEY (surah) REFERENCES "ar_quran_surahs"(surah) ON DELETE RESTRICT,
  UNIQUE (surah, ayah)
);

CREATE TABLE ar_quran_lemma_occurrences (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_id        INTEGER NOT NULL,
  word_location   TEXT    NOT NULL,
  -- Corpus location string, e.g. "2:255:3"
  surah           INTEGER NOT NULL,
  ayah            INTEGER NOT NULL,
  token_index     INTEGER NOT NULL,
  -- Position within ayah (0-based)
  ar_token_occ_id TEXT,
  -- FK to ar_occ_token(ar_token_occ_id) — optional annotation link
  surface_ar      TEXT,
  word_simple     TEXT,
  word_diacritic  TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma_id, word_location),
  FOREIGN KEY (lemma_id) REFERENCES ar_quran_lemmas(lemma_id) ON DELETE CASCADE
  -- ar_token_occ_id FK: FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id)
  -- Kept commented until ar_occ_token data is backfilled
);

CREATE TABLE ar_quran_lemmas (
  lemma_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_text         TEXT    NOT NULL,
  lemma_text_clean   TEXT    NOT NULL,
  -- clean = diacritic-stripped
  words_count        INTEGER,
  uniq_words_count   INTEGER,
  ar_u_lemma         TEXT,
  -- FK to ar_u_lemmas(lemma_norm) once ar_u_lemmas is populated
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_quran_motif_index (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  motif_key       TEXT NOT NULL UNIQUE,
  -- Stable slug, e.g. "light_darkness", "creation_adam", "covenant"
  title           TEXT NOT NULL,
  title_ar        TEXT,
  description     TEXT,
  motif_json      TEXT CHECK (motif_json IS NULL OR json_valid(motif_json)),
  -- Extended definition, semantic field, related motifs
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_quran_motif_occurrences (
  id               TEXT    PRIMARY KEY,
  canonical_input  TEXT    NOT NULL UNIQUE,
  motif_id         TEXT    NOT NULL,
  -- FK to ar_quran_motif_index(id)
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER,
  ayah_to          INTEGER,
  node_id          TEXT,
  -- Optional FK to wv_nodes(id) — for graph-linked occurrences
  note             TEXT,
  occurrence_json  TEXT    CHECK (occurrence_json IS NULL OR json_valid(occurrence_json)),
  -- { intensity, variant, cluster_id, … }
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (motif_id) REFERENCES ar_quran_motif_index(id) ON DELETE CASCADE,
  FOREIGN KEY (surah)    REFERENCES ar_quran_surahs(surah)   ON DELETE RESTRICT
);

CREATE TABLE ar_quran_page_layout_lines (
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

CREATE TABLE ar_quran_passage_analysis (
  id               TEXT    PRIMARY KEY,
  canonical_input  TEXT    NOT NULL UNIQUE,
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  scope_ref        TEXT,
  -- e.g. "2:255-257" — machine-readable canonical reference
  unit_id          TEXT,
  -- Optional FK to ar_container_units(id)
  task_id          TEXT,
  -- Optional FK to ar_container_unit_task(id)
  passage_title    TEXT,
  passage_kind     TEXT,
  -- 'pericope'|'thematic_unit'|'ring_section'|'narrative'|'command_block'
  ring_position    TEXT,
  -- 'A'|'B'|'C'|"A'"|"B'"|'center' — position in chiastic ring
  section_count    INTEGER NOT NULL DEFAULT 0,
  sections_json    TEXT    NOT NULL DEFAULT '[]'
                           CHECK (json_valid(sections_json)),
  -- Array of section objects
  theme_keys_json  TEXT    CHECK (theme_keys_json IS NULL OR json_valid(theme_keys_json)),
  motif_keys_json  TEXT    CHECK (motif_keys_json IS NULL OR json_valid(motif_keys_json)),
  has_chiasm       INTEGER NOT NULL DEFAULT 0 CHECK (has_chiasm   IN (0, 1)),
  has_timeline     INTEGER NOT NULL DEFAULT 0 CHECK (has_timeline IN (0, 1)),
  has_clusters     INTEGER NOT NULL DEFAULT 0 CHECK (has_clusters IN (0, 1)),
  has_keyvalue     INTEGER NOT NULL DEFAULT 0 CHECK (has_keyvalue IN (0, 1)),
  schema_version   INTEGER NOT NULL DEFAULT 2,
  status           TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN (
                       'draft', 'in_review', 'published', 'archived'
                   )),
  deleted_at       TEXT,
  meta_json        TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

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

CREATE TABLE ar_quran_surah_analysis (
  surah                   INTEGER PRIMARY KEY,
  -- References ar_quran_surahs(surah)
  structure_json          TEXT CHECK (structure_json         IS NULL OR json_valid(structure_json)),
  ring_json               TEXT CHECK (ring_json              IS NULL OR json_valid(ring_json)),
  -- NEW — ring / chiastic structure map
  worldview_json          TEXT CHECK (worldview_json         IS NULL OR json_valid(worldview_json)),
  parallels_json          TEXT CHECK (parallels_json         IS NULL OR json_valid(parallels_json)),
  motif_map_json          TEXT CHECK (motif_map_json         IS NULL OR json_valid(motif_map_json)),
  -- NEW — motif presence and ayah ranges
  passage_map_json        TEXT CHECK (passage_map_json       IS NULL OR json_valid(passage_map_json)),
  -- NEW — canonical passage divisions
  unique_concepts_json    TEXT CHECK (unique_concepts_json   IS NULL OR json_valid(unique_concepts_json)),
  translation_delta_json  TEXT CHECK (translation_delta_json IS NULL OR json_valid(translation_delta_json)),
  surah_podcast_doc_id    TEXT,
  -- FK to wv_documents(id)
  surah_overview_doc_id   TEXT,
  -- FK to wv_documents(id)
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                              'draft', 'in_review', 'published', 'archived'
                          )),
  notes                   TEXT,
  deleted_at              TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah)                REFERENCES ar_quran_surahs(surah)  ON DELETE CASCADE,
  FOREIGN KEY (surah_podcast_doc_id) REFERENCES "wv_documents_legacy_20260413"(id)        ON DELETE SET NULL,
  FOREIGN KEY (surah_overview_doc_id) REFERENCES "wv_documents_legacy_20260413"(id)       ON DELETE SET NULL
);

CREATE TABLE "ar_quran_surah_ayah_meta" (
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

CREATE TABLE ar_quran_surah_pairs (
  id              TEXT    PRIMARY KEY,
  canonical_input TEXT    NOT NULL UNIQUE,
  surah_a         INTEGER NOT NULL,
  surah_b         INTEGER NOT NULL,
  pair_type       TEXT    NOT NULL CHECK (pair_type IN (
                      'dovetail', 'completion', 'contrast', 'mirror',
                      'sequence', 'thematic', 'structural', 'narrative_pair'
                  )),
  summary         TEXT,
  analysis_json   TEXT CHECK (analysis_json IS NULL OR json_valid(analysis_json)),
  -- Detailed structural / thematic / ring analysis
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah_a) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT,
  FOREIGN KEY (surah_b) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

CREATE TABLE ar_quran_surah_passage (
  id               TEXT    PRIMARY KEY,
  canonical_input  TEXT    NOT NULL UNIQUE,

  -- Quran coordinates
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  scope_ref        TEXT,              -- display ref: "12:1–7"

  -- Back-links to source task (optional — data survives task deletion)
  unit_id          TEXT,              -- FK ar_container_units
  task_id          TEXT,              -- FK ar_container_unit_task

  -- Core content
  passage_title    TEXT,
  sections_json    JSON NOT NULL DEFAULT '[]' CHECK (json_valid(sections_json)),

  -- Extracted flags for fast filtering (denormalised from sections_json)
  has_chiasm       INTEGER NOT NULL DEFAULT 0 CHECK (has_chiasm   IN (0, 1)),
  has_timeline     INTEGER NOT NULL DEFAULT 0 CHECK (has_timeline IN (0, 1)),
  has_clusters     INTEGER NOT NULL DEFAULT 0 CHECK (has_clusters IN (0, 1)),
  has_keyvalue     INTEGER NOT NULL DEFAULT 0 CHECK (has_keyvalue IN (0, 1)),
  section_count    INTEGER NOT NULL DEFAULT 0,

  -- Schema version of the task_json that produced this row
  schema_version   INTEGER NOT NULL DEFAULT 2,

  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'archived'
  )),

  deleted_at       TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, ayah_from, ayah_to),

  FOREIGN KEY (surah)    REFERENCES ar_quran_surahs(surah)          ON DELETE RESTRICT,
  FOREIGN KEY (unit_id)  REFERENCES ar_container_units(id)          ON DELETE SET NULL,
  FOREIGN KEY (task_id)  REFERENCES ar_container_unit_task(task_id) ON DELETE SET NULL
);

CREATE TABLE "ar_quran_surahs" (
  surah        INTEGER PRIMARY KEY,
  name_ar      TEXT NOT NULL,
  name_en      TEXT,
  ayah_count   INTEGER NOT NULL,
  meta_json    JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT
, revelation_place TEXT CHECK (
  revelation_place IS NULL OR revelation_place IN ('meccan', 'medinan', 'both')
), revelation_order    INTEGER, juz_start           INTEGER, juz_end             INTEGER, name_transliteration TEXT, theme_summary        TEXT);

CREATE TABLE "ar_quran_synonym_topic_words" (
  topic_id           TEXT NOT NULL,
  word_norm          TEXT NOT NULL,   -- normalised Arabic (no diacritics)

  -- Arabic forms
  word_ar            TEXT,            -- with diacritics
  word_ar_pattern    TEXT,            -- morphological pattern (مَفعَل etc.)

  -- Root
  root_norm          TEXT,
  root_ar            TEXT,

  -- Multilingual glosses
  word_en            TEXT,            -- English gloss
  word_ur            TEXT,            -- Urdu meaning (from source book)

  -- THE KEY FIELD: what makes THIS word unique vs its near-synonyms
  -- e.g. "سَكَنَ = settlement after migration from elsewhere"
  semantic_nuance_en TEXT,
  semantic_nuance_ur TEXT,

  -- Quranic evidence: [{surah, ayah, text_ar, note}]
  ayah_refs_json     JSON CHECK (ayah_refs_json IS NULL OR json_valid(ayah_refs_json)),

  -- Link to canonical lexicon entry (optional)
  ar_u_lexicon       TEXT,            -- FK ar_u_lexicon

  -- Source tracking within book
  source_id          TEXT,            -- FK ar_u_sources
  page_no            INTEGER,

  order_index        INTEGER NOT NULL DEFAULT 0,

  meta_json          JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  PRIMARY KEY (topic_id, word_norm),
  FOREIGN KEY (topic_id)     REFERENCES ar_quran_synonym_topics(topic_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon)        ON DELETE SET NULL
);

CREATE TABLE ar_quran_synonym_topics (
  topic_id   TEXT PRIMARY KEY,
  topic_en   TEXT NOT NULL,
  topic_ur   TEXT,
  meta_json  JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
, source_id       TEXT, page_no         INTEGER, description_en  TEXT, description_ur  TEXT, cross_refs_json JSON CHECK (
  cross_refs_json IS NULL OR json_valid(cross_refs_json)
), word_count   INTEGER NOT NULL DEFAULT 0, surahs_json  JSON CHECK (
  surahs_json IS NULL OR json_valid(surahs_json)
), deleted_at TEXT);

CREATE TABLE ar_quran_tafsir_entries (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  source_id       INTEGER,
  -- Optional FK to wv_sources(id) if tracked in the library
  surah           INTEGER NOT NULL,
  ayah_from       INTEGER NOT NULL,
  ayah_to         INTEGER NOT NULL,
  mufassir_name   TEXT NOT NULL,
  work_title      TEXT,
  -- e.g. "Tafsir Ibn Kathir", "Fi Zilal al-Quran"
  view_key        TEXT,
  -- Stable slug, e.g. "ibn_kathir_2_255"
  entry_type      TEXT NOT NULL CHECK (entry_type IN (
                      'explanation', 'asbab_al_nuzul', 'linguistic',
                      'legal', 'thematic', 'isnad', 'comparative',
                      'question', 'objection', 'rebuttal'
                  )),
  excerpt_ar      TEXT,
  excerpt_en      TEXT,
  summary_md      TEXT,
  -- Markdown summary for UI display
  argument_json   TEXT CHECK (argument_json IS NULL OR json_valid(argument_json)),
  -- { claim, evidence [], conclusion }
  meta_json       TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
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

CREATE TABLE ar_quran_translations (
  surah INTEGER NOT NULL,
  ayah INTEGER NOT NULL,
  translation_haleem TEXT,
  translation_asad TEXT,
  translation_sahih TEXT,
  translation_usmani TEXT,
  footnotes_sahih TEXT,
  footnotes_usmani TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT, footnotes_haleem TEXT,
  PRIMARY KEY (surah, ayah)
);

CREATE TABLE "ar_quran_word_occurrences" (
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
  updated_at   TEXT, ar_u_lemma      TEXT, ar_u_morphology TEXT, surface_norm    TEXT, root_norm       TEXT, occurrence_key  TEXT,
  UNIQUE (surah, ayah, position, word_id),
  FOREIGN KEY (surah, ayah) REFERENCES ar_quran_ayah(surah, ayah) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
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

CREATE TABLE ar_source_chunks (
  chunk_id       TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,
  page_no        INTEGER,
  locator        TEXT,
  heading_raw    TEXT,
  heading_norm   TEXT,
  text           TEXT NOT NULL,
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT, chunk_type TEXT NOT NULL DEFAULT 'lexicon' CHECK (chunk_type IN ('grammar','literature','lexicon','reference','other')), text_search TEXT NOT NULL DEFAULT '', content_json JSON CHECK (content_json IS NULL OR json_valid(content_json)),
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source)
);

CREATE TABLE ar_source_index (
  index_id       TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,
  term_raw       TEXT NOT NULL,
  term_norm      TEXT NOT NULL,
  term_ar        TEXT,
  term_ar_guess  TEXT,
  head_chunk_id  TEXT,
  index_page_no  INTEGER,
  index_locator  TEXT,
  page_refs_json JSON NOT NULL CHECK (json_valid(page_refs_json)),
  variants_json  JSON CHECK (variants_json IS NULL OR json_valid(variants_json)),
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source),
  FOREIGN KEY (head_chunk_id) REFERENCES ar_source_chunks(chunk_id)
);

CREATE TABLE ar_source_toc (
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

CREATE TABLE ar_srs (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER NOT NULL,
  lesson_id       INTEGER,

  item_type       TEXT NOT NULL,   
  item_key        TEXT NOT NULL,   

  
  card_json       JSON NOT NULL CHECK (json_valid(card_json)),

  
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

  
  UNIQUE (user_id, item_type, item_key)
);

CREATE TABLE ar_token_lexicon_link (
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

CREATE TABLE ar_token_pair_links ( id TEXT PRIMARY KEY, user_id INTEGER, container_id TEXT, unit_id TEXT, link_type TEXT NOT NULL, from_token_occ TEXT NOT NULL, to_token_occ TEXT NOT NULL, note TEXT, meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL, FOREIGN KEY (container_id) REFERENCES ar_containers(id) ON DELETE SET NULL, FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE SET NULL, FOREIGN KEY (from_token_occ) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE, FOREIGN KEY (to_token_occ) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE );

CREATE TABLE ar_u_expressions (
  ar_u_expression  TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  label            TEXT,
  text_ar          TEXT,
  sequence_json    JSON CHECK (sequence_json IS NULL OR json_valid(sequence_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
, ar_u_lexicon TEXT
  REFERENCES ar_u_lexicon(ar_u_lexicon)
  ON DELETE SET NULL, surah INTEGER, ayah INTEGER, expression_type TEXT CHECK (expression_type IN (
  'verbal_idiom', 'collocation', 'formulaic_phrase',
  'hapax_legomenon', 'quranic_formula', 'divine_declaration',
  'superlative_idafa', 'conditional_formula', 'near_synonym_cluster', 'other'
)), domain TEXT DEFAULT 'quran' CHECK (domain IN (
  'quran', 'classical_arabic', 'modern_arabic', 'other'
)));

CREATE TABLE ar_u_grammar (
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

  created_at       TEXT NOT NULL,
  updated_at       TEXT
);

CREATE TABLE ar_u_grammar_raw (
  ar_u_grammar     TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  grammar_id       TEXT NOT NULL UNIQUE,
  category         TEXT,
  title            TEXT,
  title_ar         TEXT,
  definition       TEXT,
  definition_ar    TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL,
  updated_at       TEXT
);

CREATE TABLE ar_u_grammar_relations (
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

CREATE TABLE ar_u_lemma_morphology (
  ar_u_lemma      TEXT NOT NULL,
  -- FK to ar_u_lemmas(lemma_norm)
  ar_u_morphology TEXT NOT NULL,
  -- FK to ar_u_morphology(ar_u_morphology)
  link_role       TEXT,
  -- 'canonical'|'variant'|'derived'|'inflected'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ar_u_lemma, ar_u_morphology),
  FOREIGN KEY (ar_u_lemma)      REFERENCES ar_u_lemmas(lemma_norm)           ON DELETE CASCADE,
  FOREIGN KEY (ar_u_morphology) REFERENCES ar_u_morphology(ar_u_morphology)  ON DELETE CASCADE
);

CREATE TABLE ar_u_lemmas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_input TEXT    NOT NULL UNIQUE,
  -- Stable external key — Buckwalter, QAC ID, or hash
  lemma_ar        TEXT    NOT NULL,
  -- Arabic script canonical form, e.g. "كَتَبَ"
  lemma_norm      TEXT    NOT NULL UNIQUE,
  -- Normalized (no diacritics), e.g. "كتب"
  pos             TEXT    NOT NULL,
  -- 'noun'|'verb'|'particle'|'adjective'|'pronoun'|'adverb'|'other'
  ar_u_root       TEXT,
  -- Trilateral root, e.g. "ك-ت-ب" — FK to ar_u_roots
  root_norm       TEXT,
  gloss_primary   TEXT,
  features_json   TEXT    CHECK (features_json  IS NULL OR json_valid(features_json)),
  -- { gender, number, derived_form, verb_form, transitivity, … }
  meta_json       TEXT    CHECK (meta_json IS NULL OR json_valid(meta_json)),
  -- { frequency, corpus_source, notes, legacy_ar_u_token }
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

CREATE TABLE ar_u_lexicon (
  ar_u_lexicon         TEXT PRIMARY KEY,
  canonical_input      TEXT NOT NULL UNIQUE,

  
  unit_type            TEXT NOT NULL
                       CHECK (unit_type IN ('word','key_term','verbal_idiom','expression')),

  
  surface_ar           TEXT NOT NULL,
  surface_norm         TEXT NOT NULL,

  
  lemma_ar             TEXT,
  lemma_norm           TEXT,
  pos                  TEXT,

  
  root_norm            TEXT,
  ar_u_root            TEXT,

  
  valency_id           TEXT,
  sense_key            TEXT NOT NULL,

  
  meanings_json        TEXT CHECK (meanings_json IS NULL OR json_valid(meanings_json)),
  synonyms_json        TEXT CHECK (synonyms_json IS NULL OR json_valid(synonyms_json)),
  antonyms_json        TEXT CHECK (antonyms_json IS NULL OR json_valid(antonyms_json)),

  
  gloss_primary        TEXT,
  gloss_secondary_json TEXT CHECK (gloss_secondary_json IS NULL OR json_valid(gloss_secondary_json)),
  usage_notes          TEXT,

  
  morph_pattern        TEXT,
  morph_features_json  TEXT CHECK (morph_features_json IS NULL OR json_valid(morph_features_json)),
  morph_derivations_json TEXT CHECK (morph_derivations_json IS NULL OR json_valid(morph_derivations_json)),

  
  expression_type      TEXT,
  expression_text      TEXT,
  expression_token_range_json TEXT CHECK (expression_token_range_json IS NULL OR json_valid(expression_token_range_json)),
  expression_meaning   TEXT,

  
  references_json      TEXT CHECK (references_json IS NULL OR json_valid(references_json)),
  flags_json           TEXT CHECK (flags_json IS NULL OR json_valid(flags_json)),

  
  cards_json           TEXT CHECK (cards_json IS NULL OR json_valid(cards_json)),
  meta_json            TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),

  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('draft','active','deprecated')),

  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT,

  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL,

  
  
  

  
  CHECK (
    unit_type NOT IN ('expression','verbal_idiom')
    OR (expression_text IS NOT NULL AND length(trim(expression_text)) > 0)
  ),

  
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      expression_type IS NULL
      AND expression_text IS NULL
      AND expression_token_range_json IS NULL
      AND expression_meaning IS NULL
    )
  ),

  
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      (lemma_norm IS NOT NULL AND length(trim(lemma_norm)) > 0)
      OR (root_norm IS NOT NULL AND length(trim(root_norm)) > 0)
    )
  )
);

CREATE TABLE ar_u_lexicon_evidence (
  ar_u_lexicon        TEXT NOT NULL,
  evidence_id         TEXT NOT NULL,     

  
  locator_type        TEXT NOT NULL DEFAULT 'chunk'
                      CHECK (locator_type IN ('chunk','app','url')),

  
  source_id           TEXT,
  source_type         TEXT NOT NULL DEFAULT 'book'
                      CHECK (source_type IN (
                        'book','tafsir','quran','hadith',
                        'paper','website','notes','app'
                      )),

  
  chunk_id            TEXT,
  page_no             INTEGER,
  heading_raw         TEXT,
  heading_norm        TEXT,

  
  url                 TEXT,

  
  app_payload_json    TEXT CHECK (app_payload_json IS NULL OR json_valid(app_payload_json)),

  
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

  
  extract_text        TEXT,
  note_md             TEXT,

  meta_json           TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,

  PRIMARY KEY (ar_u_lexicon, evidence_id),

  FOREIGN KEY (ar_u_lexicon)
    REFERENCES ar_u_lexicon(ar_u_lexicon)
    ON DELETE CASCADE,

  
  
  

  
  CHECK (
    locator_type != 'chunk'
    OR (source_id IS NOT NULL AND chunk_id IS NOT NULL)
  ),

  
  CHECK (
    locator_type != 'url'
    OR url IS NOT NULL
  ),

  
  CHECK (
    locator_type != 'app'
    OR app_payload_json IS NOT NULL
  )
);

CREATE TABLE ar_u_lexicon_morphology (
  ar_u_lexicon    TEXT NOT NULL,
  ar_u_morphology TEXT NOT NULL,

  link_role       TEXT NOT NULL DEFAULT 'primary'
    CHECK (link_role IN ('primary','inflection','derived','variant')),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ar_u_lexicon, ar_u_morphology),
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_morphology) REFERENCES ar_u_morphology(ar_u_morphology) ON DELETE CASCADE
);

CREATE TABLE ar_u_morphology (
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
  derived_pattern  TEXT CHECK (
    derived_pattern IN (
      'ism_fael','ism_mafool','masdar','sifah_mushabbahah','ism_mubalaghah',
      'ism_zaman','ism_makan','ism_ala','tafdeel','nisbah','other'
    )
  ),

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

CREATE TABLE ar_u_roots (
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

CREATE TABLE ar_u_sentences (
  ar_u_sentence    TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  sentence_kind    TEXT NOT NULL,
  sequence_json    JSON CHECK (sequence_json IS NULL OR json_valid(sequence_json)),
  text_ar          TEXT,

  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE TABLE ar_u_sources (
  ar_u_source       TEXT PRIMARY KEY,
  canonical_input   TEXT NOT NULL UNIQUE,
  source_code       TEXT NOT NULL UNIQUE,
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

CREATE TABLE "capture_notes" (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  domain TEXT NOT NULL DEFAULT 'worldview' CHECK (domain IN ('arabic_media', 'arabic_linguistics', 'quranic_concepts', 'worldview', 'english_expression')),
  stage TEXT NOT NULL DEFAULT 'inbox' CHECK (stage IN ('inbox', 'review', 'done')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  quote_text TEXT,
  source_label TEXT,
  resources_json JSON NOT NULL DEFAULT '[]' CHECK (json_valid(resources_json)),
  compact_context TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('note', 'quran_ayah', 'ar_u_lexicon', 'wv_concept')),
  target_id TEXT NOT NULL,
  body_md TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE km_audio_scenes (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  workspace_id     TEXT NOT NULL,
  group_id         TEXT,
  user_id          INTEGER,

  source_id        TEXT NOT NULL,   -- FK wv_sources (the book / podcast / series)
  source_unit_id   TEXT,            -- FK wv_source_units (episode / segment)

  scene_number     INTEGER NOT NULL,
  season_number    INTEGER,
  episode_number   INTEGER,

  timestamp_start  TEXT,            -- HH:MM:SS.mmm
  timestamp_end    TEXT,
  transcript_ar    TEXT,            -- raw Arabic transcription
  subtitle_ar      TEXT,            -- cleaned subtitle Arabic
  translation_en   TEXT,            -- English translation
  transliteration  TEXT,            -- optional romanisation

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

  FOREIGN KEY (workspace_id)   REFERENCES workspaces(id)      ON DELETE CASCADE,
  FOREIGN KEY (group_id)       REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)        REFERENCES users(id)            ON DELETE SET NULL,
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id)       ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id)  ON DELETE SET NULL
);

CREATE TABLE km_capture (
  id          TEXT PRIMARY KEY,
  area        TEXT NOT NULL DEFAULT 'quran',  -- 'quran'|'arabic'|'wv'|'vocabulary'
  stage       TEXT NOT NULL DEFAULT 'inbox',  -- 'inbox'|'review'|'done'
  status      TEXT NOT NULL DEFAULT 'draft',  -- 'draft'|'active'|'archived'
  title       TEXT NOT NULL DEFAULT '',
  editor_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  plain_text  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
, capture_kind  TEXT NOT NULL DEFAULT 'note', content_type  TEXT NOT NULL DEFAULT 'tiptap_doc', editor_doc    JSON, source_json   JSON, footnotes     JSON NOT NULL DEFAULT '[]', tags          JSON NOT NULL DEFAULT '[]', sections      JSON NOT NULL DEFAULT '[]', capture_refs  JSON NOT NULL DEFAULT '[]', r2_resources  JSON NOT NULL DEFAULT '[]', preview       JSON, target        JSON, created_by    TEXT, updated_by    TEXT, source_kind   TEXT NOT NULL DEFAULT 'manual_capture', autosave_version INTEGER NOT NULL DEFAULT 1, schema_version  INTEGER NOT NULL DEFAULT 1);

CREATE TABLE km_cross_corpus_links (
  id                     TEXT PRIMARY KEY,
  canonical_input        TEXT NOT NULL UNIQUE,
  workspace_id           TEXT NOT NULL,
  group_id               TEXT,
  user_id                INTEGER,

  -- Quran anchor
  quran_target_type      TEXT NOT NULL DEFAULT 'ayah' CHECK (quran_target_type IN (
    'ayah', 'surah', 'passage', 'unit'
  )),
  quran_target_id        TEXT NOT NULL,   -- "12:4" or unit_id
  quran_arabic           TEXT,

  -- External corpus
  corpus                 TEXT NOT NULL CHECK (corpus IN (
    'torah', 'tanakh', 'gospel_matthew', 'gospel_mark',
    'gospel_luke', 'gospel_john', 'pauline', 'revelation', 'nt_other',
    'syriac', 'dead_sea_scrolls', 'rabbinic_midrash', 'talmud',
    'patristic', 'septuagint', 'aramaic_targum', 'other'
  )),
  corpus_ref             TEXT NOT NULL,   -- "Genesis 37:5–11"
  corpus_text            TEXT,
  corpus_text_en         TEXT,

  -- Relationship type
  relation_type          TEXT NOT NULL CHECK (relation_type IN (
    'parallel_narrative', 'transformation', 'correction',
    'allusion', 'cognate_term', 'covenantal_echo',
    'eschatological_parallel', 'typological', 'genealogical',
    'polemical_response', 'shared_tradition', 'other'
  )),
  quranic_transformation TEXT,
  scholarly_note         TEXT,

  -- Graph linkage
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

CREATE TABLE km_plans (
  id                TEXT PRIMARY KEY,            -- PLAN:01JVPLAN...
  schema_version    INTEGER NOT NULL DEFAULT 1,

  workspace_id      TEXT NOT NULL,
  group_id          TEXT,
  user_id           INTEGER,

  -- Source stream linkage
  source_stream     TEXT NOT NULL CHECK (source_stream IN ('capture', 'ar', 'wv')),
  source_type       TEXT NOT NULL,               -- e.g. 'sp_weekly_tasks', 'ar_unit', 'wv_note'
  source_id         TEXT NOT NULL,               -- ULID or integer stringified
  source_capture_id TEXT,                        -- CAP:... (always if capture exists)

  -- Human-readable plan data
  title             TEXT NOT NULL,
  summary           TEXT,
  notes             TEXT,

  -- Status & priority
  status            TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'inbox', 'refine', 'planned', 'ready', 'activated', 'blocked', 'fed', 'archived'
  )),
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  effort            TEXT CHECK (effort IN ('small', 'medium', 'large')),

  -- Scheduling
  scheduled_for     TEXT,
  due_at            TEXT,

  -- Execution model
  execution_mode    TEXT NOT NULL DEFAULT 'task_then_feed' CHECK (execution_mode IN (
    'direct_feed', 'task_then_feed'
  )),

  -- JSON payloads
  feed_target_json  JSON CHECK (feed_target_json IS NULL OR json_valid(feed_target_json)),
  plan_json         JSON CHECK (plan_json IS NULL OR json_valid(plan_json)),
  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  -- Audit
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

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

CREATE TABLE note_links (
  note_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (note_id, target_type, target_id),
  FOREIGN KEY (note_id) REFERENCES ar_capture_notes(id) ON DELETE CASCADE
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

CREATE TABLE sp_passage_planner (
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
  display_ref          TEXT,            -- "12:1-7"

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

  FOREIGN KEY (workspace_id)    REFERENCES workspaces(id)         ON DELETE CASCADE,
  FOREIGN KEY (group_id)        REFERENCES workspace_groups(id)   ON DELETE SET NULL,
  FOREIGN KEY (user_id)         REFERENCES users(id)              ON DELETE SET NULL,
  FOREIGN KEY (unit_id)         REFERENCES ar_container_units(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id)    REFERENCES ar_containers(id)      ON DELETE SET NULL,
  FOREIGN KEY (surah)           REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT,
  FOREIGN KEY (podcast_doc_id)  REFERENCES "wv_documents_legacy_20260413"(id)       ON DELETE SET NULL,
  FOREIGN KEY (study_doc_id)    REFERENCES "wv_documents_legacy_20260413"(id)       ON DELETE SET NULL,
  FOREIGN KEY (children_doc_id) REFERENCES "wv_documents_legacy_20260413"(id)       ON DELETE SET NULL
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

CREATE TABLE "sp_weekly_tasks" (
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
  updated_at TEXT, source_plan_id    TEXT, source_capture_id TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (kanban_lane_id) REFERENCES sp_kanban_lanes(id) ON DELETE SET NULL,
  FOREIGN KEY (related_node_id) REFERENCES wv_nodes(id) ON DELETE SET NULL
);

CREATE TABLE ui_passage_diagram_nodes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  diagram_id       TEXT NOT NULL,
  node_id          TEXT NOT NULL,

  role             TEXT CHECK (role IN (
    'primary',
    'secondary',
    'supporting',
    'claim',
    'evidence',
    'law',
    'flow_step',
    'theme',
    'concept',
    'hidden'
  )),

  order_index      INTEGER NOT NULL DEFAULT 0,
  is_entry         INTEGER NOT NULL DEFAULT 0 CHECK (is_entry IN (0, 1)),
  is_exit          INTEGER NOT NULL DEFAULT 0 CHECK (is_exit IN (0, 1)),

  ui_json          JSON CHECK (ui_json IS NULL OR json_valid(ui_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (diagram_id, node_id),

  FOREIGN KEY (diagram_id) REFERENCES ui_passage_diagrams(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id)    REFERENCES wv_nodes(id)            ON DELETE CASCADE
);

CREATE TABLE ui_passage_diagrams (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  unit_id          TEXT NOT NULL,              -- FK ar_container_units
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  passage_ref      TEXT,                       -- "12:1-18"

  diagram_key      TEXT NOT NULL,              -- cluster_map / proof_tree / flow / graph
  title            TEXT NOT NULL,
  description      TEXT,

  renderer         TEXT NOT NULL,              -- rect_3d_grid / vertical_proof_tree / animated_path_flow / node_graph
  diagram_type     TEXT NOT NULL CHECK (diagram_type IN (
    'cluster_map',
    'claim_evidence_tree',
    'sequence_flow',
    'law_derivation',
    'ayah_focus_strip',
    'constellation_graph',
    'custom'
  )),

  order_index      INTEGER NOT NULL DEFAULT 0,
  is_default       INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),

  layout_json      JSON CHECK (layout_json  IS NULL OR json_valid(layout_json)),
  gsap_json        JSON CHECK (gsap_json    IS NULL OR json_valid(gsap_json)),
  filters_json     JSON CHECK (filters_json IS NULL OR json_valid(filters_json)),
  meta_json        JSON CHECK (meta_json    IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (unit_id, diagram_key),

  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE,
  FOREIGN KEY (surah)   REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
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

CREATE TABLE wv_brainstorm_session (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  content      TEXT,  -- markdown/rich text
  worldview_id INTEGER REFERENCES wv_worldview(id),
  topic_id     INTEGER REFERENCES wv_topic(id),
  status       TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE wv_comparison (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  topic_id    INTEGER REFERENCES wv_topic(id),
  description TEXT,
  status      TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_comparison_cell (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id         INTEGER NOT NULL REFERENCES wv_comparison_row(id),
  tab_id         INTEGER NOT NULL REFERENCES wv_comparison_tab(id),
  surah          INTEGER,
  ayah_from      INTEGER,
  ayah_to        INTEGER,
  scripture_ref  TEXT,
  scripture_text TEXT,
  highlight_id   INTEGER REFERENCES wv_highlights(id),
  source_unit_id INTEGER REFERENCES wv_source_units(id),
  free_text      TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(row_id, tab_id)
);

CREATE TABLE wv_comparison_row (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  comparison_id INTEGER NOT NULL REFERENCES wv_comparison(id),
  theme         TEXT,
  position      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE wv_comparison_tab (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  comparison_id INTEGER NOT NULL REFERENCES wv_comparison(id),
  label         TEXT    NOT NULL,
  source_type   TEXT    NOT NULL CHECK(source_type IN ('quran','bible','torah','hadith','wv_source','free')),
  worldview_id  INTEGER REFERENCES wv_worldview(id),
  wv_source_id  INTEGER REFERENCES wv_sources(id),
  position      INTEGER NOT NULL DEFAULT 0,
  color         TEXT
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

CREATE TABLE "wv_document_blocks" (
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
  block_kind TEXT,
  scope_ref TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  task_type TEXT,
  renderer TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES wv_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_block_id) REFERENCES "wv_document_blocks"(id) ON DELETE CASCADE
);

CREATE TABLE wv_document_versions (
  id              TEXT    PRIMARY KEY,
  canonical_input TEXT    NOT NULL UNIQUE,
  document_id     TEXT    NOT NULL,
  version_no      INTEGER NOT NULL,
  body_json       TEXT    NOT NULL CHECK (json_valid(body_json)),
  snapshot_note   TEXT,
  -- Human note, e.g. "Before ring-structure refactor"
  created_by      INTEGER,
  -- FK to users(id) — activate once users table confirmed
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (document_id, version_no),
  FOREIGN KEY (document_id) REFERENCES "wv_documents_legacy_20260413"(id) ON DELETE CASCADE
  -- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
  production_type TEXT CHECK (production_type IN (
    'podcast', 'youtube', 'article', 'newsletter', 'short', 'lesson', 'slides',
    'podcast_script', 'surah_podcast', 'children_lesson', 'surah_overview',
    'audio_transcript', 'cross_corpus_analysis', 'passage_study', 'other'
  )),
  target_audience TEXT CHECK (target_audience IN ('adult', 'child', 'mixed')),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  published_at TEXT,
  surah INTEGER,
  unit_id TEXT,
  source_id TEXT,
  source_unit_id TEXT,
  domain TEXT CHECK (domain IN (
    'quran', 'arabic', 'classical_theology', 'jewish_wv',
    'christian_wv', 'history', 'worldview', 'planner', 'workspace', 'other'
  )),
  deleted_at TEXT,
  doc_scope_type TEXT,
  ayah_from INTEGER,
  ayah_to INTEGER,
  container_id TEXT,
  primary_passage_ref TEXT,
  canonical_quran_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (related_node_id) REFERENCES wv_nodes(id) ON DELETE SET NULL
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

CREATE TABLE "wv_node_edges" (
  id             TEXT  PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id   TEXT  NOT NULL,
  group_id       TEXT,
  from_node_id   TEXT  NOT NULL,
  to_node_id     TEXT  NOT NULL,
  relation_type  TEXT  NOT NULL CHECK (relation_type IN (
    -- ── Original types (2026-03-14) ────────────────────────
    'supports', 'contradicts', 'mentions', 'related_to', 'part_of',
    'derived_from', 'feeds_output', 'questions', 'cites', 'about',
    'illustrates', 'defines', 'parallels', 'other',
    -- ── NEW — Qur'anic literary / structural relations ─────
    'sequence',        -- A then B in narrative / surah order
    'leads_to',        -- A leads to / results in B
    'resolves',        -- A resolves the tension in B
    'echoes',          -- A echoes / recalls B
    'contrasts_with',  -- A is in contrast with B
    'completes',       -- A completes the arc / idea of B
    'dovetails_with',  -- A dovetails with B (surah-level)
    'center_of',       -- A is the center / pivot of B (ring structure)
    'framed_by',       -- A is framed by B (outer ring)
    'mirrors',         -- A mirrors B structurally
    'anticipates',     -- A anticipates / foreshadows B
    'fulfilled_by'     -- A is fulfilled / answered by B
  )),
  strength       REAL,
  order_index    INTEGER NOT NULL DEFAULT 0,
  note           TEXT,
  meta_json      TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)       ON DELETE CASCADE,
  FOREIGN KEY (group_id)     REFERENCES workspace_groups(id)  ON DELETE SET NULL,
  FOREIGN KEY (from_node_id) REFERENCES wv_nodes(id)          ON DELETE CASCADE,
  FOREIGN KEY (to_node_id)   REFERENCES wv_nodes(id)          ON DELETE CASCADE
);

CREATE TABLE "wv_node_quran_links" (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  node_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('ayah', 'surah_ayah_meta', 'translation_passage', 'synonym_topic', 'other')),
  target_ref TEXT NOT NULL,
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

CREATE TABLE wv_node_tafsir_links (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id    TEXT NOT NULL,
  node_id         TEXT NOT NULL,
  tafsir_entry_id TEXT NOT NULL,
  relation        TEXT NOT NULL CHECK (relation IN (
                      'supports', 'challenges', 'contextualizes',
                      'elaborates', 'contradicts', 'cites', 'references'
                  )),
  note            TEXT,
  meta_json       TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)    REFERENCES workspaces(id)                ON DELETE CASCADE,
  FOREIGN KEY (node_id)         REFERENCES wv_nodes(id)                  ON DELETE CASCADE,
  FOREIGN KEY (tafsir_entry_id) REFERENCES ar_quran_tafsir_entries(id)   ON DELETE CASCADE
);

CREATE TABLE "wv_nodes" (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  workspace_id     TEXT NOT NULL,
  group_id         TEXT,
  user_id          INTEGER,
  node_type        TEXT NOT NULL CHECK (node_type IN (
    -- ── Original ontology (2026-03-24) ─────────────────────
    'cluster', 'subcluster', 'group', 'collection',
    'theme', 'concept', 'principle', 'law', 'pattern', 'framework',
    'claim', 'evidence', 'proof_step', 'counter_claim', 'assumption',
    'inference',
    'flow', 'process', 'sequence_step', 'transition',
    'cause', 'effect', 'state', 'event',
    'actor', 'role', 'trait', 'intention', 'emotion', 'decision',
    'psych_state', 'cognitive_bias', 'moral_state', 'spiritual_state',
    'ayah_ref', 'surah_ref', 'quranic_pattern',
    'source', 'source_unit', 'quote', 'reference',
    'question', 'reflection', 'insight', 'warning', 'lesson',
    'content_piece', 'podcast_segment', 'lesson_block', 'short_clip',
    'diagram_anchor', 'highlight', 'focus_node',
    -- ── NEW — Qur'anic analysis types ──────────────────────
    'motif',             -- a recurring Qur'anic motif node
    'conflict',          -- a doctrinal / textual conflict node
    'tafsir_view',       -- a mufassir interpretation node
    'tafsir_question',   -- an unresolved tafsir question
    'structural_section',-- a named structural section of a surah
    'ring_anchor',       -- anchor point in a chiastic / ring structure
    'contrast_pair',     -- two contrasting elements in a passage
    'lexical_theme',     -- a thematic cluster of lemmas / roots
    'surah_pair',        -- a paired-surah relationship node
    'dovetail',          -- a thematic dovetail connection
    'completion',        -- a surah-completion relationship
    'passage_ref'        -- a named passage reference node
  )),
  title            TEXT,
  text_plain       TEXT,
  summary          TEXT,
  slug             TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                       'draft', 'active', 'archived', 'merged'
                   )),
  data_json        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  meta_json        TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)       ON DELETE CASCADE,
  FOREIGN KEY (group_id)     REFERENCES workspace_groups(id)  ON DELETE SET NULL,
  FOREIGN KEY (user_id)      REFERENCES users(id)             ON DELETE SET NULL
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
  updated_at TEXT, scholarly_domain TEXT CHECK (scholarly_domain IN (
  'quran', 'arabic', 'kalam', 'fiqh', 'hadith', 'tasawwuf',
  'jewish_theology', 'christian_theology', 'philosophy',
  'history', 'linguistics', 'other'
)), school             TEXT, km_priority        TEXT CHECK (km_priority IN ('primary', 'secondary', 'reference')), primary_works_json JSON CHECK (primary_works_json IS NULL OR json_valid(primary_works_json)), era_ce             TEXT, born_ce            TEXT, died_ce            TEXT, origin             TEXT, core_claim         TEXT, deleted_at         TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_person (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  nickname     TEXT,
  relationship TEXT    NOT NULL CHECK(relationship IN ('family','friend','colleague','acquaintance','mentor')),
  family_role  TEXT,
  visibility   TEXT    NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','workspace','public')),
  avatar_url   TEXT,
  bio          TEXT,
  scholar_id   INTEGER REFERENCES wv_people(id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_plan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER,  -- REFERENCES workspaces(id)
  title        TEXT    NOT NULL,
  description  TEXT,
  type         TEXT    NOT NULL DEFAULT 'reading' CHECK(type IN ('reading','research','podcast','project','arabic')),
  start_date   TEXT    NOT NULL,
  end_date     TEXT,
  status       TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','archived')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_plan_item (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id      INTEGER NOT NULL REFERENCES wv_plan(id),
  source_id    INTEGER REFERENCES wv_sources(id),
  unit_id      INTEGER REFERENCES wv_source_units(id),
  title        TEXT,
  target_date  TEXT,
  priority     INTEGER NOT NULL DEFAULT 2 CHECK(priority BETWEEN 1 AND 5),
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','skipped')),
  notes        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE wv_podcast (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL,
  description   TEXT,
  type          TEXT    NOT NULL DEFAULT 'solo' CHECK(type IN ('solo','duo','panel','interview')),
  status        TEXT    NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','recording','editing','published','archived')),
  doc_id        INTEGER REFERENCES "wv_documents_legacy_20260413"(id),
  recorded_at   TEXT,
  published_url TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_podcast_participant (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  podcast_id  INTEGER NOT NULL REFERENCES wv_podcast(id),
  person_id   INTEGER REFERENCES wv_person(id),
  scholar_id  INTEGER REFERENCES wv_people(id),
  name        TEXT,  -- fallback if no person/scholar
  role        TEXT    NOT NULL DEFAULT 'guest' CHECK(role IN ('host','co-host','guest','interviewer')),
  sort_order  INTEGER NOT NULL DEFAULT 0
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
  updated_at TEXT, source_domain TEXT CHECK (source_domain IN (
  'quran', 'arabic_book', 'arabic_podcast', 'audio_series',
  'classical_text', 'kalam_text', 'scriptural_torah', 'scriptural_nt',
  'rabbinic', 'patristic', 'historical_text', 'academic',
  'western_philosophy', 'western_psychology', 'other'
)), source_language TEXT CHECK (source_language IN (
  'ar', 'en', 'he', 'el', 'syc', 'la', 'fr', 'de', 'other'
)), era_ce TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE wv_talking_point (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  podcast_id    INTEGER NOT NULL REFERENCES wv_podcast(id),
  content       TEXT    NOT NULL,
  source_id     INTEGER REFERENCES wv_sources(id),
  unit_id       INTEGER REFERENCES wv_source_units(id),
  highlight_id  INTEGER REFERENCES wv_highlights(id),
  node_id       INTEGER REFERENCES wv_nodes(id),
  surah         INTEGER,
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  duration_mins INTEGER,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_topic (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT,
  parent_id   INTEGER REFERENCES wv_topic(id),
  tags        TEXT,  -- JSON array of strings
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE wv_workspace_person (
  workspace_id INTEGER NOT NULL,  -- REFERENCES workspaces(id) - enforced at API level
  person_id    INTEGER NOT NULL REFERENCES wv_person(id),
  role         TEXT    NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member','viewer')),
  joined_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(workspace_id, person_id)
);

CREATE TABLE wv_worldview (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK(type IN ('theistic','abrahamic','eastern','secular','philosophical','other')),
  parent_id   INTEGER REFERENCES wv_worldview(id),
  description TEXT,
  color       TEXT,
  icon        TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE ar_balagha_fts USING fts5(
  term_ar, term_en, definition,
  content='ar_balagha', content_rowid='id'
);

CREATE VIRTUAL TABLE ar_domain_phrase_fts USING fts5(
  phrase_ar, phrase_en, transliteration,
  content='ar_domain_phrase', content_rowid='id'
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

CREATE VIRTUAL TABLE wv_brainstorm_fts USING fts5(
  title, content,
  content='wv_brainstorm_session', content_rowid='id'
);

CREATE VIRTUAL TABLE wv_topic_fts USING fts5(
  name, description,
  content='wv_topic', content_rowid='id'
);

CREATE INDEX idx_ar_balagha_branch ON ar_balagha(branch);

CREATE INDEX idx_ar_container_unit_task_parent
  ON ar_container_unit_task(parent_task_id);

CREATE UNIQUE INDEX idx_ar_container_unit_task_root_type_unique
  ON ar_container_unit_task(unit_id, task_type)
  WHERE parent_task_id IS NULL;

CREATE INDEX idx_ar_container_unit_task_status
  ON ar_container_unit_task(status);

CREATE INDEX idx_ar_container_unit_task_type
  ON ar_container_unit_task(task_type);

CREATE INDEX idx_ar_container_unit_task_unit
  ON ar_container_unit_task(unit_id);

CREATE INDEX idx_ar_container_units_parent_unit_id
  ON ar_container_units(parent_unit_id);

CREATE INDEX idx_ar_container_units_parent_unit_order
  ON ar_container_units(parent_unit_id, unit_type, order_index);

CREATE INDEX idx_ar_container_units_surah
  ON ar_container_units(surah, ayah_from, ayah_to)
  WHERE surah IS NOT NULL;

CREATE INDEX idx_ar_units_container_order ON ar_container_units(container_id, order_index);

CREATE INDEX idx_ar_containers_type_key ON ar_containers(container_type, container_key);

CREATE INDEX idx_ar_domain_sort ON ar_domain(sort_order);

CREATE INDEX idx_ar_dp_domain ON ar_domain_phrase(domain_id);

CREATE INDEX idx_ar_dp_level  ON ar_domain_phrase(level);

CREATE INDEX idx_ar_grammar_unit_items_type ON ar_grammar_unit_items(item_type);

CREATE INDEX idx_ar_grammar_unit_items_unit ON ar_grammar_unit_items(unit_id);

CREATE INDEX idx_ar_grammar_units_parent ON ar_grammar_units(parent_id);

CREATE INDEX idx_ar_grammar_units_source ON ar_grammar_units(source_id);

CREATE INDEX idx_ar_grammar_units_type ON ar_grammar_units(unit_type);

CREATE INDEX idx_ar_lesson_enroll_user ON ar_lesson_enrollments(user_id, status);

CREATE INDEX idx_ar_lesson_unit_link_container
  ON ar_lesson_unit_link(container_id);

CREATE INDEX idx_ar_lesson_unit_link_lesson_order
  ON ar_lesson_unit_link(lesson_id, link_scope, unit_id);

CREATE INDEX idx_ar_lesson_unit_progress_user
  ON ar_lesson_unit_progress(user_id, lesson_id, status);

CREATE INDEX idx_ar_lesson_user_state_user ON ar_lesson_user_state(user_id, last_seen_at);

CREATE INDEX idx_ar_lessons_container_id ON ar_lessons(container_id);

CREATE INDEX idx_ar_lessons_status   ON ar_lessons(status);

CREATE INDEX idx_ar_lessons_type     ON ar_lessons(lesson_type);

CREATE INDEX idx_ar_lessons_unit_id ON ar_lessons(unit_id);

CREATE INDEX idx_ar_lessons_user_id  ON ar_lessons(user_id);

CREATE INDEX idx_ar_note_targets_container ON ar_note_targets(container_id, unit_id);

CREATE INDEX idx_ar_note_targets_relation ON ar_note_targets(relation);

CREATE INDEX idx_ar_note_targets_share ON ar_note_targets(share_scope);

CREATE INDEX idx_ar_note_targets_target ON ar_note_targets(target_type, target_id);

CREATE INDEX idx_ar_notes_source ON ar_notes(source_id);

CREATE INDEX idx_ar_notes_type ON ar_notes(note_type);

CREATE INDEX idx_ar_occ_grammar_target ON ar_occ_grammar(target_type, target_id);

CREATE INDEX idx_ar_occ_grammar_unit ON ar_occ_grammar(container_id, unit_id);

CREATE INDEX idx_ar_occ_sentence_u_sentence ON ar_occ_sentence(ar_u_sentence);

CREATE INDEX idx_ar_occ_sentence_unit ON ar_occ_sentence(container_id, unit_id);

CREATE INDEX idx_ar_occ_token_u_token ON ar_occ_token(ar_u_token);

CREATE INDEX idx_ar_occ_token_unit ON ar_occ_token(container_id, unit_id);

CREATE INDEX idx_ar_quran_ayah_juz ON ar_quran_ayah(juz);

CREATE INDEX idx_ar_quran_ayah_page ON ar_quran_ayah(page);

CREATE INDEX idx_ar_quran_ayah_surah_ayah ON ar_quran_ayah(surah, ayah);

CREATE INDEX idx_ar_quran_ayah_text_bare
  ON ar_quran_ayah(text_bare)
  WHERE text_bare IS NOT NULL;

CREATE INDEX idx_ar_qlo_lemma_surah_ayah
  ON ar_quran_lemma_occurrences(lemma_id, surah, ayah);

CREATE INDEX idx_ar_qlo_surah_ayah
  ON ar_quran_lemma_occurrences(surah, ayah);

CREATE UNIQUE INDEX idx_ar_qlo_unique
  ON ar_quran_lemma_occurrences(lemma_id, word_location);

CREATE INDEX idx_ar_quran_lemmas_ar_u_lemma
  ON ar_quran_lemmas(ar_u_lemma);

CREATE INDEX idx_ar_quran_lemmas_text
  ON ar_quran_lemmas(lemma_text_clean);

CREATE UNIQUE INDEX idx_ar_qmi_motif_key
  ON ar_quran_motif_index(motif_key);

CREATE INDEX idx_ar_qmo_motif
  ON ar_quran_motif_occurrences(motif_id);

CREATE INDEX idx_ar_qmo_node
  ON ar_quran_motif_occurrences(node_id)
  WHERE node_id IS NOT NULL;

CREATE INDEX idx_ar_qmo_surah_ayah
  ON ar_quran_motif_occurrences(surah, ayah_from, ayah_to);

CREATE INDEX idx_ar_quran_page_layout_lines_page
  ON ar_quran_page_layout_lines(page_number);

CREATE INDEX idx_ar_qpa_deleted
  ON ar_quran_passage_analysis(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_ar_qpa_scope_ref
  ON ar_quran_passage_analysis(scope_ref)
  WHERE scope_ref IS NOT NULL;

CREATE INDEX idx_ar_qpa_status
  ON ar_quran_passage_analysis(status);

CREATE INDEX idx_ar_qpa_surah_ayah
  ON ar_quran_passage_analysis(surah, ayah_from, ayah_to);

CREATE INDEX idx_ar_quran_relations_concept  ON ar_quran_relations(concept_id);

CREATE INDEX idx_ar_quran_relations_relation ON ar_quran_relations(relation);

CREATE INDEX idx_ar_quran_relations_target   ON ar_quran_relations(target_type, target_id);

CREATE INDEX idx_ar_quran_relations_user_id  ON ar_quran_relations(user_id);

CREATE INDEX idx_ar_qsa_deleted
  ON ar_quran_surah_analysis(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_ar_qsa_status
  ON ar_quran_surah_analysis(status);

CREATE INDEX idx_ar_quran_surah_ayah_meta_theme ON ar_quran_surah_ayah_meta(theme);

CREATE INDEX idx_ar_surah_ayah_meta_theme ON "ar_quran_surah_ayah_meta"(theme);

CREATE INDEX idx_ar_qsp_surah_a
  ON ar_quran_surah_pairs(surah_a);

CREATE INDEX idx_ar_qsp_surah_b
  ON ar_quran_surah_pairs(surah_b);

CREATE INDEX idx_ar_qsp_type
  ON ar_quran_surah_pairs(pair_type);

CREATE INDEX idx_ar_qsp_ayah_from ON ar_quran_surah_passage(surah, ayah_from);

CREATE INDEX idx_ar_qsp_ayah_to   ON ar_quran_surah_passage(surah, ayah_to);

CREATE INDEX idx_ar_qsp_chiasm      ON ar_quran_surah_passage(has_chiasm)   WHERE has_chiasm   = 1;

CREATE INDEX idx_ar_qsp_status      ON ar_quran_surah_passage(status);

CREATE INDEX idx_ar_qsp_surah       ON ar_quran_surah_passage(surah);

CREATE INDEX idx_ar_qsp_surah_range ON ar_quran_surah_passage(surah, ayah_from, ayah_to);

CREATE INDEX idx_ar_qsp_task        ON ar_quran_surah_passage(task_id);

CREATE INDEX idx_ar_qsp_timeline    ON ar_quran_surah_passage(has_timeline) WHERE has_timeline = 1;

CREATE INDEX idx_ar_qsp_unit        ON ar_quran_surah_passage(unit_id);

CREATE INDEX idx_ar_quran_surahs_name_ar ON ar_quran_surahs(name_ar);

CREATE INDEX idx_ar_surahs_name_ar ON "ar_quran_surahs"(name_ar);

CREATE INDEX idx_syn_topic_words_lexicon
  ON ar_quran_synonym_topic_words(ar_u_lexicon);

CREATE INDEX idx_syn_topic_words_root
  ON ar_quran_synonym_topic_words(root_norm);

CREATE INDEX idx_syn_topic_words_topic_order
  ON ar_quran_synonym_topic_words(topic_id, order_index);

CREATE INDEX idx_syn_topic_words_word
  ON ar_quran_synonym_topic_words(word_norm);

CREATE INDEX idx_syn_topics_page    ON ar_quran_synonym_topics(source_id, page_no);

CREATE INDEX idx_syn_topics_source  ON ar_quran_synonym_topics(source_id);

CREATE INDEX idx_ar_qte_entry_type
  ON ar_quran_tafsir_entries(entry_type);

CREATE INDEX idx_ar_qte_mufassir
  ON ar_quran_tafsir_entries(mufassir_name);

CREATE INDEX idx_ar_qte_surah_ayah
  ON ar_quran_tafsir_entries(surah, ayah_from, ayah_to);

CREATE INDEX idx_ar_qte_view_key
  ON ar_quran_tafsir_entries(view_key)
  WHERE view_key IS NOT NULL;

CREATE INDEX idx_ar_quran_translation_passages_page
  ON ar_quran_translation_passages(source_key, page_book, page_pdf);

CREATE INDEX idx_ar_quran_translation_passages_range
  ON ar_quran_translation_passages(source_key, surah, ayah_from, ayah_to);

CREATE INDEX idx_ar_qwo_ar_u_lemma
  ON ar_quran_word_occurrences(ar_u_lemma);

CREATE INDEX idx_ar_qwo_ar_u_morphology
  ON ar_quran_word_occurrences(ar_u_morphology);

CREATE INDEX idx_ar_qwo_ar_u_root
  ON ar_quran_word_occurrences(ar_u_root);

CREATE UNIQUE INDEX idx_ar_qwo_occurrence_key
  ON ar_quran_word_occurrences(occurrence_key)
  WHERE occurrence_key IS NOT NULL;

CREATE INDEX idx_ar_qwo_root_norm
  ON ar_quran_word_occurrences(root_norm);

CREATE INDEX idx_ar_qwo_surah_ayah_pos
  ON ar_quran_word_occurrences(surah, ayah, position);

CREATE UNIQUE INDEX idx_ar_qwo_unique_word
  ON ar_quran_word_occurrences(surah, ayah, position, word_id);

CREATE INDEX idx_ar_u_quran_ayah_words_ref
  ON "ar_quran_word_occurrences"(surah, ayah, position);

CREATE INDEX idx_ar_u_quran_ayah_words_root
  ON "ar_quran_word_occurrences"(ar_u_root);

CREATE INDEX idx_chunks_source_heading
  ON ar_source_chunks(ar_u_source, heading_norm);

CREATE INDEX idx_chunks_source_page
  ON ar_source_chunks(ar_u_source, page_no);

CREATE INDEX idx_chunks_source_type ON ar_source_chunks(ar_u_source, chunk_type);

CREATE INDEX idx_ar_source_index_source_norm
  ON ar_source_index(ar_u_source, term_norm);

CREATE INDEX idx_ar_source_index_source_page
  ON ar_source_index(ar_u_source, index_page_no);

CREATE INDEX idx_ar_source_toc_source_depth
  ON ar_source_toc(ar_u_source, depth);

CREATE INDEX idx_ar_source_toc_source_page
  ON ar_source_toc(ar_u_source, page_no);

CREATE INDEX idx_ar_sources_title ON ar_sources(title);

CREATE INDEX idx_ar_sources_type ON ar_sources(source_type);

CREATE INDEX idx_ar_srs_type_key
  ON ar_srs(item_type, item_key);

CREATE INDEX idx_ar_srs_user_due
  ON ar_srs(user_id, status, due_at);

CREATE INDEX idx_ar_srs_user_lesson
  ON ar_srs(user_id, lesson_id);

CREATE INDEX idx_ar_token_lexicon_link_lexicon ON ar_token_lexicon_link(ar_u_lexicon);

CREATE INDEX idx_ar_token_pair_links_type ON ar_token_pair_links(link_type);

CREATE INDEX idx_ar_token_pair_links_unit ON ar_token_pair_links(container_id, unit_id);

CREATE INDEX idx_ar_u_expressions_domain ON ar_u_expressions(domain);

CREATE INDEX idx_ar_u_expressions_label ON ar_u_expressions(label);

CREATE INDEX idx_ar_u_expressions_lexicon
  ON ar_u_expressions(ar_u_lexicon);

CREATE INDEX idx_ar_u_expressions_ref
  ON ar_u_expressions(surah, ayah);

CREATE INDEX idx_ar_u_expressions_type   ON ar_u_expressions(expression_type);

CREATE INDEX idx_ar_u_grammar_canonical_norm ON ar_u_grammar(canonical_norm);

CREATE INDEX idx_ar_u_grammar_category ON ar_u_grammar(category);

CREATE INDEX idx_ar_u_grammar_grammar_id ON ar_u_grammar(grammar_id);

CREATE UNIQUE INDEX ux_ar_u_grammar_canonical_norm
  ON ar_u_grammar(canonical_norm)
  WHERE canonical_norm IS NOT NULL AND canonical_norm <> '';

CREATE INDEX idx_ar_u_grammar_rel_child ON ar_u_grammar_relations(child_ar_u_grammar);

CREATE INDEX idx_ar_u_grammar_rel_parent ON ar_u_grammar_relations(parent_ar_u_grammar);

CREATE INDEX idx_ar_u_lm_lemma
  ON ar_u_lemma_morphology(ar_u_lemma);

CREATE INDEX idx_ar_u_lm_morphology
  ON ar_u_lemma_morphology(ar_u_morphology);

CREATE INDEX idx_ar_u_lemmas_ar_u_root
  ON ar_u_lemmas(ar_u_root);

CREATE INDEX idx_ar_u_lemmas_lemma_norm
  ON ar_u_lemmas(lemma_norm);

CREATE INDEX idx_ar_u_lemmas_pos
  ON ar_u_lemmas(pos);

CREATE INDEX idx_ar_u_lemmas_root_norm
  ON ar_u_lemmas(root_norm);

CREATE INDEX idx_ar_u_lexicon_ar_u_root
  ON ar_u_lexicon(ar_u_root);

CREATE INDEX idx_ar_u_lexicon_lemma_norm
  ON ar_u_lexicon(lemma_norm);

CREATE INDEX idx_ar_u_lexicon_root_norm
  ON ar_u_lexicon(root_norm);

CREATE INDEX idx_ar_u_lexicon_surface_norm
  ON ar_u_lexicon(surface_norm);

CREATE INDEX idx_ar_u_lexicon_unit_type
  ON ar_u_lexicon(unit_type);

CREATE UNIQUE INDEX ux_ar_u_lexicon_sense_valency
  ON ar_u_lexicon(sense_key, ifnull(valency_id, ''));

CREATE INDEX idx_lex_ev_chunk
  ON ar_u_lexicon_evidence(chunk_id);

CREATE INDEX idx_lex_ev_link_role
  ON ar_u_lexicon_evidence(link_role);

CREATE INDEX idx_lex_ev_locator_type
  ON ar_u_lexicon_evidence(locator_type);

CREATE INDEX idx_lex_ev_source_page
  ON ar_u_lexicon_evidence(source_id, page_no);

CREATE INDEX idx_ar_u_lexicon_morph_morph
  ON ar_u_lexicon_morphology(ar_u_morphology);

CREATE INDEX idx_ar_u_lexicon_morph_role
  ON ar_u_lexicon_morphology(link_role);

CREATE INDEX idx_ar_u_morph_pattern      ON ar_u_morphology(derived_pattern);

CREATE INDEX idx_ar_u_morph_pos2         ON ar_u_morphology(pos2);

CREATE INDEX idx_ar_u_morph_surface_norm ON ar_u_morphology(surface_norm);

CREATE INDEX idx_ar_u_morph_verb_form    ON ar_u_morphology(verb_form);

CREATE INDEX idx_ar_u_roots_root ON ar_u_roots(root);

CREATE INDEX idx_ar_u_roots_root_norm ON ar_u_roots(root_norm);

CREATE INDEX idx_ar_u_sentences_kind ON ar_u_sentences(sentence_kind);

CREATE INDEX idx_ar_u_tokens_ar_u_root ON ar_u_tokens(ar_u_root);

CREATE INDEX idx_ar_u_tokens_lemma_norm ON ar_u_tokens(lemma_norm);

CREATE INDEX idx_ar_u_tokens_pos ON ar_u_tokens(pos);

CREATE INDEX idx_ar_u_tokens_root_norm ON ar_u_tokens(root_norm);

CREATE INDEX idx_brainstorm_stage   ON brainstorm_sessions(stage);

CREATE INDEX idx_brainstorm_status  ON brainstorm_sessions(status);

CREATE INDEX idx_brainstorm_topic   ON brainstorm_sessions(topic);

CREATE INDEX idx_brainstorm_user_id ON brainstorm_sessions(user_id);

CREATE INDEX idx_capture_notes_domain_stage
  ON capture_notes(domain, stage, created_at);

CREATE INDEX idx_capture_notes_user_stage
  ON capture_notes(user_id, stage, created_at);

CREATE INDEX idx_comments_target_created
  ON comments (target_type, target_id, created_at DESC);

CREATE INDEX idx_km_audio_scenes_source    ON km_audio_scenes(source_id);

CREATE INDEX idx_km_audio_scenes_status    ON km_audio_scenes(status);

CREATE INDEX idx_km_audio_scenes_unit      ON km_audio_scenes(source_unit_id, scene_number);

CREATE INDEX idx_km_audio_scenes_workspace ON km_audio_scenes(workspace_id, status);

CREATE INDEX idx_km_capture_area   ON km_capture(area, updated_at DESC);

CREATE INDEX idx_km_capture_kind ON km_capture(capture_kind, area, updated_at DESC);

CREATE INDEX idx_km_capture_stage  ON km_capture(stage, updated_at DESC);

CREATE INDEX idx_km_cross_corpus_corpus    ON km_cross_corpus_links(corpus, relation_type);

CREATE INDEX idx_km_cross_corpus_node      ON km_cross_corpus_links(wv_node_id);

CREATE INDEX idx_km_cross_corpus_quran     ON km_cross_corpus_links(quran_target_id);

CREATE INDEX idx_km_cross_corpus_workspace ON km_cross_corpus_links(workspace_id);

CREATE INDEX idx_km_plans_capture    ON km_plans(source_capture_id);

CREATE INDEX idx_km_plans_schedule   ON km_plans(scheduled_for, due_at);

CREATE INDEX idx_km_plans_source     ON km_plans(source_stream, source_type, source_id);

CREATE INDEX idx_km_plans_status     ON km_plans(status, priority);

CREATE INDEX idx_km_plans_workspace  ON km_plans(workspace_id, status);

CREATE INDEX idx_library_category   ON library_entries(category);

CREATE INDEX idx_library_entry_type ON library_entries(entry_type);

CREATE INDEX idx_library_status     ON library_entries(status);

CREATE INDEX idx_library_title      ON library_entries(title);

CREATE INDEX idx_library_user_id    ON library_entries(user_id);

CREATE INDEX idx_note_links_note_created
  ON note_links (note_id, created_at DESC);

CREATE INDEX idx_note_links_target_created
  ON note_links (target_type, target_id, created_at DESC);

CREATE INDEX idx_sp_kanban_lanes_workspace_group_order ON sp_kanban_lanes(workspace_id, group_id, order_index);

CREATE UNIQUE INDEX ux_sp_kanban_lanes_scope_key ON sp_kanban_lanes(workspace_id, ifnull(group_id, ''), lane_key);

CREATE INDEX idx_sp_planner_status         ON sp_passage_planner(status);

CREATE INDEX idx_sp_planner_surah          ON sp_passage_planner(surah);

CREATE INDEX idx_sp_planner_user_week      ON sp_passage_planner(user_id, week_start);

CREATE INDEX idx_sp_planner_workspace_item_type ON sp_planner(workspace_id, item_type);

CREATE INDEX idx_sp_planner_workspace_period ON sp_planner(workspace_id, period_start, period_end);

CREATE INDEX idx_sp_planner_workspace_week ON sp_planner(workspace_id, week_start);

CREATE INDEX idx_sp_sprint_reviews_workspace_period ON sp_sprint_reviews(workspace_id, period_start, period_end);

CREATE INDEX idx_sp_task_assignees_task ON sp_task_assignees(task_id);

CREATE UNIQUE INDEX ux_sp_task_assignees_group ON sp_task_assignees(task_id, assigned_group_id, assignment_role) WHERE assigned_group_id IS NOT NULL;

CREATE UNIQUE INDEX ux_sp_task_assignees_user ON sp_task_assignees(task_id, assigned_user_id, assignment_role) WHERE assigned_user_id IS NOT NULL;

CREATE INDEX idx_sp_weekly_plans_workspace_week ON sp_weekly_plans(workspace_id, week_start);

CREATE UNIQUE INDEX ux_sp_weekly_plans_scope_week ON sp_weekly_plans(workspace_id, ifnull(group_id, ''), ifnull(user_id, 0), week_start);

CREATE INDEX idx_sp_weekly_tasks_assigned_group_status ON sp_weekly_tasks(assigned_group_id, status);

CREATE INDEX idx_sp_weekly_tasks_assigned_user_status ON sp_weekly_tasks(assigned_user_id, status);

CREATE INDEX idx_sp_weekly_tasks_capture
  ON sp_weekly_tasks(source_capture_id)
  WHERE source_capture_id IS NOT NULL;

CREATE INDEX idx_sp_weekly_tasks_plan
  ON sp_weekly_tasks(source_plan_id)
  WHERE source_plan_id IS NOT NULL;

CREATE INDEX idx_sp_weekly_tasks_workspace_week_lane ON sp_weekly_tasks(workspace_id, week_start, kanban_state);

CREATE UNIQUE INDEX ux_sp_weekly_tasks_source_task ON sp_weekly_tasks(workspace_id, week_start, source_task_id) WHERE source_task_id IS NOT NULL;

CREATE INDEX idx_ui_passage_diagram_nodes_diagram
  ON ui_passage_diagram_nodes(diagram_id, order_index);

CREATE INDEX idx_ui_passage_diagram_nodes_node
  ON ui_passage_diagram_nodes(node_id);

CREATE INDEX idx_ui_passage_diagrams_default
  ON ui_passage_diagrams(unit_id, is_default)
  WHERE is_default = 1;

CREATE INDEX idx_ui_passage_diagrams_status
  ON ui_passage_diagrams(status);

CREATE INDEX idx_ui_passage_diagrams_surah_range
  ON ui_passage_diagrams(surah, ayah_from, ayah_to);

CREATE INDEX idx_ui_passage_diagrams_unit
  ON ui_passage_diagrams(unit_id, order_index);

CREATE INDEX idx_user_logs_created      ON user_activity_logs(created_at);

CREATE INDEX idx_user_logs_target       ON user_activity_logs(target_type, target_id);

CREATE INDEX idx_user_logs_type         ON user_activity_logs(event_type);

CREATE INDEX idx_user_logs_user_id      ON user_activity_logs(user_id);

CREATE INDEX idx_user_state_current     ON user_state(current_type, current_id);

CREATE INDEX idx_users_email            ON users(email);

CREATE INDEX idx_users_role             ON users(role);

CREATE INDEX idx_wiki_docs_parent ON wiki_docs(parent_slug);

CREATE INDEX idx_wiki_docs_slug   ON wiki_docs(slug);

CREATE INDEX idx_wiki_docs_sort   ON wiki_docs(sort_order);

CREATE INDEX idx_wiki_docs_status ON wiki_docs(status);

CREATE INDEX idx_workspace_group_members_group_user ON workspace_group_members(group_id, user_id);

CREATE INDEX idx_workspace_groups_workspace_order ON workspace_groups(workspace_id, order_index);

CREATE INDEX idx_workspace_members_workspace_user ON workspace_members(workspace_id, user_id);

CREATE INDEX idx_workspace_roles_workspace_role_key ON workspace_roles(workspace_id, role_key);

CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces(slug);

CREATE INDEX idx_wv_block_node_links_block ON wv_block_node_links(block_id);

CREATE INDEX idx_wv_block_node_links_node_relation ON wv_block_node_links(node_id, relation);

CREATE INDEX idx_wv_bs_status    ON wv_brainstorm_session(status);

CREATE INDEX idx_wv_bs_topic     ON wv_brainstorm_session(topic_id);

CREATE INDEX idx_wv_bs_worldview ON wv_brainstorm_session(worldview_id);

CREATE INDEX idx_wv_brainstorm_stage   ON wv_brainstorm_sessions(stage);

CREATE INDEX idx_wv_brainstorm_status  ON wv_brainstorm_sessions(status);

CREATE INDEX idx_wv_brainstorm_topic   ON wv_brainstorm_sessions(topic);

CREATE INDEX idx_wv_brainstorm_user_id ON wv_brainstorm_sessions(user_id);

CREATE INDEX idx_wv_comparison_status ON wv_comparison(status);

CREATE INDEX idx_wv_comparison_topic  ON wv_comparison(topic_id);

CREATE INDEX idx_wv_ccell_row ON wv_comparison_cell(row_id);

CREATE INDEX idx_wv_ccell_tab ON wv_comparison_cell(tab_id);

CREATE INDEX idx_wv_crow_comparison ON wv_comparison_row(comparison_id);

CREATE INDEX idx_wv_ctab_comparison ON wv_comparison_tab(comparison_id);

CREATE INDEX idx_wv_content_items_related
  ON wv_content_items(related_type, related_id);

CREATE INDEX idx_wv_content_items_user_type_status
  ON wv_content_items(user_id, content_type, status);

CREATE INDEX idx_wv_distill_batch_items_batch_order ON wv_distill_batch_items(batch_id, order_index);

CREATE INDEX idx_wv_distill_batches_workspace_user_status_created ON wv_distill_batches(workspace_id, user_id, status, created_at);

CREATE INDEX idx_wv_docver_created
  ON wv_document_versions(created_at);

CREATE INDEX idx_wv_docver_document
  ON wv_document_versions(document_id, version_no);

CREATE INDEX idx_wv_docs_ayah_range
  ON wv_documents(surah, ayah_from, ayah_to) WHERE surah IS NOT NULL;

CREATE INDEX idx_wv_docs_container
  ON wv_documents(container_id) WHERE container_id IS NOT NULL;

CREATE INDEX idx_wv_docs_quran_ref
  ON wv_documents(canonical_quran_ref) WHERE canonical_quran_ref IS NOT NULL;

CREATE INDEX idx_wv_docs_scope_type
  ON wv_documents(doc_scope_type) WHERE doc_scope_type IS NOT NULL;

CREATE INDEX idx_wv_documents_doc_type ON wv_documents(doc_type);

CREATE INDEX idx_wv_documents_domain ON wv_documents(domain);

CREATE INDEX idx_wv_documents_production ON wv_documents(production_type, is_published);

CREATE INDEX idx_wv_documents_source_scope
  ON wv_documents(domain, doc_type, source_id, source_unit_id);

CREATE INDEX idx_wv_documents_surah ON wv_documents(surah);

CREATE INDEX idx_wv_documents_unit ON wv_documents(unit_id);

CREATE INDEX idx_wv_documents_workspace_user_status_created
  ON wv_documents(workspace_id, user_id, status, created_at);

CREATE INDEX idx_wv_evidence_links_target_node ON wv_evidence_links(target_node_id, relation);

CREATE INDEX idx_wv_highlights_source_scope ON wv_highlights(source_id, source_unit_id, session_id);

CREATE INDEX idx_wv_highlights_workspace_user_created ON wv_highlights(workspace_id, user_id, created_at);

CREATE INDEX idx_wv_insight_decisions_suggestion_user ON wv_insight_decisions(suggestion_id, user_id);

CREATE INDEX idx_wv_insight_suggestions_batch_type_status ON wv_insight_suggestions(batch_id, suggestion_type, status);

CREATE INDEX idx_wv_edges_from
  ON wv_node_edges(from_node_id);

CREATE INDEX idx_wv_edges_relation
  ON wv_node_edges(relation_type);

CREATE INDEX idx_wv_edges_to
  ON wv_node_edges(to_node_id);

CREATE INDEX idx_wv_edges_workspace
  ON wv_node_edges(workspace_id);

CREATE INDEX idx_wv_ntl_node
  ON wv_node_tafsir_links(node_id);

CREATE INDEX idx_wv_ntl_tafsir
  ON wv_node_tafsir_links(tafsir_entry_id);

CREATE INDEX idx_wv_ntl_workspace
  ON wv_node_tafsir_links(workspace_id);

CREATE INDEX idx_wv_nodes_status
  ON wv_nodes(status);

CREATE INDEX idx_wv_nodes_type
  ON wv_nodes(node_type);

CREATE INDEX idx_wv_nodes_workspace
  ON wv_nodes(workspace_id);

CREATE INDEX idx_wv_note_relations_note ON wv_note_relations(note_id);

CREATE INDEX idx_wv_note_relations_target_relation ON wv_note_relations(target_type, target_id, relation);

CREATE INDEX idx_wv_notes_highlight ON wv_notes(highlight_id);

CREATE INDEX idx_wv_notes_session ON wv_notes(session_id);

CREATE INDEX idx_wv_notes_source_kind ON wv_notes(source_id, source_unit_id, note_kind);

CREATE INDEX idx_wv_notes_workspace_user_created ON wv_notes(workspace_id, user_id, created_at);

CREATE INDEX idx_wv_people_display_name
  ON wv_people(display_name);

CREATE INDEX idx_wv_people_domain_school ON wv_people(scholarly_domain, school);

CREATE INDEX idx_wv_people_priority      ON wv_people(km_priority);

CREATE INDEX idx_wv_people_workspace_name ON wv_people(workspace_id, display_name);

CREATE INDEX idx_wv_person_relationship ON wv_person(relationship);

CREATE INDEX idx_wv_person_visibility   ON wv_person(visibility);

CREATE INDEX idx_wv_plan_start_date  ON wv_plan(start_date);

CREATE INDEX idx_wv_plan_status      ON wv_plan(status);

CREATE INDEX idx_wv_plan_workspace   ON wv_plan(workspace_id);

CREATE INDEX idx_wv_plan_item_plan        ON wv_plan_item(plan_id);

CREATE INDEX idx_wv_plan_item_status      ON wv_plan_item(status);

CREATE INDEX idx_wv_plan_item_target_date ON wv_plan_item(target_date);

CREATE INDEX idx_wv_podcast_status ON wv_podcast(status);

CREATE INDEX idx_wv_podcast_type   ON wv_podcast(type);

CREATE INDEX idx_wv_pp_person  ON wv_podcast_participant(person_id);

CREATE INDEX idx_wv_pp_podcast ON wv_podcast_participant(podcast_id);

CREATE INDEX idx_wv_reading_sessions_workspace_user_status_started ON wv_reading_sessions(workspace_id, user_id, status, started_at);

CREATE INDEX idx_wv_source_details_source ON wv_source_details(source_id, detail_key);

CREATE INDEX idx_wv_source_people_person ON wv_source_people(person_id);

CREATE INDEX idx_wv_source_people_source ON wv_source_people(source_id, role, order_index);

CREATE INDEX idx_wv_source_units_source_parent_order ON wv_source_units(source_id, parent_unit_id, order_index);

CREATE INDEX idx_wv_sources_domain     ON wv_sources(source_domain);

CREATE INDEX idx_wv_sources_language   ON wv_sources(source_language);

CREATE INDEX idx_wv_sources_workspace_type_status ON wv_sources(workspace_id, source_type, status);

CREATE INDEX idx_wv_tp_podcast    ON wv_talking_point(podcast_id);

CREATE INDEX idx_wv_tp_sort_order ON wv_talking_point(podcast_id, sort_order);

CREATE INDEX idx_wv_topic_parent_id ON wv_topic(parent_id);

CREATE INDEX idx_wv_wsp_person ON wv_workspace_person(person_id);

CREATE INDEX idx_wv_worldview_parent_id ON wv_worldview(parent_id);

CREATE INDEX idx_wv_worldview_type      ON wv_worldview(type);

CREATE TRIGGER trg_ar_quran_lemmas_updated_at
AFTER UPDATE ON ar_quran_lemmas
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_lemmas SET updated_at = datetime('now') WHERE lemma_id = OLD.lemma_id;
END;

CREATE TRIGGER trg_ar_quran_motif_index_updated_at
AFTER UPDATE ON ar_quran_motif_index
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_motif_index SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_quran_motif_occurrences_updated_at
AFTER UPDATE ON ar_quran_motif_occurrences
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_motif_occurrences SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_quran_passage_analysis_updated_at
AFTER UPDATE ON ar_quran_passage_analysis
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_passage_analysis SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_quran_surah_analysis_updated_at
AFTER UPDATE ON ar_quran_surah_analysis
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_surah_analysis SET updated_at = datetime('now') WHERE surah = OLD.surah;
END;

CREATE TRIGGER trg_ar_quran_surah_pairs_updated_at
AFTER UPDATE ON ar_quran_surah_pairs
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_surah_pairs SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_quran_surah_passage_updated_at
AFTER UPDATE ON ar_quran_surah_passage
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_surah_passage SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_quran_synonym_topic_words_updated_at
AFTER UPDATE ON ar_quran_synonym_topic_words
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_synonym_topic_words
  SET updated_at = datetime('now')
  WHERE topic_id = OLD.topic_id AND word_norm = OLD.word_norm;
END;

CREATE TRIGGER trg_ar_quran_tafsir_entries_updated_at
AFTER UPDATE ON ar_quran_tafsir_entries
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_tafsir_entries SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_quran_word_occurrences_updated_at
AFTER UPDATE ON ar_quran_word_occurrences
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_word_occurrences SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_srs_updated_at
AFTER UPDATE ON ar_srs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE ar_srs
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_u_lemmas_updated_at
AFTER UPDATE ON ar_u_lemmas
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lemmas SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_u_lexicon_updated_at
AFTER UPDATE ON ar_u_lexicon
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = NEW.ar_u_lexicon;
END;

CREATE TRIGGER trg_ar_u_lexicon_evidence_updated_at
AFTER UPDATE ON ar_u_lexicon_evidence
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon_evidence
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = NEW.ar_u_lexicon
    AND evidence_id = NEW.evidence_id;
END;

CREATE TRIGGER trg_capture_notes_updated_at
AFTER UPDATE ON capture_notes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE capture_notes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER trg_km_audio_scenes_updated_at
AFTER UPDATE ON km_audio_scenes
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_audio_scenes SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_km_cross_corpus_links_updated_at
AFTER UPDATE ON km_cross_corpus_links
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_cross_corpus_links SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_km_plans_updated_at
AFTER UPDATE ON km_plans
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
  UPDATE km_plans
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

CREATE TRIGGER trg_sp_passage_planner_updated_at
AFTER UPDATE ON sp_passage_planner
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_passage_planner SET updated_at = datetime('now') WHERE id = OLD.id;
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

CREATE TRIGGER trg_sp_sprint_reviews_updated_at
AFTER UPDATE ON sp_sprint_reviews
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_sprint_reviews
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

CREATE TRIGGER trg_ui_passage_diagrams_updated_at
AFTER UPDATE ON ui_passage_diagrams
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ui_passage_diagrams SET updated_at = datetime('now') WHERE id = OLD.id;
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

CREATE TRIGGER trg_workspace_groups_updated_at
AFTER UPDATE ON workspace_groups
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_groups
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

CREATE TRIGGER trg_workspace_roles_updated_at
AFTER UPDATE ON workspace_roles
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_roles
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
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

CREATE TRIGGER trg_wv_block_node_links_updated_at
AFTER UPDATE ON wv_block_node_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_block_node_links
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

CREATE TRIGGER trg_wv_evidence_links_updated_at
AFTER UPDATE ON wv_evidence_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_evidence_links
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

CREATE TRIGGER trg_wv_insight_decisions_updated_at
AFTER UPDATE ON wv_insight_decisions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_insight_decisions
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

CREATE TRIGGER trg_wv_node_edges_updated_at
AFTER UPDATE ON wv_node_edges
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_edges SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_node_tafsir_links_updated_at
AFTER UPDATE ON wv_node_tafsir_links
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_tafsir_links SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_wv_nodes_updated_at
AFTER UPDATE ON wv_nodes
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_nodes SET updated_at = datetime('now') WHERE id = OLD.id;
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

CREATE TRIGGER trg_wv_notes_updated_at
AFTER UPDATE ON wv_notes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_notes
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

CREATE TRIGGER trg_wv_reading_sessions_updated_at
AFTER UPDATE ON wv_reading_sessions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_reading_sessions
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

CREATE TRIGGER trg_wv_source_people_updated_at
AFTER UPDATE ON wv_source_people
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_people
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

CREATE TRIGGER trg_wv_sources_updated_at
AFTER UPDATE ON wv_sources
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_sources
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

