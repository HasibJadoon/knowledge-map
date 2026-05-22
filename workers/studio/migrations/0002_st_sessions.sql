-- 0002_st_sessions.sql — live session records for km_studio
-- A session is one live run of an episode. The synced cursor state lives in the
-- EpisodeSession Durable Object; this table is the durable index + history so a
-- room code can be resolved and ended sessions can be reviewed later.

CREATE TABLE IF NOT EXISTS st_sessions (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  core_user_ref TEXT NOT NULL,                  -- the host
  room_code     TEXT NOT NULL UNIQUE,           -- short code joiners type in
  status        TEXT NOT NULL DEFAULT 'live',   -- live|ended
  started_at    TEXT,
  ended_at      TEXT,
  snapshot_json TEXT,                           -- optional end-of-session state
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_st_sessions_code ON st_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_st_sessions_episode ON st_sessions(episode_ref, status);
