-- ============================================================
-- Migration: 2026-03-24 — Align worldview node schema
-- Purpose:
-- 1. Replace the ad hoc legacy wv_nodes.node_type enum with the
--    production ontology for K-Maps nodes.
-- 2. Rename wv_node_quran_links.target_id to target_ref so the
--    schema matches the existing Quran worldview query contract.
-- 3. Preserve existing data while mapping legacy random node types
--    into the new ontology where a close equivalent exists.
-- ============================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE wv_nodes__new (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  node_type TEXT NOT NULL CHECK (node_type IN (
    'cluster',
    'subcluster',
    'group',
    'collection',
    'theme',
    'concept',
    'principle',
    'law',
    'pattern',
    'framework',
    'claim',
    'evidence',
    'proof_step',
    'counter_claim',
    'assumption',
    'inference',
    'flow',
    'process',
    'sequence_step',
    'transition',
    'cause',
    'effect',
    'state',
    'event',
    'actor',
    'role',
    'trait',
    'intention',
    'emotion',
    'decision',
    'psych_state',
    'cognitive_bias',
    'moral_state',
    'spiritual_state',
    'ayah_ref',
    'surah_ref',
    'quranic_pattern',
    'source',
    'source_unit',
    'quote',
    'reference',
    'question',
    'reflection',
    'insight',
    'warning',
    'lesson',
    'content_piece',
    'podcast_segment',
    'lesson_block',
    'short_clip',
    'diagram_anchor',
    'highlight',
    'focus_node'
  )),
  title TEXT,
  text_plain TEXT,
  summary TEXT,
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'merged')),
  data_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO wv_nodes__new (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  node_type,
  title,
  text_plain,
  summary,
  slug,
  status,
  data_json,
  meta_json,
  created_at,
  updated_at
)
SELECT
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  CASE node_type
    WHEN 'output' THEN 'content_piece'
    WHEN 'argument' THEN 'proof_step'
    WHEN 'episode' THEN 'podcast_segment'
    WHEN 'source_ref' THEN 'source'
    WHEN 'person_ref' THEN 'actor'
    WHEN 'research_topic' THEN 'theme'
    WHEN 'other' THEN 'reference'
    ELSE node_type
  END,
  title,
  text_plain,
  summary,
  slug,
  status,
  data_json,
  meta_json,
  created_at,
  updated_at
FROM wv_nodes;

DROP TABLE wv_nodes;
ALTER TABLE wv_nodes__new RENAME TO wv_nodes;

CREATE TABLE wv_node_quran_links__new (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  node_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('ayah', 'surah_ayah_meta', 'translation_passage', 'synonym_topic', 'other')),
  target_ref TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('cites', 'supports', 'about', 'illustrates', 'defines', 'other')),
  quran_evidence_json JSON CHECK (quran_evidence_json IS NULL OR json_valid(quran_evidence_json)),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

INSERT INTO wv_node_quran_links__new (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  node_id,
  target_type,
  target_ref,
  relation,
  quran_evidence_json,
  note,
  created_at,
  updated_at
)
SELECT
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  node_id,
  target_type,
  target_id,
  relation,
  quran_evidence_json,
  note,
  created_at,
  updated_at
FROM wv_node_quran_links;

DROP TABLE wv_node_quran_links;
ALTER TABLE wv_node_quran_links__new RENAME TO wv_node_quran_links;

PRAGMA foreign_keys = ON;
