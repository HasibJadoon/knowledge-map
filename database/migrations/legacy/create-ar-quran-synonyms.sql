--------------------------------------------------------------------------------
-- ar_quran_synonym_topics / ar_quran_synonym_topic_words
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ar_quran_synonym_topics (
  topic_id   TEXT PRIMARY KEY,
  topic_en   TEXT NOT NULL,
  topic_ur   TEXT,
  meta_json  JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ar_quran_synonym_topic_words (
  topic_id    TEXT NOT NULL,
  word_norm   TEXT NOT NULL,
  word_ar     TEXT,
  word_en     TEXT,
  root_norm   TEXT,
  root_ar     TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  meta_json   JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  PRIMARY KEY (topic_id, word_norm),
  FOREIGN KEY (topic_id) REFERENCES ar_quran_synonym_topics(topic_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_syn_topic_words_word
  ON ar_quran_synonym_topic_words(word_norm);

CREATE INDEX IF NOT EXISTS idx_syn_topic_words_topic
  ON ar_quran_synonym_topic_words(topic_id);
