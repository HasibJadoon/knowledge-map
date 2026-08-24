-- km_planner - schema snapshot
--
-- Generated from the live database, which is the source of truth:
--   SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL
--   ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 1 ELSE 2 END, name;
--
-- Binding: DB_PL. Regenerate after applying migrations rather than
-- editing by hand. Excludes d1_migrations (wrangler's ledger), _cf_KV, and
-- FTS5 shadow tables, which their virtual tables recreate automatically.
--
-- 30 tables, 5 views, 44 indexes.

-- Tables ------------------------------------------------------------------

CREATE TABLE cp_build_job (
  id             TEXT PRIMARY KEY,
  node_id        TEXT NOT NULL REFERENCES cp_node(id) ON DELETE CASCADE,
  op             TEXT NOT NULL CHECK (op IN ('mine','promote','compile','link','render','seed')),
  seq            INTEGER NOT NULL DEFAULT 0,
  depends_on_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(depends_on_json)),
  readiness      TEXT NOT NULL DEFAULT 'not_ready' CHECK (readiness IN ('ready','not_ready')),
  status         TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','parked','archived','failed')),
  actuator       TEXT NOT NULL DEFAULT 'claude' CHECK (actuator IN ('claude','human')),
  skill          TEXT,
  attempts       INTEGER NOT NULL DEFAULT 0,
  progress_pct   INTEGER NOT NULL DEFAULT 0,
  priority       INTEGER NOT NULL DEFAULT 50,
  result_ref     TEXT,
  note_md        TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  started_at     TEXT,
  finished_at    TEXT
);

CREATE TABLE cp_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  note  TEXT
);

CREATE TABLE cp_domain (
  domain   TEXT PRIMARY KEY,
  db_name  TEXT NOT NULL,
  db_uuid  TEXT NOT NULL,
  role     TEXT NOT NULL CHECK (role IN ('content','infra','control')),
  fixed    INTEGER NOT NULL DEFAULT 1,
  note     TEXT
);

CREATE TABLE cp_edge (
  id         TEXT PRIMARY KEY,
  from_node  TEXT NOT NULL REFERENCES cp_node(id) ON DELETE CASCADE,
  to_node    TEXT NOT NULL REFERENCES cp_node(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('requires','feeds','attaches','produces','rollup')),
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (from_node, to_node, kind)
);

CREATE TABLE cp_gauge (
  id          TEXT PRIMARY KEY,
  node_id     TEXT NOT NULL REFERENCES cp_node(id) ON DELETE CASCADE,
  gauge_kind  TEXT NOT NULL CHECK (gauge_kind IN ('recite','quiz','reflection')),
  score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  actor       TEXT NOT NULL DEFAULT 'hasib',
  srs_card_id TEXT REFERENCES cp_srs_card(id) ON DELETE SET NULL,
  attempt_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  meta_json   TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json))
);

CREATE TABLE cp_lane (
  lane        TEXT PRIMARY KEY CHECK (lane IN ('quran','language','worldview')),
  title       TEXT NOT NULL,
  domain      TEXT NOT NULL,
  build_verb  TEXT NOT NULL,
  study_verb  TEXT NOT NULL,
  unit_kind   TEXT NOT NULL,
  seq         INTEGER NOT NULL DEFAULT 0,
  note        TEXT
);

CREATE TABLE cp_node (
  id            TEXT PRIMARY KEY,
  domain        TEXT NOT NULL CHECK (domain IN ('quran','ling','arabic','wv','doc','studio')),
  target_kind   TEXT NOT NULL CHECK (target_kind IN ('surah','passage','root','word','unit','node','episode','document')),
  target_ref    TEXT NOT NULL,
  layer         TEXT CHECK (layer IS NULL OR layer IN ('reading','vocabulary','ss','structure','tafsir','worldview')),
  parent_id     TEXT REFERENCES cp_node(id) ON DELETE CASCADE,
  label         TEXT,
  setpoint_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(setpoint_json)),
  build_state   TEXT NOT NULL DEFAULT 'empty'  CHECK (build_state IN ('empty','seeded','mined','compiled')),
  study_state   TEXT NOT NULL DEFAULT 'unseen' CHECK (study_state IN ('unseen','learning','mastered','taught','published')),
  build_pct     INTEGER NOT NULL DEFAULT 0,
  study_pct     INTEGER NOT NULL DEFAULT 0,
  readiness     TEXT NOT NULL DEFAULT 'ready' CHECK (readiness IN ('ready','not_ready','blocked')),
  priority      INTEGER NOT NULL DEFAULT 50,
  due_at        TEXT,
  last_signal_at TEXT,
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')), lane TEXT NOT NULL DEFAULT 'quran' CHECK (lane IN ('quran','language','worldview')), piece_kind TEXT
  CHECK (piece_kind IS NULL OR piece_kind IN ('root','word','expression','verbal_idiom','sinai_key','nuance','ss_sentence')),
  UNIQUE (domain, target_ref, layer)
);

