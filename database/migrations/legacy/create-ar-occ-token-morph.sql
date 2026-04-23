CREATE TABLE IF NOT EXISTS ar_u_morphology (
  ar_u_morphology  TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  surface_ar       TEXT NOT NULL,
  surface_norm     TEXT NOT NULL,

  -- Codes (stable, hashed)
  pos2             TEXT NOT NULL CHECK (pos2 IN ('verb','noun','prep','particle')),
  derivation_type  TEXT CHECK (derivation_type IN ('jamid','mushtaq')),
  noun_number      TEXT CHECK (noun_number IN ('singular','plural','dual')),

  verb_form        TEXT CHECK (verb_form IN ('I','II','III','IV','V','VI','VII','VIII','IX','X')),

  derived_from_verb_form TEXT CHECK (
    derived_from_verb_form IN ('I','II','III','IV','V','VI','VII','VIII','IX','X')
  ),

  derived_pattern  TEXT CHECK (
    derived_pattern IN (
      'ism_fael','ism_mafool','masdar','sifah_mushabbahah','ism_mubalaghah',
      'ism_zaman','ism_makan','ism_ala','tafdeel','nisbah','other'
    )
  ),

  -- OPTIONAL but useful (still "global")
  transitivity     TEXT CHECK (transitivity IN ('lazim','mutaaddi','both')),
  obj_count        INTEGER CHECK (obj_count IS NULL OR obj_count BETWEEN 0 AND 3),

  -- UI tags (not hashed)
  tags_ar_json     JSON CHECK (tags_ar_json IS NULL OR json_valid(tags_ar_json)),
  tags_en_json     JSON CHECK (tags_en_json IS NULL OR json_valid(tags_en_json)),

  notes            TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_ar_u_morph_surface_norm ON ar_u_morphology(surface_norm);
CREATE INDEX IF NOT EXISTS idx_ar_u_morph_pos2         ON ar_u_morphology(pos2);
CREATE INDEX IF NOT EXISTS idx_ar_u_morph_pattern      ON ar_u_morphology(derived_pattern);
CREATE INDEX IF NOT EXISTS idx_ar_u_morph_verb_form    ON ar_u_morphology(verb_form);
