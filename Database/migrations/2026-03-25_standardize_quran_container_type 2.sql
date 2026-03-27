-- Migration: 2026-03-25 — Standardize Quran container type
--
-- Quran container IDs remain under the QURAN namespace:
--   C:QURAN:{surah}
-- but the container_type stored in ar_containers is normalized to:
--   quran

UPDATE ar_containers
SET
  container_type = 'quran',
  updated_at = datetime('now')
WHERE id LIKE 'C:QURAN:%'
  AND LOWER(COALESCE(container_type, '')) <> 'quran';