CREATE TABLE cp_production (
  id           TEXT PRIMARY KEY,
  node_id      TEXT NOT NULL REFERENCES cp_node(id) ON DELETE CASCADE,
  lane         TEXT NOT NULL DEFAULT 'quran' CHECK (lane IN ('quran','language','worldview')),
  format       TEXT NOT NULL DEFAULT 'document' CHECK (format IN ('document','video','episode','podcast','short','film','lesson','teach')),
  target_domain TEXT CHECK (target_domain IN ('doc','studio')),
  output_ref   TEXT,
  youtube_ref  TEXT,
  state        TEXT NOT NULL DEFAULT 'planned' CHECK (state IN ('planned','drafted','taught','recorded','edited','uploaded','published')),
  with_whom    TEXT,
  planned_at   TEXT,
  published_at TEXT,
  meta_json    TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cp_tick_log (
  id            TEXT PRIMARY KEY,
  ran_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  trigger       TEXT NOT NULL CHECK (trigger IN ('cron','chat','code')),
  nodes_touched INTEGER NOT NULL DEFAULT 0,
  jobs_actuated INTEGER NOT NULL DEFAULT 0,
  cards_due     INTEGER NOT NULL DEFAULT 0,
  note_md       TEXT
);

CREATE TABLE pl_calendar_entries (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  plan_id         TEXT,
  task_id         TEXT,
  session_id      TEXT,
  title           TEXT NOT NULL,
  entry_type      TEXT NOT NULL DEFAULT 'scheduled_session',
    
  start_datetime  TEXT NOT NULL,
  end_datetime    TEXT,
  all_day         INTEGER NOT NULL DEFAULT 0,
  recurrence_json TEXT,                           
  is_completed    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id)   REFERENCES pl_plans(id),
  FOREIGN KEY (task_id)   REFERENCES pl_tasks(id),
  FOREIGN KEY (session_id) REFERENCES pl_sessions(id)
);

CREATE TABLE pl_capture_notes (
  id            TEXT PRIMARY KEY,
  core_user_ref TEXT NOT NULL,
  core_ws_ref   TEXT,
  status        TEXT NOT NULL DEFAULT 'inbox',
  title         TEXT,
  doc_json      TEXT NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  meta_json     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pl_goal_snapshots (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  value         REAL NOT NULL,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES pl_goals(id),
  UNIQUE (goal_id, snapshot_date)
);

CREATE TABLE pl_goals (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  plan_id         TEXT,
  title           TEXT NOT NULL,
  goal_type       TEXT NOT NULL DEFAULT 'habit',
    
  metric          TEXT NOT NULL DEFAULT 'sessions',
    
  target_value    REAL NOT NULL,
  current_value   REAL NOT NULL DEFAULT 0,
  cadence         TEXT NOT NULL DEFAULT 'weekly',
    
  period_start    TEXT,
  period_end      TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
    
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);

CREATE TABLE pl_lane_items (
  id           TEXT PRIMARY KEY,
  lane_id      TEXT NOT NULL,
  task_id      TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  moved_at     TEXT NOT NULL DEFAULT (datetime('now')),
  moved_by_ref TEXT,                              
  FOREIGN KEY (lane_id) REFERENCES pl_lanes(id),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id),
  UNIQUE (lane_id, task_id)
);

CREATE TABLE pl_lanes (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  lane_type       TEXT NOT NULL DEFAULT 'custom',
    
  sort_order      INTEGER NOT NULL DEFAULT 0,
  color           TEXT,
  wip_limit       INTEGER,                        
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);

CREATE TABLE pl_packet_items (
  id            TEXT PRIMARY KEY,
  packet_id     TEXT NOT NULL,
  task_id       TEXT,
  resource_ref  TEXT,                             
  resource_type TEXT,
  resource_label TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_required   INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (packet_id) REFERENCES pl_packets(id),
  FOREIGN KEY (task_id)   REFERENCES pl_tasks(id)
);

