-- 0001_st_studio.sql — km_studio initial schema
-- Episode Studio: build podcast / tutorial / talking-head / conversation
-- episodes from reusable templates. Phase 1 covers episode authoring; live
-- sync (Durable Objects) arrives in a later migration.

CREATE TABLE IF NOT EXISTS st_templates (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  format          TEXT NOT NULL DEFAULT 'podcast',
  is_builtin      INTEGER NOT NULL DEFAULT 0,
  structure_json  TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_st_templates_owner ON st_templates(core_user_ref);

CREATE TABLE IF NOT EXISTS st_episodes (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  title           TEXT NOT NULL,
  format          TEXT NOT NULL DEFAULT 'podcast',
  template_ref    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_st_episodes_owner ON st_episodes(core_user_ref, created_at);

CREATE TABLE IF NOT EXISTS st_participants (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#c9a84c',
  role          TEXT NOT NULL DEFAULT 'speaker',
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_st_participants_episode ON st_participants(episode_ref, seq);

CREATE TABLE IF NOT EXISTS st_sections (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'custom',
  heading       TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_st_sections_episode ON st_sections(episode_ref, seq);

CREATE TABLE IF NOT EXISTS st_talking_points (
  id            TEXT PRIMARY KEY,
  section_ref   TEXT NOT NULL,
  episode_ref   TEXT NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  speaker_ref   TEXT,
  est_seconds   INTEGER,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (section_ref) REFERENCES st_sections(id),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_st_points_section ON st_talking_points(section_ref, seq);
CREATE INDEX IF NOT EXISTS idx_st_points_episode ON st_talking_points(episode_ref);

-- ── Built-in templates ────────────────────────────────────────────────────────
-- Shared across all users (core_user_ref = 'CORE:system'). structure_json holds
-- a { participants[], sections[] } blueprint expanded into rows on episode create.
INSERT OR IGNORE INTO st_templates (id, core_user_ref, name, description, format, is_builtin, structure_json) VALUES
  ('ST:builtin-solo', 'CORE:system', 'Solo Monologue',
   'A one-person episode that runs straight through a simple arc.', 'solo', 1,
   '{"participants":[{"role":"host","display_name":"Host"}],"sections":[{"type":"intro","heading":"Intro","points":[{"text":"Welcome and introduce the topic","speaker_role":"host"}]},{"type":"main_point","heading":"Main Point","points":[{"text":"Make your core argument","speaker_role":"host"}]},{"type":"conclusion","heading":"Conclusion","points":[{"text":"Summarise and sign off","speaker_role":"host"}]}]}'),

  ('ST:builtin-conversation', 'CORE:system', 'Two-Person Conversation',
   'Two speakers trade talking points through an intro, main point and discussion.', 'conversation', 1,
   '{"participants":[{"role":"p1","display_name":"Person 1"},{"role":"p2","display_name":"Person 2"}],"sections":[{"type":"intro","heading":"Intro","points":[{"text":"Welcome and introduce the topic","speaker_role":"p1"}]},{"type":"main_point","heading":"Main Point","points":[{"text":"First take on the topic","speaker_role":"p1"},{"text":"Second take on the topic","speaker_role":"p2"}]},{"type":"discussion","heading":"Question for Discussion","points":[{"text":"Open question to discuss together","speaker_role":null}]},{"type":"conclusion","heading":"Conclusion","points":[{"text":"Final thoughts and wrap up","speaker_role":"p2"}]}]}'),

  ('ST:builtin-interview', 'CORE:system', 'Interview',
   'A host interviews a guest across background, main discussion and rapid questions.', 'podcast', 1,
   '{"participants":[{"role":"host","display_name":"Host"},{"role":"guest","display_name":"Guest"}],"sections":[{"type":"intro","heading":"Intro","points":[{"text":"Introduce the guest and the topic","speaker_role":"host"}]},{"type":"main_point","heading":"Guest Background","points":[{"text":"Ask the guest about their background","speaker_role":"host"},{"text":"Guest shares their background","speaker_role":"guest"}]},{"type":"main_point","heading":"Main Discussion","points":[{"text":"Core interview questions","speaker_role":"host"},{"text":"Guest gives their main answers","speaker_role":"guest"}]},{"type":"discussion","heading":"Rapid Questions","points":[{"text":"Quick fire questions","speaker_role":"host"}]},{"type":"conclusion","heading":"Conclusion","points":[{"text":"Thank the guest and close","speaker_role":"host"}]}]}'),

  ('ST:builtin-tutorial', 'CORE:system', 'Tutorial',
   'A teaching episode: outcomes, a step-by-step walkthrough and a recap.', 'tutorial', 1,
   '{"participants":[{"role":"host","display_name":"Instructor"}],"sections":[{"type":"intro","heading":"Intro","points":[{"text":"What this tutorial covers","speaker_role":"host"}]},{"type":"main_point","heading":"What You Will Learn","points":[{"text":"List the learning outcomes","speaker_role":"host"}]},{"type":"main_point","heading":"Step by Step","points":[{"text":"Walk through each step","speaker_role":"host"}]},{"type":"discussion","heading":"Common Mistakes","points":[{"text":"Pitfalls to avoid","speaker_role":"host"}]},{"type":"conclusion","heading":"Recap","points":[{"text":"Summarise and give next steps","speaker_role":"host"}]}]}'),

  ('ST:builtin-panel', 'CORE:system', 'Panel Discussion',
   'A moderator runs a multi-panelist discussion with opening statements and debate.', 'conversation', 1,
   '{"participants":[{"role":"host","display_name":"Moderator"},{"role":"p1","display_name":"Panelist 1"},{"role":"p2","display_name":"Panelist 2"},{"role":"p3","display_name":"Panelist 3"}],"sections":[{"type":"intro","heading":"Intro","points":[{"text":"Introduce the panel and the topic","speaker_role":"host"}]},{"type":"main_point","heading":"Opening Statements","points":[{"text":"Opening statement","speaker_role":"p1"},{"text":"Opening statement","speaker_role":"p2"},{"text":"Opening statement","speaker_role":"p3"}]},{"type":"discussion","heading":"Main Debate","points":[{"text":"Moderated debate on the key question","speaker_role":null}]},{"type":"discussion","heading":"Audience Questions","points":[{"text":"Take questions from the audience","speaker_role":"host"}]},{"type":"conclusion","heading":"Closing","points":[{"text":"Closing thoughts from each panelist","speaker_role":null}]}]}');
