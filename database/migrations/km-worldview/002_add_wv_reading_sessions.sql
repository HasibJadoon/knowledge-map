-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_worldview DB — Migration 002: Reading Sessions
-- File   : database/migrations/km-worldview/002_add_wv_reading_sessions.sql
-- DB     : km_worldview   (binding: DB_WV in Workers)
-- Run    : wrangler d1 execute km_worldview --file=... --remote
--
-- Adds a first-class reading-session record so a user can open a focused
-- reading pass over a wv_sources book (optionally scoped to a wv_source_units
-- chapter), track progress/position, and group the highlights captured during
-- that pass. Highlights gain a nullable reading_session_id back-reference.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wv_reading_sessions (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  source_unit_id  TEXT,                              -- current/last chapter within the source
  title           TEXT,
  session_type    TEXT NOT NULL DEFAULT 'reading',   -- reading | extraction | review
  status          TEXT NOT NULL DEFAULT 'active',    -- active | paused | completed
  focus_mode      TEXT,                              -- deep_read | skim | extraction
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at        TEXT,
  last_position   TEXT,                              -- locator / page label
  duration_secs   INTEGER,
  summary_md      TEXT,
  core_user_ref   TEXT NOT NULL,                     -- CORE:<user_id>
  core_ws_ref     TEXT,                              -- CORE:<workspace_id>
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id)
);

CREATE INDEX IF NOT EXISTS idx_wv_reading_session_src    ON wv_reading_sessions(source_id, started_at);
CREATE INDEX IF NOT EXISTS idx_wv_reading_session_user   ON wv_reading_sessions(core_user_ref, status);
CREATE INDEX IF NOT EXISTS idx_wv_reading_session_status ON wv_reading_sessions(status);

-- Back-reference so highlights can be grouped by the session they were made in.
-- SQLite has no ADD COLUMN IF NOT EXISTS; this migration is run-once.
ALTER TABLE wv_highlights ADD COLUMN reading_session_id TEXT REFERENCES wv_reading_sessions(id);

CREATE INDEX IF NOT EXISTS idx_wv_highlight_session ON wv_highlights(reading_session_id);