CREATE TABLE pl_packets (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  packet_type     TEXT NOT NULL DEFAULT 'assignment',
    
  assignee_refs   TEXT,                           
  resource_refs   TEXT,                           
  due_date        TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
    
  instructions_md TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);

CREATE TABLE pl_plan_scopes (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  scope_type      TEXT NOT NULL DEFAULT 'source',
    
  resource_ref    TEXT,                           
    
  resource_label  TEXT,                           
  total_units     INTEGER,
  completed_units INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);

CREATE TABLE pl_plan_templates (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'reading',
  description_md  TEXT,
  template_json   TEXT NOT NULL,                  
  is_public       INTEGER NOT NULL DEFAULT 0,
  created_by_ref  TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pl_plans (
  id              TEXT PRIMARY KEY,               
  core_user_ref   TEXT NOT NULL,                  
  core_ws_ref     TEXT,                           
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE,
  plan_type       TEXT NOT NULL DEFAULT 'reading',
    
    
  description_md  TEXT,
  goals_md        TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
    
  priority        INTEGER NOT NULL DEFAULT 3,     
  start_date      TEXT,
  target_end_date TEXT,
  completed_at    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pl_review_cycles (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  packet_id       TEXT,
  title           TEXT NOT NULL,
  cycle_type      TEXT NOT NULL DEFAULT 'periodic',
    
  cadence         TEXT,                           
  cadence_days    INTEGER,
  starts_at       TEXT,
  ends_at         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
    
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id)   REFERENCES pl_plans(id),
  FOREIGN KEY (packet_id) REFERENCES pl_packets(id)
);

CREATE TABLE pl_review_events (
  id              TEXT PRIMARY KEY,
  cycle_id        TEXT NOT NULL,
  reviewer_ref    TEXT,                           
  reviewee_ref    TEXT,                           
  event_type      TEXT NOT NULL DEFAULT 'submission',
    
  notes_md        TEXT,
  score           REAL,
  status          TEXT NOT NULL DEFAULT 'pending',
    
  due_at          TEXT,
  resolved_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES pl_review_cycles(id)
);

CREATE TABLE pl_session_item_logs (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  resource_ref  TEXT NOT NULL,                    
  resource_type TEXT NOT NULL,
  resource_label TEXT,
  item_status   TEXT NOT NULL DEFAULT 'completed',
    
  time_spent_mins INTEGER,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES pl_sessions(id)
);

CREATE TABLE pl_sessions (
  id              TEXT PRIMARY KEY,               
  plan_id         TEXT,
  task_id         TEXT,
  core_user_ref   TEXT NOT NULL,                  
  core_ws_ref     TEXT,
  session_type    TEXT NOT NULL DEFAULT 'reading',
    
    
  resource_ref    TEXT,                           
  resource_type   TEXT,
  resource_label  TEXT,                           
  qr_scope_ref    TEXT,                           
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  duration_mins   INTEGER,
  pages_covered   TEXT,                           
  ayahs_covered   TEXT,                           
  rating          INTEGER,                        
  notes_md        TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id)
);

CREATE TABLE pl_streaks (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  plan_id         TEXT,
  streak_type     TEXT NOT NULL DEFAULT 'daily_session',
    
  current_count   INTEGER NOT NULL DEFAULT 0,
  longest_count   INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  started_date    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (core_user_ref, streak_type, plan_id)
);

CREATE TABLE pl_task_assignees (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL,
  user_ref     TEXT NOT NULL,                     
  role         TEXT NOT NULL DEFAULT 'assignee',  
  assigned_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id),
  UNIQUE (task_id, user_ref)
);

CREATE TABLE pl_task_dependencies (
  id            TEXT PRIMARY KEY,
  from_task_id  TEXT NOT NULL,                    
  to_task_id    TEXT NOT NULL,                    
  dep_type      TEXT NOT NULL DEFAULT 'blocks',   
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_task_id) REFERENCES pl_tasks(id),
  FOREIGN KEY (to_task_id)   REFERENCES pl_tasks(id),
  UNIQUE (from_task_id, to_task_id)
);

CREATE TABLE pl_task_resources (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,                  
    
  resource_type   TEXT NOT NULL,
    
    
  resource_label  TEXT,                           
  role            TEXT NOT NULL DEFAULT 'primary',
    
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id),
  UNIQUE (task_id, resource_ref)
);

