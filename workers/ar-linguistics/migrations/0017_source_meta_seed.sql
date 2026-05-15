-- ─── 0017_source_meta_seed.sql ───────────────────────────────────────────────
-- Populate slug + origin + source_order + bilingual on every D1 source row
-- that corresponds to a TS-side lexicon slug. Values mirror the retired
-- constants in lexicon.ts (SOURCE_META + SOURCE_ORDER) and lexicon_v2.ts
-- (SOURCES). Rows without a corresponding TS slug stay NULL on `slug` so
-- SourcesRepo.bySlug() ignores them (orphaned duplicates / scholarship
-- entries / synonym datasets).
--
-- source_order: lower = earlier in the catalogue.
--   1   Mufradat al-Quran  (Quran-focused; first by relevance)
--   2   Lane                (bilingual; primary English reader)
--   3   Lane (legacy slug)  (NOT in D1 yet — backward-compat alias only;
--                            inserted below as a soft duplicate of #2)
--   4   al-Sihah
--   5   Lisan al-Arab
--   6   Taj al-Arus
--   7   Maqayis al-Lugha
--   8   al-Misbah al-Munir  (qomra edition)
--   9   al-Ubab al-Zakhir   (qomra edition)
--   10  Jamharat al-Lugha   (qomra edition)
--   11  al-Qamus al-Muhit   (qomra edition)
--   12+ secondary editions of the same titles (ketabonline pipeline)
--
-- origin: the publisher/pipeline that produced the chunk corpus. Two
-- editions of the same book (e.g. al-Qamus from qomra and ketabonline)
-- have the same title but different parsing characteristics; the origin
-- distinguishes them for SourcesRepo callers.
--
-- bilingual = 1 only for Lane — the only source with an English-prose
-- column. Used by the V2 reader to render two-column layouts.

-- ── Lane (English bilingual) ────────────────────────────────────────────────
UPDATE ar_ling_sources
SET slug = 'lane_lexicon',
    origin = 'lane',
    bilingual = 1,
    source_order = 2
WHERE id = 'src_lane_lexicon';

-- ── ketabonline pipeline (primary editions) ─────────────────────────────────
UPDATE ar_ling_sources
SET slug = 'ketabonline_al_raghib_mufradat',
    origin = 'ketabonline',
    source_order = 1
WHERE id = 'SRC:KETABONLINE:MUFRADAT';

UPDATE ar_ling_sources
SET slug = 'ketabonline_al_jawhari_al_sihah',
    origin = 'ketabonline',
    source_order = 4
WHERE id = 'SRC:KETABONLINE:AL_SIHAH';

UPDATE ar_ling_sources
SET slug = 'ketabonline_ibn_manzur_lisan_al_arab',
    origin = 'ketabonline',
    source_order = 5
WHERE id = 'SRC:KETABONLINE:LISAN_AL_ARAB';

UPDATE ar_ling_sources
SET slug = 'ketabonline_al_zabidi_taj_al_arus',
    origin = 'ketabonline',
    source_order = 6
WHERE id = 'SRC:KETABONLINE:TAJ_AL_ARUS';

UPDATE ar_ling_sources
SET slug = 'ketabonline_ibn_duraid_jamharat_al_lugha',
    origin = 'ketabonline',
    source_order = 12
WHERE id = 'SRC:KETABONLINE:JAMHARAT_AL_LUGHA';

UPDATE ar_ling_sources
SET slug = 'ketabonline_al_fayyumi_misbah_munir',
    origin = 'ketabonline',
    source_order = 13
WHERE id = 'SRC:KETABONLINE:MISBAH_MUNIR';

-- ── saaid + thahabi pipelines ───────────────────────────────────────────────
UPDATE ar_ling_sources
SET slug = 'saaid_maqayis_al_lugha',
    origin = 'saaid',
    source_order = 7
WHERE id = 'SRC:SAAID:MAQAYIS_AL_LUGHA';

UPDATE ar_ling_sources
SET slug = 'thahabi_al_khalil_kitab_al_ayn',
    origin = 'thahabi',
    source_order = 14
WHERE id = 'SRC:THAHABI:KITAB_AL_AYN';

-- ── qomra pipeline (legacy editions, kept until ketabonline pair lands) ────
UPDATE ar_ling_sources
SET slug = 'qomra_al_misbah_al_munir',
    origin = 'qomra',
    source_order = 8
WHERE id = 'SRC:QOMRA:AL_MISBAH_AL_MUNIR';

UPDATE ar_ling_sources
SET slug = 'qomra_al_ubab_al_zakhir',
    origin = 'qomra',
    source_order = 9
WHERE id = 'SRC:QOMRA:AL_UBAB_AL_ZAKHIR';

UPDATE ar_ling_sources
SET slug = 'qomra_jamharat_al_lugha',
    origin = 'qomra',
    source_order = 10
WHERE id = 'SRC:QOMRA:JAMHARAT_AL_LUGHA';

UPDATE ar_ling_sources
SET slug = 'qomra_al_qamus_al_muhit',
    origin = 'qomra',
    source_order = 11
WHERE id = 'SRC:QOMRA:AL_QAMUS_AL_MUHIT';

-- ── Orphaned ketabonline duplicates ─────────────────────────────────────────
-- These rows pre-date the qomra→ketabonline migration and don't have a TS
-- slug. Mark them with origin = ketabonline so admin tooling can find them,
-- but leave `slug` NULL so SourcesRepo.bySlug() can't surface them and the
-- catalogue ordering ignores them.
UPDATE ar_ling_sources
SET origin = 'ketabonline'
WHERE id IN ('SRC:KETABONLINE:SIHAH',
             'SRC:KETABONLINE:QAMUS_MUHIT',
             'SRC:KETABONLINE:UBAB_ZAKHIR');

-- ── Lane legacy slug (lane_quranic_research_perseus) ────────────────────────
-- This slug appears in lexicon.ts SOURCE_META for backward-compat with the
-- old Perseus import. There's no corresponding D1 row — the data lives in
-- the same `src_lane_lexicon` row. Add a duplicate row that aliases to the
-- same content so route handlers can resolve the legacy slug without code
-- branching. id is namespaced under SRC:LANE so it doesn't collide with the
-- snake_case src_lane_lexicon and is easy to clean up later.
INSERT OR IGNORE INTO ar_ling_sources
  (id, title_ar, title_en, author_name, period_label, source_type, genre,
   slug, origin, bilingual, source_order)
VALUES (
  'SRC:LANE:LEGACY_PERSEUS',
  'معجم لين',
  "Lane's Arabic-English Lexicon",
  'Edward William Lane',
  '19th century',
  'lexicon',
  'classical_lexicon',
  'lane_quranic_research_perseus',
  'lane',
  1,
  3
);
