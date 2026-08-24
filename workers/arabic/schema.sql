-- km_arabic - schema snapshot
--
-- Generated from the live database, which is the source of truth:
--   SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL
--   ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 1 ELSE 2 END, name;
--
-- Binding: DB_AR. Regenerate after applying migrations rather than
-- editing by hand. Excludes d1_migrations (wrangler's ledger), _cf_KV, and
-- FTS5 shadow tables, which their virtual tables recreate automatically.
--
-- 26 tables, 0 views, 34 indexes.

-- Tables ------------------------------------------------------------------

CREATE TABLE "ar_curriculum" (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  discipline      TEXT NOT NULL DEFAULT 'nahw',
    
  level           TEXT,                           
  track_id        TEXT,
  container_id    TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (track_id)    REFERENCES "ar_curriculum_track"(id),
  FOREIGN KEY (container_id) REFERENCES "ar_curriculum_container"(id)
);

CREATE TABLE "ar_curriculum_container" (
  id              TEXT PRIMARY KEY,               
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  container_type  TEXT NOT NULL DEFAULT 'course',
    
  track_id        TEXT,
  level           TEXT,                           
  description_md  TEXT,
  cover_ref       TEXT,                           
  source_ref      TEXT,                           
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_published    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')), uid TEXT, al_discipline_uid TEXT, discipline TEXT,
  FOREIGN KEY (track_id) REFERENCES "ar_curriculum_track"(id)
);

CREATE TABLE "ar_curriculum_container_unit" (
  id              TEXT PRIMARY KEY,
  container_id    TEXT NOT NULL,
  parent_id       TEXT,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  unit_type       TEXT NOT NULL DEFAULT 'lesson',
    
  unit_index      INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  estimated_mins  INTEGER,
  skill_focus     TEXT,                           
  al_concept_refs TEXT,                           
  qr_scope_ref    TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), uid TEXT, al_group_ref TEXT, al_group_uid TEXT, source_db TEXT NOT NULL DEFAULT 'km_arabic_linguistic', gn_node_id TEXT,
  FOREIGN KEY (container_id) REFERENCES "ar_curriculum_container"(id),
  FOREIGN KEY (parent_id)    REFERENCES "ar_curriculum_container_unit"(id)
);

CREATE TABLE "ar_curriculum_container_unit_task" (
  id              TEXT PRIMARY KEY,
  unit_id         TEXT NOT NULL,
  parent_task_id  TEXT,
  title           TEXT NOT NULL,
  task_type       TEXT NOT NULL DEFAULT 'read',
    
    
  task_index      INTEGER NOT NULL DEFAULT 0,
  step_no         INTEGER,
  description_md  TEXT,
  estimated_mins  INTEGER,
  al_concept_ref  TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id)        REFERENCES "ar_curriculum_container_unit"(id),
  FOREIGN KEY (parent_task_id) REFERENCES "ar_curriculum_container_unit_task"(id)
);

CREATE TABLE "ar_curriculum_domain" (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  title_ar    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_curriculum_domain_phrase" (
  id TEXT PRIMARY KEY, domain_id TEXT NOT NULL, arabic TEXT NOT NULL, transliteration TEXT,
  meaning_en TEXT NOT NULL, usage_context TEXT, level TEXT, al_lemma_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (domain_id) REFERENCES "ar_curriculum_domain"(id));

CREATE TABLE "ar_curriculum_lesson" (
  id              TEXT PRIMARY KEY,               
  unit_id         TEXT,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  lesson_type     TEXT NOT NULL DEFAULT 'instruction',
    
  level           TEXT,
  skill_focus     TEXT,                           
  content_md      TEXT NOT NULL,
  vocab_ids_json  TEXT,                           
  grammar_ids_json TEXT,                          
  qr_scope_ref    TEXT,
  estimated_mins  INTEGER,
  is_published    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id)
);

CREATE TABLE "ar_curriculum_scenario" (
  id              TEXT PRIMARY KEY,
  domain_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  scenario_type   TEXT NOT NULL DEFAULT 'dialogue',
    
  level           TEXT,
  description_md  TEXT,
  vocab_set_json  TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES "ar_curriculum_domain"(id)
);

CREATE TABLE "ar_curriculum_track" (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  track_type      TEXT NOT NULL DEFAULT 'classical',
    
  cefr_from       TEXT,                           
  cefr_to         TEXT,
  description_md  TEXT,
  prerequisites_json TEXT,                        
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_public       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, uid TEXT);

CREATE TABLE "ar_curriculum_unit" (
  id              TEXT PRIMARY KEY,
  curriculum_id   TEXT NOT NULL,
  parent_id       TEXT,
  title           TEXT NOT NULL,
  al_concept_ref  TEXT,                           
  unit_index      INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  examples_json   TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (curriculum_id) REFERENCES "ar_curriculum"(id),
  FOREIGN KEY (parent_id)     REFERENCES "ar_curriculum_unit"(id)
);

