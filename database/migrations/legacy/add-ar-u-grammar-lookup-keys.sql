-- lookup_keys_json and canonical_norm are now in base schema.
-- Keep this migration idempotent by only ensuring supporting indexes.

CREATE INDEX IF NOT EXISTS idx_ar_u_grammar_canonical_norm
  ON ar_u_grammar(canonical_norm);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ar_u_grammar_canonical_norm
  ON ar_u_grammar(canonical_norm)
  WHERE canonical_norm IS NOT NULL AND canonical_norm <> '';
