CREATE TABLE IF NOT EXISTS qr_irab_book_entries (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  source_slug TEXT NOT NULL,
  source_title TEXT,
  ayah_key TEXT NOT NULL,
  group_ayah_key TEXT,
  from_ayah TEXT,
  to_ayah TEXT,
  ayah_keys TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  entry_html TEXT,
  irab_text TEXT,
  grammar_role_ar TEXT,
  grammar_role_norm TEXT,
  grammar_concept_ref TEXT,
  syntax_relation_ref TEXT,
  case_concept_ref TEXT,
  mahal_concept_ref TEXT,
  al_mapping_status TEXT DEFAULT 'pending',
  al_mapping_confidence REAL,
  al_mapping_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_slug, ayah_key)
);

CREATE INDEX IF NOT EXISTS idx_qr_irab_source ON qr_irab_book_entries(source_slug);
CREATE INDEX IF NOT EXISTS idx_qr_irab_ayah ON qr_irab_book_entries(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_qr_irab_concept ON qr_irab_book_entries(grammar_concept_ref);
CREATE INDEX IF NOT EXISTS idx_qr_irab_status ON qr_irab_book_entries(al_mapping_status);

-- This source has historically appeared in local SQLite as a table named
-- "tafsir", but its content is i'rab. Remove only this i'rab-shaped material
-- from tafsir storage before loading it into qr_irab_book_entries.
DELETE FROM qr_tafsir_entries
WHERE work_id IN (
    'QR:WORK:MAHMUD_SAFI:JADWAL_IRAB',
    'QR:WORK:JADWAL_IRAB',
    'JADWAL_IRAB'
  )
   OR content_ar LIKE '%* الإعراب:%';
