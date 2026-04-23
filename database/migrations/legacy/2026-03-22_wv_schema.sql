-- ============================================================
-- Migration: 2026-03-22 — Worldview System Schema
-- Run: wrangler d1 execute knowledgemap --file=database/migrations/legacy/2026-03-22_wv_schema.sql --remote
-- ============================================================

-- 1. Worldview registry (Islam, Christianity, Judaism + branches)
CREATE TABLE IF NOT EXISTS wv_worldview (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK(type IN ('theistic','abrahamic','eastern','secular','philosophical','other')),
  parent_id   INTEGER REFERENCES wv_worldview(id),
  description TEXT,
  color       TEXT,
  icon        TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_worldview_type      ON wv_worldview(type);
CREATE INDEX IF NOT EXISTS idx_wv_worldview_parent_id ON wv_worldview(parent_id);

-- 2. Topics for comparison/brainstorm organisation
CREATE TABLE IF NOT EXISTS wv_topic (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT,
  parent_id   INTEGER REFERENCES wv_topic(id),
  tags        TEXT,  -- JSON array of strings
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_topic_parent_id ON wv_topic(parent_id);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_topic_fts USING fts5(
  name, description,
  content='wv_topic', content_rowid='id'
);

-- 3. Brainstorm sessions (free-form research journal)
CREATE TABLE IF NOT EXISTS wv_brainstorm_session (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  content      TEXT,  -- markdown/rich text
  worldview_id INTEGER REFERENCES wv_worldview(id),
  topic_id     INTEGER REFERENCES wv_topic(id),
  status       TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_bs_worldview ON wv_brainstorm_session(worldview_id);
CREATE INDEX IF NOT EXISTS idx_wv_bs_topic     ON wv_brainstorm_session(topic_id);
CREATE INDEX IF NOT EXISTS idx_wv_bs_status    ON wv_brainstorm_session(status);
CREATE VIRTUAL TABLE IF NOT EXISTS wv_brainstorm_fts USING fts5(
  title, content,
  content='wv_brainstorm_session', content_rowid='id'
);

-- 4. Parallel Scripture Comparison
CREATE TABLE IF NOT EXISTS wv_comparison (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  topic_id    INTEGER REFERENCES wv_topic(id),
  description TEXT,
  status      TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_comparison_topic  ON wv_comparison(topic_id);
CREATE INDEX IF NOT EXISTS idx_wv_comparison_status ON wv_comparison(status);

-- 5. Comparison tabs (one per tradition/source column)
CREATE TABLE IF NOT EXISTS wv_comparison_tab (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  comparison_id INTEGER NOT NULL REFERENCES wv_comparison(id),
  label         TEXT    NOT NULL,
  source_type   TEXT    NOT NULL CHECK(source_type IN ('quran','bible','torah','hadith','wv_source','free')),
  worldview_id  INTEGER REFERENCES wv_worldview(id),
  wv_source_id  INTEGER REFERENCES wv_sources(id),
  position      INTEGER NOT NULL DEFAULT 0,
  color         TEXT
);
CREATE INDEX IF NOT EXISTS idx_wv_ctab_comparison ON wv_comparison_tab(comparison_id);

-- 6. Comparison rows (one per theme/topic row)
CREATE TABLE IF NOT EXISTS wv_comparison_row (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  comparison_id INTEGER NOT NULL REFERENCES wv_comparison(id),
  theme         TEXT,
  position      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wv_crow_comparison ON wv_comparison_row(comparison_id);

-- 7. Comparison cells (intersection of tab × row)
CREATE TABLE IF NOT EXISTS wv_comparison_cell (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id         INTEGER NOT NULL REFERENCES wv_comparison_row(id),
  tab_id         INTEGER NOT NULL REFERENCES wv_comparison_tab(id),
  surah          INTEGER,
  ayah_from      INTEGER,
  ayah_to        INTEGER,
  scripture_ref  TEXT,
  scripture_text TEXT,
  highlight_id   INTEGER REFERENCES wv_highlights(id),
  source_unit_id INTEGER REFERENCES wv_source_units(id),
  free_text      TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(row_id, tab_id)
);
CREATE INDEX IF NOT EXISTS idx_wv_ccell_row ON wv_comparison_cell(row_id);
CREATE INDEX IF NOT EXISTS idx_wv_ccell_tab ON wv_comparison_cell(tab_id);

-- 8. Personal contacts (family/friends — strict privacy model)
-- visibility='private' = FAMILY — never visible to workspace members
-- visibility='workspace' = Friends/Colleagues — can be workspace members
CREATE TABLE IF NOT EXISTS wv_person (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  nickname     TEXT,
  relationship TEXT    NOT NULL CHECK(relationship IN ('family','friend','colleague','acquaintance','mentor')),
  family_role  TEXT,
  visibility   TEXT    NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','workspace','public')),
  avatar_url   TEXT,
  bio          TEXT,
  scholar_id   INTEGER REFERENCES wv_people(id),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_person_relationship ON wv_person(relationship);
CREATE INDEX IF NOT EXISTS idx_wv_person_visibility   ON wv_person(visibility);

-- 9. Workspace membership (only non-private persons allowed — enforced at API level)
CREATE TABLE IF NOT EXISTS wv_workspace_person (
  workspace_id INTEGER NOT NULL,  -- REFERENCES workspaces(id) - enforced at API level
  person_id    INTEGER NOT NULL REFERENCES wv_person(id),
  role         TEXT    NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member','viewer')),
  joined_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(workspace_id, person_id)
);
CREATE INDEX IF NOT EXISTS idx_wv_wsp_person ON wv_workspace_person(person_id);

-- 10. Reading/research plans
CREATE TABLE IF NOT EXISTS wv_plan (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER,  -- REFERENCES workspaces(id)
  title        TEXT    NOT NULL,
  description  TEXT,
  type         TEXT    NOT NULL DEFAULT 'reading' CHECK(type IN ('reading','research','podcast','project','arabic')),
  start_date   TEXT    NOT NULL,
  end_date     TEXT,
  status       TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed','archived')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_plan_workspace   ON wv_plan(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wv_plan_status      ON wv_plan(status);
CREATE INDEX IF NOT EXISTS idx_wv_plan_start_date  ON wv_plan(start_date);

-- 11. Plan items (individual reading/task targets)
CREATE TABLE IF NOT EXISTS wv_plan_item (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id      INTEGER NOT NULL REFERENCES wv_plan(id),
  source_id    INTEGER REFERENCES wv_sources(id),
  unit_id      INTEGER REFERENCES wv_source_units(id),
  title        TEXT,
  target_date  TEXT,
  priority     INTEGER NOT NULL DEFAULT 2 CHECK(priority BETWEEN 1 AND 5),
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','skipped')),
  notes        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_wv_plan_item_plan        ON wv_plan_item(plan_id);
CREATE INDEX IF NOT EXISTS idx_wv_plan_item_status      ON wv_plan_item(status);
CREATE INDEX IF NOT EXISTS idx_wv_plan_item_target_date ON wv_plan_item(target_date);

-- 12. Podcasts
CREATE TABLE IF NOT EXISTS wv_podcast (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT    NOT NULL,
  description   TEXT,
  type          TEXT    NOT NULL DEFAULT 'solo' CHECK(type IN ('solo','duo','panel','interview')),
  status        TEXT    NOT NULL DEFAULT 'planning' CHECK(status IN ('planning','recording','editing','published','archived')),
  doc_id        INTEGER REFERENCES wv_documents(id),
  recorded_at   TEXT,
  published_url TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_podcast_status ON wv_podcast(status);
CREATE INDEX IF NOT EXISTS idx_wv_podcast_type   ON wv_podcast(type);

-- 13. Podcast participants
CREATE TABLE IF NOT EXISTS wv_podcast_participant (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  podcast_id  INTEGER NOT NULL REFERENCES wv_podcast(id),
  person_id   INTEGER REFERENCES wv_person(id),
  scholar_id  INTEGER REFERENCES wv_people(id),
  name        TEXT,  -- fallback if no person/scholar
  role        TEXT    NOT NULL DEFAULT 'guest' CHECK(role IN ('host','co-host','guest','interviewer')),
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wv_pp_podcast ON wv_podcast_participant(podcast_id);
CREATE INDEX IF NOT EXISTS idx_wv_pp_person  ON wv_podcast_participant(person_id);

-- 14. Podcast talking points (structured content outline)
CREATE TABLE IF NOT EXISTS wv_talking_point (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  podcast_id    INTEGER NOT NULL REFERENCES wv_podcast(id),
  content       TEXT    NOT NULL,
  source_id     INTEGER REFERENCES wv_sources(id),
  unit_id       INTEGER REFERENCES wv_source_units(id),
  highlight_id  INTEGER REFERENCES wv_highlights(id),
  node_id       INTEGER REFERENCES wv_nodes(id),
  surah         INTEGER,
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  duration_mins INTEGER,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_tp_podcast    ON wv_talking_point(podcast_id);
CREATE INDEX IF NOT EXISTS idx_wv_tp_sort_order ON wv_talking_point(podcast_id, sort_order);

-- ── Seed: 9 Worldviews ───────────────────────────────────────
INSERT OR IGNORE INTO wv_worldview(id, name, type, parent_id, description, color, icon) VALUES
  (1,  'Islam',            'abrahamic', NULL, 'Monotheistic Abrahamic faith revealed through Prophet Muhammad ﷺ', '#1a6e3a', '☽'),
  (2,  'Sunni Islam',      'abrahamic', 1,    'Mainstream Islam following the Sunnah and the four madhabs',      '#1e8a45', '☽'),
  (3,  'Shia Islam',       'abrahamic', 1,    'Islam following the leadership of Ali ibn Abi Talib',             '#165e32', '☽'),
  (4,  'Christianity',     'abrahamic', NULL, 'Abrahamic faith centered on the life and teachings of Jesus Christ', '#1a3a6e', '✝'),
  (5,  'Catholicism',      'abrahamic', 4,    'Christianity under the authority of the Pope in Rome',            '#1e458a', '✝'),
  (6,  'Protestantism',    'abrahamic', 4,    'Reformed Christianity emphasizing scripture and faith alone',       '#163a5e', '✝'),
  (7,  'Judaism',          'abrahamic', NULL, 'The oldest Abrahamic monotheistic faith rooted in Torah',          '#8a6e1a', '✡'),
  (8,  'Orthodox Judaism', 'abrahamic', 7,    'Traditional Judaism strictly following halakha',                   '#6e5a12', '✡'),
  (9,  'Reform Judaism',   'abrahamic', 7,    'Progressive Judaism emphasising ethics over ritual law',           '#9a8020', '✡');

-- ── Seed: Test data ───────────────────────────────────────────
INSERT OR IGNORE INTO wv_topic(id, name, description, tags) VALUES
  (1, 'Concept of God', 'How different traditions describe the nature of the Divine', '["theology","monotheism","tawheed"]'),
  (2, 'Prayer & Worship', 'Forms and purposes of prayer across traditions', '["ibadah","prayer","ritual"]'),
  (3, 'Afterlife', 'Beliefs about death, resurrection, and the hereafter', '["akhirah","eschatology","heaven"]');

INSERT OR IGNORE INTO wv_comparison(id, title, topic_id, description, status) VALUES
  (1, 'Tawheed vs Trinity vs Unity of God', 1, 'Parallel comparison of how Islam, Christianity, and Judaism conceptualize the Oneness of God', 'active'),
  (2, 'Salah vs Prayer vs Tefillah', 2, 'Comparing prayer forms across the three Abrahamic traditions', 'draft');

INSERT OR IGNORE INTO wv_comparison_tab(id, comparison_id, label, source_type, worldview_id, position, color) VALUES
  (1, 1, 'Quran', 'quran', 1, 0, '#1a6e3a'),
  (2, 1, 'Bible', 'bible', 4, 1, '#1a3a6e'),
  (3, 1, 'Torah', 'torah', 7, 2, '#8a6e1a'),
  (4, 2, 'Quran', 'quran', 1, 0, '#1a6e3a'),
  (5, 2, 'Bible', 'bible', 4, 1, '#1a3a6e'),
  (6, 2, 'Torah', 'torah', 7, 2, '#8a6e1a');

INSERT OR IGNORE INTO wv_comparison_row(id, comparison_id, theme, position) VALUES
  (1, 1, 'Absolute Oneness', 0),
  (2, 1, 'Nature of the Divine', 1),
  (3, 2, 'Frequency', 0),
  (4, 2, 'Direction', 1);

INSERT OR IGNORE INTO wv_comparison_cell(row_id, tab_id, surah, ayah_from, ayah_to, scripture_ref, free_text) VALUES
  (1, 1, 112, 1, 4, 'Al-Ikhlas 112:1-4', 'قُلْ هُوَ ٱللَّهُ أَحَدٌ — Say: He is Allah, the One'),
  (1, 2, NULL, NULL, NULL, 'Deuteronomy 6:4', 'Hear, O Israel: The Lord our God, the Lord is one'),
  (1, 3, NULL, NULL, NULL, 'Shema — Deut 6:4', 'שְׁמַע יִשְׂרָאֵל — The foundational declaration of Jewish faith'),
  (2, 1, 2, 255, 255, 'Al-Baqarah 2:255', 'Ayah al-Kursi — The Throne Verse describing Allah''s attributes');

INSERT OR IGNORE INTO wv_brainstorm_session(id, title, content, worldview_id, topic_id, status) VALUES
  (1, 'Opening Notes on Tawheed', '## Tawheed — Oneness of God\n\nThe concept of Tawheed is the absolute foundation of Islamic theology...\n\n### Key Points\n- Allah is One with no partners\n- Al-Ikhlas is the clearest statement\n- Shirk is the unforgivable sin', 1, 1, 'active'),
  (2, 'Comparing Prayer Traditions', '## Initial Thoughts\n\nInvestigating how prayer serves different functions across traditions...', NULL, 2, 'draft');

INSERT OR IGNORE INTO wv_person(id, name, nickname, relationship, family_role, visibility, bio) VALUES
  (1, 'Ahmad Ibrahim', 'Abu Yusuf', 'family', 'father', 'private', 'Father and first teacher of Islam'),
  (2, 'Umar Hassan', NULL, 'friend', NULL, 'workspace', 'Long-time friend and study partner — joins podcast discussions'),
  (3, 'Dr. Sarah Chen', NULL, 'colleague', NULL, 'workspace', 'Comparative religion scholar at the university');

INSERT OR IGNORE INTO wv_podcast(id, title, description, type, status) VALUES
  (1, 'Tawheed and Monotheism', 'A deep dive into the concept of Divine Oneness across Abrahamic faiths', 'duo', 'planning'),
  (2, 'Reading Tafsir Ibn Kathir', 'Solo reflection on key passages from Ibn Kathir', 'solo', 'planning');

INSERT OR IGNORE INTO wv_podcast_participant(podcast_id, person_id, name, role, sort_order) VALUES
  (1, NULL, 'Host (Me)', 'host', 0),
  (1, 2, NULL, 'co-host', 1);

INSERT OR IGNORE INTO wv_talking_point(podcast_id, content, surah, ayah_from, ayah_to, sort_order, duration_mins) VALUES
  (1, 'Opening — Why does the concept of Tawheed matter today?', NULL, NULL, NULL, 0, 3),
  (1, 'Al-Ikhlas: The 4-verse summary of Islamic theology', 112, 1, 4, 1, 8),
  (1, 'Comparing with the Shema in Judaism', NULL, NULL, NULL, 2, 5),
  (1, 'The Trinity debate — Christian perspectives', NULL, NULL, NULL, 3, 10),
  (1, 'Closing — Common ground across traditions', NULL, NULL, NULL, 4, 5);

INSERT OR IGNORE INTO wv_plan(id, title, description, type, start_date, end_date, status) VALUES
  (1, 'Tafsir Reading Plan 2026', 'Systematic study of Tafsir Ibn Kathir for key surahs', 'reading', '2026-01-01', '2026-12-31', 'active'),
  (2, 'Worldview Comparison Research', 'Research project comparing Abrahamic traditions', 'research', '2026-03-01', '2026-06-30', 'active');
