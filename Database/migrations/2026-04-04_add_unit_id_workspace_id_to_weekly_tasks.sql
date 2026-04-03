-- Migration: 2026-04-04
-- Add workspace_id, unit_id, container_id, due_date, kanban_state to sp_weekly_tasks
-- Enables: duplicate-check by workspace_id + unit_id (no week_start check)
--          Plan-first: items appear in Plan always, Kanban only when due_date + status='todo'

ALTER TABLE sp_weekly_tasks ADD COLUMN workspace_id INTEGER REFERENCES wv_workspace(id);
ALTER TABLE sp_weekly_tasks ADD COLUMN unit_id TEXT;        -- generic: quran_s12_p1 | ar_book_madinah_3
ALTER TABLE sp_weekly_tasks ADD COLUMN container_id TEXT;   -- quran_s12 | ar_container.id
ALTER TABLE sp_weekly_tasks ADD COLUMN due_date TEXT;       -- ISO date — triggers Kanban visibility

-- kanban_state may already exist from earlier migration; guard with IF NOT EXISTS via index creation
-- ALTER TABLE sp_weekly_tasks ADD COLUMN kanban_state TEXT NOT NULL DEFAULT 'backlog';

-- Unique constraint: one unit per workspace — prevents duplicate pushes
-- No week_start in the uniqueness check
CREATE UNIQUE INDEX IF NOT EXISTS idx_sp_wt_workspace_unit
  ON sp_weekly_tasks(workspace_id, unit_id)
  WHERE unit_id IS NOT NULL AND workspace_id IS NOT NULL;

-- Index for Kanban query: WHERE due_date IS NOT NULL AND status = 'todo'
CREATE INDEX IF NOT EXISTS idx_sp_wt_kanban
  ON sp_weekly_tasks(workspace_id, status, due_date)
  WHERE due_date IS NOT NULL;

-- Index for Plan query: all tasks for a workspace
CREATE INDEX IF NOT EXISTS idx_sp_wt_workspace
  ON sp_weekly_tasks(workspace_id, status);
