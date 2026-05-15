-- ─── 0018_source_parser_hints.sql ────────────────────────────────────────────
-- Move the per-source parser-hint constants (footnote_source +
-- quran_block_shape) from lexicon_lisan.ts SOURCE_CONFIGS into the
-- ar_ling_sources columns added by 0016. After this migration, the entire
-- SOURCE_CONFIGS array can be replaced with a SourcesRepo lookup — the lisan
-- composer reads parser behaviour per row instead of from a hardcoded map.
--
-- Two parser-hint dimensions seeded:
--   footnote_source  → 'inline_brackets' | 'footnote_blocks' | 'none'
--     How footnote markers appear in this source's ingested chunks. The
--     composer chooses a different extraction strategy per value.
--   quran_block_shape → 'inline_verse' | 'cue_only_verse_in_braces'
--     Whether a block_type='quran_quote' carries the full ayah text inline,
--     or just the cue with the verse in {…} braces (resolved offline).
--
-- Values mirror the retired SOURCE_CONFIGS exactly — no behavioural change.

-- Lisan al-Arab: inline_brackets / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'inline_brackets', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_ibn_manzur_lisan_al_arab';

-- al-Sihah: none / cue_only_verse_in_braces
UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'cue_only_verse_in_braces'
WHERE slug = 'ketabonline_al_jawhari_al_sihah';

-- Kitab al-Ayn: footnote_blocks / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'footnote_blocks', quran_block_shape = 'inline_verse'
WHERE slug = 'thahabi_al_khalil_kitab_al_ayn';

-- Maqayis al-Lugha: none / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'saaid_maqayis_al_lugha';

-- al-Ubab al-Zakhir (qomra): none / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'qomra_al_ubab_al_zakhir';

-- Taj al-Arus: none / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_al_zabidi_taj_al_arus';

-- al-Misbah al-Munir (ketabonline): footnote_blocks / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'footnote_blocks', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_al_fayyumi_misbah_munir';

-- Jamharat al-Lugha (ketabonline): none / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_ibn_duraid_jamharat_al_lugha';

-- al-Qamus al-Muhit (qomra): none / inline_verse
UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'qomra_al_qamus_al_muhit';
