-- 0005_st_capture_log.sql — talking-point capture log
-- A capture session is one recording pass over an episode's talking points.
-- It records, per take, which point was shot, its in/out timecodes, and whether
-- the take was good / needs a redo / was skipped — the editor's shot log.

CREATE TABLE IF NOT EXISTS st_capture_sessions (
  id             TEXT PRIMARY KEY,
  episode_ref    TEXT NOT NULL,                         -- the episode being recorded
  core_user_ref  TEXT NOT NULL,                         -- the operator
  concept        TEXT NOT NULL DEFAULT 'talking_head',  -- talking_head|continuity|log_only
  started_at     TEXT,
  ended_at       TEXT,
  sync_marker_tc TEXT,                                  -- clapper / sync timecode
  device_json    TEXT,                                  -- camera / device metadata
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_st_capture_sessions_episode ON st_capture_sessions(episode_ref);

CREATE TABLE IF NOT EXISTS st_capture_markers (
  id           TEXT PRIMARY KEY,
  session_ref  TEXT NOT NULL,                       -- owning capture session
  point_ref    TEXT NOT NULL,                       -- the talking point this take covers
  section_ref  TEXT,                                -- denormalised section, for grouping
  take_number  INTEGER NOT NULL DEFAULT 1,
  start_tc     TEXT,
  end_tc       TEXT,
  status       TEXT NOT NULL DEFAULT 'good',        -- good|redo|skip
  note         TEXT,
  clip_ref     TEXT,                                -- external clip / file reference
  seq          INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_ref) REFERENCES st_capture_sessions(id),
  FOREIGN KEY (point_ref) REFERENCES st_talking_points(id)
);
CREATE INDEX IF NOT EXISTS idx_st_capture_markers_session ON st_capture_markers(session_ref, seq);
