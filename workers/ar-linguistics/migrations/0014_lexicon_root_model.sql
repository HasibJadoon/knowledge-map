-- 0014_lexicon_root_model.sql
--
-- Introduces the canonical root-entry model for all lexicon sources.
--
-- Three new tables:
--   ar_ling_lexicon_root_entries       — one row per source_slug + root_norm
--   ar_ling_lexicon_entry_sections     — internal sections under a root entry
--   ar_ling_lexicon_root_entry_sources — pointers to local SQLite / HTML / chunks / legacy rows
--
-- Also:
--   FTS5 virtual tables for both content tables
--   Insert / update / delete triggers to keep FTS in sync
--   Cleanup block: removes old Lane rows from legacy tables
--   Validation queries at the end (run manually after import)

-- ============================================================
-- SECTION 1: ar_ling_lexicon_root_entries
-- ============================================================

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_root_entries (
  id                  TEXT PRIMARY KEY,

  source_id           TEXT NOT NULL,
  source_slug         TEXT NOT NULL,

  root_id             TEXT,
  root_text           TEXT NOT NULL,
  root_norm           TEXT NOT NULL,

  entry_text_ar       TEXT,
  entry_text_en       TEXT,
  raw_text            TEXT NOT NULL,

  source_chunk_id     TEXT,

  page_start          INTEGER,
  page_end            INTEGER,
  volume_no           INTEGER,

  source_url          TEXT,
  source_path         TEXT,

  source_native_id    TEXT,
  source_native_key   TEXT,

  parser_version      TEXT,
  raw_hash            TEXT,
  import_batch_id     TEXT,

  status              TEXT NOT NULL DEFAULT 'raw',

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (root_id)          REFERENCES ar_ling_roots(id),
  FOREIGN KEY (source_id)        REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id)  REFERENCES ar_ling_source_chunks(id),

  UNIQUE(source_slug, root_norm)
);

CREATE INDEX IF NOT EXISTS idx_alre_root_norm
  ON ar_ling_lexicon_root_entries(root_norm);

CREATE INDEX IF NOT EXISTS idx_alre_source_slug
  ON ar_ling_lexicon_root_entries(source_slug);

CREATE INDEX IF NOT EXISTS idx_alre_source_root
  ON ar_ling_lexicon_root_entries(source_slug, root_norm);

CREATE INDEX IF NOT EXISTS idx_alre_status
  ON ar_ling_lexicon_root_entries(status);

CREATE INDEX IF NOT EXISTS idx_alre_import_batch
  ON ar_ling_lexicon_root_entries(import_batch_id);

-- ============================================================
-- SECTION 2: ar_ling_lexicon_entry_sections
-- ============================================================

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entry_sections (
  id                        TEXT PRIMARY KEY,

  root_entry_id             TEXT NOT NULL,

  source_slug               TEXT NOT NULL,
  root_text                 TEXT NOT NULL,
  root_norm                 TEXT NOT NULL,

  section_seq               INTEGER NOT NULL,

  heading_ar                TEXT,
  heading_norm              TEXT,
  heading_bare              TEXT,

  section_type              TEXT NOT NULL DEFAULT 'definition',

  text_ar                   TEXT,
  text_en                   TEXT,

  raw_xml                   TEXT,
  perseus_xml               TEXT,

  page_no                   INTEGER,
  volume_no                 INTEGER,

  source_native_section_id  TEXT,

  lane_node_id              TEXT,
  lane_node_num             INTEGER,
  lane_itype                TEXT,

  has_gaps                  INTEGER NOT NULL DEFAULT 0,

  parser_notes_json         TEXT CHECK (
    parser_notes_json IS NULL OR json_valid(parser_notes_json)
  ),

  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT,

  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id),

  UNIQUE(root_entry_id, section_seq)
);

CREATE INDEX IF NOT EXISTS idx_ales_root_entry
  ON ar_ling_lexicon_entry_sections(root_entry_id);

