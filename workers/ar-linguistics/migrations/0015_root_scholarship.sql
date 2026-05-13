-- ─── 0015_root_scholarship.sql ──────────────────────────────────────────
--
-- Adds a dedicated table family for ACADEMIC scholarship on Arabic roots
-- and vocabulary — distinct from the classical lexicon corpus.
--
-- Background:
--   `ar_ling_lexicon_*` tables hold classical Arabic dictionaries (Lane,
--   Lisan al-Arab, al-Sihah, al-Qamus, etc.). These are pre-modern
--   philological works keyed by root.
--
--   Modern academic articles (Al-Jallad's "Excavating the Quran",
--   epigraphic studies, comparative-Semitic work, archaeological
--   readings, historical-phonology papers) are NOT lexicons. Storing
--   them in `ar_ling_lexicon_entries` mixes apples and oranges and
--   pollutes the lexicon catalog UI.
--
--   This migration creates:
--     1. `ar_ling_root_scholarship`  — per-root academic notes
--     2. `ar_ling_vocab_scholarship` — per-lemma academic notes
--     3. Adds `genre` column to `ar_ling_sources` so article-type
--        sources can be filtered/grouped by scholarly genre
--
--   It also relocates the 9 existing Al-Jallad rows out of
--   `ar_ling_lexicon_entries` into `ar_ling_root_scholarship`, and
--   flips the source row's `source_type` from 'book' to 'article'.

-- ── 1. Source-row classification: genre + source_type tightening ──────

ALTER TABLE ar_ling_sources ADD COLUMN genre TEXT;
-- genre values (suggested controlled vocabulary):
--   'classical_lexicon'        — Lane, Lisan, Sihah, Qamus, etc.
--   'classical_qur_lexicon'    — Mufradat al-Raghib, ʿUmdat al-Huffaz
--   'epigraphic'               — Safaitic / Nabataean / OCIANA-based
--   'comparative_semitic'      — cross-Semitic etymology / philology
--   'archaeological'           — material-culture readings
--   'historical_phonology'     — sound-change studies
--   'qira_at'                  — variant-readings corpora
--   'synonym_set'              — modern synonym indices

-- ── 2. Per-root academic notes ────────────────────────────────────────

CREATE TABLE ar_ling_root_scholarship (
  id              TEXT PRIMARY KEY,

  -- Where the note comes from (article, book chapter, paper, etc.)
  source_id       TEXT NOT NULL,             -- → ar_ling_sources(id)
  source_slug     TEXT,                       -- denormalized for filtering
  source_native_id TEXT,                      -- original record id in source

  -- What it's about
  root_id         TEXT,                       -- → ar_ling_roots(id) when canonical
  root_norm       TEXT NOT NULL,              -- normalized Arabic root
  root_text       TEXT,                       -- display form (with diacritics)

  -- Reading classification
  reading_kind    TEXT NOT NULL DEFAULT 'general',
                                              -- 'etymological'
                                              -- 'epigraphic'
                                              -- 'archaeological'
                                              -- 'comparative_semitic'
                                              -- 'philological'
                                              -- 'historical_phonology'
                                              -- 'qur_anic_hermeneutic'
                                              -- 'general'

  -- Content
  title_en        TEXT,
  title_ar        TEXT,
  body_md         TEXT,                       -- markdown body of the note
  body_html       TEXT,                       -- rendered HTML if pre-rendered
  body_plain      TEXT,                       -- search-friendly plaintext

  -- Evidence packaged as JSON
  comparanda_json TEXT,                       -- {"safaitic":"...", "ugaritic":"...", "hebrew":"...", "ge_ez":"...", "akkadian":"..."}
  inscriptions_json TEXT,                     -- [{"corpus":"OCIANA","id":"KRS.123","reading":"..."}]
  glosses_json    TEXT,                       -- [{"lang":"en","gloss":"..."}]
  citations_json  TEXT,                       -- [{"author":"...","year":2020,"title":"...","page":12}]

  -- Source pin
  page_no         INTEGER,
  page_range      TEXT,                       -- "12-15"
  section_label   TEXT,                       -- "§3.2"

  -- Metadata
  parser_version  TEXT,
  import_batch_id TEXT,
  status          TEXT DEFAULT 'raw',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (root_id)   REFERENCES ar_ling_roots(id)
);

