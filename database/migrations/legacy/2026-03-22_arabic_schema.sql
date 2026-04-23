-- ============================================================
-- Migration: 2026-03-22 — Arabic Learning System Schema
-- Run: wrangler d1 execute knowledgemap --file=database/migrations/legacy/2026-03-22_arabic_schema.sql --remote
-- ============================================================

-- 1. Balagha — Arabic Rhetoric (3 branches)
CREATE TABLE IF NOT EXISTS ar_balagha (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  term_ar     TEXT    NOT NULL,
  term_en     TEXT    NOT NULL,
  branch      TEXT    NOT NULL CHECK(branch IN ('bayan','maani','badi')),
  definition  TEXT    NOT NULL,
  examples    TEXT,  -- JSON array of example strings
  quran_refs  TEXT,  -- JSON array of {surah, ayah} objects
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_balagha_branch ON ar_balagha(branch);
CREATE VIRTUAL TABLE IF NOT EXISTS ar_balagha_fts USING fts5(
  term_ar, term_en, definition,
  content='ar_balagha', content_rowid='id'
);

-- 2. Context Domains (home, market, mosque, etc.)
CREATE TABLE IF NOT EXISTS ar_domain (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  name_ar     TEXT    NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_domain_sort ON ar_domain(sort_order);

-- 3. Domain Phrases (vocabulary per context domain)
CREATE TABLE IF NOT EXISTS ar_domain_phrase (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id       INTEGER NOT NULL REFERENCES ar_domain(id),
  phrase_ar       TEXT    NOT NULL,
  phrase_en       TEXT    NOT NULL,
  transliteration TEXT,
  audio_url       TEXT,
  level           TEXT    NOT NULL DEFAULT 'beginner' CHECK(level IN ('beginner','intermediate','advanced')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_dp_domain ON ar_domain_phrase(domain_id);
CREATE INDEX IF NOT EXISTS idx_ar_dp_level  ON ar_domain_phrase(level);
CREATE VIRTUAL TABLE IF NOT EXISTS ar_domain_phrase_fts USING fts5(
  phrase_ar, phrase_en, transliteration,
  content='ar_domain_phrase', content_rowid='id'
);

-- ── Seed: 8 Context Domains ───────────────────────────────────
INSERT OR IGNORE INTO ar_domain(id, name, name_ar, description, icon, sort_order) VALUES
  (1, 'home',      'المنزل',    'Household — daily home life, family conversations, chores',       '🏠', 0),
  (2, 'market',    'السوق',     'Market and shopping — transactions, bargaining, commerce',          '🛒', 1),
  (3, 'mosque',    'المسجد',    'Mosque — prayer, dhikr, Islamic greetings, religious discourse',   '🕌', 2),
  (4, 'travel',    'السفر',     'Travel — airports, transport, directions, hotels',                  '✈️', 3),
  (5, 'food',      'الطعام',    'Food and dining — ordering, recipes, taste descriptions',           '🍽️', 4),
  (6, 'work',      'العمل',     'Professional — office, meetings, business communication',           '💼', 5),
  (7, 'health',    'الصحة',     'Health and medical — doctor visits, symptoms, pharmacy',            '🏥', 6),
  (8, 'education', 'التعليم',   'Academic — classroom, studying, books, asking questions',           '📚', 7);

-- ── Seed: Sample Phrases per Domain ──────────────────────────
-- Mosque domain (most relevant for Islamic context)
INSERT OR IGNORE INTO ar_domain_phrase(domain_id, phrase_ar, phrase_en, transliteration, level, sort_order) VALUES
  (3, 'السَّلَامُ عَلَيْكُم',        'Peace be upon you',          'as-salamu alaykum',      'beginner', 0),
  (3, 'وَعَلَيْكُم السَّلَام',       'And upon you peace',         'wa alaykum as-salam',    'beginner', 1),
  (3, 'اللَّهُ أَكْبَر',             'Allah is the Greatest',      'Allahu Akbar',            'beginner', 2),
  (3, 'سُبْحَانَ اللَّه',            'Glory be to Allah',          'Subhana Allah',           'beginner', 3),
  (3, 'الْحَمْدُ لِلَّه',            'All praise is for Allah',    'Alhamdu lillah',          'beginner', 4),
  (3, 'هَلْ صَلَّيْتَ الْفَجْر؟',   'Did you pray Fajr?',         'Hal sallayta al-fajr?',   'intermediate', 5),
  (3, 'أَيْنَ الْإِمَام؟',           'Where is the Imam?',         'Ayna al-imam?',           'beginner', 6),
  (3, 'مَتَى صَلَاةُ الظُّهْر؟',    'When is Dhuhr prayer?',      'Mata salatu az-zuhr?',    'intermediate', 7);

-- Home domain
INSERT OR IGNORE INTO ar_domain_phrase(domain_id, phrase_ar, phrase_en, transliteration, level, sort_order) VALUES
  (1, 'صَبَاحُ الْخَيْر',            'Good morning',               'Sabah al-khayr',          'beginner', 0),
  (1, 'صَبَاحُ النُّور',             'Good morning (response)',     'Sabah an-nur',            'beginner', 1),
  (1, 'هَلْ أَكَلْتَ؟',             'Have you eaten?',             'Hal akalta?',             'beginner', 2),
  (1, 'الطَّعَامُ جَاهِز',          'The food is ready',           'At-ta''am jahiz',         'beginner', 3),
  (1, 'أَطْفِئِ الضَّوْء',          'Turn off the light',          'Atfi'' ad-daw''',         'intermediate', 4);

-- Market domain
INSERT OR IGNORE INTO ar_domain_phrase(domain_id, phrase_ar, phrase_en, transliteration, level, sort_order) VALUES
  (2, 'كَمْ السِّعْر؟',             'What is the price?',          'Kam as-si''r?',           'beginner', 0),
  (2, 'هَذَا غَالٍ',               'This is expensive',            'Hatha ghali',             'beginner', 1),
  (2, 'هَلْ عِنْدَكَ…؟',           'Do you have…?',               'Hal indaka…?',            'beginner', 2),
  (2, 'أُرِيدُ كِيلُو مِنْ…',      'I want a kilo of…',          'Urid kilu min…',          'beginner', 3);

-- ── Seed: Balagha Terms ───────────────────────────────────────
INSERT OR IGNORE INTO ar_balagha(id, term_ar, term_en, branch, definition, quran_refs) VALUES
  (1, 'التَّشْبِيه',  'Simile (Tashbih)',       'bayan', 'Comparing two things explicitly using a particle of comparison (كـ، مثل، كأن)', '[{"surah":2,"ayah":17},{"surah":2,"ayah":19}]'),
  (2, 'الِاسْتِعَارَة','Metaphor (Isti''arah)',  'bayan', 'Implicit comparison where one thing is described as another without a comparative particle', '[{"surah":14,"ayah":1}]'),
  (3, 'الْكِنَايَة',  'Metonymy (Kinayah)',      'bayan', 'Expressing a meaning through an associated concept rather than explicitly', '[{"surah":2,"ayah":187}]'),
  (4, 'الْإِيجَاز',  'Conciseness (Ijaz)',       'maani', 'Expressing the maximum meaning with minimum words — a hallmark of Quranic style', '[{"surah":112,"ayah":1}]'),
  (5, 'الْإِطْنَاب', 'Elaboration (Itnab)',      'maani', 'Expanding an expression beyond necessity for rhetorical effect', '[{"surah":55,"ayah":1}]'),
  (6, 'الطِّبَاق',   'Antithesis (Tibaq)',        'badi',  'Combining two opposing concepts in the same phrase for contrast and emphasis', '[{"surah":3,"ayah":27}]'),
  (7, 'الْجِنَاس',   'Paronomasia (Jinas)',       'badi',  'Using words of similar sound but different meaning — enhances musicality', '[{"surah":75,"ayah":27}]'),
  (8, 'الْفَاصِلَة', 'Quranic Rhyme (Fasila)',    'badi',  'The rhyming end-sound of Quranic verses that creates rhythm and coherence', NULL);
