-- Schema snapshot for km_studio.
-- Episode Studio: build podcast / tutorial / talking-head / conversation
-- episodes from reusable templates, then run live synced sessions.
-- Phase 1 covers episode authoring; live-session tables arrive later.

CREATE TABLE st_templates (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  format          TEXT NOT NULL DEFAULT 'podcast',   -- podcast|tutorial|talking_head|conversation|solo
  is_builtin      INTEGER NOT NULL DEFAULT 0,
  structure_json  TEXT NOT NULL DEFAULT '{}',        -- { participants[], sections[] } blueprint
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_st_templates_owner ON st_templates(core_user_ref);

CREATE TABLE st_episodes (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  title           TEXT NOT NULL,
  format          TEXT NOT NULL DEFAULT 'podcast',
  template_ref    TEXT,                              -- ST:id of the source template
  status          TEXT NOT NULL DEFAULT 'draft',     -- draft|live|done
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_st_episodes_owner ON st_episodes(core_user_ref, created_at);

CREATE TABLE st_participants (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#c9a84c',
  role          TEXT NOT NULL DEFAULT 'speaker',     -- host|speaker|guest|viewer
  seq           INTEGER NOT NULL DEFAULT 0,
  core_user_ref TEXT,                                -- CORE account this cast member is; NULL = unlinked
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX idx_st_participants_episode ON st_participants(episode_ref, seq);
CREATE INDEX idx_st_participants_user ON st_participants(core_user_ref);

CREATE TABLE st_sections (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'custom',      -- intro|main_point|discussion|conclusion|custom
  heading       TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX idx_st_sections_episode ON st_sections(episode_ref, seq);

CREATE TABLE st_talking_points (
  id            TEXT PRIMARY KEY,
  section_ref   TEXT NOT NULL,
  episode_ref   TEXT NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  speaker_ref   TEXT,                                -- ST:id of the assigned participant
  bridge        TEXT,                                -- talking-head: transition into the next card
  est_seconds   INTEGER,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (section_ref) REFERENCES st_sections(id),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX idx_st_points_section ON st_talking_points(section_ref, seq);
CREATE INDEX idx_st_points_episode ON st_talking_points(episode_ref);

CREATE TABLE st_sessions (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  core_user_ref TEXT NOT NULL,                  -- the host
  room_code     TEXT NOT NULL UNIQUE,           -- short code joiners type in
  status        TEXT NOT NULL DEFAULT 'live',   -- live|ended
  started_at    TEXT,
  ended_at      TEXT,
  snapshot_json TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX idx_st_sessions_code ON st_sessions(room_code);
CREATE INDEX idx_st_sessions_episode ON st_sessions(episode_ref, status);
