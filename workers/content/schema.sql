-- Schema for km_content.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.

CREATE TABLE cm_audio_scenes (
  scene_id           TEXT PRIMARY KEY,
  asset_id           TEXT NOT NULL REFERENCES cm_media_assets(asset_id),
  transcript_id      TEXT REFERENCES cm_media_transcripts(transcript_id),
  scene_index        INTEGER NOT NULL,
  scene_type         TEXT NOT NULL DEFAULT 'segment',
  title              TEXT,
  description        TEXT,
  start_ms           INTEGER NOT NULL,
  end_ms             INTEGER NOT NULL,
  speaker_ref        TEXT,
  transcript_excerpt TEXT,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  meta_json          TEXT NOT NULL DEFAULT '{}',
  UNIQUE(asset_id, scene_index)
);

CREATE TABLE cm_block_embeds (
  embed_id           TEXT PRIMARY KEY,
  block_id           TEXT NOT NULL REFERENCES cm_blocks(block_id),
  embed_type         TEXT NOT NULL,
  target_ref         TEXT,
  embed_config_json  TEXT NOT NULL DEFAULT '{}',
  caption            TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE cm_block_refs (
  ref_id             TEXT PRIMARY KEY,
  block_id           TEXT NOT NULL REFERENCES cm_blocks(block_id),
  target_ref         TEXT NOT NULL,
  ref_type           TEXT NOT NULL,
  anchor_text        TEXT,
  note               TEXT,
  seq_order          INTEGER NOT NULL DEFAULT 0,
  meta_json          TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE cm_blocks (
  block_id           TEXT PRIMARY KEY,
  doc_id             TEXT NOT NULL REFERENCES cm_documents(doc_id),
  parent_block_id    TEXT REFERENCES cm_blocks(block_id),
  block_type         TEXT NOT NULL,
  seq_order          INTEGER NOT NULL DEFAULT 0,
  depth              INTEGER NOT NULL DEFAULT 0,
  content_text       TEXT,
  content_ar         TEXT,
  attrs_json         TEXT NOT NULL DEFAULT '{}',
  annotations_json   TEXT NOT NULL DEFAULT '[]',
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_capture_entries (
  capture_id         TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  capture_type       TEXT NOT NULL,
  raw_text           TEXT,
  raw_ar             TEXT,
  source_url         TEXT,
  source_title       TEXT,
  media_asset_ref    TEXT,
  is_processed       INTEGER NOT NULL DEFAULT 0,
  processed_into_ref TEXT,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  workspace_ref      TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  captured_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_capture_links (
  link_id            TEXT PRIMARY KEY,
  capture_id         TEXT NOT NULL REFERENCES cm_capture_entries(capture_id),
  target_ref         TEXT NOT NULL,
  link_type          TEXT NOT NULL DEFAULT 'related',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_collection_items (
  item_id            TEXT PRIMARY KEY,
  collection_id      TEXT NOT NULL REFERENCES cm_collections(collection_id),
  target_ref         TEXT NOT NULL,
  seq_order          INTEGER NOT NULL DEFAULT 0,
  item_note          TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE cm_collections (
  collection_id      TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  collection_type    TEXT NOT NULL DEFAULT 'mixed',
  title              TEXT NOT NULL,
  title_ar           TEXT,
  description        TEXT,
  is_ordered         INTEGER NOT NULL DEFAULT 1,
  policy_ref         TEXT,
  workspace_ref      TEXT,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  cover_image_url    TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_comment_reactions (
  reaction_id        TEXT PRIMARY KEY,
  comment_id         TEXT NOT NULL REFERENCES cm_comments(comment_id),
  core_user_ref      TEXT NOT NULL,
  emoji              TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(comment_id, core_user_ref, emoji)
);

CREATE TABLE cm_comments (
  comment_id         TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  target_ref         TEXT NOT NULL,
  parent_comment_id  TEXT REFERENCES cm_comments(comment_id),
  thread_root_id     TEXT,
  comment_text       TEXT NOT NULL,
  comment_ar         TEXT,
  is_resolved        INTEGER NOT NULL DEFAULT 0,
  resolved_by_ref    TEXT,
  resolved_at        TEXT,
  edit_history_json  TEXT NOT NULL DEFAULT '[]',
  workspace_ref      TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_distributions (
  dist_id            TEXT PRIMARY KEY,
  pub_id             TEXT NOT NULL REFERENCES cm_publications(pub_id),
  channel            TEXT NOT NULL,
  channel_config_json TEXT NOT NULL DEFAULT '{}',
  sent_at            TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  recipient_count    INTEGER,
  error_json         TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_document_versions (
  version_id         TEXT PRIMARY KEY,
  doc_id             TEXT NOT NULL REFERENCES cm_documents(doc_id),
  version_number     INTEGER NOT NULL,
  version_label      TEXT,
  snapshot_json      TEXT NOT NULL DEFAULT '{}',
  change_summary     TEXT,
  core_user_ref      TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(doc_id, version_number)
);

CREATE TABLE cm_documents (
  doc_id             TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  doc_type           TEXT NOT NULL DEFAULT 'note',
  title              TEXT NOT NULL,
  title_ar           TEXT,
  slug               TEXT,
  language           TEXT NOT NULL DEFAULT 'en',
  word_count         INTEGER,
  reading_time_min   INTEGER,
  publication_state  TEXT NOT NULL DEFAULT 'draft',
  policy_ref         TEXT,
  workspace_ref      TEXT,
  primary_source_ref TEXT,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE VIRTUAL TABLE cm_fts_captures USING fts5(
  capture_id UNINDEXED, raw_text, source_title,
  content = 'cm_capture_entries', content_rowid = 'rowid'
);

CREATE VIRTUAL TABLE cm_fts_documents USING fts5(
  doc_id UNINDEXED, title, title_ar,
  content = 'cm_documents', content_rowid = 'rowid'
);

CREATE VIRTUAL TABLE cm_fts_media USING fts5(
  asset_id UNINDEXED, title, title_ar,
  content = 'cm_media_assets', content_rowid = 'rowid'
);

CREATE VIRTUAL TABLE cm_fts_notes USING fts5(
  note_id UNINDEXED, title, body_text,
  content = 'cm_notes', content_rowid = 'rowid'
);

CREATE VIRTUAL TABLE cm_fts_source_units USING fts5(
  unit_id UNINDEXED, heading, body_text, summary,
  content = 'cm_source_units', content_rowid = 'rowid'
);

CREATE VIRTUAL TABLE cm_fts_sources USING fts5(
  source_id UNINDEXED, title, title_ar, subtitle,
  content = 'cm_sources', content_rowid = 'rowid'
);

CREATE TABLE cm_highlights (
  highlight_id       TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  target_ref         TEXT NOT NULL,
  target_type        TEXT NOT NULL,
  color              TEXT NOT NULL DEFAULT 'yellow',
  anchor_start_json  TEXT,
  anchor_end_json    TEXT,
  selected_text      TEXT NOT NULL,
  selected_text_ar   TEXT,
  note_ref           TEXT,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  workspace_ref      TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_media_assets (
  asset_id           TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  asset_type         TEXT NOT NULL,
  title              TEXT NOT NULL,
  title_ar           TEXT,
  file_name          TEXT,
  file_size_bytes    INTEGER,
  mime_type          TEXT,
  duration_sec       REAL,
  storage_ref        TEXT,
  cdn_url            TEXT,
  thumbnail_url      TEXT,
  language           TEXT NOT NULL DEFAULT 'en',
  is_transcribed     INTEGER NOT NULL DEFAULT 0,
  publication_state  TEXT NOT NULL DEFAULT 'draft',
  policy_ref         TEXT,
  workspace_ref      TEXT,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_media_chapters (
  chapter_id         TEXT PRIMARY KEY,
  asset_id           TEXT NOT NULL REFERENCES cm_media_assets(asset_id),
  chapter_index      INTEGER NOT NULL,
  title              TEXT NOT NULL,
  title_ar           TEXT,
  start_ms           INTEGER NOT NULL,
  end_ms             INTEGER,
  description        TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  UNIQUE(asset_id, chapter_index)
);

CREATE TABLE cm_media_transcripts (
  transcript_id      TEXT PRIMARY KEY,
  asset_id           TEXT NOT NULL REFERENCES cm_media_assets(asset_id),
  language           TEXT NOT NULL DEFAULT 'en',
  transcript_text    TEXT NOT NULL,
  is_auto_generated  INTEGER NOT NULL DEFAULT 1,
  is_reviewed        INTEGER NOT NULL DEFAULT 0,
  word_timestamps_json TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_note_targets (
  target_id          TEXT PRIMARY KEY,
  note_id            TEXT NOT NULL REFERENCES cm_notes(note_id),
  target_ref         TEXT NOT NULL,
  relation_type      TEXT NOT NULL DEFAULT 'about',
  seq_order          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cm_notes (
  note_id            TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  note_type          TEXT NOT NULL DEFAULT 'general',
  title              TEXT,
  body_text          TEXT NOT NULL DEFAULT '',
  body_ar            TEXT,
  is_pinned          INTEGER NOT NULL DEFAULT 0,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  workspace_ref      TEXT,
  policy_ref         TEXT,
  source_capture_ref TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_publications (
  pub_id             TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  doc_ref            TEXT,
  asset_ref          TEXT,
  pub_type           TEXT NOT NULL DEFAULT 'article',
  title              TEXT NOT NULL,
  slug               TEXT,
  excerpt            TEXT,
  cover_image_url    TEXT,
  publication_state  TEXT NOT NULL DEFAULT 'draft',
  published_at       TEXT,
  policy_ref         TEXT,
  workspace_ref      TEXT,
  tags_json          TEXT NOT NULL DEFAULT '[]',
  canonical_url      TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_resource_links (
  link_id            TEXT PRIMARY KEY,
  source_ref         TEXT NOT NULL,
  target_ref         TEXT NOT NULL,
  link_type          TEXT NOT NULL,
  anchor_text        TEXT,
  note               TEXT,
  core_user_ref      TEXT,
  confidence         REAL NOT NULL DEFAULT 1.0,
  is_ai_suggested    INTEGER NOT NULL DEFAULT 0,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_share_links (
  link_id            TEXT PRIMARY KEY,
  resource_ref       TEXT NOT NULL,
  core_user_ref      TEXT NOT NULL,
  token              TEXT NOT NULL UNIQUE,
  access_level       TEXT NOT NULL DEFAULT 'view',
  expires_at         TEXT,
  max_uses           INTEGER,
  use_count          INTEGER NOT NULL DEFAULT 0,
  is_active          INTEGER NOT NULL DEFAULT 1,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_source_chunks (
  chunk_id           TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES cm_sources(source_id),
  unit_id            TEXT REFERENCES cm_source_units(unit_id),
  chunk_index        INTEGER NOT NULL,
  chunk_kind         TEXT,
  page_no            INTEGER,
  heading_norm       TEXT,
  text_content       TEXT NOT NULL,
  token_count        INTEGER,
  is_embedded        INTEGER NOT NULL DEFAULT 0,
  qdrant_id          TEXT,
  embed_model        TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_source_details (
  detail_id          TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES cm_sources(source_id),
  author_names_json  TEXT NOT NULL DEFAULT '[]',
  editor_names_json  TEXT NOT NULL DEFAULT '[]',
  publisher          TEXT,
  publication_year   INTEGER,
  edition            TEXT,
  isbn               TEXT,
  doi                TEXT,
  url                TEXT,
  pages_total        INTEGER,
  language_original  TEXT,
  translator_names_json TEXT NOT NULL DEFAULT '[]',
  series_title       TEXT,
  volume             TEXT,
  issue              TEXT,
  abstract           TEXT,
  keywords_json      TEXT NOT NULL DEFAULT '[]',
  meta_json          TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE cm_source_toc (
  toc_id             TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES cm_sources(source_id),
  parent_toc_id      TEXT REFERENCES cm_source_toc(toc_id),
  seq_order          INTEGER NOT NULL DEFAULT 0,
  depth              INTEGER NOT NULL DEFAULT 0,
  heading_text       TEXT NOT NULL,
  heading_ar         TEXT,
  page_start         INTEGER,
  page_end           INTEGER,
  unit_id            TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE cm_source_units (
  unit_id            TEXT PRIMARY KEY,
  source_id          TEXT NOT NULL REFERENCES cm_sources(source_id),
  parent_unit_id     TEXT REFERENCES cm_source_units(unit_id),
  toc_id             TEXT REFERENCES cm_source_toc(toc_id),
  unit_type          TEXT NOT NULL,
  seq_order          INTEGER NOT NULL DEFAULT 0,
  depth              INTEGER NOT NULL DEFAULT 0,
  heading            TEXT,
  heading_ar         TEXT,
  page_start         INTEGER,
  page_end           INTEGER,
  word_count         INTEGER,
  body_text          TEXT,
  body_ar            TEXT,
  summary            TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cm_sources (
  source_id          TEXT PRIMARY KEY,
  core_user_ref      TEXT NOT NULL,
  source_type        TEXT NOT NULL,
  title              TEXT NOT NULL,
  title_ar           TEXT,
  subtitle           TEXT,
  language           TEXT NOT NULL DEFAULT 'en',
  status             TEXT NOT NULL DEFAULT 'active',
  policy_ref         TEXT,
  workspace_ref      TEXT,
  wv_source_ref      TEXT,
  meta_json          TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX idx_cmas_asset      ON cm_audio_scenes(asset_id);

CREATE INDEX idx_cmas_transcript ON cm_audio_scenes(transcript_id);

CREATE INDEX idx_cmas_type       ON cm_audio_scenes(scene_type);

CREATE INDEX idx_cmb_doc         ON cm_blocks(doc_id);

CREATE INDEX idx_cmb_order       ON cm_blocks(doc_id, seq_order);

CREATE INDEX idx_cmb_parent      ON cm_blocks(parent_block_id);

CREATE INDEX idx_cmb_type        ON cm_blocks(block_type);

CREATE INDEX idx_cmbe_block      ON cm_block_embeds(block_id);

CREATE INDEX idx_cmbe_target     ON cm_block_embeds(target_ref);

CREATE INDEX idx_cmbr_block      ON cm_block_refs(block_id);

CREATE INDEX idx_cmbr_target     ON cm_block_refs(target_ref);

CREATE INDEX idx_cmbr_type       ON cm_block_refs(ref_type);

CREATE INDEX idx_cmc_parent      ON cm_comments(parent_comment_id);

CREATE INDEX idx_cmc_resolved    ON cm_comments(is_resolved);

CREATE INDEX idx_cmc_root        ON cm_comments(thread_root_id);

CREATE INDEX idx_cmc_target      ON cm_comments(target_ref);

CREATE INDEX idx_cmc_user        ON cm_comments(core_user_ref);

CREATE INDEX idx_cmc_workspace   ON cm_comments(workspace_ref);

CREATE INDEX idx_cmce_captured   ON cm_capture_entries(captured_at);

CREATE INDEX idx_cmce_processed  ON cm_capture_entries(is_processed);

CREATE INDEX idx_cmce_type       ON cm_capture_entries(capture_type);

CREATE INDEX idx_cmce_user       ON cm_capture_entries(core_user_ref);

CREATE INDEX idx_cmce_workspace  ON cm_capture_entries(workspace_ref);

CREATE INDEX idx_cmci_collection ON cm_collection_items(collection_id);

CREATE INDEX idx_cmci_order      ON cm_collection_items(collection_id, seq_order);

CREATE INDEX idx_cmci_target     ON cm_collection_items(target_ref);

CREATE INDEX idx_cmcl_capture    ON cm_capture_links(capture_id);

CREATE INDEX idx_cmcl_target     ON cm_capture_links(target_ref);

CREATE INDEX idx_cmcol_policy    ON cm_collections(policy_ref);

CREATE INDEX idx_cmcol_type      ON cm_collections(collection_type);

CREATE INDEX idx_cmcol_user      ON cm_collections(core_user_ref);

CREATE INDEX idx_cmcol_workspace ON cm_collections(workspace_ref);

CREATE INDEX idx_cmcr_comment    ON cm_comment_reactions(comment_id);

CREATE INDEX idx_cmcr_user       ON cm_comment_reactions(core_user_ref);

CREATE INDEX idx_cmd_policy      ON cm_documents(policy_ref);

CREATE INDEX idx_cmd_source      ON cm_documents(primary_source_ref);

CREATE INDEX idx_cmd_state       ON cm_documents(publication_state);

CREATE INDEX idx_cmd_type        ON cm_documents(doc_type);

CREATE INDEX idx_cmd_updated     ON cm_documents(updated_at);

CREATE INDEX idx_cmd_user        ON cm_documents(core_user_ref);

CREATE INDEX idx_cmd_workspace   ON cm_documents(workspace_ref);

CREATE INDEX idx_cmdist_channel  ON cm_distributions(channel);

CREATE INDEX idx_cmdist_pub      ON cm_distributions(pub_id);

CREATE INDEX idx_cmdist_status   ON cm_distributions(status);

CREATE INDEX idx_cmdv_doc        ON cm_document_versions(doc_id);

CREATE INDEX idx_cmdv_user       ON cm_document_versions(core_user_ref);

CREATE INDEX idx_cmh_note        ON cm_highlights(note_ref);

CREATE INDEX idx_cmh_target      ON cm_highlights(target_ref);

CREATE INDEX idx_cmh_user        ON cm_highlights(core_user_ref);

CREATE INDEX idx_cmh_workspace   ON cm_highlights(workspace_ref);

CREATE INDEX idx_cmma_policy     ON cm_media_assets(policy_ref);

CREATE INDEX idx_cmma_state      ON cm_media_assets(publication_state);

CREATE INDEX idx_cmma_type       ON cm_media_assets(asset_type);

CREATE INDEX idx_cmma_user       ON cm_media_assets(core_user_ref);

CREATE INDEX idx_cmma_workspace  ON cm_media_assets(workspace_ref);

CREATE INDEX idx_cmmc_asset      ON cm_media_chapters(asset_id);

CREATE INDEX idx_cmmt_asset      ON cm_media_transcripts(asset_id);

CREATE INDEX idx_cmmt_lang       ON cm_media_transcripts(language);

CREATE INDEX idx_cmn_pinned      ON cm_notes(core_user_ref, is_pinned);

CREATE INDEX idx_cmn_policy      ON cm_notes(policy_ref);

CREATE INDEX idx_cmn_type        ON cm_notes(note_type);

CREATE INDEX idx_cmn_updated     ON cm_notes(updated_at);

CREATE INDEX idx_cmn_user        ON cm_notes(core_user_ref);

CREATE INDEX idx_cmn_workspace   ON cm_notes(workspace_ref);

CREATE INDEX idx_cmnt_note       ON cm_note_targets(note_id);

CREATE INDEX idx_cmnt_relation   ON cm_note_targets(relation_type);

CREATE INDEX idx_cmnt_target     ON cm_note_targets(target_ref);

CREATE INDEX idx_cmpub_asset     ON cm_publications(asset_ref);

CREATE INDEX idx_cmpub_at        ON cm_publications(published_at);

CREATE INDEX idx_cmpub_doc       ON cm_publications(doc_ref);

CREATE INDEX idx_cmpub_policy    ON cm_publications(policy_ref);

CREATE INDEX idx_cmpub_state     ON cm_publications(publication_state);

CREATE INDEX idx_cmpub_user      ON cm_publications(core_user_ref);

CREATE INDEX idx_cmpub_workspace ON cm_publications(workspace_ref);

CREATE INDEX idx_cmrl_ai         ON cm_resource_links(is_ai_suggested);

CREATE INDEX idx_cmrl_source     ON cm_resource_links(source_ref);

CREATE INDEX idx_cmrl_target     ON cm_resource_links(target_ref);

CREATE INDEX idx_cmrl_type       ON cm_resource_links(link_type);

CREATE INDEX idx_cmrl_user       ON cm_resource_links(core_user_ref);

CREATE INDEX idx_cms_policy      ON cm_sources(policy_ref);

CREATE INDEX idx_cms_status      ON cm_sources(status);

CREATE INDEX idx_cms_type        ON cm_sources(source_type);

CREATE INDEX idx_cms_user        ON cm_sources(core_user_ref);

CREATE INDEX idx_cms_workspace   ON cm_sources(workspace_ref);

CREATE INDEX idx_cms_wv_ref      ON cm_sources(wv_source_ref);

CREATE INDEX idx_cmsc_embedded   ON cm_source_chunks(is_embedded);

CREATE INDEX idx_cmsc_kind       ON cm_source_chunks(source_id, chunk_kind);

CREATE INDEX idx_cmsc_qdrant     ON cm_source_chunks(qdrant_id);

CREATE INDEX idx_cmsc_source     ON cm_source_chunks(source_id);

CREATE INDEX idx_cmsc_unit       ON cm_source_chunks(unit_id);

CREATE INDEX idx_cmsd_source     ON cm_source_details(source_id);

CREATE INDEX idx_cmsl_active     ON cm_share_links(is_active);

CREATE INDEX idx_cmsl_expires    ON cm_share_links(expires_at);

CREATE INDEX idx_cmsl_resource   ON cm_share_links(resource_ref);

CREATE INDEX idx_cmsl_user       ON cm_share_links(core_user_ref);

CREATE INDEX idx_cmstoc_parent   ON cm_source_toc(parent_toc_id);

CREATE INDEX idx_cmstoc_source   ON cm_source_toc(source_id);

CREATE INDEX idx_cmstoc_unit     ON cm_source_toc(unit_id);

CREATE INDEX idx_cmsu_order      ON cm_source_units(source_id, seq_order);

CREATE INDEX idx_cmsu_parent     ON cm_source_units(parent_unit_id);

CREATE INDEX idx_cmsu_source     ON cm_source_units(source_id);

CREATE INDEX idx_cmsu_toc        ON cm_source_units(toc_id);

CREATE INDEX idx_cmsu_type       ON cm_source_units(unit_type);
