-- ─── Passage-structure sections ─────────────────────────────────────────────
-- Moves the authored passage-structure "cards" out of
-- qr_surah_study_tasks.task_json into a normalized per-section table. Each card
-- is a heterogeneous renderer (discourse / chiasm / conflict / lexicon /
-- purpose / narrative_seed / timeline / symbol_maps …) whose body is editorial
-- and renderer-specific, so the body stays as a typed-by-`renderer` JSON column
-- rather than being force-normalized.

CREATE TABLE IF NOT EXISTS qr_passage_sections (
  id           TEXT PRIMARY KEY,
  passage_id   TEXT NOT NULL,
  surah        INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  section_key  TEXT,
  title        TEXT,
  badge        TEXT,
  tone         TEXT,
  renderer     TEXT NOT NULL,
  data_json    TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qr_passage_sections_passage
  ON qr_passage_sections(passage_id, sort_order);
