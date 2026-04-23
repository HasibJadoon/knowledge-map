PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sp_weekly_plans (
  week_start    TEXT NOT NULL,
  user_id       INTEGER,
  notes         TEXT,
  planned_count INTEGER NOT NULL DEFAULT 0,
  done_count    INTEGER NOT NULL DEFAULT 0,
  week_json     JSON NOT NULL CHECK (json_valid(week_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT,
  PRIMARY KEY (week_start, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_weekly_plans_user_week
  ON sp_weekly_plans(user_id, week_start);

CREATE TABLE IF NOT EXISTS sp_weekly_tasks (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER,
  week_start         TEXT NOT NULL,
  title              TEXT NOT NULL,
  task_type          TEXT NOT NULL,
  kanban_state       TEXT NOT NULL DEFAULT 'backlog',
  status             TEXT NOT NULL DEFAULT 'planned',
  priority           INTEGER NOT NULL DEFAULT 3,
  points             REAL,
  due_date           TEXT,
  order_index        INTEGER NOT NULL DEFAULT 0,
  task_json          JSON NOT NULL CHECK (json_valid(task_json)),
  ar_lesson_id       INTEGER,
  wv_claim_id        TEXT,
  wv_content_item_id TEXT,
  source_task_id     TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (week_start, user_id) REFERENCES sp_weekly_plans(week_start, user_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_lesson_id) REFERENCES ar_lessons(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_user_week
  ON sp_weekly_tasks(user_id, week_start, kanban_state);
CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_week_order
  ON sp_weekly_tasks(week_start, user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_lesson
  ON sp_weekly_tasks(ar_lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sp_weekly_tasks_source_task
  ON sp_weekly_tasks(user_id, week_start, source_task_id)
  WHERE source_task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sp_sprint_reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,
  period_start TEXT NOT NULL,
  period_end   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','archived')),
  review_json  JSON NOT NULL CHECK (json_valid(review_json)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_sprint_reviews_user_period
  ON sp_sprint_reviews(user_id, period_start, period_end);

DROP TRIGGER IF EXISTS trg_sp_weekly_tasks_ensure_week_plan;
CREATE TRIGGER trg_sp_weekly_tasks_ensure_week_plan
BEFORE INSERT ON sp_weekly_tasks
FOR EACH ROW
BEGIN
  INSERT OR IGNORE INTO sp_weekly_plans (
    week_start, user_id, week_json, created_at, updated_at
  )
  VALUES (
    NEW.week_start,
    NEW.user_id,
    json_object(
      'schema_version', 1,
      'title', 'Week Plan',
      'intent', 'Learn + produce',
      'weekly_goals', json_array(),
      'time_budget', json_object('study_minutes', 420, 'podcast_minutes', 180, 'review_minutes', 60),
      'lanes', json_array(
        json_object('key', 'lesson', 'label', 'Lesson'),
        json_object('key', 'podcast', 'label', 'Podcast'),
        json_object('key', 'notes', 'label', 'Notes'),
        json_object('key', 'admin', 'label', 'Admin')
      ),
      'definition_of_done', json_array(),
      'metrics', json_object('tasks_done_target', 12, 'minutes_target', 600)
    ),
    datetime('now'),
    datetime('now')
  );
END;

DROP TRIGGER IF EXISTS trg_unit_task_auto_weekly_task;
CREATE TRIGGER trg_unit_task_auto_weekly_task
AFTER INSERT ON ar_container_unit_task
FOR EACH ROW
WHEN json_extract(NEW.task_json, '$.auto_weekly') = 1
BEGIN
  INSERT OR IGNORE INTO sp_weekly_tasks (
    user_id,
    week_start,
    title,
    task_type,
    kanban_state,
    status,
    priority,
    points,
    due_date,
    order_index,
    task_json,
    ar_lesson_id,
    source_task_id,
    created_at,
    updated_at
  )
  VALUES (
    json_extract(NEW.task_json, '$.user_id'),
    json_extract(NEW.task_json, '$.week_start'),
    NEW.task_name,
    'lesson_unit_task',
    'backlog',
    'planned',
    COALESCE(json_extract(NEW.task_json, '$.priority'), 3),
    json_extract(NEW.task_json, '$.points'),
    json_extract(NEW.task_json, '$.due_date'),
    COALESCE(json_extract(NEW.task_json, '$.order_index'), 0),
    json_object(
      'schema_version', 1,
      'source', 'ar_container_unit_task',
      'task_id', NEW.task_id,
      'unit_id', NEW.unit_id,
      'task_type', NEW.task_type,
      'task_name', NEW.task_name,
      'ref', json_extract(NEW.task_json, '$.ref'),
      'raw_task_json', json(NEW.task_json)
    ),
    json_extract(NEW.task_json, '$.ar_lesson_id'),
    NEW.task_id,
    datetime('now'),
    datetime('now')
  );
END;
