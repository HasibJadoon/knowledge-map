-- 012_tafsir_display_layer.sql
-- DISPLAY-ONLY projection layer for tafsir books. Reads from qr_tafsir_entries
-- (24,139 rows, entry_type='explanation' only) and writes typed, ordered UI
-- blocks here. Parallel to migration 011 (iʿrāb display layer).
--
-- ARCHITECTURE RULE — disjoint from iʿrāb display layer:
--   • This layer covers ONLY the 8 tafsir scholars:
--     TABARI, ZAMAKHSHARI, IBN_ATIYYA, RAZI, ABU_HAYYAN, IBN_KATHIR,
--     ALUSI, IBN_ASHUR.
--   • DARWISH and SAFI (iʿrāb books) are EXCLUDED — they live in
--     qr_iraab_book_display_* (migration 011). On 2026-05-15, 1,526 legacy
--     iʿrāb-typed rows were deleted from qr_tafsir_entries; the parser also
--     filters defensively by entry_type='explanation'.
--
-- This file MUST NOT touch any canonical analysis table:
--   qr_ss_occ_{sentence,clause,phrase,segment}
--   qr_ss_scope_{morph,grammar,balagha}_link
--   qr_ss_scope_nuance
--   qr_evidence_items, qr_analysis_claims
--   qr_tafsir_entries (READ-ONLY here; cleanup already happened)
--
-- JSON columns: declared as `JSON` (documentary in SQLite; access via
-- json_extract / json_each / -> / ->>). Validation enforced in parser+worker.

