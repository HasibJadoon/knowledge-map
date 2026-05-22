-- 0003_st_participant_account.sql — link cast members to real accounts
-- A cast participant may be tied to a CORE user account. When that user joins a
-- live session, the EpisodeSession matches their X-KM-User-Id against this
-- column and identifies them automatically. NULL = an unlinked, label-only
-- cast member that no joiner will resolve to.

ALTER TABLE st_participants ADD COLUMN core_user_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_st_participants_user
  ON st_participants(core_user_ref);