CREATE TABLE pl_tasks (
  id              TEXT PRIMARY KEY,               
  plan_id         TEXT NOT NULL,
  scope_id        TEXT,
  parent_task_id  TEXT,                           
  title           TEXT NOT NULL,
  description_md  TEXT,
  task_type       TEXT NOT NULL DEFAULT 'read',
    
    
  status          TEXT NOT NULL DEFAULT 'pending',
    
  priority        INTEGER NOT NULL DEFAULT 3,     
  due_date        TEXT,
  estimated_mins  INTEGER,
  actual_mins     INTEGER,
  assignee_ref    TEXT,                           
  step_no         INTEGER,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  completed_at    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id)        REFERENCES pl_plans(id),
  FOREIGN KEY (scope_id)       REFERENCES pl_plan_scopes(id),
  FOREIGN KEY (parent_task_id) REFERENCES pl_tasks(id)
);

CREATE TABLE sp_planner (
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

-- Views -------------------------------------------------------------------

CREATE VIEW cp_coupling_violation AS
SELECT n.id AS node_id, n.domain, n.target_ref, n.layer, n.build_state, n.study_state,
       'study advanced past build' AS reason
FROM cp_node n
WHERE n.study_state <> 'unseen' AND n.build_state <> 'compiled'
UNION ALL
SELECT p.node_id, n.domain, n.target_ref, n.layer, n.build_state, n.study_state,
       'produced without mastery' AS reason
FROM cp_production p JOIN cp_node n ON n.id = p.node_id
WHERE p.state IN ('recorded','edited','uploaded','published')
  AND n.study_state NOT IN ('mastered','taught','published');

CREATE VIEW cp_lane_status AS
SELECT l.lane, l.title,
  (SELECT COUNT(*) FROM cp_node n WHERE n.lane=l.lane) nodes,
  (SELECT COUNT(*) FROM cp_node n WHERE n.lane=l.lane AND n.build_state='compiled') built,
  (SELECT COUNT(*) FROM cp_node n WHERE n.lane=l.lane AND n.study_state IN ('mastered','taught','published')) mastered,
  (SELECT COUNT(*) FROM cp_build_job j JOIN cp_node n ON n.id=j.node_id WHERE n.lane=l.lane AND j.status='queued') build_queue,
  (SELECT COUNT(*) FROM cp_production p WHERE p.lane=l.lane) outputs,
  (SELECT COUNT(*) FROM cp_production p WHERE p.lane=l.lane AND p.state='published') published
FROM cp_lane l ORDER BY l.seq;

CREATE VIEW cp_queue AS
SELECT n.lane, n.id AS node_id, n.domain, n.target_ref, n.layer, n.label,
       n.build_state, n.build_pct, n.priority
FROM cp_node n
WHERE n.build_state <> 'compiled' AND (n.layer IS NOT NULL OR n.target_kind IN ('unit','node'))
ORDER BY n.lane, (n.build_pct > 0) DESC, n.priority DESC, n.build_pct DESC;

CREATE VIEW cp_stage_study AS
SELECT
  n.id AS node_id, n.parent_id, n.target_ref, n.layer, n.build_pct,
  CASE n.layer WHEN 'reading' THEN 'recite'
               WHEN 'vocabulary' THEN 'quiz'
               WHEN 'ss' THEN 'quiz'
               ELSE 'reflection' END AS gauge_kind,
  COALESCE((SELECT CAST(AVG(score) AS INT) FROM cp_gauge g WHERE g.node_id=n.id),0) AS study_pct,
  (SELECT COUNT(*) FROM cp_gauge g WHERE g.node_id=n.id) AS attempts,
  COALESCE((SELECT MIN(interval_days) FROM cp_srs_card c
            WHERE c.node_id=n.id OR c.node_id IN (SELECT id FROM cp_node ch WHERE ch.parent_id=n.id)),0) AS retention_days,
  CASE
    WHEN n.layer='reading'
      AND COALESCE((SELECT MAX(score) FROM cp_gauge g WHERE g.node_id=n.id),0) >= 100 THEN 1
    WHEN n.layer<>'reading'
      AND COALESCE((SELECT AVG(score) FROM cp_gauge g WHERE g.node_id=n.id),0)
          >= CAST((SELECT value FROM cp_config WHERE key='mastery_threshold') AS INTEGER)
      AND COALESCE((SELECT MIN(interval_days) FROM cp_srs_card c
            WHERE c.node_id=n.id OR c.node_id IN (SELECT id FROM cp_node ch WHERE ch.parent_id=n.id)),0)
          >= CAST((SELECT value FROM cp_config WHERE key='retention_days') AS INTEGER)
    THEN 1 ELSE 0 END AS mastered
FROM cp_node n
WHERE n.layer IS NOT NULL AND n.piece_kind IS NULL AND n.target_kind='passage';

CREATE VIEW cp_study_due AS
SELECT c.id AS card_id, c.node_id, n.domain, n.target_ref, n.layer, c.card_kind,
       c.due_at, c.interval_days, c.ease
FROM cp_srs_card c JOIN cp_node n ON n.id = c.node_id
WHERE c.suspended = 0 AND (c.due_at IS NULL OR c.due_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now'))
ORDER BY c.due_at ASC;

-- Indexes -----------------------------------------------------------------

CREATE INDEX idx_pl_cal_plan  ON pl_calendar_entries(plan_id);

CREATE INDEX idx_pl_cal_start ON pl_calendar_entries(start_datetime);

CREATE INDEX idx_pl_cal_user  ON pl_calendar_entries(core_user_ref);

CREATE INDEX idx_pl_capture_inbox ON pl_capture_notes(core_user_ref, status, created_at);

CREATE INDEX idx_pl_capture_user ON pl_capture_notes(core_user_ref);

CREATE INDEX idx_pl_goals_plan   ON pl_goals(plan_id);

CREATE INDEX idx_pl_goals_status ON pl_goals(status);

CREATE INDEX idx_pl_goals_user   ON pl_goals(core_user_ref);

CREATE INDEX idx_pl_gs_date ON pl_goal_snapshots(snapshot_date);

CREATE INDEX idx_pl_gs_goal ON pl_goal_snapshots(goal_id);

CREATE INDEX idx_pl_lanes_plan ON pl_lanes(plan_id);

CREATE INDEX idx_pl_li_lane ON pl_lane_items(lane_id);

CREATE INDEX idx_pl_li_task ON pl_lane_items(task_id);

CREATE INDEX idx_pl_pi_packet ON pl_packet_items(packet_id);

CREATE INDEX idx_pl_pkt_due    ON pl_packets(due_date);

CREATE INDEX idx_pl_pkt_plan   ON pl_packets(plan_id);

CREATE INDEX idx_pl_pkt_status ON pl_packets(status);

CREATE INDEX idx_pl_plans_status ON pl_plans(status);

CREATE INDEX idx_pl_plans_user   ON pl_plans(core_user_ref);

CREATE INDEX idx_pl_plans_ws     ON pl_plans(core_ws_ref);

CREATE INDEX idx_pl_ps_plan ON pl_plan_scopes(plan_id);

CREATE INDEX idx_pl_rc_plan   ON pl_review_cycles(plan_id);

CREATE INDEX idx_pl_rc_status ON pl_review_cycles(status);

CREATE INDEX idx_pl_re_cycle ON pl_review_events(cycle_id);

CREATE INDEX idx_pl_sess_date   ON pl_sessions(started_at);

CREATE INDEX idx_pl_sess_plan   ON pl_sessions(plan_id);

CREATE INDEX idx_pl_sess_type   ON pl_sessions(session_type);

CREATE INDEX idx_pl_sess_user   ON pl_sessions(core_user_ref);

CREATE INDEX idx_pl_sil_resource ON pl_session_item_logs(resource_ref);

CREATE INDEX idx_pl_sil_session  ON pl_session_item_logs(session_id);

CREATE INDEX idx_pl_str_user ON pl_streaks(core_user_ref);

CREATE INDEX idx_pl_ta_task ON pl_task_assignees(task_id);

CREATE INDEX idx_pl_ta_user ON pl_task_assignees(user_ref);

CREATE INDEX idx_pl_tasks_assignee ON pl_tasks(assignee_ref);

CREATE INDEX idx_pl_tasks_due      ON pl_tasks(due_date);

CREATE INDEX idx_pl_tasks_parent   ON pl_tasks(parent_task_id);

CREATE INDEX idx_pl_tasks_plan     ON pl_tasks(plan_id);

CREATE INDEX idx_pl_tasks_scope    ON pl_tasks(scope_id);

CREATE INDEX idx_pl_tasks_status   ON pl_tasks(status);

CREATE INDEX idx_pl_td_from ON pl_task_dependencies(from_task_id);

CREATE INDEX idx_pl_td_to   ON pl_task_dependencies(to_task_id);

CREATE INDEX idx_pl_tr_resource ON pl_task_resources(resource_ref);

CREATE INDEX idx_pl_tr_task     ON pl_task_resources(task_id);

CREATE INDEX idx_sp_planner_lookup ON sp_planner (core_user_ref, item_type, week_start);
