PRAGMA foreign_keys = ON;

--------------------------------------------------------------------------------
-- Book/source search backbone
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ar_u_sources (
  ar_u_source       TEXT PRIMARY KEY,
  canonical_input   TEXT NOT NULL UNIQUE,
  source_code       TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  author            TEXT,
  publisher         TEXT,
  publication_year  INTEGER,
  language          TEXT,
  type              TEXT NOT NULL DEFAULT 'book',
  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT
);

CREATE TABLE IF NOT EXISTS ar_source_chunks (
  chunk_id       TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,
  page_no        INTEGER,
  locator        TEXT,
  heading_raw    TEXT,
  heading_norm   TEXT,
  chunk_type     TEXT NOT NULL DEFAULT 'lexicon'
                 CHECK (chunk_type IN ('grammar', 'literature', 'lexicon', 'reference', 'other')),
  text           TEXT NOT NULL,
  text_search    TEXT NOT NULL,
  content_json   JSON CHECK (content_json IS NULL OR json_valid(content_json)),
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source)
);

CREATE TABLE IF NOT EXISTS ar_source_toc (
  toc_id         TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,
  depth          INTEGER NOT NULL,
  index_path     TEXT NOT NULL,
  title_raw      TEXT NOT NULL,
  title_norm     TEXT NOT NULL,
  page_no        INTEGER,
  locator        TEXT,
  pdf_page_index INTEGER,
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source)
);

CREATE TABLE IF NOT EXISTS ar_source_index (
  index_id       TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,
  term_raw       TEXT NOT NULL,
  term_norm      TEXT NOT NULL,
  term_ar        TEXT,
  term_ar_guess  TEXT,
  head_chunk_id  TEXT,
  index_page_no  INTEGER,
  index_locator  TEXT,
  page_refs_json JSON NOT NULL CHECK (json_valid(page_refs_json)),
  variants_json  JSON CHECK (variants_json IS NULL OR json_valid(variants_json)),
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source),
  FOREIGN KEY (head_chunk_id) REFERENCES ar_source_chunks(chunk_id)
);

CREATE TABLE IF NOT EXISTS ar_u_lexicon_evidence (
  ar_u_lexicon        TEXT NOT NULL,
  evidence_id         TEXT NOT NULL,     -- sha256 canonical key

  -- Locator mode
  locator_type        TEXT NOT NULL DEFAULT 'chunk'
                      CHECK (locator_type IN ('chunk','app','url')),

  -- Source identity (optional for app mode)
  source_id           TEXT,
  source_type         TEXT NOT NULL DEFAULT 'book'
                      CHECK (source_type IN (
                        'book','tafsir','quran','hadith',
                        'paper','website','notes','app'
                      )),

  -- Chunk-based locator (optional)
  chunk_id            TEXT,
  page_no             INTEGER,
  heading_raw         TEXT,
  heading_norm        TEXT,

  -- URL-based locator (optional)
  url                 TEXT,

  -- App-native structured payload
  app_payload_json    TEXT CHECK (app_payload_json IS NULL OR json_valid(app_payload_json)),

  -- Evidence classification
  link_role           TEXT NOT NULL DEFAULT 'supports'
                      CHECK (link_role IN (
                        'headword','definition','usage','example',
                        'mentions','grouped_with','crossref_target',
                        'index_redirect','supports','disputes','variant'
                      )),

  evidence_kind       TEXT NOT NULL DEFAULT 'lexical'
                      CHECK (evidence_kind IN (
                        'lexical','morphological','semantic',
                        'thematic','valency','historical',
                        'comparative','editorial'
                      )),

  evidence_strength   TEXT NOT NULL DEFAULT 'supporting'
                      CHECK (evidence_strength IN (
                        'primary','supporting','contextual','weak'
                      )),

  -- Optional content
  extract_text        TEXT,
  note_md             TEXT,

  meta_json           TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,

  PRIMARY KEY (ar_u_lexicon, evidence_id),

  FOREIGN KEY (ar_u_lexicon)
    REFERENCES ar_u_lexicon(ar_u_lexicon)
    ON DELETE CASCADE,

  -- ----------------------------
  -- Locator Integrity Rules
  -- ----------------------------

  -- CHUNK mode: must have source_id + chunk_id
  CHECK (
    locator_type != 'chunk'
    OR (source_id IS NOT NULL AND chunk_id IS NOT NULL)
  ),

  -- URL mode: must have url
  CHECK (
    locator_type != 'url'
    OR url IS NOT NULL
  ),

  -- APP mode: must have structured payload
  CHECK (
    locator_type != 'app'
    OR app_payload_json IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_chunks_source_page
  ON ar_source_chunks(ar_u_source, page_no);

CREATE INDEX IF NOT EXISTS idx_chunks_source_heading
  ON ar_source_chunks(ar_u_source, heading_norm);

CREATE INDEX IF NOT EXISTS idx_chunks_source_type
  ON ar_source_chunks(ar_u_source, chunk_type);

CREATE INDEX IF NOT EXISTS idx_ar_source_toc_source_depth
  ON ar_source_toc(ar_u_source, depth);

CREATE INDEX IF NOT EXISTS idx_ar_source_toc_source_page
  ON ar_source_toc(ar_u_source, page_no);

CREATE INDEX IF NOT EXISTS idx_ar_source_index_source_norm
  ON ar_source_index(ar_u_source, term_norm);

CREATE INDEX IF NOT EXISTS idx_ar_source_index_source_page
  ON ar_source_index(ar_u_source, index_page_no);

CREATE INDEX IF NOT EXISTS idx_lex_ev_source_page
  ON ar_u_lexicon_evidence(source_id, page_no);

CREATE INDEX IF NOT EXISTS idx_lex_ev_chunk
  ON ar_u_lexicon_evidence(chunk_id);

CREATE TRIGGER IF NOT EXISTS trg_ar_u_lexicon_evidence_updated_at
AFTER UPDATE ON ar_u_lexicon_evidence
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon_evidence
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = NEW.ar_u_lexicon
    AND evidence_id = NEW.evidence_id;
END;

--------------------------------------------------------------------------------
-- FTS tables (contentful)
-- Rebuild on each migration execution to normalize earlier contentless variants.
--------------------------------------------------------------------------------

DROP TABLE IF EXISTS ar_source_chunks_fts;
DROP TABLE IF EXISTS ar_u_lexicon_evidence_fts;

CREATE VIRTUAL TABLE ar_source_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  source_code,
  heading_norm,
  text_search
);

CREATE VIRTUAL TABLE ar_u_lexicon_evidence_fts USING fts5(
  ar_u_lexicon UNINDEXED,
  evidence_id UNINDEXED,
  chunk_id UNINDEXED,
  source_code,
  extract_text,
  note_md
);

INSERT INTO ar_source_chunks_fts(chunk_id, source_code, heading_norm, text_search)
SELECT
  c.chunk_id,
  s.source_code,
  COALESCE(c.heading_norm, ''),
  COALESCE(c.text_search, c.text)
FROM ar_source_chunks c
JOIN ar_u_sources s ON s.ar_u_source = c.ar_u_source;

INSERT INTO ar_u_lexicon_evidence_fts(ar_u_lexicon, evidence_id, chunk_id, source_code, extract_text, note_md)
SELECT
  e.ar_u_lexicon,
  e.evidence_id,
  e.chunk_id,
  COALESCE(s.source_code, ''),
  COALESCE(e.extract_text, ''),
  COALESCE(e.note_md, '')
FROM ar_u_lexicon_evidence e
LEFT JOIN ar_u_sources s ON s.ar_u_source = e.source_id;