------------------------------------------------------------------------------
-- 1. SOURCES (scholar+work registry for the display tier)
-- Denormalized from qr_scholar_profiles + qr_scholar_works so the UI gets
-- everything it needs for the source picker without a join.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_tafsir_book_display_sources (
  id                 TEXT PRIMARY KEY,                  -- mirrors qr_scholar_works.id
  source_slug        TEXT NOT NULL UNIQUE,              -- 'tabari','razi','zamakhshari',…
  scholar_id         TEXT,                              -- → qr_scholar_profiles.id
  work_id            TEXT,                              -- → qr_scholar_works.id
  book_title_ar      TEXT,
  book_title_en      TEXT,
  author_name_ar     TEXT,
  author_name_en     TEXT,
  author_kunya       TEXT,
  author_laqab       TEXT,
  death_year_hijri   INTEGER,
  death_year_ce      INTEGER,
  era                TEXT,                              -- 'classical' | 'modern'
  madhab             TEXT,                              -- 'sunni'|'maliki'|'shafii'|'hanbali'|'hanafi'|'mutazili'|'ashari'
  kalam_school       TEXT,
  specialization     TEXT,
  badge_color        TEXT,                              -- UI hint, hex
  badge_glyph        TEXT,                              -- UI hint, short symbol
  markup_tier        TEXT,                              -- 'full' | 'minimal' | 'none'
  short_description  TEXT,
  long_description   TEXT,
  cover_image_url    TEXT,
  display_order      INTEGER DEFAULT 0,
  is_visible         INTEGER NOT NULL DEFAULT 1,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tafsir_display_sources_madhab  ON qr_tafsir_book_display_sources (madhab);
CREATE INDEX IF NOT EXISTS idx_tafsir_display_sources_era     ON qr_tafsir_book_display_sources (era);
CREATE INDEX IF NOT EXISTS idx_tafsir_display_sources_order   ON qr_tafsir_book_display_sources (display_order);

------------------------------------------------------------------------------
-- 2. BLOCKS (the main display projection)
------------------------------------------------------------------------------
-- block_type vocab (soft-validated, not CHECK-constrained):
--
--   tafsir_card           main per-entry block (Phase A primary output)
--   paragraph_section     sub-block of long entries (Phase A segmentation)
--   isnad                 extracted narration chain (Tabari, Ibn Kathir)
--   voice_marker          speaker tag e.g. "قال أبو جعفر:" (Tabari self-voice)
--   poetry_quote          shawāhid with ؎ / ∗∗∗ markers (Abu Hayyan)
--   verse_anchor          "قَوْلُهُ تَعالى: ﴿…﴾" opener
--   scholar_response      typed link to qr_scholar_positions or another block
--   reception_note        projection from qr_surah_reception_histories
--   paradigm_chip         Muʿtazilī / Ashʿarī badge
--   hadith_source_chip    inline source citation chip
--   (plus the shared vocab from migration 011: heading, subheading,
--    arabic_quote, source_quote, explanation, callout, warning, key_insight,
--    author_note, teaching_note, study_summary, source_badge, quran_ref_chip,
--    ayah_link, word_link, root_chip, lemma_chip, backlink, related_note,
--    same_ayah_link, same_word_link, same_grammar_link, comparison,
--    disagreement, raw_source, footnote, tag, review_status_badge)
--
-- scope_type: 'word'|'phrase'|'clause'|'sentence'|'ayah'|'ayah_range'|'ayah_group'|'surah'|'cross_ref'
-- review_status: 'ai_candidate'|'needs_review'|'approved'|'rejected'|'archived'
-- confidence: 'low'|'medium'|'high'|'verified'
-- extraction_method: 'entry_projection'|'regex_parser'|'ai_extracted'|'manual'|'imported'|'hand_edited'
-- markup_tier: 'full'|'minimal'|'none' (copied from source, tells renderer how
--              to handle raw_text HTML)

CREATE TABLE IF NOT EXISTS qr_tafsir_book_display_blocks (
  id                       TEXT PRIMARY KEY,
  -- Provenance --------------------------------------------------------------
  source_id                TEXT,
  source_tafsir_entry_id   TEXT,                        -- → qr_tafsir_entries.id (Phase A)
  source_slug              TEXT NOT NULL,
  book_title               TEXT,
  author                   TEXT,
  -- Scholar metadata denormalized for fast filter/render --------------------
  scholar_id               TEXT,                        -- → qr_scholar_profiles.id
  work_id                  TEXT,                        -- → qr_scholar_works.id
  scholar_name_ar          TEXT,
  scholar_name_en          TEXT,
  madhab                   TEXT,
  era                      TEXT,
  kalam_school             TEXT,
  death_year_hijri         INTEGER,
  -- Locator -----------------------------------------------------------------
  surah_no                 INTEGER,
  ayah_no                  INTEGER,                     -- start ayah
  ayah_to                  INTEGER,                     -- end ayah (range)
  ayah_key                 TEXT,                        -- "2:255"
  ayah_group_key           TEXT,                        -- "3:131-133"
  ayah_keys_json           JSON,                        -- ["3:131","3:132","3:133"]
  is_grouped               INTEGER NOT NULL DEFAULT 0,
  word_index               INTEGER,
  word_text                TEXT,
  phrase_text              TEXT,
  scope_type               TEXT,
  -- Block identity ----------------------------------------------------------
  block_type               TEXT NOT NULL,
  block_subtype            TEXT,
  display_order            INTEGER NOT NULL DEFAULT 0,
  paragraph_index          INTEGER,                     -- for paragraph_section blocks
  paragraph_count          INTEGER,                     -- total in source entry
  is_long_form             INTEGER NOT NULL DEFAULT 0,  -- 1 if source >5000 chars
  -- Content -----------------------------------------------------------------
  title_ar                 TEXT,
  title_en                 TEXT,
  text_ar                  TEXT,                        -- HTML-stripped
  text_en                  TEXT,                        -- reserved (NULL today)
  raw_text                 TEXT,                        -- verbatim with markup
  markup_tier              TEXT,                        -- copied from source
  source_page              TEXT,                        -- e.g. '٤' or '39'
  -- Denormalized arrays for one-shot UI render ------------------------------
  tags_json                JSON,                        -- ["explanation","tabari","narration"]
  grammar_tags_json        JSON,                        -- nullable
  theology_tags_json       JSON,                        -- ["mutazili_rebuttal","ashari_response"]
  narration_tags_json      JSON,                        -- ["sahih_muslim","sahih_bukhari"]
  quran_refs_json          JSON,                        -- [{surah,ayah,…}]
  scholar_refs_json        JSON,                        -- [{scholar_id,role,label}] who's quoted/responded
  backlinks_json           JSON,                        -- [{block_id,kind,label}]
  related_links_json       JSON,
  external_resource_json   JSON,                        -- reserved for audio/scan refs
  -- QA --------------------------------------------------------------------
  confidence               TEXT DEFAULT 'medium',
  review_status            TEXT NOT NULL DEFAULT 'ai_candidate',
  extraction_method        TEXT DEFAULT 'entry_projection',
  meta_json                JSON,                        -- structured payload (isnad_chain, paragraph_offsets, source_quote_hash, …)
  -- Audit -----------------------------------------------------------------
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Idempotency key — entry-level uniqueness incl. paragraph segmentation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tafsir_block_natural
  ON qr_tafsir_book_display_blocks (source_tafsir_entry_id, block_type, display_order, paragraph_index);

-- Primary read path: per verse × per scholar.
CREATE INDEX IF NOT EXISTS idx_tafsir_block_ayah_scholar
  ON qr_tafsir_book_display_blocks (surah_no, ayah_no, scholar_id, display_order);

-- Other access patterns.
CREATE INDEX IF NOT EXISTS idx_tafsir_block_source      ON qr_tafsir_book_display_blocks (source_id);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_slug        ON qr_tafsir_book_display_blocks (source_slug);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_surah       ON qr_tafsir_book_display_blocks (surah_no);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_ayah        ON qr_tafsir_book_display_blocks (surah_no, ayah_no);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_ayah_key    ON qr_tafsir_book_display_blocks (ayah_key);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_group       ON qr_tafsir_book_display_blocks (ayah_group_key);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_grouped     ON qr_tafsir_book_display_blocks (surah_no, is_grouped);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_scholar     ON qr_tafsir_book_display_blocks (scholar_id, surah_no);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_work        ON qr_tafsir_book_display_blocks (work_id, surah_no);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_madhab_era  ON qr_tafsir_book_display_blocks (madhab, era);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_type        ON qr_tafsir_book_display_blocks (block_type);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_review      ON qr_tafsir_book_display_blocks (review_status);
CREATE INDEX IF NOT EXISTS idx_tafsir_block_entry       ON qr_tafsir_book_display_blocks (source_tafsir_entry_id);

------------------------------------------------------------------------------
-- 3. TAGS (normalized side-table)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_tafsir_book_display_tags (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,                        -- → blocks.id
  tag_kind        TEXT NOT NULL,                        -- 'general'|'narration'|'theology'|'paradigm'|'madhab'|'topic'|'review'
  tag_value       TEXT NOT NULL,
  tag_value_norm  TEXT,                                 -- diacritic-stripped
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tafsir_tag_natural
  ON qr_tafsir_book_display_tags (block_id, tag_kind, tag_value);
CREATE INDEX IF NOT EXISTS idx_tafsir_tag_value_norm
  ON qr_tafsir_book_display_tags (tag_kind, tag_value_norm);

------------------------------------------------------------------------------
-- 4. REFS (typed refs attached to blocks)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_tafsir_book_display_refs (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,
  ref_kind        TEXT NOT NULL,                        -- 'ayah'|'word'|'lemma'|'root'|'concept'|'scholar'|'position'|'hadith_source'
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_to         INTEGER,
  ayah_key        TEXT,
  ayah_group_key  TEXT,
  word_index      INTEGER,
  typed_ref       TEXT,                                 -- 'QR:2:3' | 'QR:SCH:TABARI' | 'QR:POSITION:01HX…' | 'HADITH:MUSLIM:V5/P133'
  label           TEXT,
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tafsir_ref_block  ON qr_tafsir_book_display_refs (block_id);
CREATE INDEX IF NOT EXISTS idx_tafsir_ref_ayah   ON qr_tafsir_book_display_refs (surah_no, ayah_no);
CREATE INDEX IF NOT EXISTS idx_tafsir_ref_group  ON qr_tafsir_book_display_refs (ayah_group_key);
CREATE INDEX IF NOT EXISTS idx_tafsir_ref_typed  ON qr_tafsir_book_display_refs (typed_ref);

------------------------------------------------------------------------------
-- 5. LINKS (block↔block edges and cross-domain typed refs)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_tafsir_book_display_links (
  id              TEXT PRIMARY KEY,
  from_block_id   TEXT NOT NULL,
  to_block_id     TEXT,                                 -- nullable when target is a canonical record
  to_typed_ref    TEXT,                                 -- 'QR:POSITION:01HX…' | 'QR:INTERPRETIVE_DIFF:…'
  link_kind       TEXT NOT NULL,                        -- 'backlink'|'related'|'same_ayah'|'same_word'|'same_grammar'|'same_paradigm'|'comparison'|'disagreement'|'scholar_response'|'reception_note'|'isnad_continues'
  label           TEXT,
  weight          INTEGER NOT NULL DEFAULT 1,
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tafsir_link_natural
  ON qr_tafsir_book_display_links (from_block_id, to_block_id, link_kind);
CREATE INDEX IF NOT EXISTS idx_tafsir_link_to        ON qr_tafsir_book_display_links (to_block_id, link_kind);
CREATE INDEX IF NOT EXISTS idx_tafsir_link_to_typed  ON qr_tafsir_book_display_links (to_typed_ref);

------------------------------------------------------------------------------
-- 6. NOTES (footnotes / asides / teaching notes / source citations)
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_tafsir_book_display_notes (
  id              TEXT PRIMARY KEY,
  block_id        TEXT,                                 -- nullable: notes can float
  note_kind       TEXT NOT NULL,                        -- 'author'|'teaching'|'footnote'|'reviewer'|'editorial'|'source_citation'|'mutazili_rebuttal'
  note_text_ar    TEXT,
  note_text_en    TEXT,
  is_inline       INTEGER NOT NULL DEFAULT 0,
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_key        TEXT,
  ayah_group_key  TEXT,
  source_slug     TEXT,
  scholar_id      TEXT,                                 -- which scholar's note this is
  display_order   INTEGER NOT NULL DEFAULT 0,
  meta_json       JSON,                                 -- e.g. {"hadith_book":"المسند","volume":5,"page":133}
  review_status   TEXT NOT NULL DEFAULT 'ai_candidate',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tafsir_note_block   ON qr_tafsir_book_display_notes (block_id);
CREATE INDEX IF NOT EXISTS idx_tafsir_note_ayah    ON qr_tafsir_book_display_notes (surah_no, ayah_no);
CREATE INDEX IF NOT EXISTS idx_tafsir_note_group   ON qr_tafsir_book_display_notes (ayah_group_key);
CREATE INDEX IF NOT EXISTS idx_tafsir_note_kind    ON qr_tafsir_book_display_notes (note_kind);
CREATE INDEX IF NOT EXISTS idx_tafsir_note_scholar ON qr_tafsir_book_display_notes (scholar_id);

------------------------------------------------------------------------------
-- 7. FULL-TEXT SEARCH (contentless FTS5, Arabic+English with diacritic folding)
-- Includes scholar/madhab/era projections so search can filter without join.
------------------------------------------------------------------------------
CREATE VIRTUAL TABLE IF NOT EXISTS qr_tafsir_book_display_blocks_fts
USING fts5 (
  block_id UNINDEXED,
  source_slug UNINDEXED,
  scholar_id UNINDEXED,
  madhab UNINDEXED,
  era UNINDEXED,
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

------------------------------------------------------------------------------
-- 8. SEED — the 8 tafsir display sources (one per scholar/work)
-- Death years and metadata mirror qr_scholar_profiles; badge color/glyph and
-- markup_tier are display-tier configuration. Idempotent via INSERT OR IGNORE
-- so re-running this migration is safe.
------------------------------------------------------------------------------
INSERT OR IGNORE INTO qr_tafsir_book_display_sources
  (id, source_slug, scholar_id, work_id, book_title_ar, book_title_en,
   author_name_ar, author_name_en, author_kunya, author_laqab,
   death_year_hijri, death_year_ce, era, madhab, kalam_school, specialization,
   badge_color, badge_glyph, markup_tier, short_description, display_order, is_visible)
VALUES
  ('QR:WORK:TABARI:AR-TAFSIR-AL', 'tabari',
   'QR:SCH:TABARI', 'QR:WORK:TABARI:AR-TAFSIR-AL',
   'جامع البيان عن تأويل آي القرآن', 'Jāmiʿ al-Bayān',
   'محمد بن جرير الطبري', 'al-Ṭabarī', 'أبو جعفر', 'شيخ المفسرين',
   310, 923, 'classical', 'sunni', NULL, 'narration-based exegesis (tafsīr bi-l-maʾthūr)',
   '#8B5E3C', 'ط', 'minimal',
   'Foundational narration-based tafsīr with extensive isnād chains.', 1, 1),

  ('QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-', 'zamakhshari',
   'QR:SCH:ZAMAKHSHARI', 'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-',
   'الكشاف عن حقائق التنزيل', 'al-Kashshāf',
   'محمود بن عمر الزمخشري', 'al-Zamakhsharī', 'أبو القاسم', 'جار الله',
   538, 1144, 'classical', 'mutazili', 'mutazili', 'rhetorical/Muʿtazilī exegesis',
   '#6E588E', 'ز', 'none',
   'Rhetorical Muʿtazilī tafsīr; concise, dialectical fa-in qulta–qultu style.', 2, 1),

  ('QR:WORK:IBN_ATIYYA:AL-MUHARRAR-', 'ibn_atiyya',
   'QR:SCH:IBN_ATIYYA', 'QR:WORK:IBN_ATIYYA:AL-MUHARRAR-',
   'المحرر الوجيز في تفسير الكتاب العزيز', 'al-Muḥarrar al-Wajīz',
   'عبد الحق بن غالب ابن عطية', 'Ibn ʿAṭiyya', 'أبو محمد', NULL,
   542, 1147, 'classical', 'maliki', 'ashari', 'concise Andalusian-Maghribī tafsīr',
   '#2F7A5C', 'ع', 'minimal',
   'Concise classical Andalusian-Maghribī tafsīr; tight selection of narrations.', 3, 1),

  ('QR:WORK:RAZI:TAFSIR-AL-RA', 'razi',
   'QR:SCH:RAZI', 'QR:WORK:RAZI:TAFSIR-AL-RA',
   'مفاتيح الغيب', 'Mafātīḥ al-Ghayb',
   'فخر الدين الرازي', 'al-Rāzī', 'أبو عبد الله', 'فخر الدين',
   606, 1209, 'classical', 'ashari', 'ashari', 'philosophical / kalām-driven exegesis',
   '#B0533A', 'ر', 'full',
   'Philosophical Ashʿarī tafsīr; numbered masāʾil / fuṣūl structure.', 4, 1),

  ('QR:WORK:ABU_HAYYAN:AL-BAHR-AL-M', 'abu_hayyan',
   'QR:SCH:ABU_HAYYAN', 'QR:WORK:ABU_HAYYAN:AL-BAHR-AL-M',
   'البحر المحيط في التفسير', 'al-Baḥr al-Muḥīṭ',
   'أبو حيان الأندلسي', 'Abū Ḥayyān al-Andalusī', 'أبو حيان', 'أثير الدين',
   745, 1344, 'classical', 'sunni', 'ashari', 'grammar / iʿrāb-heavy exegesis',
   '#1F6F8B', 'ح', 'minimal',
   'Grammar-first tafsīr; case cataloging, shawāhid poetry, parsing enumeration.', 5, 1),

  ('QR:WORK:IBN_KATHIR:AR-TAFSIR-IB', 'ibn_kathir',
   'QR:SCH:IBN_KATHIR', 'QR:WORK:IBN_KATHIR:AR-TAFSIR-IB',
   'تفسير القرآن العظيم', 'Tafsīr al-Qurʾān al-ʿAẓīm',
   'إسماعيل بن عمر بن كثير', 'Ibn Kathīr', 'أبو الفداء', 'عماد الدين',
   774, 1373, 'classical', 'sunni', 'athari', 'narration-based exegesis, Salafī-Athari',
   '#8E6E1E', 'ك', 'minimal',
   'Popular narration-based tafsīr; rich hadith citations with volume refs.', 6, 1),

  ('QR:WORK:ALUSI:TAFSIR-AL-AL', 'alusi',
   'QR:SCH:ALUSI', 'QR:WORK:ALUSI:TAFSIR-AL-AL',
   'روح المعاني في تفسير القرآن العظيم والسبع المثاني', 'Rūḥ al-Maʿānī',
   'شهاب الدين محمود الآلوسي', 'al-Ālūsī', 'أبو الثناء', 'شهاب الدين',
   1270, 1854, 'modern', 'sunni', 'ashari', 'comprehensive late-classical synthesis',
   '#4A7BAA', 'آ', 'full',
   'Encyclopedic late-Ottoman tafsīr synthesizing classical opinions.', 7, 1),

  ('QR:WORK:IBN_ASHUR:AR-TAFSEER-T', 'ibn_ashur',
   'QR:SCH:IBN_ASHUR', 'QR:WORK:IBN_ASHUR:AR-TAFSEER-T',
   'التحرير والتنوير', 'al-Taḥrīr wa-al-Tanwīr',
   'محمد الطاهر بن عاشور', 'Ibn ʿĀshūr', NULL, NULL,
   NULL, NULL, 'modern', 'maliki', NULL, 'modern Maghribī balāgha-focused exegesis',
   '#7A4A8E', 'ش', 'full',
   'Modern Tunisian tafsīr; rhetorical and structural emphasis.', 8, 1);
