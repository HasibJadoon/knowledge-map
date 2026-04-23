PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS idx_sp_sprint_reviews_period;
DROP INDEX IF EXISTS idx_sp_sprint_reviews_status;
DROP INDEX IF EXISTS idx_sp_sprint_reviews_user_id;
DROP INDEX IF EXISTS idx_sp_weekly_plans_user_id;
DROP INDEX IF EXISTS idx_sp_weekly_tasks_kanban_state;
DROP INDEX IF EXISTS idx_sp_weekly_tasks_order;
DROP INDEX IF EXISTS idx_sp_weekly_tasks_status;
DROP INDEX IF EXISTS idx_sp_weekly_tasks_type;
DROP INDEX IF EXISTS idx_sp_weekly_tasks_user_id;
DROP INDEX IF EXISTS idx_sp_weekly_tasks_week;
DROP INDEX IF EXISTS ux_sp_weekly_tasks_source_task;

ALTER TABLE sp_weekly_plans RENAME TO sp_weekly_plans_legacy_20260314;
ALTER TABLE sp_weekly_tasks RENAME TO sp_weekly_tasks_legacy_20260314;
ALTER TABLE sp_sprint_reviews RENAME TO sp_sprint_reviews_legacy_20260314;

DROP TABLE IF EXISTS wv_claims;
DROP TABLE IF EXISTS wv_concept_anchors;
DROP TABLE IF EXISTS wv_concept_sources;
DROP TABLE IF EXISTS wv_concepts;
DROP TABLE IF EXISTS wv_content_items;
DROP TABLE IF EXISTS wv_cross_references;
DROP TABLE IF EXISTS wv_discourse_edges;
DROP TABLE IF EXISTS wv_quran_relations;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  workspace_type TEXT NOT NULL CHECK (workspace_type IN ('personal', 'family', 'team', 'study_group', 'organization')),
  owner_user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'suspended')),
  settings_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member' CHECK (membership_role IN ('owner', 'admin', 'member', 'viewer', 'guest')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'paused', 'left', 'removed')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  invited_by INTEGER,
  settings_json JSON CHECK (settings_json IS NULL OR json_valid(settings_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, user_id),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workspace_groups (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  group_type TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'hidden')),
  order_index INTEGER NOT NULL DEFAULT 0,
  settings_json JSON CHECK (settings_json IS NULL OR json_valid(settings_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, slug),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'left', 'removed')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, group_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, group_id) REFERENCES workspace_groups(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id) REFERENCES workspace_members(workspace_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_roles (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  title TEXT NOT NULL,
  permissions_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(permissions_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (workspace_id, role_key),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_member_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  workspace_member_id INTEGER NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workspace_id, workspace_member_id, role_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, workspace_member_id) REFERENCES workspace_members(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, role_id) REFERENCES workspace_roles(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_group_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workspace_id, group_id, role_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, group_id) REFERENCES workspace_groups(workspace_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, role_id) REFERENCES workspace_roles(workspace_id, id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO workspaces (
  id,
  canonical_input,
  slug,
  title,
  description,
  workspace_type,
  owner_user_id,
  status,
  settings_json,
  meta_json,
  created_at
) VALUES (
  'ws_system',
  'workspace:system',
  'system',
  'System Workspace',
  'Default workspace for legacy rows without a user.',
  'organization',
  NULL,
  'active',
  '{}',
  json_object('migrated_from_remote', 1),
  datetime('now')
);

INSERT OR IGNORE INTO workspaces (
  id,
  canonical_input,
  slug,
  title,
  description,
  workspace_type,
  owner_user_id,
  status,
  settings_json,
  meta_json,
  created_at
)
SELECT
  'ws_user_' || id,
  'workspace:user:' || id,
  'user-' || id,
  COALESCE(email, 'User ' || id) || ' Workspace',
  'Auto-created personal workspace from remote migration.',
  'personal',
  id,
  'active',
  '{}',
  json_object('migrated_from_remote', 1, 'source_user_id', id),
  datetime('now')
FROM users;

INSERT OR IGNORE INTO workspace_members (
  workspace_id,
  user_id,
  membership_role,
  status,
  joined_at,
  settings_json,
  meta_json,
  created_at
)
SELECT
  'ws_user_' || id,
  id,
  'owner',
  'active',
  datetime('now'),
  '{}',
  json_object('migrated_from_remote', 1),
  datetime('now')
FROM users;

CREATE TABLE IF NOT EXISTS wv_sources (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('book', 'article', 'lecture', 'podcast', 'video', 'story', 'paper', 'conversation', 'document', 'other')),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  creator TEXT,
  publisher TEXT,
  publication_year INTEGER CHECK (publication_year IS NULL OR publication_year BETWEEN 1 AND 3000),
  language TEXT,
  source_url TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  source_json JSON CHECK (source_json IS NULL OR json_valid(source_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_source_units (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  parent_unit_id TEXT,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('chapter', 'section', 'heading', 'scene', 'timestamp', 'topic', 'passage', 'segment', 'other')),
  title TEXT,
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  start_ref TEXT,
  end_ref TEXT,
  anchor_text TEXT,
  summary TEXT,
  unit_json JSON CHECK (unit_json IS NULL OR json_valid(unit_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_unit_id) REFERENCES wv_source_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_people (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  display_name TEXT NOT NULL,
  sort_name TEXT,
  person_type TEXT NOT NULL DEFAULT 'person' CHECK (person_type IN ('person', 'organization')),
  bio_short TEXT,
  website_url TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_source_people (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('author', 'co_author', 'editor', 'translator', 'speaker', 'host', 'guest', 'interviewer', 'publisher', 'organization', 'narrator', 'reviewer', 'other')),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (source_id, person_id, role, order_index),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES wv_people(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_source_details (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  detail_key TEXT NOT NULL,
  detail_value TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (source_id, detail_key, order_index),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_reading_sessions (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  source_unit_id TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('reading', 'review', 'research', 'extraction')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  focus_mode TEXT,
  last_position TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  session_json JSON CHECK (session_json IS NULL OR json_valid(session_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_highlights (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT NOT NULL,
  source_unit_id TEXT,
  session_id TEXT,
  locator TEXT,
  anchor_text TEXT,
  selected_text TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  color TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  CHECK (end_offset IS NULL OR start_offset IS NULL OR end_offset >= start_offset),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES wv_reading_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_notes (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_id TEXT,
  source_unit_id TEXT,
  session_id TEXT,
  highlight_id TEXT,
  note_kind TEXT NOT NULL CHECK (note_kind IN ('quote', 'summary', 'reflection', 'question', 'claim_seed', 'insight', 'observation', 'reference', 'todo', 'idea')),
  title TEXT,
  body_md TEXT NOT NULL,
  excerpt_text TEXT,
  locator TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  note_json JSON CHECK (note_json IS NULL OR json_valid(note_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES wv_reading_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (highlight_id) REFERENCES wv_highlights(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_note_relations (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  note_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('node', 'source', 'source_unit', 'note', 'document', 'external', 'other')),
  target_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('supports', 'questions', 'distills_to_node', 'references_source', 'references_unit', 'related_note', 'about', 'other')),
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (note_id, target_type, target_id, relation),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (note_id) REFERENCES wv_notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_distill_batches (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('distill', 'review', 'merge', 'insight_generation')),
  title TEXT,
  instructions_md TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'ready', 'approved', 'archived')),
  batch_json JSON CHECK (batch_json IS NULL OR json_valid(batch_json)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_distill_batch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('note', 'highlight')),
  item_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  role TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (batch_id, item_type, item_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_insight_suggestions (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  batch_id TEXT NOT NULL,
  user_id INTEGER,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('node', 'edge', 'cluster', 'output', 'srs')),
  payload_json JSON NOT NULL CHECK (json_valid(payload_json)),
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'edited', 'rejected', 'saved')),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id) REFERENCES wv_distill_batches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_insight_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  suggestion_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'edit_and_save', 'reject', 'defer')),
  target_type TEXT,
  target_id TEXT,
  edited_payload_json JSON CHECK (edited_payload_json IS NULL OR json_valid(edited_payload_json)),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (suggestion_id) REFERENCES wv_insight_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_nodes (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  node_type TEXT NOT NULL CHECK (node_type IN ('cluster', 'subcluster', 'group', 'collection', 'theme', 'concept', 'principle', 'law', 'pattern', 'framework', 'claim', 'evidence', 'proof_step', 'counter_claim', 'assumption', 'inference', 'flow', 'process', 'sequence_step', 'transition', 'cause', 'effect', 'state', 'event', 'actor', 'role', 'trait', 'intention', 'emotion', 'decision', 'psych_state', 'cognitive_bias', 'moral_state', 'spiritual_state', 'ayah_ref', 'surah_ref', 'quranic_pattern', 'source', 'source_unit', 'quote', 'reference', 'question', 'reflection', 'insight', 'warning', 'lesson', 'content_piece', 'podcast_segment', 'lesson_block', 'short_clip', 'diagram_anchor', 'highlight', 'focus_node')),
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

CREATE TABLE IF NOT EXISTS wv_node_edges (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('supports', 'contradicts', 'mentions', 'related_to', 'part_of', 'derived_from', 'feeds_output', 'questions', 'cites', 'about', 'illustrates', 'defines', 'parallels', 'other')),
  strength REAL,
  order_index INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (from_node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_evidence_links (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  source_type TEXT NOT NULL CHECK (source_type IN ('source', 'source_unit', 'note', 'highlight', 'document', 'document_block', 'external', 'other')),
  source_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('supports', 'questions', 'cites', 'illustrates', 'about', 'other')),
  evidence_text TEXT,
  locator TEXT,
  note TEXT,
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_node_quran_links (
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

CREATE TABLE IF NOT EXISTS wv_documents (
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (related_node_id) REFERENCES wv_nodes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_document_blocks (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  document_id TEXT NOT NULL,
  parent_block_id TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL CHECK (block_type IN ('heading', 'paragraph', 'quote', 'bullet_item', 'numbered_item', 'callout', 'code', 'image', 'divider')),
  block_level INTEGER,
  text_plain TEXT,
  content_json JSON CHECK (content_json IS NULL OR json_valid(content_json)),
  attrs_json JSON CHECK (attrs_json IS NULL OR json_valid(attrs_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES wv_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_block_id) REFERENCES wv_document_blocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_block_node_links (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  block_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('mentions', 'supports', 'defines', 'references', 'illustrates', 'feeds')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (block_id, node_id, relation),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (block_id) REFERENCES wv_document_blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES wv_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sp_weekly_plans (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  week_start TEXT NOT NULL,
  notes TEXT,
  planned_count INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  week_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(week_json)),
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sp_kanban_lanes (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  lane_key TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  is_done_lane INTEGER NOT NULL DEFAULT 0 CHECK (is_done_lane IN (0, 1)),
  meta_json JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sp_weekly_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  created_by INTEGER,
  assigned_user_id INTEGER,
  assigned_group_id TEXT,
  week_start TEXT NOT NULL,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  kanban_lane_id TEXT,
  kanban_state TEXT NOT NULL DEFAULT 'backlog',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'in_progress', 'blocked', 'done', 'cancelled', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  points REAL,
  due_date TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  task_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(task_json)),
  related_node_id TEXT,
  source_task_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (kanban_lane_id) REFERENCES sp_kanban_lanes(id) ON DELETE SET NULL,
  FOREIGN KEY (related_node_id) REFERENCES wv_nodes(id) ON DELETE SET NULL,
  FOREIGN KEY (source_task_id) REFERENCES sp_weekly_tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sp_task_assignees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  assigned_user_id INTEGER,
  assigned_group_id TEXT,
  assignment_role TEXT NOT NULL DEFAULT 'assignee' CHECK (assignment_role IN ('assignee', 'owner', 'reviewer', 'watcher')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (assigned_user_id IS NOT NULL AND assigned_group_id IS NULL)
    OR (assigned_user_id IS NULL AND assigned_group_id IS NOT NULL)
  ),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES sp_weekly_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_group_id) REFERENCES workspace_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sp_sprint_reviews (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'archived')),
  review_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(review_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sp_planner (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id TEXT NOT NULL,
  group_id TEXT,
  user_id INTEGER,
  item_type TEXT NOT NULL CHECK (item_type IN ('week_plan', 'task', 'sprint_review')),
  week_start TEXT,
  period_start TEXT,
  period_end TEXT,
  related_type TEXT,
  related_id TEXT,
  item_json JSON NOT NULL CHECK (json_valid(item_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  CHECK (
    (item_type IN ('week_plan', 'task') AND week_start IS NOT NULL)
    OR (item_type = 'sprint_review' AND period_start IS NOT NULL AND period_end IS NOT NULL)
  ),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO sp_kanban_lanes (
  id,
  canonical_input,
  workspace_id,
  group_id,
  lane_key,
  title,
  order_index,
  color,
  is_done_lane,
  meta_json,
  created_at
)
SELECT 'lane:' || id || ':backlog', 'kanban_lane:' || id || ':backlog', id, NULL, 'backlog', 'Backlog', 0, '#6B7280', 0, '{}', datetime('now')
FROM workspaces;

INSERT OR IGNORE INTO sp_kanban_lanes (
  id,
  canonical_input,
  workspace_id,
  group_id,
  lane_key,
  title,
  order_index,
  color,
  is_done_lane,
  meta_json,
  created_at
)
SELECT 'lane:' || id || ':in_progress', 'kanban_lane:' || id || ':in_progress', id, NULL, 'in_progress', 'In Progress', 1, '#2563EB', 0, '{}', datetime('now')
FROM workspaces;

INSERT OR IGNORE INTO sp_kanban_lanes (
  id,
  canonical_input,
  workspace_id,
  group_id,
  lane_key,
  title,
  order_index,
  color,
  is_done_lane,
  meta_json,
  created_at
)
SELECT 'lane:' || id || ':review', 'kanban_lane:' || id || ':review', id, NULL, 'review', 'Review', 2, '#D97706', 0, '{}', datetime('now')
FROM workspaces;

INSERT OR IGNORE INTO sp_kanban_lanes (
  id,
  canonical_input,
  workspace_id,
  group_id,
  lane_key,
  title,
  order_index,
  color,
  is_done_lane,
  meta_json,
  created_at
)
SELECT 'lane:' || id || ':done', 'kanban_lane:' || id || ':done', id, NULL, 'done', 'Done', 3, '#059669', 1, '{}', datetime('now')
FROM workspaces;

INSERT INTO sp_weekly_plans (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  week_start,
  notes,
  planned_count,
  done_count,
  week_json,
  created_by,
  created_at,
  updated_at
)
SELECT
  'week_plan:' || COALESCE(CAST(user_id AS TEXT), 'system') || ':' || week_start,
  'week_plan:' || COALESCE(CAST(user_id AS TEXT), 'system') || ':' || week_start,
  CASE WHEN user_id IS NULL THEN 'ws_system' ELSE 'ws_user_' || user_id END,
  NULL,
  user_id,
  week_start,
  notes,
  planned_count,
  done_count,
  week_json,
  user_id,
  created_at,
  updated_at
FROM sp_weekly_plans_legacy_20260314;

INSERT INTO sp_weekly_tasks (
  id,
  workspace_id,
  group_id,
  created_by,
  assigned_user_id,
  assigned_group_id,
  week_start,
  title,
  task_type,
  kanban_lane_id,
  kanban_state,
  status,
  priority,
  points,
  due_date,
  order_index,
  task_json,
  related_node_id,
  source_task_id,
  created_at,
  updated_at
)
SELECT
  'task:' || id,
  CASE WHEN user_id IS NULL THEN 'ws_system' ELSE 'ws_user_' || user_id END,
  NULL,
  user_id,
  user_id,
  NULL,
  week_start,
  title,
  task_type,
  CASE
    WHEN lower(COALESCE(kanban_state, '')) IN ('done', 'completed') THEN 'lane:' || CASE WHEN user_id IS NULL THEN 'ws_system' ELSE 'ws_user_' || user_id END || ':done'
    WHEN lower(COALESCE(kanban_state, '')) IN ('review') THEN 'lane:' || CASE WHEN user_id IS NULL THEN 'ws_system' ELSE 'ws_user_' || user_id END || ':review'
    WHEN lower(COALESCE(kanban_state, '')) IN ('in_progress', 'doing', 'working', 'active') THEN 'lane:' || CASE WHEN user_id IS NULL THEN 'ws_system' ELSE 'ws_user_' || user_id END || ':in_progress'
    ELSE 'lane:' || CASE WHEN user_id IS NULL THEN 'ws_system' ELSE 'ws_user_' || user_id END || ':backlog'
  END,
  CASE
    WHEN lower(COALESCE(kanban_state, '')) IN ('done', 'completed') THEN 'done'
    WHEN lower(COALESCE(kanban_state, '')) IN ('review') THEN 'review'
    WHEN lower(COALESCE(kanban_state, '')) IN ('in_progress', 'doing', 'working', 'active') THEN 'in_progress'
    ELSE 'backlog'
  END,
  CASE
    WHEN status IN ('draft', 'planned', 'in_progress', 'blocked', 'done', 'cancelled', 'archived') THEN status
    WHEN lower(COALESCE(status, '')) IN ('completed') THEN 'done'
    ELSE 'planned'
  END,
  CASE
    WHEN priority = 1 THEN 'urgent'
    WHEN priority = 2 THEN 'high'
    WHEN priority = 3 OR priority IS NULL THEN 'medium'
    ELSE 'low'
  END,
  points,
  due_date,
  order_index,
  task_json,
  NULL,
  CASE WHEN source_task_id IS NULL THEN NULL ELSE 'task:' || source_task_id END,
  created_at,
  updated_at
FROM sp_weekly_tasks_legacy_20260314;

INSERT INTO sp_task_assignees (
  workspace_id,
  task_id,
  assigned_user_id,
  assigned_group_id,
  assignment_role,
  created_at
)
SELECT
  workspace_id,
  id,
  assigned_user_id,
  NULL,
  'assignee',
  created_at
FROM sp_weekly_tasks
WHERE assigned_user_id IS NOT NULL;

INSERT INTO sp_sprint_reviews (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  period_start,
  period_end,
  status,
  review_json,
  created_at,
  updated_at
)
SELECT
  'sprint_review:' || id,
  'sprint_review:' || id,
  CASE WHEN user_id IS NULL THEN 'ws_system' ELSE 'ws_user_' || user_id END,
  NULL,
  user_id,
  period_start,
  period_end,
  CASE
    WHEN status IN ('draft', 'submitted', 'approved', 'archived') THEN status
    ELSE 'draft'
  END,
  review_json,
  created_at,
  updated_at
FROM sp_sprint_reviews_legacy_20260314;

INSERT INTO sp_planner (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  item_type,
  week_start,
  period_start,
  period_end,
  related_type,
  related_id,
  item_json,
  status,
  created_at,
  updated_at
)
SELECT
  'planner:week_plan:' || id,
  'planner:week_plan:' || id,
  workspace_id,
  group_id,
  user_id,
  'week_plan',
  week_start,
  NULL,
  NULL,
  'sp_weekly_plans',
  id,
  week_json,
  'active',
  created_at,
  updated_at
FROM sp_weekly_plans;

INSERT INTO sp_planner (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  item_type,
  week_start,
  period_start,
  period_end,
  related_type,
  related_id,
  item_json,
  status,
  created_at,
  updated_at
)
SELECT
  'planner:task:' || id,
  'planner:task:' || id,
  workspace_id,
  group_id,
  assigned_user_id,
  'task',
  week_start,
  NULL,
  NULL,
  'sp_weekly_tasks',
  id,
  task_json,
  CASE WHEN status = 'archived' THEN 'archived' ELSE 'active' END,
  created_at,
  updated_at
FROM sp_weekly_tasks;

INSERT INTO sp_planner (
  id,
  canonical_input,
  workspace_id,
  group_id,
  user_id,
  item_type,
  week_start,
  period_start,
  period_end,
  related_type,
  related_id,
  item_json,
  status,
  created_at,
  updated_at
)
SELECT
  'planner:sprint_review:' || id,
  'planner:sprint_review:' || id,
  workspace_id,
  group_id,
  user_id,
  'sprint_review',
  NULL,
  period_start,
  period_end,
  'sp_sprint_reviews',
  id,
  review_json,
  CASE WHEN status = 'archived' THEN 'archived' ELSE 'active' END,
  created_at,
  updated_at
FROM sp_sprint_reviews;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user ON workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_groups_workspace_order ON workspace_groups(workspace_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workspace_group_members_group_user ON workspace_group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace_role_key ON workspace_roles(workspace_id, role_key);

CREATE INDEX IF NOT EXISTS idx_wv_brainstorm_user_id ON wv_brainstorm_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wv_brainstorm_topic ON wv_brainstorm_sessions(topic);
CREATE INDEX IF NOT EXISTS idx_wv_brainstorm_status ON wv_brainstorm_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wv_brainstorm_stage ON wv_brainstorm_sessions(stage);
CREATE INDEX IF NOT EXISTS idx_wv_sources_workspace_type_status ON wv_sources(workspace_id, source_type, status);
CREATE INDEX IF NOT EXISTS idx_wv_people_workspace_name ON wv_people(workspace_id, display_name);
CREATE INDEX IF NOT EXISTS idx_wv_source_people_source ON wv_source_people(source_id, role, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_source_people_person ON wv_source_people(person_id);
CREATE INDEX IF NOT EXISTS idx_wv_source_details_source ON wv_source_details(source_id, detail_key);
CREATE INDEX IF NOT EXISTS idx_wv_source_units_source_parent_order ON wv_source_units(source_id, parent_unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_reading_sessions_workspace_user_status_started ON wv_reading_sessions(workspace_id, user_id, status, started_at);
CREATE INDEX IF NOT EXISTS idx_wv_highlights_workspace_user_created ON wv_highlights(workspace_id, user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wv_highlights_source_scope ON wv_highlights(source_id, source_unit_id, session_id);
CREATE INDEX IF NOT EXISTS idx_wv_notes_workspace_user_created ON wv_notes(workspace_id, user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wv_notes_source_kind ON wv_notes(source_id, source_unit_id, note_kind);
CREATE INDEX IF NOT EXISTS idx_wv_notes_session ON wv_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_wv_notes_highlight ON wv_notes(highlight_id);
CREATE INDEX IF NOT EXISTS idx_wv_note_relations_note ON wv_note_relations(note_id);
CREATE INDEX IF NOT EXISTS idx_wv_note_relations_target_relation ON wv_note_relations(target_type, target_id, relation);
CREATE INDEX IF NOT EXISTS idx_wv_distill_batches_workspace_user_status_created ON wv_distill_batches(workspace_id, user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_wv_distill_batch_items_batch_order ON wv_distill_batch_items(batch_id, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_insight_suggestions_batch_type_status ON wv_insight_suggestions(batch_id, suggestion_type, status);
CREATE INDEX IF NOT EXISTS idx_wv_insight_decisions_suggestion_user ON wv_insight_decisions(suggestion_id, user_id);
CREATE INDEX IF NOT EXISTS idx_wv_nodes_workspace_group_type_status ON wv_nodes(workspace_id, group_id, node_type, status);
CREATE INDEX IF NOT EXISTS idx_wv_nodes_slug ON wv_nodes(slug);
CREATE INDEX IF NOT EXISTS idx_wv_nodes_user_created ON wv_nodes(user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_wv_nodes_workspace_slug ON wv_nodes(workspace_id, slug) WHERE slug IS NOT NULL AND trim(slug) <> '';
CREATE INDEX IF NOT EXISTS idx_wv_node_edges_workspace_relation ON wv_node_edges(workspace_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_wv_node_edges_from_relation ON wv_node_edges(from_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_wv_node_edges_to_relation ON wv_node_edges(to_node_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_wv_evidence_links_target_node ON wv_evidence_links(target_node_id, relation);
CREATE INDEX IF NOT EXISTS idx_wv_node_quran_links_node ON wv_node_quran_links(node_id, relation);
CREATE INDEX IF NOT EXISTS idx_wv_documents_workspace_user_status_created ON wv_documents(workspace_id, user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_wv_documents_doc_type ON wv_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_wv_document_blocks_document_order ON wv_document_blocks(document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_document_blocks_parent ON wv_document_blocks(parent_block_id);
CREATE INDEX IF NOT EXISTS idx_wv_document_blocks_block_type ON wv_document_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_wv_block_node_links_block ON wv_block_node_links(block_id);
CREATE INDEX IF NOT EXISTS idx_wv_block_node_links_node_relation ON wv_block_node_links(node_id, relation);

CREATE INDEX IF NOT EXISTS idx_sp_weekly_plans_workspace_week ON sp_weekly_plans(workspace_id, week_start);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sp_weekly_plans_scope_week ON sp_weekly_plans(workspace_id, ifnull(group_id, ''), ifnull(user_id, 0), week_start);
CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_workspace_week_lane ON sp_weekly_tasks(workspace_id, week_start, kanban_state);
CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_assigned_user_status ON sp_weekly_tasks(assigned_user_id, status);
CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_assigned_group_status ON sp_weekly_tasks(assigned_group_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sp_weekly_tasks_source_task ON sp_weekly_tasks(workspace_id, week_start, source_task_id) WHERE source_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_task_assignees_task ON sp_task_assignees(task_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sp_task_assignees_user ON sp_task_assignees(task_id, assigned_user_id, assignment_role) WHERE assigned_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_sp_task_assignees_group ON sp_task_assignees(task_id, assigned_group_id, assignment_role) WHERE assigned_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sp_kanban_lanes_workspace_group_order ON sp_kanban_lanes(workspace_id, group_id, order_index);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sp_kanban_lanes_scope_key ON sp_kanban_lanes(workspace_id, ifnull(group_id, ''), lane_key);
CREATE INDEX IF NOT EXISTS idx_sp_sprint_reviews_workspace_period ON sp_sprint_reviews(workspace_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_sp_planner_workspace_item_type ON sp_planner(workspace_id, item_type);
CREATE INDEX IF NOT EXISTS idx_sp_planner_workspace_week ON sp_planner(workspace_id, week_start);
CREATE INDEX IF NOT EXISTS idx_sp_planner_workspace_period ON sp_planner(workspace_id, period_start, period_end);

CREATE TRIGGER IF NOT EXISTS trg_workspaces_updated_at
AFTER UPDATE ON workspaces
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspaces
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_workspace_members_updated_at
AFTER UPDATE ON workspace_members
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_members
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_workspace_groups_updated_at
AFTER UPDATE ON workspace_groups
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_groups
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_workspace_group_members_updated_at
AFTER UPDATE ON workspace_group_members
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_group_members
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_workspace_roles_updated_at
AFTER UPDATE ON workspace_roles
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE workspace_roles
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_sources_updated_at
AFTER UPDATE ON wv_sources
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_sources
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_people_updated_at
AFTER UPDATE ON wv_people
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_people
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_source_people_updated_at
AFTER UPDATE ON wv_source_people
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_people
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_source_details_updated_at
AFTER UPDATE ON wv_source_details
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_details
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_source_units_updated_at
AFTER UPDATE ON wv_source_units
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_units
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_reading_sessions_updated_at
AFTER UPDATE ON wv_reading_sessions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_reading_sessions
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_highlights_updated_at
AFTER UPDATE ON wv_highlights
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_highlights
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_notes_updated_at
AFTER UPDATE ON wv_notes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_notes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_note_relations_updated_at
AFTER UPDATE ON wv_note_relations
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_note_relations
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_distill_batches_updated_at
AFTER UPDATE ON wv_distill_batches
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_distill_batches
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_insight_suggestions_updated_at
AFTER UPDATE ON wv_insight_suggestions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_insight_suggestions
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_insight_decisions_updated_at
AFTER UPDATE ON wv_insight_decisions
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_insight_decisions
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_documents_updated_at
AFTER UPDATE ON wv_documents
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_documents
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_document_blocks_updated_at
AFTER UPDATE ON wv_document_blocks
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_document_blocks
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_block_node_links_updated_at
AFTER UPDATE ON wv_block_node_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_block_node_links
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_nodes_updated_at
AFTER UPDATE ON wv_nodes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_nodes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_node_edges_updated_at
AFTER UPDATE ON wv_node_edges
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_edges
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_evidence_links_updated_at
AFTER UPDATE ON wv_evidence_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_evidence_links
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_node_quran_links_updated_at
AFTER UPDATE ON wv_node_quran_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_quran_links
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sp_weekly_plans_updated_at
AFTER UPDATE ON sp_weekly_plans
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_weekly_plans
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sp_weekly_tasks_updated_at
AFTER UPDATE ON sp_weekly_tasks
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_weekly_tasks
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sp_kanban_lanes_updated_at
AFTER UPDATE ON sp_kanban_lanes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_kanban_lanes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sp_sprint_reviews_updated_at
AFTER UPDATE ON sp_sprint_reviews
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_sprint_reviews
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sp_planner_updated_at
AFTER UPDATE ON sp_planner
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_planner
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

PRAGMA foreign_keys = ON;
