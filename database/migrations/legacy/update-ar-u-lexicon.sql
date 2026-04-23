PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=TRUE;

-- Bootstrap for clean installs: if the table does not exist yet, create a
-- compatible shell so the copy/rebuild path below is always safe.
CREATE TABLE IF NOT EXISTS ar_u_lexicon (
  ar_u_lexicon           TEXT PRIMARY KEY,
  canonical_input        TEXT NOT NULL UNIQUE,
  unit_type              TEXT NOT NULL DEFAULT 'word',
  surface_ar             TEXT NOT NULL DEFAULT '',
  surface_norm           TEXT NOT NULL DEFAULT '',
  lemma_ar               TEXT,
  lemma_norm             TEXT,
  pos                    TEXT,
  root_norm              TEXT,
  ar_u_root              TEXT,
  valency_id             TEXT,
  sense_key              TEXT NOT NULL DEFAULT '',
  meanings_json          TEXT,
  synonyms_json          TEXT,
  antonyms_json          TEXT,
  gloss_primary          TEXT,
  gloss_secondary_json   TEXT,
  usage_notes            TEXT,
  morph_pattern          TEXT,
  morph_features_json    TEXT,
  morph_derivations_json TEXT,
  expression_type        TEXT,
  expression_text        TEXT,
  expression_token_range_json TEXT,
  expression_meaning     TEXT,
  references_json        TEXT,
  flags_json             TEXT,
  cards_json             TEXT,
  meta_json              TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT
);

DROP TABLE IF EXISTS ar_u_lexicon__raw;
CREATE TABLE ar_u_lexicon__raw AS
SELECT * FROM ar_u_lexicon;

DROP TRIGGER IF EXISTS trg_ar_u_lexicon_updated_at;
DROP TABLE IF EXISTS ar_u_lexicon;

CREATE TABLE ar_u_lexicon (
  ar_u_lexicon         TEXT PRIMARY KEY,
  canonical_input      TEXT NOT NULL UNIQUE,

  -- Type
  unit_type            TEXT NOT NULL
                       CHECK (unit_type IN ('word','key_term','verbal_idiom','expression')),

  -- Representative surface (single word OR representative form for expression)
  surface_ar           TEXT NOT NULL,
  surface_norm         TEXT NOT NULL,

  -- Core lexeme identity (mostly for unit_type='word'/'key_term')
  lemma_ar             TEXT,
  lemma_norm           TEXT,
  pos                  TEXT,

  -- Root linkage
  root_norm            TEXT,
  ar_u_root            TEXT,

  -- Sense partitioning
  valency_id           TEXT,
  sense_key            TEXT NOT NULL,

  -- Meanings / synonyms / antonyms (store as TEXT; JSON validity enforced)
  meanings_json        TEXT CHECK (meanings_json IS NULL OR json_valid(meanings_json)),
  synonyms_json        TEXT CHECK (synonyms_json IS NULL OR json_valid(synonyms_json)),
  antonyms_json        TEXT CHECK (antonyms_json IS NULL OR json_valid(antonyms_json)),

  -- Convenience gloss fields
  gloss_primary        TEXT,
  gloss_secondary_json TEXT CHECK (gloss_secondary_json IS NULL OR json_valid(gloss_secondary_json)),
  usage_notes          TEXT,

  -- Morphology
  morph_pattern        TEXT,
  morph_features_json  TEXT CHECK (morph_features_json IS NULL OR json_valid(morph_features_json)),
  morph_derivations_json TEXT CHECK (morph_derivations_json IS NULL OR json_valid(morph_derivations_json)),

  -- Expression block (only for unit_type IN ('expression','verbal_idiom'))
  expression_type      TEXT,
  expression_text      TEXT,
  expression_token_range_json TEXT CHECK (expression_token_range_json IS NULL OR json_valid(expression_token_range_json)),
  expression_meaning   TEXT,

  -- References + flags
  references_json      TEXT CHECK (references_json IS NULL OR json_valid(references_json)),
  flags_json           TEXT CHECK (flags_json IS NULL OR json_valid(flags_json)),

  -- Payload buckets
  cards_json           TEXT CHECK (cards_json IS NULL OR json_valid(cards_json)),
  meta_json            TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),

  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('draft','active','deprecated')),

  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT,

  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL,

  -- ----------------------------
  -- Integrity rules (critical)
  -- ----------------------------

  -- If expression/idiom: must have expression_text
  CHECK (
    unit_type NOT IN ('expression','verbal_idiom')
    OR (expression_text IS NOT NULL AND length(trim(expression_text)) > 0)
  ),

  -- If NOT expression/idiom: expression fields must be NULL
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      expression_type IS NULL
      AND expression_text IS NULL
      AND expression_token_range_json IS NULL
      AND expression_meaning IS NULL
    )
  ),

  -- For word/key_term: require lemma_norm or root_norm
  CHECK (
    unit_type IN ('expression','verbal_idiom')
    OR (
      (lemma_norm IS NOT NULL AND length(trim(lemma_norm)) > 0)
      OR (root_norm IS NOT NULL AND length(trim(root_norm)) > 0)
    )
  )
);

