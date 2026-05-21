-- Schema for km_arabic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.

CREATE TABLE ar_applied_balagha (
  id              TEXT PRIMARY KEY,
  al_balagha_ref  TEXT NOT NULL,                  
  title           TEXT NOT NULL,
  title_ar        TEXT,
  explanation_md  TEXT NOT NULL,
  level           TEXT,
  qr_scope_ref    TEXT,                           
  examples_json   TEXT,                           
  quiz_notes      TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_assignment_submissions (
  id              TEXT PRIMARY KEY,
  assignment_id   TEXT NOT NULL,
  student_ref     TEXT NOT NULL,                  
  submission_type TEXT NOT NULL DEFAULT 'text',
    
  content_md      TEXT,
  cm_doc_ref      TEXT,                           
  score           REAL,
  feedback_md     TEXT,
  graded_by_ref   TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted',
    
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  graded_at       TEXT,
  FOREIGN KEY (assignment_id) REFERENCES ar_class_assignments(id),
  UNIQUE (assignment_id, student_ref)
);

CREATE TABLE ar_class_assignments (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  title           TEXT NOT NULL,
  instructions_md TEXT,
  resource_refs   TEXT,                           
  due_date        TEXT,
  weight          REAL NOT NULL DEFAULT 1.0,
  status          TEXT NOT NULL DEFAULT 'open',   
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES ar_classes(id)
);

CREATE TABLE ar_class_enrolments (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  student_ref     TEXT NOT NULL,                  
  role            TEXT NOT NULL DEFAULT 'student',
    
  status          TEXT NOT NULL DEFAULT 'active',
    
  enrolled_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  meta_json       TEXT,
  FOREIGN KEY (class_id) REFERENCES ar_classes(id),
  UNIQUE (class_id, student_ref)
);

CREATE TABLE ar_class_resources (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,                  
  resource_type   TEXT NOT NULL,
    
  resource_label  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_required     INTEGER NOT NULL DEFAULT 1,
  added_by_ref    TEXT,                           
  added_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES ar_classes(id),
  UNIQUE (class_id, resource_ref)
);

CREATE TABLE ar_classes (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  class_type      TEXT NOT NULL DEFAULT 'course',
    
  container_id    TEXT,                           
  curriculum_id   TEXT,                           
  teacher_ref     TEXT NOT NULL,                  
  core_ws_ref     TEXT NOT NULL,                  
  status          TEXT NOT NULL DEFAULT 'draft',
    
  start_date      TEXT,
  end_date        TEXT,
  max_enrolments  INTEGER,
  visibility      TEXT NOT NULL DEFAULT 'workspace',
    
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (container_id)  REFERENCES ar_containers(id),
  FOREIGN KEY (curriculum_id) REFERENCES ar_curricula(id)
);

CREATE TABLE ar_container_unit_tasks (
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
  FOREIGN KEY (unit_id)        REFERENCES ar_container_units(id),
  FOREIGN KEY (parent_task_id) REFERENCES ar_container_unit_tasks(id)
);

CREATE TABLE ar_container_units (
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (container_id) REFERENCES ar_containers(id),
  FOREIGN KEY (parent_id)    REFERENCES ar_container_units(id)
);

CREATE TABLE ar_containers (
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
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (track_id) REFERENCES ar_learning_tracks(id)
);

CREATE TABLE ar_curricula (
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
  FOREIGN KEY (track_id)    REFERENCES ar_learning_tracks(id),
  FOREIGN KEY (container_id) REFERENCES ar_containers(id)
);

CREATE TABLE ar_curriculum_units (
  id              TEXT PRIMARY KEY,
  curriculum_id   TEXT NOT NULL,
  parent_id       TEXT,
  title           TEXT NOT NULL,
  al_concept_ref  TEXT,                           
  unit_index      INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  examples_json   TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (curriculum_id) REFERENCES ar_curricula(id),
  FOREIGN KEY (parent_id)     REFERENCES ar_curriculum_units(id)
);

CREATE TABLE ar_domain_phrases (
  id              TEXT PRIMARY KEY,
  domain_id       TEXT NOT NULL,
  arabic          TEXT NOT NULL,
  transliteration TEXT,
  meaning_en      TEXT NOT NULL,
  usage_context   TEXT,
  level           TEXT,
  vocab_id        TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES ar_domains(id),
  FOREIGN KEY (vocab_id)  REFERENCES ar_vocabulary(id)
);

CREATE TABLE ar_domains (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  title_ar    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_exercise_attempts (
  id              TEXT PRIMARY KEY,
  exercise_id     TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  response_json   TEXT,                           
  is_correct      INTEGER NOT NULL DEFAULT 0,
  score           REAL,
  time_spent_secs INTEGER,
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  attempted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exercise_id) REFERENCES ar_exercises(id)
);

CREATE TABLE ar_exercises (
  id              TEXT PRIMARY KEY,               
  lesson_id       TEXT,
  unit_id         TEXT,
  exercise_type   TEXT NOT NULL DEFAULT 'mcq',
    
    
  prompt_ar       TEXT,
  prompt_en       TEXT,
  options_json    TEXT,                           
  answer_json     TEXT,                           
  explanation_md  TEXT,
  vocab_id        TEXT,
  grammar_id      TEXT,
  al_concept_ref  TEXT,                           
  qr_scope_ref    TEXT,
  level           TEXT,
  skill_focus     TEXT,
  difficulty      INTEGER NOT NULL DEFAULT 3,     
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lesson_id)  REFERENCES ar_lessons(id),
  FOREIGN KEY (unit_id)    REFERENCES ar_container_units(id),
  FOREIGN KEY (vocab_id)   REFERENCES ar_vocabulary(id),
  FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id)
);

