-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_arabic_linguistics DB — Root Search Key Normalisation
-- File   : database/migrations/km-arabic-linguistics/003_root_search_keys.sql
-- Run AFTER: 002_lx_content.sql
-- Run    : wrangler d1 execute km_arabic_linguistic --file=... --remote
--
-- Adds three cross-standard search columns to ar_ling_roots so that any
-- root can be retrieved via:
--   1. buckwalter      – standard Buckwalter/QAC notation  (ktb, $rH, HmD)
--   2. simple_lat      – all-ASCII readable Latin          (ktb, shrh, hmd)
--   3. root_normalized – Arabic with hamza/alef collapsed  (for loose Arabic search)
--
-- Also moves the QUL english_trilateral out of meaning_core_en (where it was
-- mis-stored in seed v1) into the dedicated buckwalter column, and rebuilds
-- the FTS table to cover all forms.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── New columns ─────────────────────────────────────────────────────────────
ALTER TABLE ar_ling_roots ADD COLUMN buckwalter      TEXT;
ALTER TABLE ar_ling_roots ADD COLUMN simple_lat      TEXT;
ALTER TABLE ar_ling_roots ADD COLUMN root_normalized TEXT;

-- ─── Indexes for exact-key lookups ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rl_bw      ON ar_ling_roots(buckwalter);
CREATE INDEX IF NOT EXISTS idx_rl_simple  ON ar_ling_roots(simple_lat);
CREATE INDEX IF NOT EXISTS idx_rl_norm    ON ar_ling_roots(root_normalized);

-- ─── Move mis-stored Buckwalter out of meaning_core_en ───────────────────────
-- The v1 seed wrote QUL english_trilateral into meaning_core_en.
-- Move it to the correct column and clear meaning_core_en.
UPDATE ar_ling_roots
SET    buckwalter    = meaning_core_en,
       meaning_core_en = NULL
WHERE  meaning_core_en IS NOT NULL;

-- ─── Rebuild FTS with all search forms ───────────────────────────────────────
DROP TABLE IF EXISTS ar_ling_roots_fts;

CREATE VIRTUAL TABLE ar_ling_roots_fts USING fts5(
  id            UNINDEXED,
  root_text,
  root_normalized,
  buckwalter,
  simple_lat,
  meaning_core_en,
  tokenize = "unicode61 remove_diacritics 2"
);
