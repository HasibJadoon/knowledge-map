PRAGMA foreign_keys = ON;

-- Restore core lexicon tables that were dropped by drop-ar-occ-universal.sql.
-- This restores schema integrity (data restoration requires Time Travel restore).

CREATE TABLE IF NOT EXISTS ar_u_roots (
  ar_u_root        TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  root             TEXT NOT NULL,
  root_norm        TEXT NOT NULL UNIQUE,
  arabic_trilateral TEXT,
  english_trilateral TEXT,
  root_latn         TEXT,
  alt_latn_json     JSON CHECK (alt_latn_json IS NULL OR json_valid(alt_latn_json)),
  search_keys_norm  TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  difficulty        INTEGER,
  frequency         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  extracted_at      TEXT,
  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json))
);

CREATE INDEX IF NOT EXISTS idx_ar_u_roots_root_norm ON ar_u_roots(root_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_roots_root ON ar_u_roots(root);

CREATE TABLE IF NOT EXISTS ar_u_lexicon (
  ar_u_lexicon         TEXT PRIMARY KEY,
  canonical_input      TEXT NOT NULL UNIQUE,
  unit_type            TEXT NOT NULL
                       CHECK (unit_type IN ('word','key_term','verbal_idiom','expression')),
  surface_ar           TEXT NOT NULL,
  surface_norm         TEXT NOT NULL,
  lemma_ar             TEXT,
  lemma_norm           TEXT,
  pos                  TEXT,
  root_norm            TEXT,
  ar_u_root            TEXT,
  valency_id           TEXT,
  sense_key            TEXT NOT NULL,
  meanings_json        TEXT CHECK (meanings_json IS NULL OR json_valid(meanings_json)),
  synonyms_json        TEXT CHECK (synonyms_json IS NULL OR json_valid(synonyms_json)),
  antonyms_json        TEXT CHECK (antonyms_json IS NULL OR json_valid(antonyms_json)),
  gloss_primary        TEXT,
  gloss_secondary_json TEXT CHECK (gloss_secondary_json IS NULL OR json_valid(gloss_secondary_json)),
  usage_notes          TEXT,
  morph_pattern        TEXT,
  morph_features_json  TEXT CHECK (morph_features_json IS NULL OR json_valid(morph_features_json)),
  morph_derivations_json TEXT CHECK (morph_derivations_json IS NULL OR json_valid(morph_derivations_json)),
  expression_type      TEXT,
  expression_text      TEXT,
  expression_token_range_json TEXT CHECK (expression_token_range_json IS NULL OR json_valid(expression_token_range_json)),
  expression_meaning   TEXT,
  references_json      TEXT CHECK (references_json IS NULL OR json_valid(references_json)),
  flags_json           TEXT CHECK (flags_json IS NULL OR json_valid(flags_json)),
  cards_json           TEXT CHECK (cards_json IS NULL OR json_valid(cards_json)),
  meta_json            TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('draft','active','deprecated')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT,
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL,
  CHECK (
    unit_type NOT IN ('expression','verbal_idiom')
    OR (expression_text IS NOT NULL AND length(trim(expression_text)) > 0)
  ),
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      expression_type IS NULL
      AND expression_text IS NULL
      AND expression_token_range_json IS NULL
      AND expression_meaning IS NULL
    )
  ),
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      (lemma_norm IS NOT NULL AND length(trim(lemma_norm)) > 0)
      OR (root_norm IS NOT NULL AND length(trim(root_norm)) > 0)
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_surface_norm
  ON ar_u_lexicon(surface_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_lemma_norm
  ON ar_u_lexicon(lemma_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_root_norm
  ON ar_u_lexicon(root_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_unit_type
  ON ar_u_lexicon(unit_type);
CREATE INDEX IF NOT EXISTS idx_ar_u_lexicon_ar_u_root
  ON ar_u_lexicon(ar_u_root);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_u_lexicon_sense_valency
  ON ar_u_lexicon(sense_key, ifnull(valency_id, ''));

CREATE TRIGGER IF NOT EXISTS trg_ar_u_lexicon_updated_at
AFTER UPDATE ON ar_u_lexicon
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = NEW.ar_u_lexicon;
END;
