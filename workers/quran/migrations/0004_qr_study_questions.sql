-- Migration 0004: comprehension question bank for the surah study module.
--
-- The Data Storage Map (docs/wiki/03-quranic-teaching/Data Storage Map.md)
-- routes the Comprehension tab to an `ar_lesson_questions` table in the AR
-- domain. The QR domain had no equivalent, so the study module's
-- comprehension step had no canonical source table to resolve from. This
-- adds qr_study_questions: authored pedagogy (questions), keyed to a passage
-- and analysis scope, that the comprehension task resolves from directly.
--
-- Apply:
--   wrangler d1 migrations apply km_quran --remote --config workers/quran/wrangler.toml

CREATE TABLE IF NOT EXISTS qr_study_questions (
  id            TEXT PRIMARY KEY,
  surah         INTEGER NOT NULL,
  passage_id    TEXT,
  scope_ref     TEXT,                       -- QR:AS:{surah}:{n} analysis scope
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  question_type TEXT NOT NULL DEFAULT 'comprehension',  -- comprehension|analytical|reflective|mcq
  question_en   TEXT NOT NULL,
  question_ar   TEXT,
  options_json  TEXT,                       -- for mcq
  answer_md     TEXT,
  difficulty    TEXT NOT NULL DEFAULT 'standard',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id),
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qrsq_passage ON qr_study_questions(passage_id, sort_order);
