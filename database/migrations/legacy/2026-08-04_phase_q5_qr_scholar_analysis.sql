-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  Phase Q5 — Quran Scholar & Interpretive Analysis
-- File   : database/migrations/legacy/2026-08-04_phase_q5_qr_scholar_analysis.sql
-- Run    : wrangler d1 execute knowledgemap \
--            --file=database/migrations/legacy/2026-08-04_phase_q5_qr_scholar_analysis.sql --remote
--
-- What this does (NEW tables only — no renames, zero breakage):
--
--   Scholar registry
--     qr_scholar_profiles       — scholar identity + biographical data
--     qr_scholar_works          — books / tafsir works by scholar
--     qr_scholarly_paradigms    — named interpretive frameworks (e.g. Mu'tazili, Athari)
--     qr_scholar_paradigm_links — which paradigm(s) a scholar belongs to
--
--   Positions & interpretive content
--     qr_scholar_positions      — a scholar's position on a specific ayah/passage/word
--     qr_surah_scholar_readings — whole-surah unified reading from one scholar/work
--     qr_interpretive_differences — where scholars diverge on meaning
--     qr_debate_clusters        — grouped debates (e.g. "fate vs. free will in Baqarah")
--
--   Reception history
--     qr_surah_reception_histories — how a surah's interpretation evolved across eras
--     qr_era_interpretive_trends   — broad tendencies per historical era
--
--   Cross-reference helpers
--     qr_scholar_position_evidences — evidence items linked to a position
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  SCHOLAR PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_scholar_profiles (
  id                TEXT PRIMARY KEY,           -- ULID

  -- Identity
  name_ar           TEXT NOT NULL,              -- الاسم الكامل بالعربية
  name_en           TEXT,
  kunya             TEXT,                       -- أبو / أم …
  laqab             TEXT,                       -- لقب (e.g. شيخ الإسلام)
  nisba             TEXT,                       -- نسبة (e.g. البخاري، المصري)

  -- Biography
  birth_year_hijri  INTEGER,
  death_year_hijri  INTEGER,
  birth_year_ce     INTEGER,
  death_year_ce     INTEGER,
  birth_place       TEXT,
  death_place       TEXT,
  era               TEXT,
    -- 'sahaba'|'tabiun'|'taba_tabiun'|'classical'|'medieval'|'pre_modern'|'modern'|'contemporary'

  -- Tradition
  madhab            TEXT,                       -- 'hanafi'|'maliki'|'shafii'|'hanbali'|'zahiri'|'shia'|'other'|'none'
  kalam_school      TEXT,                       -- 'ashari'|'maturidi'|'athari'|'mutazili'|'shia_imami'|'other'
  specialization    TEXT,                       -- 'tafsir'|'hadith'|'fiqh'|'kalam'|'usul'|'nahw'|'balagha'|'multi'

  -- Notes
  biography_md      TEXT,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrsp_name_ar ON qr_scholar_profiles(name_ar);
CREATE INDEX IF NOT EXISTS idx_qrsp_era     ON qr_scholar_profiles(era);
CREATE INDEX IF NOT EXISTS idx_qrsp_madhab  ON qr_scholar_profiles(madhab);

CREATE TRIGGER trg_qr_scholar_profiles_updated_at
AFTER UPDATE ON qr_scholar_profiles
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_scholar_profiles SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- FTS for scholar names
CREATE VIRTUAL TABLE IF NOT EXISTS qr_scholar_profiles_fts USING fts5(
  name_ar,
  name_en,
  laqab,
  nisba,
  biography_md
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 2  SCHOLAR WORKS
--      Books, tafsirs, treatises written by a scholar.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_scholar_works (
  id                TEXT PRIMARY KEY,           -- ULID
  scholar_id        TEXT NOT NULL,              -- FK → qr_scholar_profiles.id

  title_ar          TEXT NOT NULL,
  title_en          TEXT,
  work_type         TEXT NOT NULL DEFAULT 'tafsir',
    -- 'tafsir'|'ijaz'|'asbab_nuzul'|'nasikh_mansukh'|'qiraat'|
    --  'uloom_quran'|'fiqh_quran'|'balagha'|'grammar'|'other'

  composition_year_hijri INTEGER,
  composition_year_ce    INTEGER,

  -- Link to source in LING system (if ingested for pipeline)
  ling_source_id    TEXT,                       -- FK → ar_ling_sources.id

  volumes           INTEGER,
  is_complete       INTEGER NOT NULL DEFAULT 1, -- 0 = incomplete work
  print_edition     TEXT,                       -- e.g. 'Dar al-Kutub al-Ilmiyya, 1994'

  summary           TEXT,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (scholar_id) REFERENCES qr_scholar_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsw_scholar  ON qr_scholar_works(scholar_id);
CREATE INDEX IF NOT EXISTS idx_qrsw_type     ON qr_scholar_works(work_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  SCHOLARLY PARADIGMS
--      Named interpretive frameworks / schools of thought.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_scholarly_paradigms (
  id                TEXT PRIMARY KEY,           -- ULID
  name_ar           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  paradigm_type     TEXT NOT NULL,
    -- 'theological'|'linguistic'|'legal'|'sufi'|'scientific'|'modernist'|'other'
  description_md    TEXT,
  era_range         TEXT,                       -- e.g. '2nd–5th century AH'
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Scholar → Paradigm links (many-to-many)
CREATE TABLE IF NOT EXISTS qr_scholar_paradigm_links (
  scholar_id        TEXT NOT NULL,
  paradigm_id       TEXT NOT NULL,
  affiliation_type  TEXT NOT NULL DEFAULT 'primary',
    -- 'primary'|'secondary'|'critic_of'
  note_md           TEXT,
  PRIMARY KEY (scholar_id, paradigm_id),
  FOREIGN KEY (scholar_id)  REFERENCES qr_scholar_profiles(id),
  FOREIGN KEY (paradigm_id) REFERENCES qr_scholarly_paradigms(id)
);

CREATE INDEX IF NOT EXISTS idx_qrspl_paradigm ON qr_scholar_paradigm_links(paradigm_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 4  SCHOLAR POSITIONS
--      A specific interpretive stance by a scholar/work on a scope
--      (word, ayah, passage, surah-level theme, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_scholar_positions (
  id                TEXT PRIMARY KEY,           -- ULID

  -- Who
  scholar_id        TEXT NOT NULL,              -- FK → qr_scholar_profiles.id
  work_id           TEXT,                       -- FK → qr_scholar_works.id (null = oral/attributed)

  -- Scope of the position
  scope_type        TEXT NOT NULL,
    -- 'word'|'token'|'phrase'|'ayah'|'passage'|'surah'|'cross_surah'|'concept'
  surah             INTEGER,
  ayah_from         INTEGER,
  ayah_to           INTEGER,
  token_morph_id    TEXT,                       -- FK → qr_token_morphology.id (for word-level)

  -- The position
  position_type     TEXT NOT NULL DEFAULT 'meaning',
    -- 'meaning'           تفسير المعنى
    -- 'irab'              إعراب
    -- 'qiraat'            اختيار قراءة
    -- 'asbab_nuzul'       سبب النزول
    -- 'nasikh_mansukh'    ناسخ ومنسوخ
    -- 'hukm_fiqhi'        حكم فقهي
    -- 'balagha'           إعجاز بلاغي
    -- 'aqida'             موقف عقدي
    -- 'isra'iliyyat'      إسرائيليات
    -- 'rejection'         ردّ على قول آخر

  position_text_ar  TEXT NOT NULL,              -- scholar's actual statement (Arabic)
  position_text_en  TEXT,                       -- translation
  position_summary  TEXT,                       -- 1-sentence summary

  -- Cross-references
  original_page     TEXT,                       -- page/volume ref in the work
  is_minority_view  INTEGER NOT NULL DEFAULT 0,
  is_contested      INTEGER NOT NULL DEFAULT 0,

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (scholar_id) REFERENCES qr_scholar_profiles(id),
  FOREIGN KEY (work_id)    REFERENCES qr_scholar_works(id)
);

CREATE INDEX IF NOT EXISTS idx_qrscpos_scholar  ON qr_scholar_positions(scholar_id);
CREATE INDEX IF NOT EXISTS idx_qrscpos_work     ON qr_scholar_positions(work_id);
CREATE INDEX IF NOT EXISTS idx_qrscpos_scope    ON qr_scholar_positions(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_qrscpos_type     ON qr_scholar_positions(position_type);

CREATE TRIGGER trg_qr_scholar_positions_updated_at
AFTER UPDATE ON qr_scholar_positions
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_scholar_positions SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- FTS for position text
CREATE VIRTUAL TABLE IF NOT EXISTS qr_scholar_positions_fts USING fts5(
  scholar_id     UNINDEXED,
  work_id        UNINDEXED,
  surah          UNINDEXED,
  ayah_from      UNINDEXED,
  position_type,
  position_text_ar,
  position_text_en,
  position_summary
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  SCHOLAR POSITION EVIDENCES
--      Evidence (quotes, cross-references) backing a position.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_scholar_position_evidences (
  id               TEXT PRIMARY KEY,            -- ULID
  position_id      TEXT NOT NULL,               -- FK → qr_scholar_positions.id
  evidence_type    TEXT NOT NULL,
    -- 'quran_ayah'|'hadith'|'athar'|'linguistic'|'scholarly_consensus'|'other'
  reference        TEXT NOT NULL,               -- e.g. 'Quran 2:255' or 'Bukhari 1234'
  quote_ar         TEXT,
  quote_en         TEXT,
  note_md          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (position_id) REFERENCES qr_scholar_positions(id)
);

CREATE INDEX IF NOT EXISTS idx_qrspe_position ON qr_scholar_position_evidences(position_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 6  SURAH SCHOLAR READINGS
--      A holistic reading of an entire surah by one scholar / work.
--      More than just per-ayah positions — it's the macro interpretation.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_scholar_readings (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  scholar_id        TEXT NOT NULL,              -- FK → qr_scholar_profiles.id
  work_id           TEXT,                       -- FK → qr_scholar_works.id

  -- Central thesis of this scholar's reading
  central_theme     TEXT NOT NULL,              -- e.g. "tawhid as the surah's organizing principle"
  macro_structure   TEXT,                       -- how scholar divides the surah
  key_positions     TEXT,                       -- JSON array of {ayah, brief_position}

  -- Distinctive features of this reading
  distinguishing_features TEXT,                -- what makes this reading unique
  methodology       TEXT,
    -- 'tafsir_bil_ma'thur'|'tafsir_bil_ra'y'|'linguistic'|'sufi'|'scientific'|'thematic'|'mixed'

  tafsir_style_notes TEXT,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, scholar_id, work_id),
  FOREIGN KEY (surah)      REFERENCES qr_surahs(id),
  FOREIGN KEY (scholar_id) REFERENCES qr_scholar_profiles(id),
  FOREIGN KEY (work_id)    REFERENCES qr_scholar_works(id)
);

CREATE INDEX IF NOT EXISTS idx_qrssr_surah   ON qr_surah_scholar_readings(surah);
CREATE INDEX IF NOT EXISTS idx_qrssr_scholar ON qr_surah_scholar_readings(scholar_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 7  INTERPRETIVE DIFFERENCES
--      Where scholars diverge on a specific scope — the comparison row.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_interpretive_differences (
  id                TEXT PRIMARY KEY,           -- ULID

  -- Scope
  scope_type        TEXT NOT NULL,
  surah             INTEGER,
  ayah_from         INTEGER,
  ayah_to           INTEGER,
  token_morph_id    TEXT,

  -- The question / point of difference
  question_ar       TEXT NOT NULL,              -- e.g. "ما المراد بـ الروح في الآية؟"
  question_en       TEXT,
  difference_type   TEXT NOT NULL DEFAULT 'meaning',
    -- 'meaning'|'irab'|'legal_ruling'|'theological'|'qiraat'|'other'

  -- Positions in this debate (JSON summary)
  positions_summary TEXT,                       -- JSON [{scholar, position_brief}]
  majority_view     TEXT,
  minority_view     TEXT,
  resolution_note   TEXT,                       -- Ibn Kathir-style tarjih or summary

  -- Impact
  is_doctrinally_significant INTEGER NOT NULL DEFAULT 0,
  is_legally_significant     INTEGER NOT NULL DEFAULT 0,

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrid_surah      ON qr_interpretive_differences(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_qrid_diff_type  ON qr_interpretive_differences(difference_type);

-- Positions linked to a difference
CREATE TABLE IF NOT EXISTS qr_difference_positions (
  difference_id     TEXT NOT NULL,              -- FK → qr_interpretive_differences.id
  position_id       TEXT NOT NULL,              -- FK → qr_scholar_positions.id
  stance            TEXT NOT NULL DEFAULT 'affirms',
    -- 'affirms'|'rejects'|'qualifies'|'is_neutral'
  PRIMARY KEY (difference_id, position_id),
  FOREIGN KEY (difference_id) REFERENCES qr_interpretive_differences(id),
  FOREIGN KEY (position_id)   REFERENCES qr_scholar_positions(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 8  DEBATE CLUSTERS
--      Groups of related interpretive differences forming a major debate.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_debate_clusters (
  id                TEXT PRIMARY KEY,           -- ULID

  title_ar          TEXT NOT NULL,              -- e.g. "خلق الأفعال في سورة الفاتحة"
  title_en          TEXT,
  surah             INTEGER,                    -- primary surah (nullable for cross-surah)
  scope_description TEXT,

  cluster_type      TEXT NOT NULL DEFAULT 'theological',
    -- 'theological'|'legal'|'linguistic'|'historical'|'eschatological'|'other'

  summary_md        TEXT,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Link interpretive_differences to a cluster
CREATE TABLE IF NOT EXISTS qr_debate_cluster_items (
  cluster_id     TEXT NOT NULL,
  difference_id  TEXT NOT NULL,
  item_order     INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (cluster_id, difference_id),
  FOREIGN KEY (cluster_id)    REFERENCES qr_debate_clusters(id),
  FOREIGN KEY (difference_id) REFERENCES qr_interpretive_differences(id)
);

CREATE INDEX IF NOT EXISTS idx_qrdc_surah ON qr_debate_clusters(surah);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 9  SURAH RECEPTION HISTORIES
--      How interpretation of a surah evolved across eras.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_reception_histories (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  era               TEXT NOT NULL,
    -- 'sahaba'|'tabiun'|'taba_tabiun'|'early_classical'|
    --  'late_classical'|'medieval'|'ottoman'|'colonial'|
    --  'modern'|'contemporary'

  -- Dominant approaches in this era
  dominant_methodology TEXT,
  dominant_themes   TEXT,                       -- JSON array of theme strings
  notable_scholars  TEXT,                       -- JSON array of qr_scholar_profiles.id

  -- Characteristic interpretive tendencies
  tendencies_md     TEXT,

  -- Turning points
  notable_shifts_md TEXT,                       -- major changes from prior era

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, era),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsrh_surah ON qr_surah_reception_histories(surah);
CREATE INDEX IF NOT EXISTS idx_qrsrh_era   ON qr_surah_reception_histories(era);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 10  ERA INTERPRETIVE TRENDS
--       Broad tendencies across all of Quran interpretation for an era.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_era_interpretive_trends (
  id                TEXT PRIMARY KEY,           -- ULID
  era               TEXT NOT NULL UNIQUE,
  era_range_hijri   TEXT,                       -- e.g. '1–100 AH'
  era_range_ce      TEXT,
  overview_md       TEXT NOT NULL,
  key_works         TEXT,                       -- JSON array of qr_scholar_works.id
  key_scholars      TEXT,                       -- JSON array of qr_scholar_profiles.id
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- wrangler d1 execute knowledgemap \
--   --command="SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name LIKE 'qr_scholar%' ORDER BY name" \
--   --remote
-- ─────────────────────────────────────────────────────────────────────────────
