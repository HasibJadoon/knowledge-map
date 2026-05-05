-- 0009_lexicon_entries_from_chunks.sql
-- Promote classical lexical source chunks into canonical lexicon entries.
--
-- ar_ling_source_chunks remains the source text table for page/chunk navigation.
-- ar_ling_lexicon_entries becomes the major structured lexicon table, with direct
-- source, locator, root, and embedding columns so every imported lexicon source
-- can be queried from one place.

ALTER TABLE ar_ling_lexicon_entries ADD COLUMN root_id TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN source_id TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN source_slug TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN source_chunk_id TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN entry_kind TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN heading_norm TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN source_entry_seq INTEGER;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN page_no INTEGER;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN volume_no INTEGER;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN tokens_approx INTEGER;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN title_ar TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN title_en TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN display_heading_ar TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN display_heading_en TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN heading_key TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN lemma_text TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN root_text TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN transliteration TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN pos_tag TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN gloss_ar TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN gloss_en TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN summary_ar TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN summary_en TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN source_url TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN is_embedded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN qdrant_id TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN embed_model TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN semantic_field TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN related_lemmas JSON CHECK (related_lemmas IS NULL OR json_valid(related_lemmas));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN sense_json JSON CHECK (sense_json IS NULL OR json_valid(sense_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN morphology_json JSON CHECK (morphology_json IS NULL OR json_valid(morphology_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN examples_json JSON CHECK (examples_json IS NULL OR json_valid(examples_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN citations_json JSON CHECK (citations_json IS NULL OR json_valid(citations_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN ui_json JSON CHECK (ui_json IS NULL OR json_valid(ui_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN ai_json JSON CHECK (ai_json IS NULL OR json_valid(ai_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN cleaner_json JSON CHECK (cleaner_json IS NULL OR json_valid(cleaner_json));
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'raw_promoted';
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN quality_score REAL;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN ai_fill_state TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN ai_model TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN ai_filled_at TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN reviewed_at TEXT;
ALTER TABLE ar_ling_lexicon_entries ADD COLUMN sort_key TEXT;

CREATE INDEX IF NOT EXISTS idx_arl_le_root
  ON ar_ling_lexicon_entries(root_id);

CREATE INDEX IF NOT EXISTS idx_arl_le_source
  ON ar_ling_lexicon_entries(source_id);

CREATE INDEX IF NOT EXISTS idx_arl_le_source_slug
  ON ar_ling_lexicon_entries(source_slug);

CREATE UNIQUE INDEX IF NOT EXISTS ux_arl_le_source_chunk
  ON ar_ling_lexicon_entries(source_chunk_id)
  WHERE source_chunk_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_arl_le_heading
  ON ar_ling_lexicon_entries(heading_norm);

CREATE INDEX IF NOT EXISTS idx_arl_le_heading_key
  ON ar_ling_lexicon_entries(heading_key);

CREATE INDEX IF NOT EXISTS idx_arl_le_heading_source
  ON ar_ling_lexicon_entries(heading_norm, source_slug);

CREATE INDEX IF NOT EXISTS idx_arl_le_status
  ON ar_ling_lexicon_entries(status);

CREATE INDEX IF NOT EXISTS idx_arl_le_ai_fill_state
  ON ar_ling_lexicon_entries(ai_fill_state);

CREATE INDEX IF NOT EXISTS idx_arl_le_sort_key
  ON ar_ling_lexicon_entries(sort_key);

CREATE INDEX IF NOT EXISTS idx_arl_le_embedded
  ON ar_ling_lexicon_entries(is_embedded);

CREATE INDEX IF NOT EXISTS idx_arl_le_qdrant
  ON ar_ling_lexicon_entries(qdrant_id);

INSERT OR IGNORE INTO ar_ling_lemmas (
  id,
  root_id,
  lemma_text,
  lemma_text_bare,
  part_of_speech,
  is_quran_word,
  frequency_quran,
  note_md
)
SELECT
  'LEM:LEX:' || c.heading_norm AS id,
  MIN(NULLIF(c.root_id, '')) AS root_id,
  c.heading_norm AS lemma_text,
  c.heading_norm AS lemma_text_bare,
  CASE
    WHEN c.chunk_kind = 'lexical_word_entry' THEN 'lexical_word'
    ELSE 'root_entry'
  END AS part_of_speech,
  0 AS is_quran_word,
  0 AS frequency_quran,
  'Backfilled from lexical source chunks by 0009_lexicon_entries_from_chunks.'
FROM ar_ling_source_chunks c
WHERE c.chunk_kind IN ('lexical_entry', 'lexical_word_entry')
  AND c.heading_norm IS NOT NULL
  AND trim(c.heading_norm) != ''
GROUP BY c.heading_norm, c.chunk_kind;

INSERT INTO ar_ling_lexicon_entries (
  id,
  lemma_id,
  entry_text,
  definition_ar,
  definition_en,
  definition_source,
  usage_register,
  note_md,
  root_id,
  source_id,
  source_slug,
  source_chunk_id,
  entry_kind,
  heading_norm,
  source_entry_seq,
  page_no,
  volume_no,
  tokens_approx,
  title_ar,
  title_en,
  display_heading_ar,
  display_heading_en,
  heading_key,
  lemma_text,
  root_text,
  transliteration,
  pos_tag,
  gloss_ar,
  gloss_en,
  summary_ar,
  summary_en,
  source_url,
  is_embedded,
  qdrant_id,
  embed_model,
  meta_json,
  semantic_field,
  related_lemmas,
  sense_json,
  morphology_json,
  examples_json,
  citations_json,
  ui_json,
  ai_json,
  cleaner_json,
  status,
  quality_score,
  ai_fill_state,
  ai_model,
  ai_filled_at,
  reviewed_at,
  sort_key
)
SELECT
  'LEX:' || c.id AS id,
  'LEM:LEX:' || c.heading_norm AS lemma_id,
  c.heading_norm AS entry_text,
  c.text_ar AS definition_ar,
  COALESCE(
    NULLIF(trim(c.text_en), ''),
    '[Arabic lexical source entry: ' || c.heading_norm || ']'
  ) AS definition_en,
  COALESCE(NULLIF(trim(s.title_en), ''), NULLIF(trim(c.source_slug), ''), c.source_id) AS definition_source,
  'classical' AS usage_register,
  'Promoted from ar_ling_source_chunks by 0009_lexicon_entries_from_chunks.' AS note_md,
  NULLIF(c.root_id, '') AS root_id,
  c.source_id,
  c.source_slug,
  c.id AS source_chunk_id,
  c.chunk_kind AS entry_kind,
  c.heading_norm,
  c.chunk_seq AS source_entry_seq,
  c.page_no,
  c.volume_no,
  c.tokens_approx,
  c.heading_norm AS title_ar,
  NULL AS title_en,
  c.heading_norm AS display_heading_ar,
  NULL AS display_heading_en,
  lower(c.heading_norm) AS heading_key,
  c.heading_norm AS lemma_text,
  COALESCE(NULLIF(r.root_text, ''), NULLIF(c.heading_norm, '')) AS root_text,
  r.simple_lat AS transliteration,
  CASE
    WHEN c.chunk_kind = 'lexical_word_entry' THEN 'lexical_word'
    ELSE 'root_entry'
  END AS pos_tag,
  NULL AS gloss_ar,
  NULL AS gloss_en,
  NULL AS summary_ar,
  NULL AS summary_en,
  json_extract(c.meta_json, '$.source_url') AS source_url,
  COALESCE(c.is_embedded, 0) AS is_embedded,
  c.qdrant_id,
  CASE WHEN c.qdrant_id IS NOT NULL THEN 'legacy_chunk_embedding' ELSE NULL END AS embed_model,
  c.meta_json,
  NULL AS semantic_field,
  NULL AS related_lemmas,
  NULL AS sense_json,
  NULL AS morphology_json,
  NULL AS examples_json,
  json_object(
    'source_id', c.source_id,
    'source_slug', c.source_slug,
    'source_chunk_id', c.id,
    'page_no', c.page_no,
    'volume_no', c.volume_no
  ) AS citations_json,
  json_object(
    'kind', c.chunk_kind,
    'heading', c.heading_norm,
    'source_slug', c.source_slug,
    'page_no', c.page_no,
    'volume_no', c.volume_no
  ) AS ui_json,
  NULL AS ai_json,
  json_object(
    'promoted_by', '0009_lexicon_entries_from_chunks',
    'needs_ai_cleaning', 1,
    'source_text_column', 'definition_ar'
  ) AS cleaner_json,
  'raw_promoted' AS status,
  NULL AS quality_score,
  'pending' AS ai_fill_state,
  NULL AS ai_model,
  NULL AS ai_filled_at,
  NULL AS reviewed_at,
  printf('%s:%010d:%s', COALESCE(c.source_slug, c.source_id), COALESCE(c.chunk_seq, 0), c.heading_norm) AS sort_key
FROM ar_ling_source_chunks c
LEFT JOIN ar_ling_sources s ON s.id = c.source_id
LEFT JOIN ar_ling_roots r ON r.id = c.root_id
WHERE c.chunk_kind IN ('lexical_entry', 'lexical_word_entry')
  AND c.heading_norm IS NOT NULL
  AND trim(c.heading_norm) != ''
ON CONFLICT(id) DO UPDATE SET
  lemma_id = excluded.lemma_id,
  entry_text = excluded.entry_text,
  definition_ar = excluded.definition_ar,
  definition_en = excluded.definition_en,
  definition_source = excluded.definition_source,
  usage_register = excluded.usage_register,
  root_id = excluded.root_id,
  source_id = excluded.source_id,
  source_slug = excluded.source_slug,
  source_chunk_id = excluded.source_chunk_id,
  entry_kind = excluded.entry_kind,
  heading_norm = excluded.heading_norm,
  source_entry_seq = excluded.source_entry_seq,
  page_no = excluded.page_no,
  volume_no = excluded.volume_no,
  tokens_approx = excluded.tokens_approx,
  title_ar = excluded.title_ar,
  title_en = excluded.title_en,
  display_heading_ar = excluded.display_heading_ar,
  display_heading_en = excluded.display_heading_en,
  heading_key = excluded.heading_key,
  lemma_text = excluded.lemma_text,
  root_text = excluded.root_text,
  transliteration = excluded.transliteration,
  pos_tag = excluded.pos_tag,
  source_url = excluded.source_url,
  is_embedded = excluded.is_embedded,
  qdrant_id = excluded.qdrant_id,
  embed_model = excluded.embed_model,
  meta_json = excluded.meta_json,
  citations_json = excluded.citations_json,
  ui_json = excluded.ui_json,
  cleaner_json = excluded.cleaner_json,
  status = excluded.status,
  ai_fill_state = excluded.ai_fill_state,
  sort_key = excluded.sort_key,
  updated_at = datetime('now');

DROP TABLE IF EXISTS ar_ling_lexicon_entries_fts;
CREATE VIRTUAL TABLE ar_ling_lexicon_entries_fts USING fts5(
  entry_text,
  heading_norm,
  title_ar,
  title_en,
  display_heading_ar,
  display_heading_en,
  gloss_ar,
  gloss_en,
  summary_ar,
  summary_en,
  definition_ar,
  definition_en,
  definition_source,
  source_slug,
  content='ar_ling_lexicon_entries',
  content_rowid='rowid'
);

INSERT INTO ar_ling_lexicon_entries_fts(
  rowid,
  entry_text,
  heading_norm,
  title_ar,
  title_en,
  display_heading_ar,
  display_heading_en,
  gloss_ar,
  gloss_en,
  summary_ar,
  summary_en,
  definition_ar,
  definition_en,
  definition_source,
  source_slug
)
SELECT
  rowid,
  entry_text,
  heading_norm,
  title_ar,
  title_en,
  display_heading_ar,
  display_heading_en,
  gloss_ar,
  gloss_en,
  summary_ar,
  summary_en,
  definition_ar,
  definition_en,
  definition_source,
  source_slug
FROM ar_ling_lexicon_entries;
