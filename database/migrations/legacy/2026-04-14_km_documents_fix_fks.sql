-- Fix FK references to match actual production table names
-- Drop all km_documents related tables and recreate with correct FKs

DROP TABLE IF EXISTS km_docs_fts;
DROP TABLE IF EXISTS km_doc_media;
DROP TABLE IF EXISTS km_doc_tasks;
DROP TABLE IF EXISTS km_block_arabic_links;
DROP TABLE IF EXISTS km_block_source_links;
DROP TABLE IF EXISTS km_block_quran_links;
DROP TABLE IF EXISTS km_block_wv_links;
DROP TABLE IF EXISTS km_document_versions;
DROP TABLE IF EXISTS km_documents;

-- km_documents: primary document table (corrected FKs)
CREATE TABLE km_documents (
  id               TEXT PRIMARY KEY,
  workspace_id     INTEGER REFERENCES workspaces(id),
  title            TEXT NOT NULL DEFAULT 'Untitled',
  doc_type         TEXT NOT NULL DEFAULT 'note',
  domain           TEXT NOT NULL DEFAULT 'general',
  document_json    TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  status           TEXT NOT NULL DEFAULT 'draft',
  container_id     INTEGER REFERENCES ar_containers(id),
  unit_id          INTEGER REFERENCES ar_container_units(id),
  source_id        INTEGER REFERENCES wv_sources(id),
  source_unit_id   INTEGER REFERENCES wv_source_units(id),
  surah            INTEGER,
  ayah_from        INTEGER,
  ayah_to          INTEGER,
  canonical_ref    TEXT,
  production_type  TEXT,
  target_audience  TEXT,
  tags_json        TEXT DEFAULT '[]',
  word_count       INTEGER DEFAULT 0,
  is_template      INTEGER DEFAULT 0,
  parent_doc_id    TEXT REFERENCES km_documents(id),
  sort_order       INTEGER DEFAULT 0,
  created_by       TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  published_at     TEXT
);

CREATE INDEX idx_kmdoc_workspace ON km_documents(workspace_id, status);
CREATE INDEX idx_kmdoc_domain    ON km_documents(domain, doc_type);
CREATE INDEX idx_kmdoc_updated   ON km_documents(updated_at DESC);
CREATE INDEX idx_kmdoc_source    ON km_documents(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_kmdoc_quran     ON km_documents(surah, ayah_from, ayah_to) WHERE surah IS NOT NULL;

-- Version snapshots
CREATE TABLE km_document_versions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id   TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  version_num   INTEGER NOT NULL,
  title         TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  word_count    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE (document_id, version_num)
);
CREATE INDEX idx_kmdocv_doc ON km_document_versions(document_id, version_num DESC);

-- Block → WV entity links
CREATE TABLE km_block_wv_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  rel_type    TEXT DEFAULT 'related',
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_kmblkwv        ON km_block_wv_links(document_id, block_id);
CREATE INDEX idx_kmblkwv_entity ON km_block_wv_links(entity_type, entity_id);

-- Block → Quran ayah links
CREATE TABLE km_block_quran_links (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id     TEXT NOT NULL,
  surah        INTEGER NOT NULL,
  ayah_from    INTEGER NOT NULL,
  ayah_to      INTEGER NOT NULL,
  relationship TEXT DEFAULT 'related',
  note         TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_kmblkqr      ON km_block_quran_links(document_id, block_id);
CREATE INDEX idx_kmblkqr_ayah ON km_block_quran_links(surah, ayah_from, ayah_to);

-- Block → Source links (corrected FKs)
CREATE TABLE km_block_source_links (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id    TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id       TEXT NOT NULL,
  source_id      INTEGER NOT NULL REFERENCES wv_sources(id),
  source_unit_id INTEGER REFERENCES wv_source_units(id),
  page_ref       INTEGER,
  quote_text     TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Block → Arabic entity links
CREATE TABLE km_block_arabic_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_kmblkar ON km_block_arabic_links(document_id, block_id);

-- Task extraction registry
CREATE TABLE km_doc_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id     TEXT NOT NULL,
  plan_item_id INTEGER REFERENCES wv_plan_item(id),
  title        TEXT NOT NULL,
  due_date     TEXT,
  priority     INTEGER DEFAULT 2,
  status       TEXT DEFAULT 'pending',
  created_at   TEXT DEFAULT (datetime('now'))
);

-- R2 media registry
CREATE TABLE km_doc_media (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id    TEXT,
  r2_key      TEXT NOT NULL UNIQUE,
  url         TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  file_name   TEXT,
  size_bytes  INTEGER,
  width       INTEGER,
  height      INTEGER,
  alt_text    TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE km_docs_fts USING fts5(
  id UNINDEXED, title, document_json,
  content=km_documents, content_rowid=rowid
);

CREATE TRIGGER km_docs_ai AFTER INSERT ON km_documents BEGIN
  INSERT INTO km_docs_fts(rowid, id, title, document_json)
  VALUES (new.rowid, new.id, new.title, new.document_json);
END;

CREATE TRIGGER km_docs_au AFTER UPDATE ON km_documents BEGIN
  INSERT INTO km_docs_fts(km_docs_fts, rowid, id, title, document_json)
  VALUES ('delete', old.rowid, old.id, old.title, old.document_json);
  INSERT INTO km_docs_fts(rowid, id, title, document_json)
  VALUES (new.rowid, new.id, new.title, new.document_json);
END;

CREATE TRIGGER km_docs_ad AFTER DELETE ON km_documents BEGIN
  INSERT INTO km_docs_fts(km_docs_fts, rowid, id, title, document_json)
  VALUES ('delete', old.rowid, old.id, old.title, old.document_json);
END;
