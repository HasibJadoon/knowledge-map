CREATE TABLE IF NOT EXISTS ar_occ_token_morph (
  ar_token_occ_id    TEXT PRIMARY KEY,

  pos                TEXT,

  noun_case          TEXT,
  noun_number        TEXT,
  noun_gender        TEXT,
  noun_definiteness  TEXT,

  verb_tense         TEXT,
  verb_mood          TEXT,
  verb_voice         TEXT,
  verb_person        TEXT,
  verb_number        TEXT,
  verb_gender        TEXT,

  particle_type      TEXT,

  extra_json         JSON CHECK (extra_json IS NULL OR json_valid(extra_json)),

  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_occ_token_morph_pos ON ar_occ_token_morph(pos);
