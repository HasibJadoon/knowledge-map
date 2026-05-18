-- Weekly-sprint planner item store, ported from the legacy `knowledgemap` DB.
-- One generic table holds week plans, tasks, and sprint reviews as item_json
-- blobs, scoped to a CORE user ref. Drives the /planner/* + /week/* API.

CREATE TABLE IF NOT EXISTS sp_planner (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  core_user_ref   TEXT NOT NULL,
  item_type       TEXT NOT NULL DEFAULT 'task',
  week_start      TEXT,
  period_start    TEXT,
  period_end      TEXT,
  related_type    TEXT,
  related_id      TEXT,
  item_json       TEXT NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_sp_planner_lookup
  ON sp_planner (core_user_ref, item_type, week_start);
