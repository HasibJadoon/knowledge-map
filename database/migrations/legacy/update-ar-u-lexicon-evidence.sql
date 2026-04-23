PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=TRUE;

-- This migration upgrades the legacy evidence table shape:
--   PK (ar_u_lexicon, chunk_id) + ar_u_source/notes/span_*
-- to:
--   PK (ar_u_lexicon, evidence_id) + locator model + note_md.
DROP TABLE IF EXISTS ar_u_lexicon_evidence__raw;
CREATE TABLE ar_u_lexicon_evidence__raw AS
SELECT * FROM ar_u_lexicon_evidence;

DROP TRIGGER IF EXISTS trg_ar_u_lexicon_evidence_updated_at;
DROP TABLE IF EXISTS ar_u_lexicon_evidence;

CREATE TABLE ar_u_lexicon_evidence (
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

WITH normalized AS (
  SELECT
    r.ar_u_lexicon,
    'legacy:' || COALESCE(NULLIF(trim(r.chunk_id), ''), r.ar_u_lexicon) AS evidence_id,
    'chunk' AS locator_type,
    COALESCE(NULLIF(trim(r.source_id), ''), c.ar_u_source) AS source_id,
    'book' AS source_type,
    NULLIF(trim(r.chunk_id), '') AS chunk_id,
    COALESCE(r.page_no, c.page_no) AS page_no,
    NULLIF(trim(c.heading_raw), '') AS heading_raw,
    NULLIF(trim(c.heading_norm), '') AS heading_norm,
    NULL AS url,
    NULL AS app_payload_json,
    CASE
      WHEN lower(trim(r.link_role)) IN (
        'headword','definition','usage','example',
        'mentions','grouped_with','crossref_target',
        'index_redirect','supports','disputes','variant'
      ) THEN lower(trim(r.link_role))
      WHEN lower(trim(r.link_role)) = 'verbal_idiom_note' THEN 'usage'
      ELSE 'supports'
    END AS link_role,
    'lexical' AS evidence_kind,
    'supporting' AS evidence_strength,
    r.extract_text AS extract_text,
    NULLIF(trim(r.note_md), '') AS note_md,
    CASE
      WHEN r.meta_json IS NULL OR length(trim(r.meta_json)) = 0 THEN NULL
      WHEN json_valid(r.meta_json) THEN r.meta_json
      ELSE json_quote(r.meta_json)
    END AS meta_json,
    COALESCE(NULLIF(trim(r.created_at), ''), datetime('now')) AS created_at,
    NULLIF(trim(r.updated_at), '') AS updated_at
  FROM ar_u_lexicon_evidence__raw r
  LEFT JOIN ar_source_chunks c
    ON c.chunk_id = r.chunk_id
)
INSERT INTO ar_u_lexicon_evidence (
  ar_u_lexicon,
  evidence_id,
  locator_type,
  source_id,
  source_type,
  chunk_id,
  page_no,
  heading_raw,
  heading_norm,
  url,
  app_payload_json,
  link_role,
  evidence_kind,
  evidence_strength,
  extract_text,
  note_md,
  meta_json,
  created_at,
  updated_at
)
SELECT
  ar_u_lexicon,
  evidence_id,
  locator_type,
  source_id,
  source_type,
  chunk_id,
  page_no,
  heading_raw,
  heading_norm,
  url,
  app_payload_json,
  link_role,
  evidence_kind,
  evidence_strength,
  extract_text,
  note_md,
  meta_json,
  created_at,
  updated_at
FROM normalized;

DROP TABLE IF EXISTS ar_u_lexicon_evidence__raw;

CREATE INDEX IF NOT EXISTS idx_lex_ev_source_page
  ON ar_u_lexicon_evidence(source_id, page_no);

CREATE INDEX IF NOT EXISTS idx_lex_ev_chunk
  ON ar_u_lexicon_evidence(chunk_id);

CREATE INDEX IF NOT EXISTS idx_lex_ev_locator_type
  ON ar_u_lexicon_evidence(locator_type);

CREATE INDEX IF NOT EXISTS idx_lex_ev_link_role
  ON ar_u_lexicon_evidence(link_role);

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

DROP TABLE IF EXISTS ar_u_lexicon_evidence_fts;
CREATE VIRTUAL TABLE ar_u_lexicon_evidence_fts USING fts5(
  ar_u_lexicon UNINDEXED,
  evidence_id UNINDEXED,
  chunk_id UNINDEXED,
  source_code,
  extract_text,
  note_md
);

INSERT INTO ar_u_lexicon_evidence_fts(ar_u_lexicon, evidence_id, chunk_id, source_code, extract_text, note_md)
SELECT
  e.ar_u_lexicon,
  e.evidence_id,
  e.chunk_id,
  COALESCE(s.source_code, ''),
  COALESCE(e.extract_text, ''),
  COALESCE(e.note_md, '')
FROM ar_u_lexicon_evidence e
LEFT JOIN ar_u_sources s
  ON s.ar_u_source = e.source_id;

PRAGMA foreign_keys=ON;