CREATE TABLE ar_expressions (
  id              TEXT PRIMARY KEY,
  arabic          TEXT NOT NULL,
  transliteration TEXT,
  meaning_en      TEXT NOT NULL,
  expression_type TEXT NOT NULL DEFAULT 'idiom',
    
  al_expression_ref TEXT,                         
  domain_id       TEXT,
  level           TEXT,
  usage_note      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE ar_expressions_fts USING fts5(
  arabic, meaning_en, content='ar_expressions', content_rowid='rowid'
);

CREATE TABLE ar_grammar (
  id              TEXT PRIMARY KEY,               
  title           TEXT NOT NULL,
  title_ar        TEXT,
  al_nahw_ref     TEXT,                           
  al_morph_ref    TEXT,                           
  grammar_type    TEXT NOT NULL DEFAULT 'nahw',
    
  level           TEXT,                           
  explanation_md  TEXT NOT NULL,
  examples_json   TEXT,                           
  rule_summary    TEXT,
  qr_scope_ref    TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE ar_grammar_fts USING fts5(
  title, title_ar, explanation_md, content='ar_grammar', content_rowid='rowid'
);

CREATE TABLE ar_grammar_vocabulary_links (
  id          TEXT PRIMARY KEY,
  grammar_id  TEXT NOT NULL,
  vocab_id    TEXT NOT NULL,
  link_role   TEXT NOT NULL DEFAULT 'example',   
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id),
  FOREIGN KEY (vocab_id)   REFERENCES ar_vocabulary(id),
  UNIQUE (grammar_id, vocab_id)
);

CREATE TABLE ar_learning_tracks (
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
);

CREATE TABLE ar_lessons (
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
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id)
);

CREATE TABLE ar_mastery_profiles (
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
  FOREIGN KEY (track_id) REFERENCES ar_learning_tracks(id),
  UNIQUE (core_user_ref, track_id, skill)
);

CREATE TABLE ar_scenarios (
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
  FOREIGN KEY (domain_id) REFERENCES ar_domains(id)
);

CREATE TABLE ar_srs_cards (
  id              TEXT PRIMARY KEY,
  deck_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,
  resource_type   TEXT NOT NULL,

  card_template   TEXT NOT NULL DEFAULT 'freeform',
  front_text      TEXT NOT NULL DEFAULT '',
  back_text       TEXT NOT NULL DEFAULT '',
  extra_json      TEXT,
  tags            TEXT,
  suspended       INTEGER NOT NULL DEFAULT 0,

  stability       REAL NOT NULL DEFAULT 1.0,
  difficulty      REAL NOT NULL DEFAULT 0.3,
  elapsed_days    INTEGER NOT NULL DEFAULT 0,
  scheduled_days  INTEGER NOT NULL DEFAULT 1,
  reps            INTEGER NOT NULL DEFAULT 0,
  lapses          INTEGER NOT NULL DEFAULT 0,
  card_state      TEXT NOT NULL DEFAULT 'new',

  last_review_at  TEXT,
  next_review_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deck_id) REFERENCES ar_srs_decks(id),
  UNIQUE (deck_id, resource_ref)
);

CREATE INDEX idx_ar_sc_due ON ar_srs_cards(core_user_ref, suspended, next_review_at);