CREATE TABLE "ar_curriculum_unit_concept_map" (
  id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, al_term_ref TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), al_term_uid TEXT, source_db TEXT NOT NULL DEFAULT 'km_arabic_linguistic', role TEXT NOT NULL DEFAULT 'focus',
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id), UNIQUE (unit_id, al_term_ref));

CREATE TABLE "ar_curriculum_unit_lemma_map" (
  id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, al_lemma_ref TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, is_key_word INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id), UNIQUE (unit_id, al_lemma_ref));

CREATE TABLE ar_discipline (
  code        TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  name_ur     TEXT,
  tagline_en  TEXT,
  root_node_id TEXT,
  container_id TEXT,
  accent      TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_exercises ( id TEXT PRIMARY KEY, lesson_id TEXT, unit_id TEXT, exercise_type TEXT NOT NULL DEFAULT 'mcq', prompt_ar TEXT, prompt_en TEXT, options_json TEXT, answer_json TEXT, explanation_md TEXT, vocab_id TEXT, grammar_id TEXT, al_concept_ref TEXT, qr_scope_ref TEXT, level TEXT, skill_focus TEXT, difficulty INTEGER NOT NULL DEFAULT 3, meta_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (lesson_id) REFERENCES ar_curriculum_lesson(id), FOREIGN KEY (unit_id) REFERENCES ar_curriculum_container_unit(id), FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id) );

CREATE TABLE ar_grammar ( id TEXT PRIMARY KEY, title TEXT NOT NULL, title_ar TEXT, al_nahw_ref TEXT, al_morph_ref TEXT, grammar_type TEXT NOT NULL DEFAULT 'nahw', level TEXT, explanation_md TEXT NOT NULL, examples_json TEXT, rule_summary TEXT, qr_scope_ref TEXT, meta_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')) );

CREATE TABLE ar_grammar_example (
  id            TEXT PRIMARY KEY,
  node_id       TEXT REFERENCES ar_grammar_node(id),
  grammar_id    TEXT REFERENCES ar_grammar(id),
  example_ar    TEXT NOT NULL,
  gloss_en      TEXT,
  gloss_ur      TEXT,
  example_kind  TEXT NOT NULL DEFAULT 'quran',
  qr_ref        TEXT,
  source_ref    TEXT,
  mudaf         TEXT,
  mudaf_ilayh   TEXT,
  idafa_type    TEXT,
  purity        TEXT,
  effect        TEXT,
  analysis_ar   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  meta_json     TEXT
);

CREATE TABLE ar_grammar_node (
  id             TEXT PRIMARY KEY,
  parent_id      TEXT REFERENCES ar_grammar_node(id),
  discipline     TEXT NOT NULL,
  node_type      TEXT NOT NULL DEFAULT 'bab',
  name_ar        TEXT NOT NULL,
  name_en        TEXT,
  name_ur        TEXT,
  definition_ar  TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  depth          INTEGER NOT NULL DEFAULT 0,
  path           TEXT,
  grammar_id     TEXT REFERENCES ar_grammar(id),
  unit_id        TEXT,
  al_refs_json   TEXT,
  status         TEXT NOT NULL DEFAULT 'skeleton',
  meta_json      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
, teach_order INTEGER, difficulty INTEGER, prereq_json TEXT);

CREATE TABLE "ar_learn_exposure_log" (
  id             TEXT PRIMARY KEY,
  core_user_ref  TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL,
  memlet_key     TEXT,
  item_id        TEXT,
  surface        TEXT NOT NULL,
  qr_ref         TEXT,
  outcome        TEXT,
  latency_ms     INTEGER,
  shown_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_learn_mastery" (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  track_id        TEXT,
  skill           TEXT NOT NULL,
    
  mastery_score   REAL NOT NULL DEFAULT 0,        
  items_mastered  INTEGER NOT NULL DEFAULT 0,
  items_learning  INTEGER NOT NULL DEFAULT 0,
  last_assessed_at TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (track_id) REFERENCES "ar_curriculum_track"(id),
  UNIQUE (core_user_ref, track_id, skill)
);

CREATE TABLE "ar_learn_memlet_mastery" (
  id             TEXT PRIMARY KEY,
  core_user_ref  TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL,
  memlet_key     TEXT NOT NULL,
  exposures      INTEGER NOT NULL DEFAULT 0,
  correct        INTEGER NOT NULL DEFAULT 0,
  encoding_score REAL NOT NULL DEFAULT 0,
  last_seen_at   TEXT,
  UNIQUE (core_user_ref, lemma_ar, memlet_key)
);

CREATE TABLE "ar_learn_task_completion" (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  completed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  time_spent_mins INTEGER,
  notes           TEXT,
  FOREIGN KEY (task_id) REFERENCES "ar_curriculum_container_unit_task"(id),
  UNIQUE (task_id, core_user_ref)
);

CREATE TABLE "ar_learn_track_profile" (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,                  
  track_id        TEXT NOT NULL,
  current_level   TEXT,                           
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  FOREIGN KEY (track_id) REFERENCES "ar_curriculum_track"(id),
  UNIQUE (core_user_ref, track_id)
);

CREATE TABLE "ar_learn_unit_progress" (
  id                TEXT PRIMARY KEY,
  unit_id           TEXT NOT NULL,
  core_user_ref     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'not_started',
    
  progress_pct      REAL NOT NULL DEFAULT 0,      
  last_activity_at  TEXT,
  completed_at      TEXT,
  meta_json         TEXT,
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id),
  UNIQUE (unit_id, core_user_ref)
);

