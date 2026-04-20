-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_quran DB — Layer 2 & 3: Surah Organism + Structure Science
-- File   : Database/migrations/km-quran/002_surah_spine.sql
-- Run    : wrangler d1 execute km_quran --file=... --remote
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 2  SURAH ORGANISM
-- ─────────────────────────────────────────────────────────────────────────────

-- The surah's governing analytical identity
CREATE TABLE IF NOT EXISTS qr_surah_profiles (
  surah                  INTEGER PRIMARY KEY,
  governing_movement     TEXT,   -- e.g. 'revelation-reception-call', 'covenant-warning-promise'
  central_claim          TEXT,
  opening_force          TEXT,   -- rhetorical + semantic force of the opening
  closure_force          TEXT,   -- rhetorical + semantic force of the closing
  dominant_addressee     TEXT,   -- 'believers'|'prophet'|'mankind'|'all'|'implied'
  dominant_tone          TEXT,   -- 'exhortative'|'narrative'|'argumentative'|'legislative'|'consolatory'
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Freezes the surah's atomic identity — one canonical interpretive center per surah
CREATE TABLE IF NOT EXISTS qr_surah_atomic_profiles (
  surah                  INTEGER PRIMARY KEY,
  atomic_center          TEXT NOT NULL,   -- the single organizing principle / center of gravity
  atomic_center_ar       TEXT,
  structural_type        TEXT NOT NULL,
    -- 'linear_escalation'|'ring_concentric'|'diamond_cross'|'parallel_panels'|
    -- 'staircase'|'mirror_symmetry'|'mosaic'|'mixed'
  structural_type_note   TEXT,
  resolution_pattern     TEXT,            -- how the surah resolves its tensions
  interpretive_lens      TEXT,            -- primary reading paradigm that most reveals the surah
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Passages: canonical meso-level structural segments
CREATE TABLE IF NOT EXISTS qr_surah_passages (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  passage_index          INTEGER NOT NULL,   -- ordered sequence
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  theme                  TEXT,
  title_ar               TEXT,
  title_en               TEXT,
  discourse_role         TEXT,
    -- 'opening'|'development'|'pivot'|'argument'|'narrative'|'command_bloc'|
    -- 'bridge'|'return'|'closure'|'oath_sequence'|'transitional'
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, passage_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsp_surah ON qr_surah_passages(surah);
CREATE INDEX IF NOT EXISTS idx_qrsp_range ON qr_surah_passages(surah, ayah_from, ayah_to);

-- Surah opening sections (فاتحة)
CREATE TABLE IF NOT EXISTS qr_surah_openings (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL DEFAULT 1,
  ayah_to                INTEGER NOT NULL,
  opening_type           TEXT NOT NULL,
    -- 'huruf_muqattaat'|'hamd'|'tasbih'|'nida'|'qasam'|'narrative_entry'|
    -- 'command'|'direct_address'|'question'|'other'
  rhetorical_force       TEXT,
  sets_up_md             TEXT,            -- what the opening sets up / foreshadows
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Surah closures (خاتمة)
CREATE TABLE IF NOT EXISTS qr_surah_closures (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  closure_type           TEXT NOT NULL,
    -- 'return_to_opening'|'escalation'|'command'|'promise_warning'|
    -- 'divine_attribute'|'call_to_action'|'echo'|'other'
  echo_of_opening        INTEGER NOT NULL DEFAULT 0,   -- 1 if closure echoes opening
  rhetorical_force       TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Structural pivots inside a surah (turning points / هندسة داخلية)
CREATE TABLE IF NOT EXISTS qr_surah_structural_pivots (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  pivot_index            INTEGER NOT NULL,
  ayah                   INTEGER NOT NULL,
  pivot_type             TEXT NOT NULL,
    -- 'topic_turn'|'addressee_shift'|'mode_shift'|'narrative_peak'|
    -- 'center_of_ring'|'rhetorical_climax'|'command_entry'|'other'
  description            TEXT NOT NULL,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, pivot_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrpiv_surah ON qr_surah_structural_pivots(surah);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LAYER 3  STRUCTURE SCIENCE
-- ─────────────────────────────────────────────────────────────────────────────

-- Named structure units inside a surah (not passages — these are compositional blocks)
CREATE TABLE IF NOT EXISTS qr_surah_structure_units (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  unit_index             INTEGER NOT NULL,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  unit_role              TEXT NOT NULL,
    -- 'A'|'B'|'C'|'A_prime'|'B_prime'|'C_prime'|'center'|'bridge'|'envelope'|'coda'
  label                  TEXT,              -- human-readable label
  reading_id             TEXT,              -- FK → qr_surah_structure_readings.id (which reading this unit belongs to)
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrssu_surah ON qr_surah_structure_units(surah);

-- Links between structure units (internal bridges, correspondences)
CREATE TABLE IF NOT EXISTS qr_surah_structure_links (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  from_unit_id           TEXT NOT NULL,
  to_unit_id             TEXT NOT NULL,
  link_type              TEXT NOT NULL,
    -- 'mirror'|'echo'|'contrast'|'expansion'|'return'|'bridge'|'anticipation'|'fulfillment'
  link_evidence          TEXT,              -- brief description of the correspondences
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_unit_id) REFERENCES qr_surah_structure_units(id),
  FOREIGN KEY (to_unit_id)   REFERENCES qr_surah_structure_units(id)
);

-- Alternative structure readings of one surah (multiple coexisting structure maps)
CREATE TABLE IF NOT EXISTS qr_surah_structure_readings (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  reading_label          TEXT NOT NULL,      -- e.g. 'Farahi ring reading', 'Islahi linear reading'
  structure_type         TEXT NOT NULL,
    -- 'ring_concentric'|'diamond_cross'|'linear_escalation'|'parallel_panels'|
    -- 'mirror_symmetry'|'staircase'|'mosaic'|'other'
  scholar_ref            TEXT,               -- typed ref: QR:<qr_scholar_profiles.id>
  paradigm_ref           TEXT,               -- typed ref: QR:<qr_scholarly_paradigms.id>
  confidence             TEXT DEFAULT 'proposed',
    -- 'proposed'|'contested'|'widely_accepted'|'classical_consensus'
  summary_md             TEXT NOT NULL,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrssr_surah ON qr_surah_structure_readings(surah);

-- Symmetry patterns (ring, concentric, mirror)
CREATE TABLE IF NOT EXISTS qr_surah_symmetry_patterns (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  structure_reading_id   TEXT,               -- FK → qr_surah_structure_readings.id
  pattern_type           TEXT NOT NULL,
    -- 'ring_abccba'|'ring_abcba'|'mirror_panel'|'parallel_ab_ab'|
    -- 'concentric_nested'|'inverted_parallel'|'other'
  center_ayah_from       INTEGER,            -- center of ring / diamond
  center_ayah_to         INTEGER,
  pattern_notation       TEXT,               -- e.g. 'A-B-C-C-B-A' or 'A1B1C1 | C2B2A2'
  pairs_json             TEXT,               -- JSON [{a_from, a_to, b_from, b_to, correspondence_note}]
  summary_md             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Diamond and cross-balanced patterns
CREATE TABLE IF NOT EXISTS qr_surah_diamond_patterns (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  structure_reading_id   TEXT,
  pattern_type           TEXT NOT NULL DEFAULT 'diamond',
    -- 'diamond'|'cross_balanced'|'hourglass'|'other'
  top_section_from       INTEGER,
  top_section_to         INTEGER,
  center_from            INTEGER,
  center_to              INTEGER,
  bottom_section_from    INTEGER,
  bottom_section_to      INTEGER,
  balance_note           TEXT,               -- what creates the balance / cross
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Sequence and linear progression patterns
CREATE TABLE IF NOT EXISTS qr_surah_sequence_patterns (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  sequence_type          TEXT NOT NULL,
    -- 'linear_escalation'|'staircase_ascent'|'staircase_descent'|
    -- 'alternating_promise_warning'|'cumulative_admonition'|'narrative_arc'|'other'
  stages_json            TEXT NOT NULL,      -- JSON [{ayah_from, ayah_to, stage_label, stage_role}]
  description            TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Motif clusters (surah-wide semantic constellations)
CREATE TABLE IF NOT EXISTS qr_surah_motif_clusters (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  cluster_label          TEXT NOT NULL,      -- e.g. 'covenant cluster', 'light-darkness cluster'
  cluster_label_ar       TEXT,
  motif_keys             TEXT NOT NULL,      -- JSON array of qr_motif_index.id refs
  ayah_range_json        TEXT,              -- JSON [{ayah, occurrence_note}] showing recurrence points
  semantic_role          TEXT,              -- the cluster's role in the surah's meaning
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsmc_surah ON qr_surah_motif_clusters(surah);

-- Coherence signals (explicit linguistic markers of surah unity)
CREATE TABLE IF NOT EXISTS qr_surah_coherence_signals (
  id                     TEXT PRIMARY KEY,   -- ULID
  surah                  INTEGER NOT NULL,
  signal_type            TEXT NOT NULL,
    -- 'lexical_return'|'root_concentration'|'opening_closure_echo'|
    -- 'pronoun_consistency'|'topic_braid'|'anaphora'|'refrain'|'other'
  description            TEXT NOT NULL,
  ayahs_json             TEXT,              -- JSON array of relevant ayah numbers
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrscs_surah ON qr_surah_coherence_signals(surah);
