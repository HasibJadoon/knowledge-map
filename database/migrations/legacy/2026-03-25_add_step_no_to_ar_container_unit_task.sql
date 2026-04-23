ALTER TABLE ar_container_unit_task
ADD COLUMN step_no INTEGER;

CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_step
  ON ar_container_unit_task(unit_id, step_no, task_id);

UPDATE ar_container_unit_task
SET step_no = CASE task_type
  WHEN 'reading' THEN 100
  WHEN 'morphology' THEN 200
  WHEN 'sentence_structure' THEN 300
  WHEN 'expressions' THEN 400
  WHEN 'comprehension' THEN 500
  WHEN 'passage_structure' THEN 600
  WHEN 'grammar_concepts' THEN 700
  WHEN 'worldview' THEN 800
  WHEN 'translation_semantics' THEN 900
  WHEN 'near_synonyms' THEN 1000
  WHEN 'surah_analysis' THEN 1100
  WHEN 'cross_corpus' THEN 1200
  WHEN 'children_lesson' THEN 1300
  ELSE 99000
END
WHERE parent_task_id IS NULL
  AND step_no IS NULL;
