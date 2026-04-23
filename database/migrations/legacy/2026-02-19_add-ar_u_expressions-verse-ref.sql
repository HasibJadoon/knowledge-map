ALTER TABLE ar_u_expressions
  ADD COLUMN surah INTEGER;

ALTER TABLE ar_u_expressions
  ADD COLUMN ayah INTEGER;

CREATE INDEX IF NOT EXISTS idx_ar_u_expressions_ref
  ON ar_u_expressions(surah, ayah);

UPDATE ar_u_expressions
SET
  surah = COALESCE(surah, CAST(json_extract(meta_json, '$.surah') AS INTEGER)),
  ayah = COALESCE(ayah, CAST(json_extract(meta_json, '$.ayah') AS INTEGER))
WHERE meta_json IS NOT NULL
  AND json_valid(meta_json)
  AND (surah IS NULL OR ayah IS NULL);
