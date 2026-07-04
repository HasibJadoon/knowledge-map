-- Doc Space (D1): owner-scoped notes + typed anchors on cm_notes (km_content).
-- cm_notes already has core_user_ref (owner); add visibility + anchor columns
-- so a note can be private/workspace/public and optionally bound to a domain
-- surface (e.g. a surah/ayah). Additive + idempotent-friendly.
ALTER TABLE cm_notes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE cm_notes ADD COLUMN domain     TEXT;
ALTER TABLE cm_notes ADD COLUMN surah      INTEGER;
ALTER TABLE cm_notes ADD COLUMN ayah_from  INTEGER;
ALTER TABLE cm_notes ADD COLUMN ayah_to    INTEGER;

CREATE INDEX IF NOT EXISTS idx_cmnotes_owner
  ON cm_notes(core_user_ref, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmnotes_anchor
  ON cm_notes(domain, surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_cmnotes_visibility
  ON cm_notes(visibility, workspace_ref, updated_at DESC);
