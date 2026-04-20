-- Large study task payloads can exceed D1's per-statement SQL size when copied
-- as string literals. Store oversized JSON payloads in deterministic chunks and
-- reassemble them in the QR Worker adapter.

CREATE TABLE IF NOT EXISTS qr_surah_study_task_json_chunks (
  task_id       TEXT NOT NULL,
  passage_id    TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, chunk_index),
  FOREIGN KEY (task_id)    REFERENCES qr_surah_study_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qrsstjc_passage
  ON qr_surah_study_task_json_chunks(passage_id, task_id, chunk_index);
