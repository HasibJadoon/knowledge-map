-- 0023_citation_spine.sql
-- Roam-style backlink spine for root layers.
--
-- One edge table. Read forward (from_layer, from_id) = a layer's sources;
-- read backward (to_ref) = a resource's "Linked References". The link target is
-- a TYPED resource ref, not a hard FK, because the resources it points at live
-- in different D1 databases (lexicon/roots in AL, tafsīr + sentence-structure in
-- QR) and this repo's cross-domain contract is typed refs, not cross-DB joins.
--
-- to_ref schemes:
--   ALB:<block_id>     — ar_ling_lexicon_blocks         (precise passage)
--   ALE:<entry_id>     — ar_ling_lexicon_root_entries   (book + root + page)
--   ALS:<schol_id>     — ar_ling_root_scholarship
--   SRC:<slug>         — ar_ling_sources                (un-ingested classical work)
--   ALGEN:<slug>       — internal synthesis/derived projection (memlet, near-syn)
--   AREX:<expr_id>     — ar_ling_expressions            (idioms / expressions)
--   QRT:<tafsir_id>    — qr_tafsir_entries              (cross-domain, QR)
--   QR:<surah>:<ayah>  — Qurʾān āyah                     (cross-domain, QR)
--   SS:<node_id>       — sentence-structure node        (cross-domain, QR)
--
-- from_layer covers every root layer and generalises to SS / expressions /
-- memlet panels / tafsīr use as those are wired in.

CREATE TABLE IF NOT EXISTS ar_ling_citations (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT,                          -- nullable: non-root layers (SS, ayah)
  from_layer    TEXT NOT NULL,                 -- 'root_stage'|'root_sense'|'root_beat'|'root_story'|'root_dna'|'root_dev_stage'|'expression'|'memlet'|'ss'|'tafsir_use'|…
  from_id       TEXT NOT NULL,                 -- the citing layer row id
  to_ref        TEXT NOT NULL,                 -- typed resource ref (see schemes above)
  to_kind       TEXT NOT NULL,                 -- 'lexicon_block'|'lexicon_entry'|'scholarship'|'source'|'synthesis'|'expression'|'tafsir'|'ayah'|'sentence_structure'
  relation      TEXT NOT NULL DEFAULT 'grounds', -- 'grounds'|'attests'|'illustrates'|'contrasts'|'derived'
  source_slug   TEXT,                          -- carried for display / reader deep-link
  page_no       INTEGER,
  quote_ar      TEXT,                          -- verbatim snippet to show at the link
  confidence    REAL,
  origin        TEXT NOT NULL DEFAULT 'backfill', -- 'backfill'|'authored'|'derived'
  status        TEXT NOT NULL DEFAULT 'live',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_layer, from_id, to_ref, relation)
);

CREATE INDEX IF NOT EXISTS idx_alc_root   ON ar_ling_citations(root_norm);
CREATE INDEX IF NOT EXISTS idx_alc_from   ON ar_ling_citations(from_layer, from_id);
CREATE INDEX IF NOT EXISTS idx_alc_toref  ON ar_ling_citations(to_ref);   -- reverse "linked references"
CREATE INDEX IF NOT EXISTS idx_alc_tokind ON ar_ling_citations(to_kind);
CREATE INDEX IF NOT EXISTS idx_alc_slug   ON ar_ling_citations(source_slug);
