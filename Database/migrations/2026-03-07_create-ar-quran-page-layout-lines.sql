CREATE TABLE IF NOT EXISTS ar_quran_page_layout_lines (
  page_number   INTEGER NOT NULL,
  line_number   INTEGER NOT NULL,
  line_type     TEXT NOT NULL CHECK (line_type IN ('ayah', 'surah_name', 'basmallah')),
  is_centered   INTEGER NOT NULL DEFAULT 0 CHECK (is_centered IN (0, 1)),
  first_word_id INTEGER,
  last_word_id  INTEGER,
  surah_number  INTEGER,
  PRIMARY KEY (page_number, line_number),
  FOREIGN KEY (surah_number) REFERENCES ar_quran_surahs(surah) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_quran_page_layout_lines_page
  ON ar_quran_page_layout_lines(page_number);