CREATE TABLE ar_srs_decks (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  title           TEXT NOT NULL,
  deck_type       TEXT NOT NULL DEFAULT 'vocabulary',
    
  description     TEXT,
  card_count      INTEGER NOT NULL DEFAULT 0,
  is_shared       INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_srs_reviews (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  rating          INTEGER NOT NULL,               
  
  stability_after REAL,
  difficulty_after REAL,
  scheduled_days_after INTEGER,
  state_after     TEXT,
  review_duration_secs INTEGER,
  reviewed_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES ar_srs_cards(id)
);

CREATE TABLE ar_task_completions (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  completed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  time_spent_mins INTEGER,
  notes           TEXT,
  FOREIGN KEY (task_id) REFERENCES ar_container_unit_tasks(id),
  UNIQUE (task_id, core_user_ref)
);

CREATE TABLE ar_unit_grammar_map (
  id          TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL,
  grammar_id  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id)    REFERENCES ar_container_units(id),
  FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id),
  UNIQUE (unit_id, grammar_id)
);

CREATE TABLE ar_unit_progress (
  id                TEXT PRIMARY KEY,
  unit_id           TEXT NOT NULL,
  core_user_ref     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'not_started',
    
  progress_pct      REAL NOT NULL DEFAULT 0,      
  last_activity_at  TEXT,
  completed_at      TEXT,
  meta_json         TEXT,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id),
  UNIQUE (unit_id, core_user_ref)
);

CREATE TABLE ar_unit_vocabulary_map (
  id          TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL,
  vocab_id    TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_key_word INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id)  REFERENCES ar_container_units(id),
  FOREIGN KEY (vocab_id) REFERENCES ar_vocabulary(id),
  UNIQUE (unit_id, vocab_id)
);

CREATE TABLE ar_user_track_profiles (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,                  
  track_id        TEXT NOT NULL,
  current_level   TEXT,                           
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  FOREIGN KEY (track_id) REFERENCES ar_learning_tracks(id),
  UNIQUE (core_user_ref, track_id)
);

CREATE TABLE ar_vocabulary (
  id              TEXT PRIMARY KEY,               
  arabic          TEXT NOT NULL,
  transliteration TEXT,
  meaning_en      TEXT NOT NULL,
  meaning_notes   TEXT,
  al_lemma_ref    TEXT,                           
  al_root_ref     TEXT,                           
  al_morph_ref    TEXT,                           
  word_class      TEXT NOT NULL DEFAULT 'noun',
    
  level           TEXT,                           
  domain_id       TEXT,
  frequency_rank  INTEGER,
  qr_scope_ref    TEXT,                           
  tags_json       TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_vocabulary_evidence (
  id              TEXT PRIMARY KEY,
  vocab_id        TEXT NOT NULL,
  source_ref      TEXT,                           
  locator         TEXT,
  excerpt_ar      TEXT,
  excerpt_en      TEXT,
  qr_scope_ref    TEXT,
  evidence_type   TEXT NOT NULL DEFAULT 'text',
    
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vocab_id) REFERENCES ar_vocabulary(id)
);

CREATE VIRTUAL TABLE ar_vocabulary_fts USING fts5(
  arabic, meaning_en, meaning_notes, content='ar_vocabulary', content_rowid='rowid'
);

CREATE TABLE ar_vocabulary_relations (
  id              TEXT PRIMARY KEY,
  from_vocab_id   TEXT NOT NULL,
  to_vocab_id     TEXT NOT NULL,
  relation_type   TEXT NOT NULL DEFAULT 'synonym',
    
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_vocab_id) REFERENCES ar_vocabulary(id),
  FOREIGN KEY (to_vocab_id)   REFERENCES ar_vocabulary(id),
  UNIQUE (from_vocab_id, to_vocab_id, relation_type)
);

CREATE INDEX idx_ar_ab_balagha ON ar_applied_balagha(al_balagha_ref);

CREATE INDEX idx_ar_asub_assign  ON ar_assignment_submissions(assignment_id);

CREATE INDEX idx_ar_asub_student ON ar_assignment_submissions(student_ref);

CREATE INDEX idx_ar_ca_class  ON ar_class_assignments(class_id);

CREATE INDEX idx_ar_ca_due    ON ar_class_assignments(due_date);

CREATE INDEX idx_ar_ca_status ON ar_class_assignments(status);

CREATE INDEX idx_ar_ce_class   ON ar_class_enrolments(class_id);

CREATE INDEX idx_ar_ce_status  ON ar_class_enrolments(status);

CREATE INDEX idx_ar_ce_student ON ar_class_enrolments(student_ref);

CREATE INDEX idx_ar_cl_status  ON ar_classes(status);

CREATE INDEX idx_ar_cl_teacher ON ar_classes(teacher_ref);

CREATE INDEX idx_ar_cl_ws      ON ar_classes(core_ws_ref);

CREATE INDEX idx_ar_con_track ON ar_containers(track_id);

