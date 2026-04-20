-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_planner DB — Canonical PL Module Schema
-- File   : Database/migrations/km-planner/001_pl_schema.sql
-- DB     : km_planner   (binding: DB_PL in Workers)
-- Prefix : pl_*
-- Run    : wrangler d1 execute km_planner --file=... --remote
--
-- Module scope:
--   Operational execution only — plans, plan scopes, tasks, task resources,
--   lanes, lane items, packets, dependencies, review cycles, sessions,
--   goals, calendar, streaks, templates.
--
-- PL must NOT own canonical scholarly truth. Deleting a PL row must never
-- destroy domain knowledge. All canonical content stays in QR/AL/AR/WV/CM.
--
-- Cross-module typed refs (no SQL FK across DBs):
--   core_user_ref  → 'CORE:<user_id>'
--   core_ws_ref    → 'CORE:<workspace_id>'
--   qr_scope_ref   → 'QR:<surah>:<ayah_from>[-<ayah_to>]'
--   al_concept_ref → 'AL:<lemma_id>'
--   ar_ref         → 'AR:<container_id|unit_id|class_id>'
--   wv_ref         → 'WV:<source_id|node_id|claim_id>'
--   cm_doc_ref     → 'CM:<doc_id|note_id|media_id>'
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 1  PLANS (Top-level program shells)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_plans (
  id              TEXT PRIMARY KEY,               -- ULID
  core_user_ref   TEXT NOT NULL,                  -- 'CORE:<user_id>'
  core_ws_ref     TEXT,                           -- 'CORE:<workspace_id>'
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE,
  plan_type       TEXT NOT NULL DEFAULT 'reading',
    -- 'reading'|'quran'|'arabic'|'worldview_research'|'revision'|
    -- 'curriculum'|'class'|'sprint'|'personal'|'team'|'other'
  description_md  TEXT,
  goals_md        TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'draft'|'active'|'paused'|'completed'|'archived'
  priority        INTEGER NOT NULL DEFAULT 3,     -- 1=critical 5=low
  start_date      TEXT,
  target_end_date TEXT,
  completed_at    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pl_plans_user   ON pl_plans(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_pl_plans_ws     ON pl_plans(core_ws_ref);
CREATE INDEX IF NOT EXISTS idx_pl_plans_status ON pl_plans(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 2  PLAN SCOPES (Execution shells within a plan)
-- ─────────────────────────────────────────────────────────────────────────────

-- A plan scope carves a canonical resource into a planning envelope.
-- One plan can have multiple scopes (e.g. Plan = "Islamic Studies" →
--   Scope A: Surah Al-Baqarah, Scope B: Ibn Kathir tafsir, Scope C: Arabic grammar)
CREATE TABLE IF NOT EXISTS pl_plan_scopes (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  scope_type      TEXT NOT NULL DEFAULT 'source',
    -- 'source'|'surah_range'|'arabic_class'|'wv_node'|'cm_document'|'custom'
  resource_ref    TEXT,                           -- typed ref to canonical item
    -- e.g. 'WV:<source_id>', 'QR:2:1-286', 'AR:<class_id>', 'CM:<doc_id>', 'AL:<root_id>'
  resource_label  TEXT,                           -- denormalized display name (never truth)
  total_units     INTEGER,
  completed_units INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_ps_plan ON pl_plan_scopes(plan_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 3  TASKS (Atomic work units)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_tasks (
  id              TEXT PRIMARY KEY,               -- ULID
  plan_id         TEXT NOT NULL,
  scope_id        TEXT,
  parent_task_id  TEXT,                           -- for sub-tasks
  title           TEXT NOT NULL,
  description_md  TEXT,
  task_type       TEXT NOT NULL DEFAULT 'read',
    -- 'read'|'memorize'|'revise'|'review'|'exercise'|'note'|'listen'|
    -- 'watch'|'translate'|'submit'|'other'
  status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending'|'in_progress'|'done'|'skipped'|'blocked'
  priority        INTEGER NOT NULL DEFAULT 3,     -- 1=critical 5=low
  due_date        TEXT,
  estimated_mins  INTEGER,
  actual_mins     INTEGER,
  assignee_ref    TEXT,                           -- 'CORE:<user_id>' (for team plans)
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
CREATE INDEX IF NOT EXISTS idx_pl_tasks_plan     ON pl_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_pl_tasks_scope    ON pl_tasks(scope_id);
CREATE INDEX IF NOT EXISTS idx_pl_tasks_status   ON pl_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pl_tasks_due      ON pl_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_pl_tasks_assignee ON pl_tasks(assignee_ref);
CREATE INDEX IF NOT EXISTS idx_pl_tasks_parent   ON pl_tasks(parent_task_id);

-- § 3.1  Task resources (typed refs to canonical content attached to a task)
CREATE TABLE IF NOT EXISTS pl_task_resources (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,                  -- typed ref to canonical item
    -- 'CM:<doc_id>', 'AR:<class_id>', 'QR:2:1-10', 'WV:<node_id>', 'AL:<concept_id>'
  resource_type   TEXT NOT NULL,
    -- 'cm_doc'|'ar_class'|'ar_unit'|'qr_passage'|'wv_node'|'wv_source'|
    -- 'al_concept'|'cm_media'|'other'
  resource_label  TEXT,                           -- denormalized display name
  role            TEXT NOT NULL DEFAULT 'primary',
    -- 'primary'|'reference'|'exercise'|'supplementary'
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id),
  UNIQUE (task_id, resource_ref)
);
CREATE INDEX IF NOT EXISTS idx_pl_tr_task     ON pl_task_resources(task_id);
CREATE INDEX IF NOT EXISTS idx_pl_tr_resource ON pl_task_resources(resource_ref);

-- § 3.2  Task assignees (multiple assignees for team tasks)
CREATE TABLE IF NOT EXISTS pl_task_assignees (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL,
  user_ref     TEXT NOT NULL,                     -- 'CORE:<user_id>'
  role         TEXT NOT NULL DEFAULT 'assignee',  -- 'owner'|'assignee'|'reviewer'|'observer'
  assigned_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id),
  UNIQUE (task_id, user_ref)
);
CREATE INDEX IF NOT EXISTS idx_pl_ta_task ON pl_task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_pl_ta_user ON pl_task_assignees(user_ref);

-- § 3.3  Task dependencies (dependency graph between tasks)
CREATE TABLE IF NOT EXISTS pl_task_dependencies (
  id            TEXT PRIMARY KEY,
  from_task_id  TEXT NOT NULL,                    -- this task is blocked by
  to_task_id    TEXT NOT NULL,                    -- this task (must complete first)
  dep_type      TEXT NOT NULL DEFAULT 'blocks',   -- 'blocks'|'related'|'sequence'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_task_id) REFERENCES pl_tasks(id),
  FOREIGN KEY (to_task_id)   REFERENCES pl_tasks(id),
  UNIQUE (from_task_id, to_task_id)
);
CREATE INDEX IF NOT EXISTS idx_pl_td_from ON pl_task_dependencies(from_task_id);
CREATE INDEX IF NOT EXISTS idx_pl_td_to   ON pl_task_dependencies(to_task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 4  LANES AND KANBAN (Board view organization)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_lanes (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  lane_type       TEXT NOT NULL DEFAULT 'custom',
    -- 'pending'|'in_progress'|'done'|'skipped'|'blocked'|'custom'
  sort_order      INTEGER NOT NULL DEFAULT 0,
  color           TEXT,
  wip_limit       INTEGER,                        -- max tasks in lane (0 = unlimited)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_lanes_plan ON pl_lanes(plan_id);

CREATE TABLE IF NOT EXISTS pl_lane_items (
  id           TEXT PRIMARY KEY,
  lane_id      TEXT NOT NULL,
  task_id      TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  moved_at     TEXT NOT NULL DEFAULT (datetime('now')),
  moved_by_ref TEXT,                              -- 'CORE:<user_id>'
  FOREIGN KEY (lane_id) REFERENCES pl_lanes(id),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id),
  UNIQUE (lane_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_pl_li_lane ON pl_lane_items(lane_id);
CREATE INDEX IF NOT EXISTS idx_pl_li_task ON pl_lane_items(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 5  PACKETS (Work bundles for class delivery or team sprint)
-- ─────────────────────────────────────────────────────────────────────────────

-- A packet aggregates tasks + resources from multiple modules into one
-- workflow envelope (e.g. weekly class assignment, sprint bundle).
CREATE TABLE IF NOT EXISTS pl_packets (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  packet_type     TEXT NOT NULL DEFAULT 'assignment',
    -- 'assignment'|'sprint'|'review_bundle'|'class_session'|'study_packet'|'other'
  assignee_refs   TEXT,                           -- JSON ['CORE:<user_id>',...]
  resource_refs   TEXT,                           -- JSON [{ref, type, label}]
  due_date        TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
    -- 'open'|'in_progress'|'submitted'|'reviewed'|'closed'
  instructions_md TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_pkt_plan   ON pl_packets(plan_id);
CREATE INDEX IF NOT EXISTS idx_pl_pkt_status ON pl_packets(status);
CREATE INDEX IF NOT EXISTS idx_pl_pkt_due    ON pl_packets(due_date);

-- Packet items (individual task/resource links within a packet)
CREATE TABLE IF NOT EXISTS pl_packet_items (
  id            TEXT PRIMARY KEY,
  packet_id     TEXT NOT NULL,
  task_id       TEXT,
  resource_ref  TEXT,                             -- typed ref to canonical item
  resource_type TEXT,
  resource_label TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_required   INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (packet_id) REFERENCES pl_packets(id),
  FOREIGN KEY (task_id)   REFERENCES pl_tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_pi_packet ON pl_packet_items(packet_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 6  REVIEW CYCLES (Scheduled review + submission loops)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_review_cycles (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  packet_id       TEXT,
  title           TEXT NOT NULL,
  cycle_type      TEXT NOT NULL DEFAULT 'periodic',
    -- 'periodic'|'milestone'|'submission'|'class_round'|'sprint_retro'|'other'
  cadence         TEXT,                           -- 'daily'|'weekly'|'monthly'|'custom'
  cadence_days    INTEGER,
  starts_at       TEXT,
  ends_at         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending'|'active'|'complete'|'cancelled'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id)   REFERENCES pl_plans(id),
  FOREIGN KEY (packet_id) REFERENCES pl_packets(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_rc_plan   ON pl_review_cycles(plan_id);
CREATE INDEX IF NOT EXISTS idx_pl_rc_status ON pl_review_cycles(status);

CREATE TABLE IF NOT EXISTS pl_review_events (
  id              TEXT PRIMARY KEY,
  cycle_id        TEXT NOT NULL,
  reviewer_ref    TEXT,                           -- 'CORE:<user_id>'
  reviewee_ref    TEXT,                           -- 'CORE:<user_id>'
  event_type      TEXT NOT NULL DEFAULT 'submission',
    -- 'submission'|'feedback'|'approval'|'rejection'|'revision'|'final'
  notes_md        TEXT,
  score           REAL,
  status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending'|'complete'|'cancelled'
  due_at          TEXT,
  resolved_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cycle_id) REFERENCES pl_review_cycles(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_re_cycle ON pl_review_events(cycle_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 7  STUDY SESSIONS (Completed session logs)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_sessions (
  id              TEXT PRIMARY KEY,               -- ULID
  plan_id         TEXT,
  task_id         TEXT,
  core_user_ref   TEXT NOT NULL,                  -- 'CORE:<user_id>'
  core_ws_ref     TEXT,
  session_type    TEXT NOT NULL DEFAULT 'reading',
    -- 'reading'|'memorization'|'revision'|'exercise'|'lecture'|'class'|
    -- 'podcast'|'research'|'other'
  resource_ref    TEXT,                           -- primary resource studied
  resource_type   TEXT,
  resource_label  TEXT,                           -- denormalized
  qr_scope_ref    TEXT,                           -- 'QR:2:1-10' if Quran session
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  duration_mins   INTEGER,
  pages_covered   TEXT,                           -- e.g. '45-60'
  ayahs_covered   TEXT,                           -- e.g. '1-15'
  rating          INTEGER,                        -- 1–5 quality/focus rating
  notes_md        TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id),
  FOREIGN KEY (task_id) REFERENCES pl_tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_sess_user   ON pl_sessions(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_pl_sess_plan   ON pl_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_pl_sess_type   ON pl_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_pl_sess_date   ON pl_sessions(started_at);

-- Session item logs (multiple canonical items covered in one session)
CREATE TABLE IF NOT EXISTS pl_session_item_logs (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  resource_ref  TEXT NOT NULL,                    -- typed ref
  resource_type TEXT NOT NULL,
  resource_label TEXT,
  item_status   TEXT NOT NULL DEFAULT 'completed',
    -- 'completed'|'partial'|'skipped'|'reviewed'
  time_spent_mins INTEGER,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES pl_sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_sil_session  ON pl_session_item_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_pl_sil_resource ON pl_session_item_logs(resource_ref);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 8  GOALS AND STREAKS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_goals (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  plan_id         TEXT,
  title           TEXT NOT NULL,
  goal_type       TEXT NOT NULL DEFAULT 'habit',
    -- 'habit'|'milestone'|'quota'|'completion'|'other'
  metric          TEXT NOT NULL DEFAULT 'sessions',
    -- 'sessions'|'minutes'|'pages'|'ayahs'|'tasks'|'other'
  target_value    REAL NOT NULL,
  current_value   REAL NOT NULL DEFAULT 0,
  cadence         TEXT NOT NULL DEFAULT 'weekly',
    -- 'daily'|'weekly'|'monthly'|'total'
  period_start    TEXT,
  period_end      TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'active'|'completed'|'paused'|'archived'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES pl_plans(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_goals_user   ON pl_goals(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_pl_goals_plan   ON pl_goals(plan_id);
CREATE INDEX IF NOT EXISTS idx_pl_goals_status ON pl_goals(status);

CREATE TABLE IF NOT EXISTS pl_goal_snapshots (
  id            TEXT PRIMARY KEY,
  goal_id       TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  value         REAL NOT NULL,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES pl_goals(id),
  UNIQUE (goal_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_pl_gs_goal ON pl_goal_snapshots(goal_id);
CREATE INDEX IF NOT EXISTS idx_pl_gs_date ON pl_goal_snapshots(snapshot_date);

-- Streaks (daily / weekly continuity tracking)
CREATE TABLE IF NOT EXISTS pl_streaks (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  plan_id         TEXT,
  streak_type     TEXT NOT NULL DEFAULT 'daily_session',
    -- 'daily_session'|'weekly_goal'|'task_chain'|'other'
  current_count   INTEGER NOT NULL DEFAULT 0,
  longest_count   INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  started_date    TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (core_user_ref, streak_type, plan_id)
);
CREATE INDEX IF NOT EXISTS idx_pl_str_user ON pl_streaks(core_user_ref);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 9  CALENDAR ENTRIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_calendar_entries (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  plan_id         TEXT,
  task_id         TEXT,
  session_id      TEXT,
  title           TEXT NOT NULL,
  entry_type      TEXT NOT NULL DEFAULT 'scheduled_session',
    -- 'scheduled_session'|'deadline'|'milestone'|'review'|'event'|'other'
  start_datetime  TEXT NOT NULL,
  end_datetime    TEXT,
  all_day         INTEGER NOT NULL DEFAULT 0,
  recurrence_json TEXT,                           -- RRULE-compatible JSON
  is_completed    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id)   REFERENCES pl_plans(id),
  FOREIGN KEY (task_id)   REFERENCES pl_tasks(id),
  FOREIGN KEY (session_id) REFERENCES pl_sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_pl_cal_user  ON pl_calendar_entries(core_user_ref);
CREATE INDEX IF NOT EXISTS idx_pl_cal_start ON pl_calendar_entries(start_datetime);
CREATE INDEX IF NOT EXISTS idx_pl_cal_plan  ON pl_calendar_entries(plan_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██ § 10  PLAN TEMPLATES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_plan_templates (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'reading',
  description_md  TEXT,
  template_json   TEXT NOT NULL,                  -- full plan scaffold definition
  is_public       INTEGER NOT NULL DEFAULT 0,
  created_by_ref  TEXT,                           -- 'CORE:<user_id>'
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed built-in templates
INSERT OR IGNORE INTO pl_plan_templates (id, slug, title, plan_type, description_md, template_json) VALUES
  ('01PLTMPL000000000000001', 'quran-30-days',
   '30-Day Quran Reading Plan', 'quran',
   'Read the entire Quran in 30 days — approximately 20 pages per day.',
   '{"daily_pages":20,"total_days":30,"scope_type":"qr_surah_full"}'),
  ('01PLTMPL000000000000002', 'arabic-beginner',
   'Arabic Beginner Track', 'arabic',
   'Foundational Arabic vocabulary and grammar — 3 months.',
   '{"duration_weeks":12,"daily_mins":30,"scope_type":"ar_class"}'),
  ('01PLTMPL000000000000003', 'worldview-research',
   'Worldview Research Sprint', 'worldview_research',
   'Two-week focused research sprint on a worldview topic.',
   '{"duration_days":14,"daily_sessions":1,"scope_type":"wv_source"}');
