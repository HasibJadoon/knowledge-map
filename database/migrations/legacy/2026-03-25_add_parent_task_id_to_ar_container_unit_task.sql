ALTER TABLE ar_container_unit_task
ADD COLUMN parent_task_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_parent
  ON ar_container_unit_task(parent_task_id);