CREATE INDEX idx_ar_con_type  ON ar_containers(container_type);

CREATE INDEX idx_ar_cr_class    ON ar_class_resources(class_id);

CREATE INDEX idx_ar_cr_resource ON ar_class_resources(resource_ref);

CREATE INDEX idx_ar_cu_container ON ar_container_units(container_id);

CREATE INDEX idx_ar_cu_parent    ON ar_container_units(parent_id);

CREATE INDEX idx_ar_cu_type      ON ar_container_units(unit_type);

CREATE INDEX idx_ar_cun_curr ON ar_curriculum_units(curriculum_id);

CREATE INDEX idx_ar_cut_unit ON ar_container_unit_tasks(unit_id);

CREATE INDEX idx_ar_dp_domain ON ar_domain_phrases(domain_id);

CREATE INDEX idx_ar_ea_at       ON ar_exercise_attempts(attempted_at);

CREATE INDEX idx_ar_ea_exercise ON ar_exercise_attempts(exercise_id);

CREATE INDEX idx_ar_ea_user     ON ar_exercise_attempts(core_user_ref);

CREATE INDEX idx_ar_ex_lesson ON ar_exercises(lesson_id);

CREATE INDEX idx_ar_ex_level  ON ar_exercises(level);

CREATE INDEX idx_ar_ex_type   ON ar_exercises(exercise_type);

CREATE INDEX idx_ar_exp_type ON ar_expressions(expression_type);

CREATE INDEX idx_ar_gr_level ON ar_grammar(level);

CREATE INDEX idx_ar_gr_nahw  ON ar_grammar(al_nahw_ref);

CREATE INDEX idx_ar_gr_type  ON ar_grammar(grammar_type);

CREATE INDEX idx_ar_les_level ON ar_lessons(level);

CREATE INDEX idx_ar_les_type  ON ar_lessons(lesson_type);

CREATE INDEX idx_ar_les_unit  ON ar_lessons(unit_id);

CREATE INDEX idx_ar_lt_type ON ar_learning_tracks(track_type);

CREATE INDEX idx_ar_mp_skill ON ar_mastery_profiles(skill);

CREATE INDEX idx_ar_mp_user  ON ar_mastery_profiles(core_user_ref);

CREATE INDEX idx_ar_sc_deck   ON ar_srs_cards(deck_id);

CREATE INDEX idx_ar_sc_domain ON ar_scenarios(domain_id);

CREATE INDEX idx_ar_sc_next   ON ar_srs_cards(next_review_at);

CREATE INDEX idx_ar_sc_state  ON ar_srs_cards(card_state);

CREATE INDEX idx_ar_sc_user   ON ar_srs_cards(core_user_ref);

CREATE INDEX idx_ar_sd_user ON ar_srs_decks(core_user_ref);

CREATE INDEX idx_ar_sr_at   ON ar_srs_reviews(reviewed_at);

CREATE INDEX idx_ar_sr_card ON ar_srs_reviews(card_id);

CREATE INDEX idx_ar_sr_user ON ar_srs_reviews(core_user_ref);

CREATE INDEX idx_ar_tc_task ON ar_task_completions(task_id);

CREATE INDEX idx_ar_tc_user ON ar_task_completions(core_user_ref);

CREATE INDEX idx_ar_ugm_grammar ON ar_unit_grammar_map(grammar_id);

CREATE INDEX idx_ar_ugm_unit    ON ar_unit_grammar_map(unit_id);

CREATE INDEX idx_ar_up_status ON ar_unit_progress(status);

CREATE INDEX idx_ar_up_unit   ON ar_unit_progress(unit_id);

CREATE INDEX idx_ar_up_user   ON ar_unit_progress(core_user_ref);

CREATE INDEX idx_ar_utp_track ON ar_user_track_profiles(track_id);

CREATE INDEX idx_ar_utp_user  ON ar_user_track_profiles(core_user_ref);

CREATE INDEX idx_ar_uvm_unit  ON ar_unit_vocabulary_map(unit_id);

CREATE INDEX idx_ar_uvm_vocab ON ar_unit_vocabulary_map(vocab_id);

CREATE INDEX idx_ar_ve_vocab ON ar_vocabulary_evidence(vocab_id);

CREATE INDEX idx_ar_voc_class  ON ar_vocabulary(word_class);

CREATE INDEX idx_ar_voc_lemma  ON ar_vocabulary(al_lemma_ref);

CREATE INDEX idx_ar_voc_level  ON ar_vocabulary(level);

CREATE INDEX idx_ar_voc_root   ON ar_vocabulary(al_root_ref);

CREATE INDEX idx_ar_vr_from ON ar_vocabulary_relations(from_vocab_id);
