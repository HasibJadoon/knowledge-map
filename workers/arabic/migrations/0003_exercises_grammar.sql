-- Exercise + grammar content tables.
--
-- `/ar/exercises` and `/ar/grammar` are wired to routes and the worker queries
-- ar_exercises / ar_grammar, but neither table was ever created in km_arabic —
-- both endpoints fail at runtime. The DDL below is the schema snapshot's
-- definition, with the foreign keys repointed at the tables that actually
-- exist after the curriculum rename (ar_curriculum_lesson,
-- ar_curriculum_container_unit).
--
-- vocab_id is left as a plain column: AR does not own vocabulary. Canonical
-- lexical truth lives in DB_AL and is referenced with AL:<id> typed refs.

CREATE TABLE IF NOT EXISTS ar_grammar (
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

CREATE TABLE IF NOT EXISTS ar_exercises (
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
  FOREIGN KEY (lesson_id)  REFERENCES ar_curriculum_lesson(id),
  FOREIGN KEY (unit_id)    REFERENCES ar_curriculum_container_unit(id),
  FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_exercises_lesson  ON ar_exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ar_exercises_unit    ON ar_exercises(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_exercises_grammar ON ar_exercises(grammar_id);
CREATE INDEX IF NOT EXISTS idx_ar_grammar_type      ON ar_grammar(grammar_type, level);