CREATE INDEX IF NOT EXISTS idx_ales_root_norm
  ON ar_ling_lexicon_entry_sections(root_norm);

CREATE INDEX IF NOT EXISTS idx_ales_source_root
  ON ar_ling_lexicon_entry_sections(source_slug, root_norm);

CREATE INDEX IF NOT EXISTS idx_ales_heading_norm
  ON ar_ling_lexicon_entry_sections(heading_norm);

CREATE INDEX IF NOT EXISTS idx_ales_page
  ON ar_ling_lexicon_entry_sections(page_no);

-- ============================================================
-- SECTION 3: ar_ling_lexicon_root_entry_sources
-- ============================================================

-- Allowed source_kind values:
--   legacy_lexicon_entry
--   legacy_source_chunk
--   lane_sqlite_root
--   lane_sqlite_entry
--   quranic_research_html
--   quranic_research_json
--   quranic_research_clean_text
--   quranic_research_chunks

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_root_entry_sources (
  id                TEXT PRIMARY KEY,

  root_entry_id     TEXT NOT NULL,

  source_kind       TEXT NOT NULL,
  source_slug       TEXT NOT NULL,

  source_native_id  TEXT,
  source_url        TEXT,
  source_path       TEXT,

  checksum          TEXT,
  note_md           TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_alres_root_entry
  ON ar_ling_lexicon_root_entry_sources(root_entry_id);

CREATE INDEX IF NOT EXISTS idx_alres_kind
  ON ar_ling_lexicon_root_entry_sources(source_kind);

CREATE INDEX IF NOT EXISTS idx_alres_slug
  ON ar_ling_lexicon_root_entry_sources(source_slug);

-- ============================================================
-- SECTION 4: FTS5 virtual tables
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_root_entries_fts USING fts5(
  root_text,
  root_norm,
  source_slug,
  entry_text_ar,
  entry_text_en,
  raw_text,
  content='ar_ling_lexicon_root_entries',
  content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_entry_sections_fts USING fts5(
  root_text,
  root_norm,
  heading_ar,
  heading_norm,
  heading_bare,
  section_type,
  text_ar,
  text_en,
  content='ar_ling_lexicon_entry_sections',
  content_rowid='rowid'
);

-- ============================================================
-- SECTION 5: FTS triggers — ar_ling_lexicon_root_entries
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trig_alre_fts_ai
AFTER INSERT ON ar_ling_lexicon_root_entries BEGIN
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    new.rowid, new.root_text, new.root_norm, new.source_slug,
    COALESCE(new.entry_text_ar, ''),
    COALESCE(new.entry_text_en, ''),
    COALESCE(new.raw_text, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_alre_fts_ad
AFTER DELETE ON ar_ling_lexicon_root_entries BEGIN
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    ar_ling_lexicon_root_entries_fts,
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm, old.source_slug,
    COALESCE(old.entry_text_ar, ''),
    COALESCE(old.entry_text_en, ''),
    COALESCE(old.raw_text, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_alre_fts_au
AFTER UPDATE ON ar_ling_lexicon_root_entries BEGIN
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    ar_ling_lexicon_root_entries_fts,
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm, old.source_slug,
    COALESCE(old.entry_text_ar, ''),
    COALESCE(old.entry_text_en, ''),
    COALESCE(old.raw_text, '')
  );
  INSERT INTO ar_ling_lexicon_root_entries_fts(
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    new.rowid, new.root_text, new.root_norm, new.source_slug,
    COALESCE(new.entry_text_ar, ''),
    COALESCE(new.entry_text_en, ''),
    COALESCE(new.raw_text, '')
  );
END;

-- ============================================================
-- SECTION 6: FTS triggers — ar_ling_lexicon_entry_sections
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trig_ales_fts_ai
AFTER INSERT ON ar_ling_lexicon_entry_sections BEGIN
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    new.rowid, new.root_text, new.root_norm,
    COALESCE(new.heading_ar, ''),
    COALESCE(new.heading_norm, ''),
    COALESCE(new.heading_bare, ''),
    COALESCE(new.section_type, ''),
    COALESCE(new.text_ar, ''),
    COALESCE(new.text_en, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_ales_fts_ad
AFTER DELETE ON ar_ling_lexicon_entry_sections BEGIN
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    ar_ling_lexicon_entry_sections_fts,
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm,
    COALESCE(old.heading_ar, ''),
    COALESCE(old.heading_norm, ''),
    COALESCE(old.heading_bare, ''),
    COALESCE(old.section_type, ''),
    COALESCE(old.text_ar, ''),
    COALESCE(old.text_en, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trig_ales_fts_au
AFTER UPDATE ON ar_ling_lexicon_entry_sections BEGIN
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    ar_ling_lexicon_entry_sections_fts,
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm,
    COALESCE(old.heading_ar, ''),
    COALESCE(old.heading_norm, ''),
    COALESCE(old.heading_bare, ''),
    COALESCE(old.section_type, ''),
    COALESCE(old.text_ar, ''),
    COALESCE(old.text_en, '')
  );
  INSERT INTO ar_ling_lexicon_entry_sections_fts(
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    new.rowid, new.root_text, new.root_norm,
    COALESCE(new.heading_ar, ''),
    COALESCE(new.heading_norm, ''),
    COALESCE(new.heading_bare, ''),
    COALESCE(new.section_type, ''),
    COALESCE(new.text_ar, ''),
    COALESCE(new.text_en, '')
  );
END;

-- ============================================================
-- SECTION 7: Delete old Lane data from legacy tables
--
-- Safe to run multiple times (deletes are idempotent).
-- Does NOT touch non-Lane source slugs.
-- ============================================================

-- Lane-only quality/repair tables (full truncate)
DELETE FROM ar_ling_lane_quality_index
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lane_patch_log
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

-- Children of ar_ling_source_lexicon_display_blocks (must go first)
DELETE FROM ar_ling_source_lexicon_display_blocks
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

-- Children of ar_ling_lexicon_entries
DELETE FROM ar_ling_lexicon_evidence
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lexicon_morphology
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_sense_relations
WHERE from_sense_id IN (
  SELECT id FROM ar_ling_senses
  WHERE lexicon_entry_id IN (
    SELECT id FROM ar_ling_lexicon_entries
    WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
  )
) OR to_sense_id IN (
  SELECT id FROM ar_ling_senses
  WHERE lexicon_entry_id IN (
    SELECT id FROM ar_ling_lexicon_entries
    WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
  )
);

DELETE FROM ar_ling_senses
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_token_lexicon_link
WHERE lexicon_entry_id IN (
  SELECT id FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lexicon_entries_fts
WHERE rowid IN (
  SELECT rowid FROM ar_ling_lexicon_entries
  WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus')
);

DELETE FROM ar_ling_lexicon_entries
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

-- New root-level tables (children before parent)
DELETE FROM ar_ling_lexicon_entry_sections
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

DELETE FROM ar_ling_lexicon_root_entry_sources
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

DELETE FROM ar_ling_lexicon_root_entries
WHERE source_slug IN ('lane_lexicon', 'lane_quranic_research_perseus');

-- ============================================================
-- SECTION 8: FTS backfill (run after import scripts complete)
-- ============================================================

-- DELETE FROM ar_ling_lexicon_root_entries_fts;
--
-- INSERT INTO ar_ling_lexicon_root_entries_fts(
--   rowid, root_text, root_norm, source_slug,
--   entry_text_ar, entry_text_en, raw_text
-- )
-- SELECT
--   rowid, root_text, root_norm, source_slug,
--   COALESCE(entry_text_ar, ''),
--   COALESCE(entry_text_en, ''),
--   COALESCE(raw_text, '')
-- FROM ar_ling_lexicon_root_entries;
--
-- DELETE FROM ar_ling_lexicon_entry_sections_fts;
--
-- INSERT INTO ar_ling_lexicon_entry_sections_fts(
--   rowid, root_text, root_norm,
--   heading_ar, heading_norm, heading_bare,
--   section_type, text_ar, text_en
-- )
-- SELECT
--   rowid, root_text, root_norm,
--   COALESCE(heading_ar, ''),
--   COALESCE(heading_norm, ''),
--   COALESCE(heading_bare, ''),
--   COALESCE(section_type, ''),
--   COALESCE(text_ar, ''),
--   COALESCE(text_en, '')
-- FROM ar_ling_lexicon_entry_sections;

-- ============================================================
-- SECTION 9: Validation queries (run manually)
-- ============================================================

-- 1. No duplicate root/source rows:
-- SELECT source_slug, root_norm, COUNT(*) AS count
-- FROM ar_ling_lexicon_root_entries
-- GROUP BY source_slug, root_norm
-- HAVING COUNT(*) > 1;
-- Expected: zero rows.

-- 2. Lane علم = exactly one root entry:
-- SELECT source_slug, root_text, root_norm, COUNT(*) AS count
-- FROM ar_ling_lexicon_root_entries
-- WHERE source_slug = 'lane_lexicon' AND root_norm = 'علم'
-- GROUP BY source_slug, root_text, root_norm;
-- Expected: count = 1.

-- 3. Lane علم sections:
-- SELECT s.section_seq, s.heading_ar, s.section_type, s.page_no
-- FROM ar_ling_lexicon_entry_sections s
-- JOIN ar_ling_lexicon_root_entries e ON e.id = s.root_entry_id
-- WHERE e.source_slug = 'lane_lexicon' AND e.root_norm = 'علم'
-- ORDER BY s.section_seq;
-- Expected: ~40 rows.

-- 4. All sources in root entries:
-- SELECT source_slug, COUNT(*) AS root_count
-- FROM ar_ling_lexicon_root_entries
-- GROUP BY source_slug ORDER BY source_slug;

-- 5. Source chunk kinds:
-- SELECT chunk_kind, COUNT(*) AS count
-- FROM ar_ling_source_chunks
-- WHERE chunk_kind IN ('lexicon_root','lexicon_root_html_clean_text','lexicon_root_display_chunk')
-- GROUP BY chunk_kind;

-- 6. FTS vs table counts:
-- SELECT 'root_entries' AS t, COUNT(*) FROM ar_ling_lexicon_root_entries UNION ALL
-- SELECT 'root_entries_fts',  COUNT(*) FROM ar_ling_lexicon_root_entries_fts UNION ALL
-- SELECT 'sections',          COUNT(*) FROM ar_ling_lexicon_entry_sections UNION ALL
-- SELECT 'sections_fts',      COUNT(*) FROM ar_ling_lexicon_entry_sections_fts;

-- 7. FTS search test (Arabic):
-- SELECT e.source_slug, e.root_text,
--        snippet(ar_ling_lexicon_root_entries_fts, 5, '[', ']', '…', 20) AS snippet
-- FROM ar_ling_lexicon_root_entries_fts
-- JOIN ar_ling_lexicon_root_entries e ON e.rowid = ar_ling_lexicon_root_entries_fts.rowid
-- WHERE ar_ling_lexicon_root_entries_fts MATCH 'علم'
-- LIMIT 20;

-- 8. FTS search test (English):
-- SELECT s.source_slug, s.root_text, s.heading_ar,
--        snippet(ar_ling_lexicon_entry_sections_fts, 7, '[', ']', '…', 20) AS snippet
-- FROM ar_ling_lexicon_entry_sections_fts
-- JOIN ar_ling_lexicon_entry_sections s ON s.rowid = ar_ling_lexicon_entry_sections_fts.rowid
-- WHERE ar_ling_lexicon_entry_sections_fts MATCH 'knowledge'
-- LIMIT 20;
