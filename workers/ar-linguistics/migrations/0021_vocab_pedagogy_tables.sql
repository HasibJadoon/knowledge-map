-- 0021 — Membean-style pedagogy content for the vocabulary backbone (AL domain).
-- Content is keyed by root_norm (+ optional sense_id) so every surah occurrence
-- reuses one canonical set: memory hooks, illustrations (incl. video/story),
-- semantic-field diagrams, and a varied exercise bank. Per-user/per-workspace
-- learning STATE lives in km_arabic (workers/arabic/migrations/0002_*), not here.
-- See docs/quran-vocabulary-backbone-plan.md.

-- Memory hooks (Membean "Hooks" Memlet) — one per sense (+ a root-level hook).
CREATE TABLE IF NOT EXISTS ar_ling_vocab_memory_hooks (
  id          TEXT PRIMARY KEY,
  root_norm   TEXT NOT NULL,
  sense_id    TEXT,                                  -- -> ar_ling_senses.id
  scope_type  TEXT NOT NULL DEFAULT 'root',          -- root | sense
  hook_kind   TEXT NOT NULL DEFAULT 'sound',         -- sound | meaning | story
  hook_md     TEXT NOT NULL,
  anchor_word TEXT,
  source_ref  TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vmh_root ON ar_ling_vocab_memory_hooks(root_norm);

-- Illustrations (Membean "Images" + "Video Stories" Memlets).
CREATE TABLE IF NOT EXISTS ar_ling_vocab_illustrations (
  id               TEXT PRIMARY KEY,
  root_norm        TEXT NOT NULL,
  sense_id         TEXT,
  scope_type       TEXT NOT NULL DEFAULT 'root',
  media_kind       TEXT NOT NULL DEFAULT 'svg',      -- image | svg | video | story
  illustration_key TEXT,
  title            TEXT,
  caption_md       TEXT,
  svg_inline       TEXT,
  asset_url        TEXT,
  palette          TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vill_root ON ar_ling_vocab_illustrations(root_norm);

-- Semantic-field diagrams (Membean "Word Constellation" Memlet).
CREATE TABLE IF NOT EXISTS ar_ling_vocab_diagrams (
  id           TEXT PRIMARY KEY,
  root_norm    TEXT NOT NULL,
  diagram_kind TEXT NOT NULL DEFAULT 'constellation', -- constellation | range | contrast | sarf_tree
  diagram_key  TEXT,
  title        TEXT,
  spec_json    TEXT NOT NULL,
  renderer_key TEXT,
  svg_cache    TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vdiag_root ON ar_ling_vocab_diagrams(root_norm);

-- Assessment bank (Membean retrieval practice) — reusable question CONTENT.
-- Per-user attempts live in km_arabic.ar_qr_vocab_reviews.
CREATE TABLE IF NOT EXISTS ar_ling_vocab_exercises (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,
  sense_id      TEXT,
  scope_type    TEXT NOT NULL DEFAULT 'sense',
  exercise_kind TEXT NOT NULL,                        -- def_mcq | cloze | synonym | antonym | choose_word | sarf | spelling
  prompt_md     TEXT NOT NULL,
  options_json  TEXT,
  answer_key    TEXT NOT NULL,
  qr_ref        TEXT,
  difficulty    INTEGER NOT NULL DEFAULT 3,
  source_ref    TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vex_root ON ar_ling_vocab_exercises(root_norm);
