ALTER TABLE ar_u_expressions
  ADD COLUMN ar_u_lexicon TEXT
  REFERENCES ar_u_lexicon(ar_u_lexicon)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ar_u_expressions_lexicon
  ON ar_u_expressions(ar_u_lexicon);
