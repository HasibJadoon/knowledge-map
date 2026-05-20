-- Schema for km_planner.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.

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

CREATE INDEX idx_pl_cal_plan  ON pl_calendar_entries(plan_id);

CREATE INDEX idx_pl_cal_start ON pl_calendar_entries(start_datetime);

CREATE INDEX idx_pl_cal_user  ON pl_calendar_entries(core_user_ref);

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

CREATE TABLE pl_capture_notes (
  id            TEXT PRIMARY KEY,
  core_user_ref TEXT NOT NULL,
  core_ws_ref   TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  title         TEXT,
  doc_json      TEXT NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  meta_json     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pl_capture_user  ON pl_capture_notes(core_user_ref);

CREATE INDEX idx_pl_capture_inbox ON pl_capture_notes(core_user_ref, status, created_at);
