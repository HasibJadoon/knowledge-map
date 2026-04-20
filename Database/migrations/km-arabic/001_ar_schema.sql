-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_arabic DB — Canonical AR Module Schema
-- File   : Database/migrations/km-arabic/001_ar_schema.sql
-- DB     : km_arabic   (binding: DB_AR in Workers)
-- Prefix : ar_*
-- Run    : wrangler d1 execute km_arabic --file=... --remote
--
-- Module scope:
--   Classical Arabic + MSA acquisition engine — learning tracks, curriculum
--   sciences (sarf/nahw/balagha), domain/scenario engine, vocabulary,
--   grammar, applied balagha, lessons, exercises, SRS (FSRS), classes,
--   class enrolments, class assignments, telemetry, and mastery profiles.
--
-- AR owns: canonical pedagogy and learner-state.
-- AR must NOT re-own: roots, lemmas, morphology paradigms, balagha/nahw
--   registries (those live in km_arabic_linguistic / DB_AL).
--
-- Cross-module typed refs (no SQL FK across DBs):
--   al_lemma_ref    → 'AL:<ar_ling_lemma_id>'
--   al_root_ref     → 'AL:<ar_ling_root_id>'
--   al_nahw_ref     → 'AL:<ar_ling_nahw_concept_id>'
--   al_balagha_ref  → 'AL:<ar_ling_balagha_concept_id>'
--   al_morph_ref    → 'AL:<ar_ling_morphology_id>'
--   qr_scope_ref    → 'QR:<surah>:<ayah_from>[-<ayah_to>]'
--   cm_doc_ref      → 'CM:<doc_id>'
--   core_user_ref   → 'CORE:<user_id>'
--   core_ws_ref     → 'CORE:<workspace_id>'
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 1 — TRACK AND LEARNER MODEL
-- ─────────────────────────────────────────────────────────────────────────────