WITH base AS (
  SELECT
    ar_u_lexicon,
    CASE
      WHEN canonical_input IS NOT NULL AND length(trim(canonical_input)) > 0 THEN trim(canonical_input)
      ELSE 'lexicon|migrated|' || ar_u_lexicon
    END AS canonical_input_raw,
    CASE
      WHEN lower(trim(unit_type)) IN ('word','key_term','verbal_idiom','expression') THEN lower(trim(unit_type))
      WHEN expression_text IS NOT NULL AND length(trim(expression_text)) > 0 THEN 'expression'
      ELSE 'word'
    END AS unit_type_raw,
    COALESCE(
      NULLIF(trim(surface_ar), ''),
      NULLIF(trim(expression_text), ''),
      NULLIF(trim(lemma_ar), ''),
      NULLIF(trim(gloss_primary), ''),
      '[' || ar_u_lexicon || ']'
    ) AS surface_ar_raw,
    COALESCE(
      NULLIF(trim(surface_norm), ''),
      NULLIF(trim(lemma_norm), ''),
      NULLIF(trim(root_norm), ''),
      lower(
        COALESCE(
          NULLIF(trim(surface_ar), ''),
          NULLIF(trim(expression_text), ''),
          NULLIF(trim(lemma_ar), ''),
          NULLIF(trim(gloss_primary), ''),
          ar_u_lexicon
        )
      )
    ) AS surface_norm_raw,
    NULLIF(trim(lemma_ar), '') AS lemma_ar_raw,
    NULLIF(trim(lemma_norm), '') AS lemma_norm_raw,
    NULLIF(trim(pos), '') AS pos_raw,
    NULLIF(trim(root_norm), '') AS root_norm_raw,
    NULLIF(trim(ar_u_root), '') AS ar_u_root_raw,
    NULLIF(trim(valency_id), '') AS valency_id_raw,
    CASE
      WHEN sense_key IS NOT NULL AND length(trim(sense_key)) > 0 THEN trim(sense_key)
      WHEN canonical_input IS NOT NULL AND length(trim(canonical_input)) > 0 THEN trim(canonical_input)
      ELSE 'sense|' || ar_u_lexicon
    END AS sense_key_raw,
    meanings_json AS meanings_json_raw,
    synonyms_json AS synonyms_json_raw,
    antonyms_json AS antonyms_json_raw,
    NULLIF(trim(gloss_primary), '') AS gloss_primary_raw,
    gloss_secondary_json AS gloss_secondary_json_raw,
    NULLIF(trim(usage_notes), '') AS usage_notes_raw,
    NULLIF(trim(morph_pattern), '') AS morph_pattern_raw,
    morph_features_json AS morph_features_json_raw,
    morph_derivations_json AS morph_derivations_json_raw,
    NULLIF(trim(expression_type), '') AS expression_type_raw,
    NULLIF(trim(expression_text), '') AS expression_text_raw,
    expression_token_range_json AS expression_token_range_json_raw,
    NULLIF(trim(expression_meaning), '') AS expression_meaning_raw,
    references_json AS references_json_raw,
    flags_json AS flags_json_raw,
    cards_json AS cards_json_raw,
    meta_json AS meta_json_raw,
    CASE
      WHEN lower(trim(status)) IN ('draft','active','deprecated') THEN lower(trim(status))
      ELSE 'active'
    END AS status_raw,
    COALESCE(NULLIF(trim(created_at), ''), datetime('now')) AS created_at_raw,
    NULLIF(trim(updated_at), '') AS updated_at_raw
  FROM ar_u_lexicon__raw
),
normalized AS (
  SELECT
    ar_u_lexicon,
    canonical_input_raw AS canonical_input_prepared,
    unit_type_raw AS unit_type_prepared,
    surface_ar_raw AS surface_ar_prepared,
    surface_norm_raw AS surface_norm_prepared,
    lemma_ar_raw AS lemma_ar_prepared,
    CASE
      WHEN unit_type_raw IN ('word','key_term') AND lemma_norm_raw IS NULL AND root_norm_raw IS NULL THEN surface_norm_raw
      ELSE lemma_norm_raw
    END AS lemma_norm_prepared,
    pos_raw AS pos_prepared,
    root_norm_raw AS root_norm_prepared,
    ar_u_root_raw AS ar_u_root_prepared,
    valency_id_raw AS valency_id_prepared,
    sense_key_raw AS sense_key_prepared,
    meanings_json_raw,
    synonyms_json_raw,
    antonyms_json_raw,
    gloss_primary_raw,
    gloss_secondary_json_raw,
    usage_notes_raw,
    morph_pattern_raw,
    morph_features_json_raw,
    morph_derivations_json_raw,
    CASE
      WHEN unit_type_raw IN ('expression','verbal_idiom') THEN COALESCE(expression_type_raw, unit_type_raw)
      ELSE NULL
    END AS expression_type_prepared,
    CASE
      WHEN unit_type_raw IN ('expression','verbal_idiom') THEN COALESCE(expression_text_raw, surface_ar_raw)
      ELSE NULL
    END AS expression_text_prepared,
    CASE
      WHEN unit_type_raw IN ('expression','verbal_idiom') THEN expression_token_range_json_raw
      ELSE NULL
    END AS expression_token_range_json_prepared,
    CASE
      WHEN unit_type_raw IN ('expression','verbal_idiom') THEN COALESCE(expression_meaning_raw, gloss_primary_raw)
      ELSE NULL
    END AS expression_meaning_prepared,
    references_json_raw,
    flags_json_raw,
    cards_json_raw,
    meta_json_raw,
    status_raw AS status_prepared,
    created_at_raw AS created_at_prepared,
    updated_at_raw AS updated_at_prepared
  FROM base
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY canonical_input_prepared
      ORDER BY ar_u_lexicon
    ) AS canonical_dup_rank,
    ROW_NUMBER() OVER (
      PARTITION BY sense_key_prepared, ifnull(valency_id_prepared, '')
      ORDER BY ar_u_lexicon
    ) AS sense_dup_rank
  FROM normalized
)
INSERT INTO ar_u_lexicon (
  ar_u_lexicon,
  canonical_input,
  unit_type,
  surface_ar,
  surface_norm,
  lemma_ar,
  lemma_norm,
  pos,
  root_norm,
  ar_u_root,
  valency_id,
  sense_key,
  meanings_json,
  synonyms_json,
  antonyms_json,
  gloss_primary,
  gloss_secondary_json,
  usage_notes,
  morph_pattern,
  morph_features_json,
  morph_derivations_json,
  expression_type,
  expression_text,
  expression_token_range_json,
  expression_meaning,
  references_json,
  flags_json,
  cards_json,
  meta_json,
  status,
  created_at,
  updated_at
)
SELECT
  ar_u_lexicon,
  CASE
    WHEN canonical_dup_rank = 1 THEN canonical_input_prepared
    ELSE canonical_input_prepared || '|dup|' || ar_u_lexicon
  END AS canonical_input,
  unit_type_prepared,
  surface_ar_prepared,
  surface_norm_prepared,
  lemma_ar_prepared,
  lemma_norm_prepared,
  pos_prepared,
  root_norm_prepared,
  ar_u_root_prepared,
  CASE
    WHEN sense_dup_rank = 1 THEN valency_id_prepared
    WHEN valency_id_prepared IS NULL THEN '__dup|' || ar_u_lexicon
    ELSE valency_id_prepared || '#dup|' || CAST(sense_dup_rank AS TEXT)
  END AS valency_id,
  sense_key_prepared,
  CASE
    WHEN meanings_json_raw IS NULL OR length(trim(meanings_json_raw)) = 0 THEN NULL
    WHEN json_valid(meanings_json_raw) THEN meanings_json_raw
    ELSE json_quote(meanings_json_raw)
  END AS meanings_json,
  CASE
    WHEN synonyms_json_raw IS NULL OR length(trim(synonyms_json_raw)) = 0 THEN NULL
    WHEN json_valid(synonyms_json_raw) THEN synonyms_json_raw
    ELSE json_quote(synonyms_json_raw)
  END AS synonyms_json,
  CASE
    WHEN antonyms_json_raw IS NULL OR length(trim(antonyms_json_raw)) = 0 THEN NULL
    WHEN json_valid(antonyms_json_raw) THEN antonyms_json_raw
    ELSE json_quote(antonyms_json_raw)
  END AS antonyms_json,
  gloss_primary_raw,
  CASE
    WHEN gloss_secondary_json_raw IS NULL OR length(trim(gloss_secondary_json_raw)) = 0 THEN NULL
    WHEN json_valid(gloss_secondary_json_raw) THEN gloss_secondary_json_raw
    ELSE json_quote(gloss_secondary_json_raw)
  END AS gloss_secondary_json,
  usage_notes_raw,
  morph_pattern_raw,
  CASE
    WHEN morph_features_json_raw IS NULL OR length(trim(morph_features_json_raw)) = 0 THEN NULL
    WHEN json_valid(morph_features_json_raw) THEN morph_features_json_raw
    ELSE json_quote(morph_features_json_raw)
  END AS morph_features_json,
  CASE
    WHEN morph_derivations_json_raw IS NULL OR length(trim(morph_derivations_json_raw)) = 0 THEN NULL
    WHEN json_valid(morph_derivations_json_raw) THEN morph_derivations_json_raw
    ELSE json_quote(morph_derivations_json_raw)
  END AS morph_derivations_json,
  expression_type_prepared,
  expression_text_prepared,
  CASE
    WHEN expression_token_range_json_prepared IS NULL OR length(trim(expression_token_range_json_prepared)) = 0 THEN NULL
    WHEN json_valid(expression_token_range_json_prepared) THEN expression_token_range_json_prepared
    ELSE json_quote(expression_token_range_json_prepared)
  END AS expression_token_range_json,
  expression_meaning_prepared,
  CASE
    WHEN references_json_raw IS NULL OR length(trim(references_json_raw)) = 0 THEN NULL
    WHEN json_valid(references_json_raw) THEN references_json_raw
    ELSE json_quote(references_json_raw)
  END AS references_json,
  CASE
    WHEN flags_json_raw IS NULL OR length(trim(flags_json_raw)) = 0 THEN NULL
    WHEN json_valid(flags_json_raw) THEN flags_json_raw
    ELSE json_quote(flags_json_raw)
  END AS flags_json,
  CASE
    WHEN cards_json_raw IS NULL OR length(trim(cards_json_raw)) = 0 THEN NULL
    WHEN json_valid(cards_json_raw) THEN cards_json_raw
    ELSE json_quote(cards_json_raw)
  END AS cards_json,
  CASE
    WHEN meta_json_raw IS NULL OR length(trim(meta_json_raw)) = 0 THEN NULL
    WHEN json_valid(meta_json_raw) THEN meta_json_raw
    ELSE json_quote(meta_json_raw)
  END AS meta_json,
  status_prepared,
  created_at_prepared,
  updated_at_prepared
FROM ranked;

DROP TABLE IF EXISTS ar_u_lexicon__raw;

-- UI/search indexes
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

-- SQLite-compatible equivalent of UNIQUE (sense_key, ifnull(valency_id,'')).
CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_u_lexicon_sense_valency
  ON ar_u_lexicon(sense_key, ifnull(valency_id, ''));

-- Keep updated_at in sync with row updates.
CREATE TRIGGER IF NOT EXISTS trg_ar_u_lexicon_updated_at
AFTER UPDATE ON ar_u_lexicon
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lexicon
  SET updated_at = datetime('now')
  WHERE ar_u_lexicon = NEW.ar_u_lexicon;
END;

PRAGMA foreign_keys=ON;
