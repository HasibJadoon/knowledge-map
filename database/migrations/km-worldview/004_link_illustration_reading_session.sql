-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_worldview DB — Migration 004: Link illustrations to reading sessions
-- File   : database/migrations/km-worldview/004_link_illustration_reading_session.sql
-- DB     : km_worldview   (binding: DB_WV in Workers)
-- Run    : wrangler d1 execute km_worldview --file=... --remote
--
-- A source unit is a chapter; within a chapter there are several reading
-- sessions (one per reading block, rows in wv_reading_sessions). Each reading
-- session carries its own summary (summary_md) and now its own illustrations.
-- This adds a nullable reading_session_id back-reference on illustrations so the
-- reader can group a chapter's illustrations by reading session.
--
-- SQLite has no ADD COLUMN IF NOT EXISTS; this migration is run-once.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE wv_source_unit_illustrations
  ADD COLUMN reading_session_id TEXT REFERENCES wv_reading_sessions(id);

CREATE INDEX IF NOT EXISTS idx_wv_su_illus_rsession
  ON wv_source_unit_illustrations(reading_session_id, order_index);