-- § 1.1  Learning tracks (fluency tracks: Classical, Quranic, MSA, etc.)
CREATE TABLE IF NOT EXISTS ar_learning_tracks (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  track_type      TEXT NOT NULL DEFAULT 'classical',
    -- 'classical'|'quranic'|'msa'|'dialect'|'academic'|'custom'
  cefr_from       TEXT,                           -- A1|A2|B1|B2|C1|C2
  cefr_to         TEXT,
  description_md  TEXT,
  prerequisites_json TEXT,                        -- JSON [track_id]
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_public       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_lt_type ON ar_learning_tracks(track_type);

INSERT OR IGNORE INTO ar_learning_tracks (id, slug, title, track_type, cefr_from, cefr_to) VALUES
  ('01ARLT00000000000000001', 'quranic-arabic',   'Quranic Arabic',    'quranic',   'A1', 'C1'),
  ('01ARLT00000000000000002', 'classical-arabic', 'Classical Arabic',  'classical', 'A2', 'C2'),
  ('01ARLT00000000000000003', 'msa-arabic',       'Modern Standard',   'msa',       'A1', 'B2'),
  ('01ARLT00000000000000004', 'sarf-track',       'Sarf (Morphology)', 'classical', 'A2', 'C1'),
  ('01ARLT00000000000000005', 'nahw-track',       'Nahw (Syntax)',     'classical', 'A2', 'C2'),
  ('01ARLT00000000000000006', 'balagha-track',    'Balagha (Rhetoric)','classical', 'B1', 'C2');

-- § 1.2  User track profiles (learner progress handle per track)
CREATE TABLE IF NOT EXISTS ar_user_track_profiles (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,                  -- 'CORE:<user_id>'
  track_id        TEXT NOT NULL,
  current_level   TEXT,                           -- 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  FOREIGN KEY (track_id) REFERENCES ar_learning_tracks(id),
  UNIQUE (core_user_ref, track_id)
);
CREATE INDEX IF NOT EXISTS idx_ar_utp_user  ON ar_user_track_profiles(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_ar_utp_track ON ar_user_track_profiles(track_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 2 — CONTAINERS, UNITS, AND TASKS (Curriculum packaging spine)
-- ─────────────────────────────────────────────────────────────────────────────

-- § 2.1  Containers (top-level course/book/curriculum packages)
CREATE TABLE IF NOT EXISTS ar_containers (
  id              TEXT PRIMARY KEY,               -- ULID
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  container_type  TEXT NOT NULL DEFAULT 'course',
    -- 'course'|'book'|'curriculum'|'track_package'|'custom'
  track_id        TEXT,
  level           TEXT,                           -- 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'
  description_md  TEXT,
  cover_ref       TEXT,                           -- 'CM:<media_id>'
  source_ref      TEXT,                           -- 'CM:<source_id>' or 'AL:<source_id>'
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_published    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (track_id) REFERENCES ar_learning_tracks(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_con_track ON ar_containers(track_id);
CREATE INDEX IF NOT EXISTS idx_ar_con_type  ON ar_containers(container_type);

-- § 2.2  Container units (chapters, modules within a container)
CREATE TABLE IF NOT EXISTS ar_container_units (
  id              TEXT PRIMARY KEY,
  container_id    TEXT NOT NULL,
  parent_id       TEXT,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  unit_type       TEXT NOT NULL DEFAULT 'lesson',
    -- 'lesson'|'chapter'|'module'|'section'|'exercise_set'|'assessment'|'other'
  unit_index      INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  estimated_mins  INTEGER,
  skill_focus     TEXT,                           -- 'sarf'|'nahw'|'balagha'|'vocab'|'listening'|'reading'|'other'
  al_concept_refs TEXT,                           -- JSON ['AL:<id>'] — concepts covered
  qr_scope_ref    TEXT,                           -- if Quran-anchored
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (container_id) REFERENCES ar_containers(id),
  FOREIGN KEY (parent_id)    REFERENCES ar_container_units(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_cu_container ON ar_container_units(container_id);
CREATE INDEX IF NOT EXISTS idx_ar_cu_parent    ON ar_container_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_ar_cu_type      ON ar_container_units(unit_type);

-- § 2.3  Unit tasks (atomic learning tasks within a unit)
CREATE TABLE IF NOT EXISTS ar_container_unit_tasks (
  id              TEXT PRIMARY KEY,
  unit_id         TEXT NOT NULL,
  parent_task_id  TEXT,
  title           TEXT NOT NULL,
  task_type       TEXT NOT NULL DEFAULT 'read',
    -- 'read'|'memorize'|'translate'|'exercise'|'listen'|'shadow'|'dictate'|
    -- 'review_vocab'|'quiz'|'apply_grammar'|'write'|'speak'|'other'
  task_index      INTEGER NOT NULL DEFAULT 0,
  step_no         INTEGER,
  description_md  TEXT,
  estimated_mins  INTEGER,
  al_concept_ref  TEXT,                           -- 'AL:<concept_id>' if grammar/balagha task
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id)        REFERENCES ar_container_units(id),
  FOREIGN KEY (parent_task_id) REFERENCES ar_container_unit_tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_cut_unit ON ar_container_unit_tasks(unit_id);

-- § 2.4  Curriculum (formal 3-discipline curriculum tree)
CREATE TABLE IF NOT EXISTS ar_curricula (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  discipline      TEXT NOT NULL DEFAULT 'nahw',
    -- 'sarf'|'nahw'|'balagha'|'combined'|'vocab'|'reading'|'other'
  level           TEXT,                           -- 'A1'→'C2'
  track_id        TEXT,
  container_id    TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (track_id)    REFERENCES ar_learning_tracks(id),
  FOREIGN KEY (container_id) REFERENCES ar_containers(id)
);

CREATE TABLE IF NOT EXISTS ar_curriculum_units (
  id              TEXT PRIMARY KEY,
  curriculum_id   TEXT NOT NULL,
  parent_id       TEXT,
  title           TEXT NOT NULL,
  al_concept_ref  TEXT,                           -- 'AL:<nahw|sarf|balagha_concept_id>'
  unit_index      INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  examples_json   TEXT,                           -- JSON [{arabic,translation,notes}]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (curriculum_id) REFERENCES ar_curricula(id),
  FOREIGN KEY (parent_id)     REFERENCES ar_curriculum_units(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_cun_curr ON ar_curriculum_units(curriculum_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 3 — VOCABULARY
-- ─────────────────────────────────────────────────────────────────────────────

-- § 3.1  Vocabulary (learner-facing vocab entries — links to AL for truth)
CREATE TABLE IF NOT EXISTS ar_vocabulary (
  id              TEXT PRIMARY KEY,               -- ULID
  arabic          TEXT NOT NULL,
  transliteration TEXT,
  meaning_en      TEXT NOT NULL,
  meaning_notes   TEXT,
  al_lemma_ref    TEXT,                           -- 'AL:<ar_ling_lemma_id>'
  al_root_ref     TEXT,                           -- 'AL:<ar_ling_root_id>'
  al_morph_ref    TEXT,                           -- 'AL:<ar_ling_morphology_id>'
  word_class      TEXT NOT NULL DEFAULT 'noun',
    -- 'noun'|'verb'|'adjective'|'particle'|'adverb'|'pronoun'|'phrase'|'other'
  level           TEXT,                           -- 'A1'→'C2'
  domain_id       TEXT,
  frequency_rank  INTEGER,
  qr_scope_ref    TEXT,                           -- if Quran word
  tags_json       TEXT,                           -- JSON [string]
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_voc_lemma  ON ar_vocabulary(al_lemma_ref);
CREATE INDEX IF NOT EXISTS idx_ar_voc_root   ON ar_vocabulary(al_root_ref);
CREATE INDEX IF NOT EXISTS idx_ar_voc_class  ON ar_vocabulary(word_class);
CREATE INDEX IF NOT EXISTS idx_ar_voc_level  ON ar_vocabulary(level);
CREATE VIRTUAL TABLE IF NOT EXISTS ar_vocabulary_fts USING fts5(
  arabic, meaning_en, meaning_notes, content='ar_vocabulary', content_rowid='rowid'
);

-- § 3.2  Vocabulary evidence (sourced examples for vocab items)
CREATE TABLE IF NOT EXISTS ar_vocabulary_evidence (
  id              TEXT PRIMARY KEY,
  vocab_id        TEXT NOT NULL,
  source_ref      TEXT,                           -- 'AL:<source_id>'|'CM:<source_id>'
  locator         TEXT,
  excerpt_ar      TEXT,
  excerpt_en      TEXT,
  qr_scope_ref    TEXT,
  evidence_type   TEXT NOT NULL DEFAULT 'text',
    -- 'text'|'quran'|'hadith'|'classical'|'modern'|'other'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (vocab_id) REFERENCES ar_vocabulary(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_ve_vocab ON ar_vocabulary_evidence(vocab_id);

-- § 3.3  Vocabulary relations (synonyms, antonyms, morphological family)
CREATE TABLE IF NOT EXISTS ar_vocabulary_relations (
  id              TEXT PRIMARY KEY,
  from_vocab_id   TEXT NOT NULL,
  to_vocab_id     TEXT NOT NULL,
  relation_type   TEXT NOT NULL DEFAULT 'synonym',
    -- 'synonym'|'antonym'|'root_family'|'derived_form'|'near_synonym'|'other'
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_vocab_id) REFERENCES ar_vocabulary(id),
  FOREIGN KEY (to_vocab_id)   REFERENCES ar_vocabulary(id),
  UNIQUE (from_vocab_id, to_vocab_id, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_ar_vr_from ON ar_vocabulary_relations(from_vocab_id);

-- § 3.4  Unit → vocabulary map
CREATE TABLE IF NOT EXISTS ar_unit_vocabulary_map (
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
CREATE INDEX IF NOT EXISTS idx_ar_uvm_unit  ON ar_unit_vocabulary_map(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_uvm_vocab ON ar_unit_vocabulary_map(vocab_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 4 — GRAMMAR
-- ─────────────────────────────────────────────────────────────────────────────

-- § 4.1  Grammar entries (pedagogical grammar explanations)
CREATE TABLE IF NOT EXISTS ar_grammar (
  id              TEXT PRIMARY KEY,               -- ULID
  title           TEXT NOT NULL,
  title_ar        TEXT,
  al_nahw_ref     TEXT,                           -- 'AL:<ar_ling_nahw_concept_id>'
  al_morph_ref    TEXT,                           -- 'AL:<ar_ling_morphology_id>' (sarf)
  grammar_type    TEXT NOT NULL DEFAULT 'nahw',
    -- 'nahw'|'sarf'|'combined'|'other'
  level           TEXT,                           -- 'A1'→'C2'
  explanation_md  TEXT NOT NULL,
  examples_json   TEXT,                           -- JSON [{arabic, translation, note}]
  rule_summary    TEXT,
  qr_scope_ref    TEXT,                           -- if Quran example basis
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_gr_nahw  ON ar_grammar(al_nahw_ref);
CREATE INDEX IF NOT EXISTS idx_ar_gr_type  ON ar_grammar(grammar_type);
CREATE INDEX IF NOT EXISTS idx_ar_gr_level ON ar_grammar(level);
CREATE VIRTUAL TABLE IF NOT EXISTS ar_grammar_fts USING fts5(
  title, title_ar, explanation_md, content='ar_grammar', content_rowid='rowid'
);

-- § 4.2  Grammar ↔ vocabulary links
CREATE TABLE IF NOT EXISTS ar_grammar_vocabulary_links (
  id          TEXT PRIMARY KEY,
  grammar_id  TEXT NOT NULL,
  vocab_id    TEXT NOT NULL,
  link_role   TEXT NOT NULL DEFAULT 'example',   -- 'example'|'applies_to'|'illustrates'
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id),
  FOREIGN KEY (vocab_id)   REFERENCES ar_vocabulary(id),
  UNIQUE (grammar_id, vocab_id)
);

-- § 4.3  Unit → grammar map
CREATE TABLE IF NOT EXISTS ar_unit_grammar_map (
  id          TEXT PRIMARY KEY,
  unit_id     TEXT NOT NULL,
  grammar_id  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id)    REFERENCES ar_container_units(id),
  FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id),
  UNIQUE (unit_id, grammar_id)
);
CREATE INDEX IF NOT EXISTS idx_ar_ugm_unit    ON ar_unit_grammar_map(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_ugm_grammar ON ar_unit_grammar_map(grammar_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 5 — APPLIED BALAGHA
-- ─────────────────────────────────────────────────────────────────────────────

-- § 5.1  Applied balagha (pedagogical entries pointing to AL for canonical def)
CREATE TABLE IF NOT EXISTS ar_applied_balagha (
  id              TEXT PRIMARY KEY,
  al_balagha_ref  TEXT NOT NULL,                  -- 'AL:<ar_ling_balagha_concept_id>'
  title           TEXT NOT NULL,
  title_ar        TEXT,
  explanation_md  TEXT NOT NULL,
  level           TEXT,
  qr_scope_ref    TEXT,                           -- primary Quran example
  examples_json   TEXT,                           -- JSON [{arabic, source, analysis}]
  quiz_notes      TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_ab_balagha ON ar_applied_balagha(al_balagha_ref);

-- § 5.2  Expressions (idiomatic and formulaic expressions)
CREATE TABLE IF NOT EXISTS ar_expressions (
  id              TEXT PRIMARY KEY,
  arabic          TEXT NOT NULL,
  transliteration TEXT,
  meaning_en      TEXT NOT NULL,
  expression_type TEXT NOT NULL DEFAULT 'idiom',
    -- 'idiom'|'formula'|'proverb'|'collocate'|'fixed_phrase'|'other'
  al_expression_ref TEXT,                         -- 'AL:<ar_ling_expression_id>'
  domain_id       TEXT,
  level           TEXT,
  usage_note      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_exp_type ON ar_expressions(expression_type);
CREATE VIRTUAL TABLE IF NOT EXISTS ar_expressions_fts USING fts5(
  arabic, meaning_en, content='ar_expressions', content_rowid='rowid'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 6 — DOMAINS AND SCENARIOS
-- ─────────────────────────────────────────────────────────────────────────────

-- § 6.1  Context domains (semantic domain registry for contextual acquisition)
CREATE TABLE IF NOT EXISTS ar_domains (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  title_ar    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO ar_domains (id, slug, title, title_ar) VALUES
  ('01ARDOM000000000000001', 'quran',          'Quranic Language',      'لغة القرآن'),
  ('01ARDOM000000000000002', 'hadith',         'Hadith and Sunnah',     'الحديث والسنة'),
  ('01ARDOM000000000000003', 'fiqh',           'Islamic Law (Fiqh)',    'الفقه'),
  ('01ARDOM000000000000004', 'literature',     'Classical Literature',  'الأدب الكلاسيكي'),
  ('01ARDOM000000000000005', 'daily_life',     'Daily Life',            'الحياة اليومية'),
  ('01ARDOM000000000000006', 'academic',       'Academic Arabic',       'العربية الأكاديمية'),
  ('01ARDOM000000000000007', 'news_media',     'News and Media',        'الأخبار والإعلام'),
  ('01ARDOM000000000000008', 'theology',       'Theology (Aqeedah)',    'العقيدة');

-- § 6.2  Domain phrases (key phrases within a domain)
CREATE TABLE IF NOT EXISTS ar_domain_phrases (
  id              TEXT PRIMARY KEY,
  domain_id       TEXT NOT NULL,
  arabic          TEXT NOT NULL,
  transliteration TEXT,
  meaning_en      TEXT NOT NULL,
  usage_context   TEXT,
  level           TEXT,
  vocab_id        TEXT,                           -- link to ar_vocabulary if exists
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES ar_domains(id),
  FOREIGN KEY (vocab_id)  REFERENCES ar_vocabulary(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_dp_domain ON ar_domain_phrases(domain_id);

-- § 6.3  Scenarios (contextual acquisition settings)
CREATE TABLE IF NOT EXISTS ar_scenarios (
  id              TEXT PRIMARY KEY,
  domain_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  scenario_type   TEXT NOT NULL DEFAULT 'dialogue',
    -- 'dialogue'|'reading'|'listening'|'writing'|'speaking'|'other'
  level           TEXT,
  description_md  TEXT,
  vocab_set_json  TEXT,                           -- JSON [vocab_id]
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES ar_domains(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_sc_domain ON ar_scenarios(domain_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 7 — LESSONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_lessons (
  id              TEXT PRIMARY KEY,               -- ULID
  unit_id         TEXT,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  lesson_type     TEXT NOT NULL DEFAULT 'instruction',
    -- 'instruction'|'exercise'|'reading'|'audio'|'quiz'|'assessment'|'other'
  level           TEXT,
  skill_focus     TEXT,                           -- 'sarf'|'nahw'|'balagha'|'vocab'|'other'
  content_md      TEXT NOT NULL,
  vocab_ids_json  TEXT,                           -- JSON [vocab_id]
  grammar_ids_json TEXT,                          -- JSON [grammar_id]
  qr_scope_ref    TEXT,
  estimated_mins  INTEGER,
  is_published    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_les_unit  ON ar_lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_les_type  ON ar_lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_ar_les_level ON ar_lessons(level);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 8 — EXERCISES
-- ─────────────────────────────────────────────────────────────────────────────

-- § 8.1  Exercise bank (question definitions)
CREATE TABLE IF NOT EXISTS ar_exercises (
  id              TEXT PRIMARY KEY,               -- ULID
  lesson_id       TEXT,
  unit_id         TEXT,
  exercise_type   TEXT NOT NULL DEFAULT 'mcq',
    -- 'mcq'|'fill_blank'|'translation'|'matching'|'reorder'|'drag_drop'|
    -- 'conjugate'|'parse'|'identify_balagha'|'free_write'|'other'
  prompt_ar       TEXT,
  prompt_en       TEXT,
  options_json    TEXT,                           -- JSON [{text, is_correct}] for MCQ
  answer_json     TEXT,                           -- correct answer payload
  explanation_md  TEXT,
  vocab_id        TEXT,
  grammar_id      TEXT,
  al_concept_ref  TEXT,                           -- 'AL:<concept_id>'
  qr_scope_ref    TEXT,
  level           TEXT,
  skill_focus     TEXT,
  difficulty      INTEGER NOT NULL DEFAULT 3,     -- 1=easy 5=hard
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lesson_id)  REFERENCES ar_lessons(id),
  FOREIGN KEY (unit_id)    REFERENCES ar_container_units(id),
  FOREIGN KEY (vocab_id)   REFERENCES ar_vocabulary(id),
  FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_ex_lesson ON ar_exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ar_ex_type   ON ar_exercises(exercise_type);
CREATE INDEX IF NOT EXISTS idx_ar_ex_level  ON ar_exercises(level);

-- § 8.2  Exercise attempts (learner responses)
CREATE TABLE IF NOT EXISTS ar_exercise_attempts (
  id              TEXT PRIMARY KEY,
  exercise_id     TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  response_json   TEXT,                           -- learner's answer
  is_correct      INTEGER NOT NULL DEFAULT 0,
  score           REAL,
  time_spent_secs INTEGER,
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  attempted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (exercise_id) REFERENCES ar_exercises(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_ea_exercise ON ar_exercise_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_ar_ea_user     ON ar_exercise_attempts(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_ar_ea_at       ON ar_exercise_attempts(attempted_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 9 — SRS (Spaced Repetition System — FSRS Algorithm)
-- ─────────────────────────────────────────────────────────────────────────────

-- § 9.1  SRS decks
CREATE TABLE IF NOT EXISTS ar_srs_decks (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  title           TEXT NOT NULL,
  deck_type       TEXT NOT NULL DEFAULT 'vocabulary',
    -- 'vocabulary'|'grammar'|'ayah'|'balagha'|'expression'|'mixed'|'other'
  description     TEXT,
  card_count      INTEGER NOT NULL DEFAULT 0,
  is_shared       INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_sd_user ON ar_srs_decks(core_user_ref);

-- § 9.2  SRS cards (FSRS state per learner per item)
CREATE TABLE IF NOT EXISTS ar_srs_cards (
  id              TEXT PRIMARY KEY,               -- ULID
  deck_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,                  -- typed ref to vocab/grammar/ayah/concept
  resource_type   TEXT NOT NULL,
    -- 'vocabulary'|'grammar'|'ayah'|'balagha'|'expression'|'al_lemma'|'other'
  -- FSRS state
  stability       REAL NOT NULL DEFAULT 1.0,      -- memory stability S
  difficulty      REAL NOT NULL DEFAULT 0.3,      -- item difficulty D (0–1)
  elapsed_days    INTEGER NOT NULL DEFAULT 0,
  scheduled_days  INTEGER NOT NULL DEFAULT 1,
  reps            INTEGER NOT NULL DEFAULT 0,
  lapses          INTEGER NOT NULL DEFAULT 0,
  card_state      TEXT NOT NULL DEFAULT 'new',
    -- 'new'|'learning'|'review'|'relearning'
  last_review_at  TEXT,
  next_review_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deck_id) REFERENCES ar_srs_decks(id),
  UNIQUE (deck_id, resource_ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_sc_deck   ON ar_srs_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_ar_sc_user   ON ar_srs_cards(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_ar_sc_next   ON ar_srs_cards(next_review_at);
CREATE INDEX IF NOT EXISTS idx_ar_sc_state  ON ar_srs_cards(card_state);

-- § 9.3  SRS reviews (review event log)
CREATE TABLE IF NOT EXISTS ar_srs_reviews (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  rating          INTEGER NOT NULL,               -- FSRS: 1=Again 2=Hard 3=Good 4=Easy
  -- Snapshot of FSRS state after review
  stability_after REAL,
  difficulty_after REAL,
  scheduled_days_after INTEGER,
  state_after     TEXT,
  review_duration_secs INTEGER,
  reviewed_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES ar_srs_cards(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_sr_card ON ar_srs_reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_ar_sr_user ON ar_srs_reviews(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_ar_sr_at   ON ar_srs_reviews(reviewed_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 10 — CLASSES AND ENROLMENTS
-- ─────────────────────────────────────────────────────────────────────────────

-- § 10.1  Classes (teacher-led delivery shell)
CREATE TABLE IF NOT EXISTS ar_classes (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  class_type      TEXT NOT NULL DEFAULT 'course',
    -- 'course'|'workshop'|'tutoring'|'group_study'|'other'
  container_id    TEXT,                           -- optional: anchors to a container
  curriculum_id   TEXT,                           -- optional: anchors to a curriculum
  teacher_ref     TEXT NOT NULL,                  -- 'CORE:<user_id>'
  core_ws_ref     TEXT NOT NULL,                  -- 'CORE:<workspace_id>'
  status          TEXT NOT NULL DEFAULT 'draft',
    -- 'draft'|'active'|'paused'|'completed'|'archived'
  start_date      TEXT,
  end_date        TEXT,
  max_enrolments  INTEGER,
  visibility      TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'|'public'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (container_id)  REFERENCES ar_containers(id),
  FOREIGN KEY (curriculum_id) REFERENCES ar_curricula(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_cl_ws      ON ar_classes(core_ws_ref);
CREATE INDEX IF NOT EXISTS idx_ar_cl_teacher ON ar_classes(teacher_ref);
CREATE INDEX IF NOT EXISTS idx_ar_cl_status  ON ar_classes(status);

-- § 10.2  Class enrolments
CREATE TABLE IF NOT EXISTS ar_class_enrolments (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  student_ref     TEXT NOT NULL,                  -- 'CORE:<user_id>'
  role            TEXT NOT NULL DEFAULT 'student',
    -- 'student'|'teacher_assistant'|'observer'|'auditor'
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'invited'|'active'|'paused'|'withdrawn'|'completed'
  enrolled_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  meta_json       TEXT,
  FOREIGN KEY (class_id) REFERENCES ar_classes(id),
  UNIQUE (class_id, student_ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_ce_class   ON ar_class_enrolments(class_id);
CREATE INDEX IF NOT EXISTS idx_ar_ce_student ON ar_class_enrolments(student_ref);
CREATE INDEX IF NOT EXISTS idx_ar_ce_status  ON ar_class_enrolments(status);

-- § 10.3  Class resources (materials attached to a class)
CREATE TABLE IF NOT EXISTS ar_class_resources (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,                  -- typed ref: 'CM:<doc_id>'|'AR:<vocab_id>'|etc.
  resource_type   TEXT NOT NULL,
    -- 'cm_doc'|'lesson'|'exercise_set'|'vocab_list'|'grammar_note'|'media'|'other'
  resource_label  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_required     INTEGER NOT NULL DEFAULT 1,
  added_by_ref    TEXT,                           -- 'CORE:<user_id>'
  added_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES ar_classes(id),
  UNIQUE (class_id, resource_ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_cr_class    ON ar_class_resources(class_id);
CREATE INDEX IF NOT EXISTS idx_ar_cr_resource ON ar_class_resources(resource_ref);

-- § 10.4  Class assignments
CREATE TABLE IF NOT EXISTS ar_class_assignments (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  title           TEXT NOT NULL,
  instructions_md TEXT,
  resource_refs   TEXT,                           -- JSON [typed_refs]
  due_date        TEXT,
  weight          REAL NOT NULL DEFAULT 1.0,
  status          TEXT NOT NULL DEFAULT 'open',   -- 'open'|'closed'|'graded'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES ar_classes(id)
);
CREATE INDEX IF NOT EXISTS idx_ar_ca_class  ON ar_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_ar_ca_status ON ar_class_assignments(status);
CREATE INDEX IF NOT EXISTS idx_ar_ca_due    ON ar_class_assignments(due_date);

-- § 10.5  Assignment submissions
CREATE TABLE IF NOT EXISTS ar_assignment_submissions (
  id              TEXT PRIMARY KEY,
  assignment_id   TEXT NOT NULL,
  student_ref     TEXT NOT NULL,                  -- 'CORE:<user_id>'
  submission_type TEXT NOT NULL DEFAULT 'text',
    -- 'text'|'file'|'audio'|'link'|'other'
  content_md      TEXT,
  cm_doc_ref      TEXT,                           -- 'CM:<doc_id>' if file
  score           REAL,
  feedback_md     TEXT,
  graded_by_ref   TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted',
    -- 'draft'|'submitted'|'graded'|'returned'
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  graded_at       TEXT,
  FOREIGN KEY (assignment_id) REFERENCES ar_class_assignments(id),
  UNIQUE (assignment_id, student_ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_asub_assign  ON ar_assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ar_asub_student ON ar_assignment_submissions(student_ref);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ LAYER 11 — PROGRESS AND TELEMETRY
-- ─────────────────────────────────────────────────────────────────────────────

-- § 11.1  Task completions
CREATE TABLE IF NOT EXISTS ar_task_completions (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  completed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  time_spent_mins INTEGER,
  notes           TEXT,
  FOREIGN KEY (task_id) REFERENCES ar_container_unit_tasks(id),
  UNIQUE (task_id, core_user_ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_tc_task ON ar_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_ar_tc_user ON ar_task_completions(core_user_ref);

-- § 11.2  Unit progress
CREATE TABLE IF NOT EXISTS ar_unit_progress (
  id                TEXT PRIMARY KEY,
  unit_id           TEXT NOT NULL,
  core_user_ref     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'not_started',
    -- 'not_started'|'in_progress'|'completed'|'revisiting'
  progress_pct      REAL NOT NULL DEFAULT 0,      -- 0–100
  last_activity_at  TEXT,
  completed_at      TEXT,
  meta_json         TEXT,
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id),
  UNIQUE (unit_id, core_user_ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_up_unit   ON ar_unit_progress(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_up_user   ON ar_unit_progress(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_ar_up_status ON ar_unit_progress(status);

-- § 11.3  Mastery profiles (per-user skill mastery tracking)
CREATE TABLE IF NOT EXISTS ar_mastery_profiles (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  track_id        TEXT,
  skill           TEXT NOT NULL,
    -- 'sarf'|'nahw'|'balagha'|'vocab_size'|'reading'|'listening'|'other'
  mastery_score   REAL NOT NULL DEFAULT 0,        -- 0–1
  items_mastered  INTEGER NOT NULL DEFAULT 0,
  items_learning  INTEGER NOT NULL DEFAULT 0,
  last_assessed_at TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (track_id) REFERENCES ar_learning_tracks(id),
  UNIQUE (core_user_ref, track_id, skill)
);
CREATE INDEX IF NOT EXISTS idx_ar_mp_user  ON ar_mastery_profiles(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_ar_mp_skill ON ar_mastery_profiles(skill);
