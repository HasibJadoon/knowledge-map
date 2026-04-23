PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS ar_u_lexicon_evidence (
  ar_u_lexicon        TEXT NOT NULL,
  evidence_id         TEXT NOT NULL,

  locator_type        TEXT NOT NULL DEFAULT 'chunk'
                      CHECK (locator_type IN ('chunk','app','url')),

  source_id           TEXT,
  source_type         TEXT NOT NULL DEFAULT 'book'
                      CHECK (source_type IN (
                        'book','tafsir','quran','hadith',
                        'paper','website','notes','app'
                      )),

  chunk_id            TEXT,
  page_no             INTEGER,
  heading_raw         TEXT,
  heading_norm        TEXT,

  url                 TEXT,

  app_payload_json    TEXT CHECK (app_payload_json IS NULL OR json_valid(app_payload_json)),

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

  extract_text        TEXT,
  note_md             TEXT,

  meta_json           TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT,

  PRIMARY KEY (ar_u_lexicon, evidence_id),

  FOREIGN KEY (ar_u_lexicon)
    REFERENCES ar_u_lexicon(ar_u_lexicon)
    ON DELETE CASCADE,

  CHECK (
    locator_type != 'chunk'
    OR (source_id IS NOT NULL AND chunk_id IS NOT NULL)
  ),

  CHECK (
    locator_type != 'url'
    OR url IS NOT NULL
  ),

  CHECK (
    locator_type != 'app'
    OR app_payload_json IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS ar_u_lexicon_morphology (
  ar_u_lexicon    TEXT NOT NULL,
  ar_u_morphology TEXT NOT NULL,

  link_role       TEXT NOT NULL DEFAULT 'primary'
    CHECK (link_role IN ('primary','inflection','derived','variant')),

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ar_u_lexicon, ar_u_morphology),
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_morphology) REFERENCES ar_u_morphology(ar_u_morphology) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lex_ev_source_page
  ON ar_u_lexicon_evidence(source_id, page_no);

CREATE INDEX IF NOT EXISTS idx_lex_ev_chunk
  ON ar_u_lexicon_evidence(chunk_id);

CREATE INDEX IF NOT EXISTS idx_lex_ev_locator_type
  ON ar_u_lexicon_evidence(locator_type);

CREATE INDEX IF NOT EXISTS idx_lex_ev_link_role
  ON ar_u_lexicon_evidence(link_role);

CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_morph_morph
  ON ar_u_lexicon_morphology(ar_u_morphology);

CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_morph_role
  ON ar_u_lexicon_morphology(link_role);
