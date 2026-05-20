-- Move capture notes from inbox/archived to a stage-based workflow:
-- draft → plan → review → done. The status column keeps its name so the
-- repo stays simple; only the allowed values change.

UPDATE pl_capture_notes SET status = 'draft' WHERE status = 'inbox';
UPDATE pl_capture_notes SET status = 'done'  WHERE status = 'archived';

-- Backfill anything unexpected to 'draft' so the UI has a valid stage to render.
UPDATE pl_capture_notes
SET status = 'draft'
WHERE status NOT IN ('draft', 'plan', 'review', 'done');
