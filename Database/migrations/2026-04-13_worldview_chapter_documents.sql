PRAGMA foreign_keys = OFF;

ALTER TABLE wv_documents RENAME TO wv_documents_legacy_20260413;

CREATE TABLE wv_documents (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('article', 'lesson', 'podcast_script', 'study_note', 'research_paper', 'reflection', 'draft')),
  title TEXT NOT NULL,
  summary TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'published', 'archived')),
  related_node_id TEXT,
  document_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(document_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  production_type TEXT CHECK (production_type IN (
    'podcast', 'youtube', 'article', 'newsletter', 'short', 'lesson', 'slides',
    'podcast_script', 'surah_podcast', 'children_lesson', 'surah_overview',
    'audio_transcript', 'cross_corpus_analysis', 'passage_study', 'other'
  )),
  target_audience TEXT CHECK (target_audience IN ('adult', 'child', 'mixed')),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  published_at TEXT,
  surah INTEGER,
  unit_id TEXT,
  source_id TEXT,
  source_unit_id TEXT,
  domain TEXT CHECK (domain IN (
    'quran', 'arabic', 'classical_theology', 'jewish_wv',
    'christian_wv', 'history', 'worldview', 'planner', 'workspace', 'other'
  )),
  deleted_at TEXT,
  doc_scope_type TEXT,
  ayah_from INTEGER,
  ayah_to INTEGER,
  container_id TEXT,
  primary_passage_ref TEXT,
  canonical_quran_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (related_node_id) REFERENCES wv_nodes(id) ON DELETE SET NULL
);

INSERT INTO wv_documents (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  doc_type,
  title,
  summary,
  cover_image_url,
  status,
  related_node_id,
  document_json,
  meta_json,
  created_at,
  updated_at,
  production_type,
  target_audience,
  is_published,
  published_at,
  surah,
  unit_id,
  source_id,
  source_unit_id,
  domain,
  deleted_at,
  doc_scope_type,
  ayah_from,
  ayah_to,
  container_id,
  primary_passage_ref,
  canonical_quran_ref
)
SELECT
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  doc_type,
  title,
  summary,
  cover_image_url,
  status,
  related_node_id,
  document_json,
  meta_json,
  created_at,
  updated_at,
  production_type,
  target_audience,
  is_published,
  published_at,
  surah,
  unit_id,
  COALESCE(source_id, json_extract(document_json, '$.source_id')),
  COALESCE(source_unit_id, json_extract(document_json, '$.source_unit_id')),
  domain,
  deleted_at,
  doc_scope_type,
  ayah_from,
  ayah_to,
  container_id,
  primary_passage_ref,
  canonical_quran_ref
FROM wv_documents_legacy_20260413;

DROP TABLE wv_documents_legacy_20260413;

CREATE INDEX idx_wv_documents_workspace_user_status_created
  ON wv_documents(workspace_id, user_id, status, created_at);
CREATE INDEX idx_wv_documents_doc_type ON wv_documents(doc_type);
CREATE INDEX idx_wv_documents_domain ON wv_documents(domain);
CREATE INDEX idx_wv_documents_unit ON wv_documents(unit_id);
CREATE INDEX idx_wv_documents_surah ON wv_documents(surah);
CREATE INDEX idx_wv_documents_production ON wv_documents(production_type, is_published);
CREATE INDEX idx_wv_documents_source_scope
  ON wv_documents(domain, doc_type, source_id, source_unit_id);
CREATE INDEX idx_wv_docs_scope_type
  ON wv_documents(doc_scope_type) WHERE doc_scope_type IS NOT NULL;
CREATE INDEX idx_wv_docs_ayah_range
  ON wv_documents(surah, ayah_from, ayah_to) WHERE surah IS NOT NULL;
CREATE INDEX idx_wv_docs_container
  ON wv_documents(container_id) WHERE container_id IS NOT NULL;
CREATE INDEX idx_wv_docs_quran_ref
  ON wv_documents(canonical_quran_ref) WHERE canonical_quran_ref IS NOT NULL;

PRAGMA foreign_keys = ON;
