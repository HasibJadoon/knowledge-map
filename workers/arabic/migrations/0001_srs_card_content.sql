-- SRS storage for the K-MAPS spaced-repetition engine.
--
-- These tables never existed in km_arabic: the original 001_ar_schema.sql
-- shipped only the curriculum + learn-progress families, and this migration
-- used to ALTER an `ar_srs_cards` table that was never created, so it could
-- never apply. It now creates the three tables outright, under the ar_learn_*
-- grouping the rest of the learner-state tables use (ar_learn_mastery,
-- ar_learn_unit_progress, …), which is also the naming the worker queries.
--
-- Cards are self-contained Anki-style rows: an explicit front and back,
-- structured extras, tags and a suspend flag. The snapshot columns let cards
-- be reviewed offline and exported to Anki without re-deriving content from
-- the resource_ref.

CREATE TABLE IF NOT EXISTS ar_learn_srs_deck (
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

CREATE TABLE IF NOT EXISTS ar_learn_srs_card (
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
  FOREIGN KEY (deck_id) REFERENCES ar_learn_srs_deck(id),
  UNIQUE (deck_id, resource_ref)
);

CREATE TABLE IF NOT EXISTS ar_learn_srs_review (
  id                   TEXT PRIMARY KEY,
  card_id              TEXT NOT NULL,
  core_user_ref        TEXT NOT NULL,
  rating               INTEGER NOT NULL,
  stability_after      REAL,
  difficulty_after     REAL,
  scheduled_days_after INTEGER,
  state_after          TEXT,
  review_duration_secs INTEGER,
  reviewed_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES ar_learn_srs_card(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_sc_due
  ON ar_learn_srs_card(core_user_ref, suspended, next_review_at);
