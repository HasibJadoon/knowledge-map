-- Doc Space (D3): handwriting/ink pages for a note. Stored TWICE — native
-- PKDrawing (loss-less, iOS) + portable KMInk JSON (cross-platform source of
-- truth) — per the dual-format contract. Lives beside cm_notes in km_content.
CREATE TABLE IF NOT EXISTS cm_doc_ink (
  ink_id         TEXT PRIMARY KEY,
  note_id        TEXT NOT NULL REFERENCES cm_notes(note_id) ON DELETE CASCADE,
  page_index     INTEGER NOT NULL DEFAULT 0,
  kmink_json     TEXT NOT NULL,
  pk_drawing_b64 TEXT,
  pk_stale       INTEGER NOT NULL DEFAULT 0,
  width          INTEGER,
  height         INTEGER,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (note_id, page_index)
);
CREATE INDEX IF NOT EXISTS idx_cmink_note ON cm_doc_ink(note_id, page_index);
