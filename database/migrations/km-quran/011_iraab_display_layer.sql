-- 011_iraab_display_layer.sql
-- DISPLAY-ONLY projection layer for iʿrāb books. Reads from qr_irab_source_chunks
-- and qr_irab_book_entries (already-ingested) and writes typed, ordered UI
-- blocks here.
--
-- This file MUST NOT touch any canonical analysis table:
--   qr_ss_occ_{sentence,clause,phrase,segment}
--   qr_ss_scope_{morph,grammar,balagha}_link
--   qr_ss_scope_nuance
--   qr_evidence_items, qr_analysis_claims
--
-- Naming convention is deliberately `qr_iraab_*` (double-a) to distinguish the
-- display projection from the existing `qr_irab_*` canonical/ingestion tables.
--
-- JSON columns:
--   Declared as `JSON` (purely documentary in SQLite — JSON gets NUMERIC affinity
--   and stores as TEXT at rest). Access via json_extract / json_each / -> / ->>.
--   We do NOT use CHECK(json_valid(col)) by default — validation is enforced at
--   the parser and worker layers, and the CHECKs noticeably slow batch inserts.
--   The `_json` suffix is kept on column names for grep-ability and to match
--   the rest of the QR schema.

------------------------------------------------------------------------------
-- 1. SOURCES (display-tier copy with badge metadata)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_iraab_book_display_sources (
  id                TEXT PRIMARY KEY,                  -- mirrors qr_irab_sources.id
  source_slug       TEXT NOT NULL UNIQUE,
  book_title_ar     TEXT,
  book_title_en     TEXT,
  author_name_ar    TEXT,
  author_name_en    TEXT,
  author_period     TEXT,                              -- e.g. "Classical (d. 745 AH)"
  badge_color       TEXT,                              -- UI hint, hex like '#C9A227'
  badge_glyph       TEXT,                              -- UI hint, short symbol
  short_description TEXT,
  long_description  TEXT,
  cover_image_url   TEXT,
  display_order     INTEGER DEFAULT 0,
  is_visible        INTEGER NOT NULL DEFAULT 1,
  meta_json         JSON,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

------------------------------------------------------------------------------
-- 2. BLOCKS (the main display projection)
------------------------------------------------------------------------------
-- block_type vocab (soft-validated, not CHECK-constrained so the UI can extend
-- without a migration). Renderers should fall back to 'explanation' for unknowns.
--
--   heading | subheading
--   arabic_quote | source_quote
--   explanation | irab_card | grammar_note | sarf_note | balagha_note
--   language_note                                  ← Darwish vocabulary/etymology
--   callout | warning | key_insight | author_note | teaching_note | study_summary
--   source_badge | quran_ref_chip | ayah_link | word_link | root_chip | lemma_chip
--   backlink | related_note | same_ayah_link | same_word_link | same_grammar_link
--   comparison | disagreement | raw_source | footnote | tag | review_status_badge
--   dependency_graph                              ← SVG-backed iʿrāb tree from R2
--
-- scope_type: 'word' | 'phrase' | 'clause' | 'sentence' | 'ayah'
--             | 'ayah_range' | 'ayah_group' (alias for ayah_range) | 'surah' | 'cross_ref'
-- review_status: 'ai_candidate' | 'needs_review' | 'approved' | 'rejected' | 'archived'
-- confidence: 'low' | 'medium' | 'high' | 'verified'  (display labels; map from
--             qr_analysis_claims.confidence enum or numeric heuristics in parser)
-- extraction_method: 'regex_parser' | 'entry_projection' | 'ai_extracted'
--             | 'manual' | 'imported' | 'hand_edited'
--
-- Group semantics: iʿrāb books group analysis across ayah ranges (e.g. "2:1-5"
-- as one anchor row covering 5 verses). The canonical group source is the TEXT
-- column `ayah_keys_json` (mirrors qr_irab_source_chunks.ayah_keys); the
-- integer columns `ayah_no` / `ayah_to` are best-effort and may be NULL for
-- some sources (Al-Jadwal importer bug). `ayah_group_key` is the canonical
-- display form: "2:3" for singletons, "2:1-5" for ranges.

CREATE TABLE IF NOT EXISTS qr_iraab_book_display_blocks (
  id                  TEXT PRIMARY KEY,
  -- Provenance ----------------------------------------------------------------
  source_id           TEXT,
  source_chunk_id     TEXT,                            -- → qr_irab_source_chunks.id (NULL for Phase A entry-only blocks)
  source_entry_id     TEXT,                            -- → qr_irab_book_entries.id when projected from entries (Phase A)
  source_slug         TEXT NOT NULL,
  book_title          TEXT,
  author              TEXT,
  -- Locator -------------------------------------------------------------------
  surah_no            INTEGER,
  ayah_no             INTEGER,                         -- start ayah (best-effort; trust ayah_keys_json for span)
  ayah_to             INTEGER,                         -- end ayah of range
  ayah_key            TEXT,                            -- e.g. "2:3" — singleton anchor
  ayah_group_key      TEXT,                            -- e.g. "2:1-5" — canonical group form
  ayah_keys_json      JSON,                            -- e.g. ["2:1","2:2","2:3","2:4","2:5"]
  is_grouped          INTEGER NOT NULL DEFAULT 0,      -- 1 if span > 1 ayah
  word_index          INTEGER,
  word_text           TEXT,                            -- bare word as displayed
  phrase_text         TEXT,
  scope_type          TEXT,
  -- Block identity ------------------------------------------------------------
  block_type          TEXT NOT NULL,
  block_subtype       TEXT,                            -- finer category, free-form
  display_order       INTEGER NOT NULL DEFAULT 0,
  -- Content -------------------------------------------------------------------
  title_ar            TEXT,
  title_en            TEXT,
  text_ar             TEXT,
  text_en             TEXT,
  raw_text            TEXT,                            -- preserved verbatim
  -- Denormalized arrays for one-shot UI rendering -----------------------------
  tags_json               JSON,                        -- ["tafsir","2:3","jadwal"]
  grammar_tags_json       JSON,                        -- ["اسم موصول","مبني","فاعل"]
  sarf_tags_json          JSON,                        -- ["أفعال خمسة","حذف الهمزة"]
  balagha_tags_json       JSON,                        -- ["تكرار","تبعيض"]
  quran_refs_json         JSON,                        -- [{surah,ayah,word_index?}]
  backlinks_json          JSON,                        -- [{block_id,kind,label}]
  related_links_json      JSON,                        -- [{block_id,kind,label}]
  external_resource_json  JSON,                        -- {"r2_key":"…","kind":"svg","bytes":N} for dependency_graph blocks
  -- Provenance / QA -----------------------------------------------------------
  confidence          TEXT DEFAULT 'medium',
  review_status       TEXT NOT NULL DEFAULT 'ai_candidate',
  extraction_method   TEXT DEFAULT 'regex_parser',
  meta_json           JSON,
  -- Audit ---------------------------------------------------------------------
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Idempotency key for re-parse. Phase A blocks (projected from entries) use
-- source_entry_id; Phase B/C blocks (projected from chunks) use source_chunk_id.
-- Exactly one of the two is non-NULL per block. SQLite treats NULLs as distinct
-- in UNIQUE, which gives us per-source-row deduplication for free.
CREATE UNIQUE INDEX IF NOT EXISTS uq_iraab_block_natural
  ON qr_iraab_book_display_blocks (source_chunk_id, source_entry_id, block_type, display_order);

-- Query indexes (per spec + new group/entry columns).
CREATE INDEX IF NOT EXISTS idx_iraab_block_source     ON qr_iraab_book_display_blocks (source_id);
CREATE INDEX IF NOT EXISTS idx_iraab_block_slug       ON qr_iraab_book_display_blocks (source_slug);
CREATE INDEX IF NOT EXISTS idx_iraab_block_surah      ON qr_iraab_book_display_blocks (surah_no);
CREATE INDEX IF NOT EXISTS idx_iraab_block_ayah       ON qr_iraab_book_display_blocks (surah_no, ayah_no);
CREATE INDEX IF NOT EXISTS idx_iraab_block_ayah_key   ON qr_iraab_book_display_blocks (ayah_key);
CREATE INDEX IF NOT EXISTS idx_iraab_block_group      ON qr_iraab_book_display_blocks (ayah_group_key);
CREATE INDEX IF NOT EXISTS idx_iraab_block_grouped    ON qr_iraab_book_display_blocks (surah_no, is_grouped);
CREATE INDEX IF NOT EXISTS idx_iraab_block_type       ON qr_iraab_book_display_blocks (block_type);
CREATE INDEX IF NOT EXISTS idx_iraab_block_review     ON qr_iraab_book_display_blocks (review_status);
CREATE INDEX IF NOT EXISTS idx_iraab_block_chunk      ON qr_iraab_book_display_blocks (source_chunk_id);
CREATE INDEX IF NOT EXISTS idx_iraab_block_entry      ON qr_iraab_book_display_blocks (source_entry_id);
CREATE INDEX IF NOT EXISTS idx_iraab_block_order      ON qr_iraab_book_display_blocks (surah_no, ayah_no, display_order);

------------------------------------------------------------------------------
-- 3. TAGS (normalized side-table for tag-based filters/search/counts)
-- Denormalized tags_json on the block is for one-shot render; this is for query.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_iraab_book_display_tags (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,                       -- → qr_iraab_book_display_blocks.id
  tag_kind        TEXT NOT NULL,                       -- 'general'|'grammar'|'sarf'|'balagha'|'topic'|'review'
  tag_value       TEXT NOT NULL,                       -- 'اسم موصول' | 'tafsir' | 'needs_review' …
  tag_value_norm  TEXT,                                -- diacritics-stripped form for matching
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_iraab_tag_natural
  ON qr_iraab_book_display_tags (block_id, tag_kind, tag_value);
CREATE INDEX IF NOT EXISTS idx_iraab_tag_value_norm
  ON qr_iraab_book_display_tags (tag_kind, tag_value_norm);

------------------------------------------------------------------------------
-- 4. REFS (Qur'an refs attached to blocks — surah/ayah/word/lemma/root)
-- Lets the UI quickly compute "what other blocks cite this ayah/word/root".
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_iraab_book_display_refs (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,
  ref_kind        TEXT NOT NULL,                       -- 'ayah'|'word'|'lemma'|'root'|'concept'
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_to         INTEGER,
  ayah_key        TEXT,                                -- "2:3"
  ayah_group_key  TEXT,                                -- "2:1-5" — filter by group quickly
  word_index      INTEGER,
  typed_ref       TEXT,                                -- e.g. 'AL:01HX…' | 'QR:2:3:1' | 'LX:…'
  label           TEXT,                                -- display label for the chip
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_iraab_ref_block   ON qr_iraab_book_display_refs (block_id);
CREATE INDEX IF NOT EXISTS idx_iraab_ref_ayah    ON qr_iraab_book_display_refs (surah_no, ayah_no);
CREATE INDEX IF NOT EXISTS idx_iraab_ref_group   ON qr_iraab_book_display_refs (ayah_group_key);
CREATE INDEX IF NOT EXISTS idx_iraab_ref_typed   ON qr_iraab_book_display_refs (typed_ref);

------------------------------------------------------------------------------
-- 5. LINKS (block↔block edges — backlinks, related, same-ayah/word/grammar)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_iraab_book_display_links (
  id            TEXT PRIMARY KEY,
  from_block_id TEXT NOT NULL,
  to_block_id   TEXT NOT NULL,
  link_kind     TEXT NOT NULL,                         -- 'backlink'|'related'|'same_ayah'|'same_word'|'same_grammar'|'comparison'|'disagreement'
  label         TEXT,
  weight        INTEGER NOT NULL DEFAULT 1,
  meta_json     JSON,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_iraab_link_natural
  ON qr_iraab_book_display_links (from_block_id, to_block_id, link_kind);
CREATE INDEX IF NOT EXISTS idx_iraab_link_to ON qr_iraab_book_display_links (to_block_id, link_kind);

------------------------------------------------------------------------------
-- 6. NOTES (author/teaching/footnote — attached to blocks or free-floating)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_iraab_book_display_notes (
  id              TEXT PRIMARY KEY,
  block_id        TEXT,                                -- nullable: notes can stand alone
  note_kind       TEXT NOT NULL,                       -- 'author'|'teaching'|'footnote'|'reviewer'
  note_text_ar    TEXT,
  note_text_en    TEXT,
  is_inline       INTEGER NOT NULL DEFAULT 0,          -- inline footnote vs side-note
  surah_no        INTEGER,                             -- denormalized for filtering
  ayah_no         INTEGER,
  ayah_key        TEXT,                                -- "2:3"
  ayah_group_key  TEXT,                                -- "2:1-5" — filter by group quickly
  source_slug     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  meta_json       JSON,
  review_status   TEXT NOT NULL DEFAULT 'ai_candidate',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_iraab_note_block ON qr_iraab_book_display_notes (block_id);
CREATE INDEX IF NOT EXISTS idx_iraab_note_ayah  ON qr_iraab_book_display_notes (surah_no, ayah_no);
CREATE INDEX IF NOT EXISTS idx_iraab_note_group ON qr_iraab_book_display_notes (ayah_group_key);
CREATE INDEX IF NOT EXISTS idx_iraab_note_kind  ON qr_iraab_book_display_notes (note_kind);

------------------------------------------------------------------------------
-- 7. FULL-TEXT SEARCH (optional, useful for AR+EN substring scan)
-- Contentless FTS5 mirroring the block — rebuilt by parser, not by trigger
-- (D1 trigger support is limited; the parser deletes+inserts on re-run).
-- Unicode61 with diacritics removed gives Arabic-friendly matching.
------------------------------------------------------------------------------
CREATE VIRTUAL TABLE IF NOT EXISTS qr_iraab_book_display_blocks_fts
USING fts5 (
  block_id UNINDEXED,
  source_slug UNINDEXED,
  surah_no UNINDEXED,
  ayah_no UNINDEXED,
  ayah_key UNINDEXED,
  ayah_group_key UNINDEXED,
  block_type UNINDEXED,
  title_ar, title_en,
  text_ar, text_en,
  raw_text,
  tokenize = "unicode61 remove_diacritics 2"
);
