-- 0020 — Qur'anic vocabulary backbone (AL domain).
-- One canonical reference per root that every surah occurrence reuses:
-- Five-Lens (existing lexicon blocks) + ṣarf depth + SRS. Near-synonyms,
-- antonyms and idioms are NOT stored here — they link to the existing
-- ar_ling_near_synonym_*, ar_ling_sense_relations and ar_ling_expressions
-- families (no duplication). See docs/quran-vocabulary-backbone-plan.md.

-- Canonical per-root registry (one row per root).
CREATE TABLE IF NOT EXISTS ar_ling_root_vocab (
  root_norm           TEXT PRIMARY KEY,
  root_text           TEXT NOT NULL,
  root_id             TEXT,                 -- -> ar_ling_roots.id
  five_lens_entry_id  TEXT,                 -- -> ar_ling_lexicon_root_entries.id (kmaps_five_lens)
  core_sense_en       TEXT,
  core_sense_ar       TEXT,
  membean_hook        TEXT,
  membean_anchors_json TEXT,
  illustration_key    TEXT,
  diagram_key         TEXT,
  unique_senses_json  TEXT,
  examples_json       TEXT,                 -- cross-surah occurrence examples
  status              TEXT NOT NULL DEFAULT 'draft',
  first_surah         INTEGER,
  first_ayah          INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ṣarf / semantic depth that has no other canonical home.
-- (near_synonyms / antonyms / idioms intentionally excluded — see plan.)
CREATE TABLE IF NOT EXISTS ar_ling_vocab_depth (
  root_norm             TEXT PRIMARY KEY,
  transitivity          TEXT,               -- lazim | mutaaddi | both | doubly_transitive
  masadir_json          TEXT,
  prep_meanings_json    TEXT,               -- verb + preposition: all senses
  near_synonyms_json    TEXT,               -- DENORMALIZED cache only; canonical = near_synonym_members
  antonyms_json         TEXT,               -- DENORMALIZED cache only; canonical = sense_relations
  idioms_json           TEXT,               -- DENORMALIZED cache only; canonical = ar_ling_expressions
  nuance_gems_json      TEXT,               -- Qur'anic nuance gems
  key_term_synthesis_en TEXT,               -- Sinai-style deep synthesis
  key_term_synthesis_ar TEXT,
  memory_hooks_json     TEXT,               -- Membean-style hooks
  sources_json          TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_norm) REFERENCES ar_ling_root_vocab(root_norm)
);

-- Spaced-repetition card per root (canonical key = root; per workspace/learner).
CREATE TABLE IF NOT EXISTS ar_ling_vocab_srs (
  id               TEXT PRIMARY KEY,        -- {workspace_id}:{root_norm}
  workspace_id     INTEGER NOT NULL DEFAULT 1,
  root_norm        TEXT NOT NULL,
  ease_factor      REAL NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  reps             INTEGER NOT NULL DEFAULT 0,
  lapses           INTEGER NOT NULL DEFAULT 0,
  due_at           TEXT,
  last_grade       INTEGER,
  last_reviewed_at TEXT,
  status           TEXT NOT NULL DEFAULT 'new',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workspace_id, root_norm)
);
CREATE INDEX IF NOT EXISTS idx_vocab_srs_due ON ar_ling_vocab_srs(workspace_id, due_at);
