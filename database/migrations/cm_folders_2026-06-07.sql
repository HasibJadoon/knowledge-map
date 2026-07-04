-- D6.5 — Doc Space library: personal folders (Notability subjects/dividers) +
-- soft delete (Recently Deleted). Organization metadata only — notes stay in
-- cm_notes. FK enforcement is done in the worker (D1 has foreign_keys off by
-- default and ALTER ADD COLUMN ... REFERENCES is brittle), so folder_ref is a
-- plain TEXT and folder delete nulls it in application code.
CREATE TABLE IF NOT EXISTS cm_folders (
  id            TEXT PRIMARY KEY,
  core_user_ref TEXT NOT NULL,
  parent_ref    TEXT,
  name          TEXT NOT NULL,
  color         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cmfolders_owner ON cm_folders(core_user_ref, parent_ref, sort_order);

ALTER TABLE cm_notes ADD COLUMN folder_ref TEXT;
ALTER TABLE cm_notes ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_cmnotes_folder ON cm_notes(core_user_ref, folder_ref, deleted_at);