CREATE TABLE ar_learning_source (
  id            TEXT PRIMARY KEY,
  source_kind   TEXT NOT NULL,
  title_ar      TEXT,
  title_en      TEXT,
  author_ar     TEXT,
  author_en     TEXT,
  death_year    TEXT,
  url           TEXT,
  platform      TEXT,
  edition       TEXT,
  locator       TEXT,
  lang          TEXT,
  discipline    TEXT,
  authority     TEXT NOT NULL DEFAULT 'secondary',
  al_source_slug TEXT,
  notes_md      TEXT,
  meta_json     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_node_source (
  node_id     TEXT NOT NULL,
  source_id   TEXT NOT NULL REFERENCES ar_learning_source(id),
  locator     TEXT,
  role        TEXT NOT NULL DEFAULT 'reference',
  timestamp_s INTEGER,
  note_ar     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (node_id, source_id, role)
);

CREATE TABLE ar_teaching_variant (
  id          TEXT PRIMARY KEY,
  node_id     TEXT NOT NULL REFERENCES ar_grammar_node(id),
  audience    TEXT NOT NULL,
  lang        TEXT NOT NULL DEFAULT 'en',
  title       TEXT,
  body_md     TEXT NOT NULL,
  duration_min INTEGER,
  age_from    INTEGER,
  source_ids_json TEXT,
  example_ids_json TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes -----------------------------------------------------------------

CREATE INDEX idx_ar_con_track ON "ar_curriculum_container"(track_id);

CREATE INDEX idx_ar_con_type  ON "ar_curriculum_container"(container_type);

CREATE INDEX idx_ar_cu_container ON "ar_curriculum_container_unit"(container_id);

CREATE INDEX idx_ar_cu_parent    ON "ar_curriculum_container_unit"(parent_id);

CREATE INDEX idx_ar_cu_type      ON "ar_curriculum_container_unit"(unit_type);

CREATE INDEX idx_ar_cun_curr ON "ar_curriculum_unit"(curriculum_id);

CREATE INDEX idx_ar_cut_unit ON "ar_curriculum_container_unit_task"(unit_id);

CREATE INDEX idx_ar_exercises_grammar ON ar_exercises(grammar_id);

CREATE INDEX idx_ar_exercises_lesson ON ar_exercises(lesson_id);

CREATE INDEX idx_ar_exercises_unit ON ar_exercises(unit_id);

CREATE INDEX idx_ar_grammar_type ON ar_grammar(grammar_type, level);

CREATE INDEX idx_ar_les_level ON "ar_curriculum_lesson"(level);

CREATE INDEX idx_ar_les_type  ON "ar_curriculum_lesson"(lesson_type);

CREATE INDEX idx_ar_les_unit  ON "ar_curriculum_lesson"(unit_id);

CREATE INDEX idx_ar_lt_type ON "ar_curriculum_track"(track_type);

CREATE INDEX idx_ar_mp_skill ON "ar_learn_mastery"(skill);

CREATE INDEX idx_ar_mp_user  ON "ar_learn_mastery"(core_user_ref);

CREATE INDEX idx_ar_sc_domain ON "ar_curriculum_scenario"(domain_id);

CREATE INDEX idx_ar_tc_task ON "ar_learn_task_completion"(task_id);

CREATE INDEX idx_ar_tc_user ON "ar_learn_task_completion"(core_user_ref);

CREATE INDEX idx_ar_up_status ON "ar_learn_unit_progress"(status);

CREATE INDEX idx_ar_up_unit   ON "ar_learn_unit_progress"(unit_id);

CREATE INDEX idx_ar_up_user   ON "ar_learn_unit_progress"(core_user_ref);

CREATE INDEX idx_ar_utp_track ON "ar_learn_track_profile"(track_id);

CREATE INDEX idx_ar_utp_user  ON "ar_learn_track_profile"(core_user_ref);

CREATE INDEX idx_cc_discipline ON ar_curriculum_container (discipline, sort_order);

CREATE INDEX idx_ccu_container ON ar_curriculum_container_unit (container_id, parent_id, unit_index);

CREATE INDEX idx_ccu_node ON ar_curriculum_container_unit (gn_node_id);

CREATE INDEX idx_gn_disc_parent ON ar_grammar_node (discipline, parent_id, sort_order);

CREATE INDEX idx_gn_parent ON ar_grammar_node (parent_id, sort_order);

CREATE INDEX idx_gn_path ON ar_grammar_node (path);

CREATE INDEX idx_gn_unit ON ar_grammar_node (unit_id);

CREATE INDEX idx_ls_discipline ON ar_learning_source (discipline, source_kind);

CREATE INDEX idx_ns_source ON ar_node_source (source_id);
