-- 0002 — Qur'anic-vocabulary learner workflow (AR domain), surah-passage model.
-- This is NOT the class/curriculum SRS (ar_srs_*, ar_classes, ar_curricula).
-- Qur'anic study is organized surah -> passage, encounter-driven, scoped per
-- user + per workspace. Cards reference AL content (root_norm / sense_id) and
-- QR scope (surah:ayah:word) by typed reference; they reuse the FSRS scheduling
-- shape of ar_srs_cards. See docs/quran-vocabulary-backbone-plan.md.

-- A passage's vocabulary set (unlocks as the learner studies that passage).
CREATE TABLE IF NOT EXISTS ar_qr_vocab_decks (
  id           TEXT PRIMARY KEY,
  workspace_id INTEGER NOT NULL DEFAULT 1,
  surah        INTEGER NOT NULL,
  passage_id   TEXT,
  passage_ref  TEXT,                                  -- e.g. QR:39:1-39:5
  title        TEXT NOT NULL,
  note_md      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, surah, passage_ref)
);

-- One SRS card per (workspace, user, vocab scope). Scope = root | sense | lemma.
CREATE TABLE IF NOT EXISTS ar_qr_vocab_cards (
  id                  TEXT PRIMARY KEY,
  workspace_id        INTEGER NOT NULL DEFAULT 1,
  core_user_ref       TEXT NOT NULL,
  deck_id             TEXT,
  vocab_scope         TEXT NOT NULL,                  -- root | sense | lemma
  vocab_ref           TEXT NOT NULL,                  -- AL: root_norm / sense_id / lemma_id
  root_norm           TEXT,
  al_root_ref         TEXT,                           -- AL:<root id>
  introduced_surah    INTEGER,
  introduced_ayah     INTEGER,
  introduced_word_ref TEXT,                           -- QR:surah:ayah:word
  stability           REAL NOT NULL DEFAULT 1.0,
  difficulty          REAL NOT NULL DEFAULT 0.3,
  reps                INTEGER NOT NULL DEFAULT 0,
  lapses              INTEGER NOT NULL DEFAULT 0,
  card_state          TEXT NOT NULL DEFAULT 'new',    -- new | learning | review | relearning
  mastery_state       TEXT NOT NULL DEFAULT 'new',    -- new | growing | well_learned
  last_review_at      TEXT,
  next_review_at      TEXT,
  suspended           INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, core_user_ref, vocab_scope, vocab_ref)
);
CREATE INDEX IF NOT EXISTS idx_ar_qrvc_due
  ON ar_qr_vocab_cards(workspace_id, core_user_ref, suspended, next_review_at);

-- Attempt log — drives the 24h strength recompute and per-passage progress.
CREATE TABLE IF NOT EXISTS ar_qr_vocab_reviews (
  id               TEXT PRIMARY KEY,
  card_id          TEXT NOT NULL,
  workspace_id     INTEGER NOT NULL DEFAULT 1,
  core_user_ref    TEXT NOT NULL,
  exercise_id      TEXT,                              -- AL: ar_ling_vocab_exercises.id
  rating           INTEGER NOT NULL,                  -- 1..4
  response_ms      INTEGER,
  card_state_after TEXT,
  stability_after  REAL,
  reviewed_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_qrvr_card ON ar_qr_vocab_reviews(card_id);

-- Per (workspace, user, passage) progress rollup.
CREATE TABLE IF NOT EXISTS ar_qr_vocab_progress (
  id                 TEXT PRIMARY KEY,
  workspace_id       INTEGER NOT NULL DEFAULT 1,
  core_user_ref      TEXT NOT NULL,
  surah              INTEGER NOT NULL,
  passage_id         TEXT,
  passage_ref        TEXT,
  roots_total        INTEGER NOT NULL DEFAULT 0,
  roots_growing      INTEGER NOT NULL DEFAULT 0,
  roots_well_learned INTEGER NOT NULL DEFAULT 0,
  last_studied_at    TEXT,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(workspace_id, core_user_ref, passage_ref)
);
