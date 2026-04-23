PRAGMA foreign_keys = ON;

-- Safety no-op:
-- This migration previously dropped core ar_u/ar_occ tables, including ar_u_lexicon.
-- That caused production data loss when replayed in environments with live data.
-- Keep this migration inert; explicit cleanup should happen in narrowly scoped
-- follow-up migrations with backup/recovery controls.
