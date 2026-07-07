------------------------------------------------------------------------------
-- 015 · Morphology card — compact sense synopsis
--
-- The Surah → Morphology grid card shows a compact "range of meanings" line.
-- For an authored/anchor word this is a 360° synthesis: a semantic ARC
-- (e.g. "separation → clarity") over a RANGE of glosses
-- (e.g. "clear · manifest · self-evident · that which makes plain").
--
-- Both are stored on the display-word row (the table is the source of truth —
-- never hardcode this in the UI). The card promotes the arc when present and
-- otherwise falls back to the range, then to gloss_en / quran_meanings.
--
-- English-primary card summaries (the grid card synopsis renders EN, left-
-- aligned); Arabic/Urdu variants can be added later if the card localises.
------------------------------------------------------------------------------

ALTER TABLE qr_morph_display_words ADD COLUMN sense_arc_en   TEXT;  -- "separation → clarity"
ALTER TABLE qr_morph_display_words ADD COLUMN sense_range_en TEXT;  -- "clear · manifest · self-evident · that which makes plain"