CREATE INDEX idx_root_scholarship_root_norm ON ar_ling_root_scholarship(root_norm);
CREATE INDEX idx_root_scholarship_source    ON ar_ling_root_scholarship(source_id);
CREATE INDEX idx_root_scholarship_slug_root ON ar_ling_root_scholarship(source_slug, root_norm);
CREATE INDEX idx_root_scholarship_kind      ON ar_ling_root_scholarship(reading_kind);

-- ── 3. Per-lemma academic notes (vocabulary-level, not root-level) ────

CREATE TABLE ar_ling_vocab_scholarship (
  id              TEXT PRIMARY KEY,

  source_id       TEXT NOT NULL,
  source_slug     TEXT,
  source_native_id TEXT,

  -- Target lemma (we accept either a canonical lemma_id or a raw lemma_text
  -- — academic articles often cite forms that aren't in our canonical
  -- lemma table, so lemma_id is nullable).
  lemma_id        TEXT,                       -- → ar_ling_lemmas(id) when canonical
  lemma_text      TEXT NOT NULL,              -- the cited form (vocalized)
  lemma_norm      TEXT,                       -- normalized (tashkil stripped)
  root_norm       TEXT,                       -- optional back-link to root

  reading_kind    TEXT NOT NULL DEFAULT 'general',

  title_en        TEXT,
  title_ar        TEXT,
  body_md         TEXT,
  body_html       TEXT,
  body_plain      TEXT,

  comparanda_json TEXT,
  citations_json  TEXT,

  page_no         INTEGER,
  page_range      TEXT,
  section_label   TEXT,

  parser_version  TEXT,
  import_batch_id TEXT,
  status          TEXT DEFAULT 'raw',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (lemma_id)  REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX idx_vocab_scholarship_lemma_norm ON ar_ling_vocab_scholarship(lemma_norm);
CREATE INDEX idx_vocab_scholarship_root_norm  ON ar_ling_vocab_scholarship(root_norm);
CREATE INDEX idx_vocab_scholarship_source     ON ar_ling_vocab_scholarship(source_id);

-- ── 4. Migrate Al-Jallad rows out of the lexicon corpus ───────────────
--
-- These 9 rows were stored in `ar_ling_lexicon_entries` against
-- source_id='SRC:ALJ:2026:EXCQRN'. Lift them into the scholarship table
-- so they no longer appear in the lexicon catalog.

INSERT INTO ar_ling_root_scholarship (
  id, source_id, source_slug,
  root_id, root_norm, root_text,
  reading_kind,
  title_en, title_ar,
  body_md, body_html, body_plain,
  page_no, status, created_at
)
SELECT
  -- New row id, prefixed `rs_` so it's distinguishable.
  'rs_' || lower(hex(randomblob(8)))                AS id,
  e.source_id,
  e.source_slug,
  e.root_id,
  COALESCE(e.heading_norm, e.root_text)             AS root_norm,
  e.root_text,
  -- All Al-Jallad rows are "archaeological hermeneutic" by default.
  'qur_anic_hermeneutic'                            AS reading_kind,
  e.title_en,
  e.title_ar,
  COALESCE(e.gloss_en, e.summary_en, e.note_md)     AS body_md,
  NULL                                              AS body_html,
  COALESCE(e.gloss_en, e.summary_en)                AS body_plain,
  e.page_no,
  'imported'                                        AS status,
  COALESCE(e.created_at, datetime('now'))           AS created_at
FROM ar_ling_lexicon_entries e
WHERE e.source_id = 'SRC:ALJ:2026:EXCQRN';

DELETE FROM ar_ling_lexicon_entries WHERE source_id = 'SRC:ALJ:2026:EXCQRN';

-- ── 5. Reclassify the source row itself ───────────────────────────────

UPDATE ar_ling_sources
   SET source_type = 'article',
       genre       = 'qur_anic_hermeneutic'
 WHERE id = 'SRC:ALJ:2026:EXCQRN';

-- ── 6. Backfill `genre` for existing classical lexicon sources ────────
--
-- Anything that's still `source_type='lexicon'` gets the
-- 'classical_lexicon' genre; the Raghib/Sumayn Qur'an-specific lexicons
-- get 'classical_qur_lexicon'.

UPDATE ar_ling_sources
   SET genre = CASE
     WHEN id IN ('SRC:KETABONLINE:MUFRADAT', 'SRC:KETABONLINE:UMDAT_AL_HUFFAZ')
       THEN 'classical_qur_lexicon'
     ELSE 'classical_lexicon'
   END
 WHERE source_type = 'lexicon' AND genre IS NULL;
