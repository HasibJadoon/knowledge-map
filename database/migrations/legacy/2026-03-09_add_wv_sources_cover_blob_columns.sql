-- Adds optional source-cover storage to worldview sources.
-- Title already exists as `title`; author is stored in `creator`.

ALTER TABLE wv_sources
  ADD COLUMN IF NOT EXISTS cover_blob BLOB;

ALTER TABLE wv_sources
  ADD COLUMN IF NOT EXISTS cover_mime_type TEXT;
