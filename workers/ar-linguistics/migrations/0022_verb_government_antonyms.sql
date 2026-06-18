-- 0022 — Verb government + root antonyms (AL domain).
-- Two panels of the word view had no canonical home:
--   • Verb transitivity (lāzim / mutaʿaddin) + preposition government (تعدية بحرف)
--   • Root-level antonyms (cross-root opposites; sense_relations needs sense ids)
-- These tables fill those gaps. Content is keyed by root_norm and rendered by
-- the fused word lens. See docs/quran-morphology-step-process.md.

CREATE TABLE IF NOT EXISTS ar_ling_verb_government (
  id           TEXT PRIMARY KEY,
  root_norm    TEXT NOT NULL,
  verb_form    TEXT,                                -- I, II, IV, VIII …
  verb_ar      TEXT NOT NULL,
  transitivity TEXT NOT NULL,                       -- 'lazim' | 'mutaaddi'
  harf         TEXT,                                -- إلى / من / لـ / (هـ) / NULL
  meaning_en   TEXT,
  meaning_ar   TEXT,
  qr_ref       TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  source_ref   TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vgov_root ON ar_ling_verb_government(root_norm, sort_order);

CREATE TABLE IF NOT EXISTS ar_ling_root_antonyms (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,
  antonym_ar    TEXT NOT NULL,
  antonym_root  TEXT,
  antonym_en    TEXT,
  relation_kind TEXT NOT NULL DEFAULT 'antonym',    -- antonym | contrast
  note          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  source_ref    TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_rant_root ON ar_ling_root_antonyms(root_norm, sort_order);
