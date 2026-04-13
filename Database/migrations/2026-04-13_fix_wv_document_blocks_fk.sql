PRAGMA foreign_keys = OFF;

-- Fix wv_document_blocks FK: was pointing to dropped wv_documents_legacy_20260413,
-- now correctly references wv_documents. Also removes orphaned test blocks.
CREATE TABLE wv_document_blocks_new (
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
  block_kind TEXT,
  scope_ref TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  task_type TEXT,
  renderer TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (document_id) REFERENCES wv_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_block_id) REFERENCES wv_document_blocks_new(id) ON DELETE CASCADE
);

INSERT INTO wv_document_blocks_new
SELECT id, canonical_input, workspace_id, group_id, user_id, document_id, parent_block_id,
       order_index, block_type, block_level, text_plain, content_json, attrs_json,
       created_at, updated_at, block_kind, scope_ref, surah, ayah_from, ayah_to, task_type, renderer
FROM wv_document_blocks
WHERE id NOT IN (
  'wv_block_q12_1_7_001','wv_block_q12_1_7_002','wv_block_q12_1_7_003','wv_block_q12_1_7_004',
  'wv_block_q12_1_7_005','wv_block_q12_1_7_006','wv_block_q12_1_7_007','wv_block_q12_1_7_008',
  'wv_block_q12_b1','wv_block_q12_b5','wv_block_q12_b6','wv_block_q12_b7',
  'wv_blk_q12_b1','wv_blk_q12_b2','wv_blk_q12_b3','wv_blk_q12_b4',
  'wv_blk_q12_b5','wv_blk_q12_b6','wv_blk_q12_b7'
);

DROP TABLE wv_document_blocks;

ALTER TABLE wv_document_blocks_new RENAME TO wv_document_blocks;

PRAGMA foreign_keys = ON;
