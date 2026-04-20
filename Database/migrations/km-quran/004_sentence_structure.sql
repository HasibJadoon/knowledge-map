-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_quran DB — Layer 6: Canonical Sentence-Structure Stack (qr_ss_*)
-- File   : Database/migrations/km-quran/004_sentence_structure.sql
-- Run    : wrangler d1 execute km_quran --file=... --remote
--
-- ARCHITECTURE RULES (SETTLED — do not violate):
--   • qr_word_occurrences = single canonical owner of visible Quranic words
--     (see 001_corpus_base.sql) — do NOT create qr_ss_occ_word here
--   • qr_ss_occ_segment = attached sub-word elements (particles, articles, pronouns)
--   • qr_ss_occ_sentence/clause/phrase = canonical discourse scopes
--   • qr_ss_scope_member_map + qr_ss_scope_relations = explicit hierarchy rows
--   • Morphology, grammar, balagha LINKED from LX registries, not re-owned here
--   • qr_ss_scope_nuance is canonical; qr_ss_sentence_nuance is derived
--   • qr_ss_tree_* are downstream projections of the scope model
--   • Scope rows POPULATE BEFORE tree rows are generated
--   • Surah-first rollups: qr_surah_clause_patterns, qr_surah_register_shifts,
--     qr_surah_ellipsis_patterns must be fed from sentence analysis
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § OCCURRENCE LAYER  (what exists in the Quran text at sub-word to phrase level)
-- ─────────────────────────────────────────────────────────────────────────────

-- Attached segments: prefixed conjunctions, prepositions, lam, fa, waw,
-- articles, attached pronouns — stored at sub-word precision
CREATE TABLE IF NOT EXISTS qr_ss_occ_segment (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  word_occurrence_id   TEXT NOT NULL,        -- FK → qr_word_occurrences.id (parent word)
  segment_index        INTEGER NOT NULL,     -- 1-based position within the word
  segment_text         TEXT NOT NULL,        -- Arabic text of this segment
  segment_type         TEXT NOT NULL,
    -- 'conjunction_prefix'|'preposition_prefix'|'lam_prefix'|'fa_prefix'|
    -- 'definite_article'|'attached_pronoun'|'other_prefix'|'other_suffix'
  lx_particle_ref      TEXT,                 -- typed ref: LX:<ar_ling_particles.id>
  morphology_tag       TEXT,                 -- morphology tag from Quranic Corpus
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (word_occurrence_id) REFERENCES qr_word_occurrences(id)
);

CREATE INDEX IF NOT EXISTS idx_qrseg_word  ON qr_ss_occ_segment(word_occurrence_id);
CREATE INDEX IF NOT EXISTS idx_qrseg_surah ON qr_ss_occ_segment(surah, ayah);

-- Sentence occurrences (canonical discourse scope — may span part of ayah or multiple ayat)
CREATE TABLE IF NOT EXISTS qr_ss_occ_sentence (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  word_start_index     INTEGER,              -- 1-based word position in ayah_from
  word_end_index       INTEGER,              -- 1-based word position in ayah_to
  sentence_kind        TEXT NOT NULL DEFAULT 'declarative',
    -- 'declarative'|'nominal'|'verbal'|'interrogative'|'imperative'|
    -- 'conditional'|'exclamatory'|'oath'|'answer'|'fragment'
  lx_sentence_kind_ref TEXT,                -- typed ref: LX:<ar_ling_sentence_kinds.id>
  discourse_role       TEXT,                -- role in the surah's discourse structure
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsen_surah ON qr_ss_occ_sentence(surah, ayah_from);



-- Clause occurrences (subordinate to sentences; recursive depth allowed)
CREATE TABLE IF NOT EXISTS qr_ss_occ_clause (
  id                   TEXT PRIMARY KEY,     -- ULID
  sentence_id          TEXT NOT NULL,        -- FK → qr_ss_occ_sentence.id
  parent_clause_id     TEXT,                 -- FK → qr_ss_occ_clause.id (null = top-level clause)
  clause_order         INTEGER NOT NULL DEFAULT 1,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  word_start_index     INTEGER,
  word_end_index       INTEGER,
  clause_type          TEXT NOT NULL DEFAULT 'main',
    -- 'main'|'relative'|'conditional_if'|'conditional_then'|'adverbial_time'|
    -- 'adverbial_cause'|'adverbial_result'|'nominal_subject'|'nominal_predicate'|
    -- 'vocative'|'oath'|'oath_answer'|'parenthetical'|'elliptical'
  lx_clause_type_ref   TEXT,                 -- typed ref: LX:<ar_ling_clause_types.id>
  clause_function      TEXT,                 -- 'subject'|'predicate'|'object'|'adjunct'|'complement'
  lx_clause_func_ref   TEXT,                 -- typed ref: LX:<ar_ling_clause_functions.id>
  governing_particle   TEXT,                 -- e.g. إِنَّ، لَمَّا، إِذَا
  is_elliptical        INTEGER NOT NULL DEFAULT 0,
  elided_element       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sentence_id)    REFERENCES qr_ss_occ_sentence(id),
  FOREIGN KEY (parent_clause_id) REFERENCES qr_ss_occ_clause(id)
);

CREATE INDEX IF NOT EXISTS idx_qrcl_sentence ON qr_ss_occ_clause(sentence_id);
CREATE INDEX IF NOT EXISTS idx_qrcl_parent   ON qr_ss_occ_clause(parent_clause_id);
CREATE INDEX IF NOT EXISTS idx_qrcl_surah    ON qr_ss_occ_clause(surah, ayah_from);

-- Phrase occurrences (sub-clause: idafa, sifa, jar-majrur, maf'ul, hal, etc.)
CREATE TABLE IF NOT EXISTS qr_ss_occ_phrase (
  id                   TEXT PRIMARY KEY,     -- ULID
  clause_id            TEXT NOT NULL,        -- FK → qr_ss_occ_clause.id
  phrase_order         INTEGER NOT NULL DEFAULT 1,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  word_start_index     INTEGER NOT NULL,
  word_end_index       INTEGER NOT NULL,
  phrase_type          TEXT NOT NULL,
    -- 'idafa'|'sifa_mawsuf'|'jar_majrur'|'maf_ul_bih'|'maf_ul_mutlaq'|
    -- 'maf_ul_lahu'|'maf_ul_fih'|'hal'|'tamyiz'|'munada'|'badal'|'atf'|
    -- 'tawkid'|'istithna'|'verbal_noun'|'other'
  lx_phrase_type_ref   TEXT,                 -- typed ref: LX:<ar_ling_phrase_types.id>
  phrase_function      TEXT,                 -- semantic role: 'agent'|'patient'|'beneficiary'|etc.
  lx_phrase_func_ref   TEXT,                 -- typed ref: LX:<ar_ling_phrase_functions.id>
  head_word_id         TEXT,                 -- FK → qr_word_occurrences.id (head of phrase)
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (clause_id)   REFERENCES qr_ss_occ_clause(id),
  FOREIGN KEY (head_word_id) REFERENCES qr_word_occurrences(id)
);

CREATE INDEX IF NOT EXISTS idx_qrph_clause ON qr_ss_occ_phrase(clause_id);
CREATE INDEX IF NOT EXISTS idx_qrph_surah  ON qr_ss_occ_phrase(surah, ayah);

-- ─────────────────────────────────────────────────────────────────────────────
-- § MEMBERSHIP + HIERARCHY
-- ─────────────────────────────────────────────────────────────────────────────

-- Maps any word occurrence to its containing scopes (sentence/clause/phrase)
CREATE TABLE IF NOT EXISTS qr_ss_scope_member_map (
  id                   TEXT PRIMARY KEY,     -- ULID
  word_occurrence_id   TEXT NOT NULL,        -- FK → qr_word_occurrences.id
  scope_type           TEXT NOT NULL,        -- 'sentence'|'clause'|'phrase'
  scope_id             TEXT NOT NULL,        -- ULID of qr_ss_occ_sentence / _clause / _phrase
  member_role          TEXT,                 -- 'head'|'dependent'|'modifier'|'member'
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (word_occurrence_id, scope_type, scope_id),
  FOREIGN KEY (word_occurrence_id) REFERENCES qr_word_occurrences(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsmm_word  ON qr_ss_scope_member_map(word_occurrence_id);
CREATE INDEX IF NOT EXISTS idx_qrsmm_scope ON qr_ss_scope_member_map(scope_type, scope_id);

-- Relations between scopes (clause → clause, phrase → phrase)
CREATE TABLE IF NOT EXISTS qr_ss_scope_relations (
  id                   TEXT PRIMARY KEY,     -- ULID
  from_scope_type      TEXT NOT NULL,        -- 'sentence'|'clause'|'phrase'
  from_scope_id        TEXT NOT NULL,
  to_scope_type        TEXT NOT NULL,
  to_scope_id          TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
    -- 'contains'|'modifies'|'governs'|'coordinates_with'|'subordinates_to'|
    -- 'parallels'|'contrasts_with'|'expands'|'other'
  lx_relation_ref      TEXT,                 -- typed ref: LX:<ar_ling_syntax_relation_types.id>
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrscr_from ON qr_ss_scope_relations(from_scope_type, from_scope_id);
CREATE INDEX IF NOT EXISTS idx_qrscr_to   ON qr_ss_scope_relations(to_scope_type, to_scope_id);

-- Dependency / government arcs (head → dependent word-level syntax)
CREATE TABLE IF NOT EXISTS qr_ss_syntax_relations (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  head_word_id         TEXT NOT NULL,        -- FK → qr_word_occurrences.id
  dep_word_id          TEXT NOT NULL,        -- FK → qr_word_occurrences.id
  relation_label       TEXT NOT NULL,
    -- 'nsubj'|'obj'|'iobj'|'csubj'|'ccomp'|'xcomp'|'nmod'|'amod'|
    -- 'nummod'|'advmod'|'aux'|'cop'|'mark'|'det'|'appos'|'conj'|'cc'|
    -- 'case'|'vocative'|'parataxis'|'other'
  lx_rel_type_ref      TEXT,                 -- typed ref: LX:<ar_ling_syntax_relation_types.id>
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (head_word_id) REFERENCES qr_word_occurrences(id),
  FOREIGN KEY (dep_word_id)  REFERENCES qr_word_occurrences(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsyn_head ON qr_ss_syntax_relations(head_word_id);
CREATE INDEX IF NOT EXISTS idx_qrsyn_dep  ON qr_ss_syntax_relations(dep_word_id);
CREATE INDEX IF NOT EXISTS idx_qrsyn_surah ON qr_ss_syntax_relations(surah, ayah);

-- ─────────────────────────────────────────────────────────────────────────────
-- § APPLIED LINGUISTIC ANALYSIS  (LX registries linked into QR scopes)
-- ─────────────────────────────────────────────────────────────────────────────

-- Morphology links: LX morphology entry applied to a QR scope
CREATE TABLE IF NOT EXISTS qr_ss_scope_morph_link (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_type           TEXT NOT NULL,        -- 'word'|'segment'|'phrase'
  scope_id             TEXT NOT NULL,        -- word_occurrence_id or segment_id or phrase_id
  lx_morph_ref         TEXT NOT NULL,        -- typed ref: LX:<ar_ling_morphology.id>
  irab_position        TEXT,
    -- 'marfu'|'mansub'|'majrur'|'majzum'|'mabniy'
  irab_sign            TEXT,
  syntactic_function   TEXT,
    -- 'mubtada'|'khabar'|'fail'|'naib_fail'|'mafuul_bih'|'sifa'|'mudaf_ilayh'|etc.
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrsml_scope ON qr_ss_scope_morph_link(scope_type, scope_id);

-- Grammar links: LX nahw concept applied to a QR scope
CREATE TABLE IF NOT EXISTS qr_ss_scope_grammar_link (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_grammar_ref       TEXT NOT NULL,        -- typed ref: LX:<ar_ling_nahw_concepts.id>
  application_note     TEXT,                 -- how this grammar concept applies here
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrsgl_scope ON qr_ss_scope_grammar_link(scope_type, scope_id);

-- Balagha links: LX balagha term applied to a QR scope
CREATE TABLE IF NOT EXISTS qr_ss_scope_balagha_link (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_balagha_ref       TEXT NOT NULL,        -- typed ref: LX:<ar_ling_balagha_terms.id>
  balagha_category     TEXT,                 -- 'bayan'|'mani'|'badi'
  rhetorical_effect    TEXT,                 -- what effect this device creates
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrsbl_scope ON qr_ss_scope_balagha_link(scope_type, scope_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § NUANCE + ELLIPSIS  (canonical — must be populated before tree/UI projections)
-- ─────────────────────────────────────────────────────────────────────────────

-- Canonical nuance records attached to any scope
CREATE TABLE IF NOT EXISTS qr_ss_scope_nuance (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_type           TEXT NOT NULL,        -- 'sentence'|'clause'|'phrase'|'word'|'segment'
  scope_id             TEXT NOT NULL,
  nuance_type          TEXT NOT NULL DEFAULT 'discourse_force',
    -- 'discourse_force'|'emphasis'|'suspension'|'contrast_release'|'compression'|
    -- 'ellipsis_effect'|'register_shift'|'ambiguity'|'qualification'|'other'
  lx_nuance_type_ref   TEXT,                 -- typed ref: LX:<ar_ling_nuance_types.id>
  nuance_text          TEXT NOT NULL,
  nuance_text_ar       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrssn_scope ON qr_ss_scope_nuance(scope_type, scope_id);

-- Ellipsis events (where meaning is intensified through omission / الإيجاز)
CREATE TABLE IF NOT EXISTS qr_ss_ellipsis_event (
  id                   TEXT PRIMARY KEY,     -- ULID
  sentence_id          TEXT NOT NULL,        -- FK → qr_ss_occ_sentence.id
  scope_type           TEXT NOT NULL DEFAULT 'clause',
  scope_id             TEXT NOT NULL,
  ellipsis_type        TEXT NOT NULL,
    -- 'elided_subject'|'elided_predicate'|'elided_verb'|'elided_object'|
    -- 'elided_apodosis'|'elided_response'|'sudden_transition'|'other'
  lx_ellipsis_ref      TEXT,                 -- typed ref: LX:<ar_ling_ellipsis_types.id>
  elided_element       TEXT NOT NULL,        -- what is elided
  rhetorical_effect    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sentence_id) REFERENCES qr_ss_occ_sentence(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsee_sentence ON qr_ss_ellipsis_event(sentence_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § READINGS + EVIDENCE  (scholar/paradigm readings of specific scopes)
-- ─────────────────────────────────────────────────────────────────────────────

-- A scholar/paradigm reading of a sentence, clause, or phrase scope
CREATE TABLE IF NOT EXISTS qr_ss_scope_reading (
  id                   TEXT PRIMARY KEY,     -- ULID
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  scholar_ref          TEXT,                 -- typed ref: QR:<qr_scholar_profiles.id>
  paradigm_ref         TEXT,                 -- typed ref: QR:<qr_scholarly_paradigms.id>
  reading_type         TEXT NOT NULL DEFAULT 'irab',
    -- 'irab'|'meaning'|'balagha'|'grammar'|'qiraat'|'theological'|'literary'|'other'
  lx_reading_type_ref  TEXT,                 -- typed ref: LX:<ar_ling_reading_types.id>
  reading_text         TEXT NOT NULL,
  reading_text_ar      TEXT,
  is_minority          INTEGER NOT NULL DEFAULT 0,
  is_contested         INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrssr_scope ON qr_ss_scope_reading(scope_type, scope_id);

-- Evidence linked to a scope reading
CREATE TABLE IF NOT EXISTS qr_ss_scope_reading_evidence_link (
  reading_id           TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,        -- FK → qr_evidence_items.id
  support_type         TEXT NOT NULL DEFAULT 'supports',
  PRIMARY KEY (reading_id, evidence_id),
  FOREIGN KEY (reading_id)  REFERENCES qr_ss_scope_reading(id),
  FOREIGN KEY (evidence_id) REFERENCES qr_evidence_items(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § TREE PROJECTION  (downstream of scope model — generated, not primary store)
-- ─────────────────────────────────────────────────────────────────────────────

-- Canonical syntactic trees (built from occurrence + scope + relation rows)
CREATE TABLE IF NOT EXISTS qr_ss_tree (
  id                   TEXT PRIMARY KEY,     -- ULID
  sentence_id          TEXT NOT NULL,        -- FK → qr_ss_occ_sentence.id
  tree_type            TEXT NOT NULL DEFAULT 'constituency',
    -- 'constituency'|'dependency'|'lf_semantic'
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  note_md              TEXT,
  FOREIGN KEY (sentence_id) REFERENCES qr_ss_occ_sentence(id)
);

-- Nodes within a tree (each node represents a scope: sentence/clause/phrase/word)
CREATE TABLE IF NOT EXISTS qr_ss_tree_node (
  id                   TEXT PRIMARY KEY,     -- ULID
  tree_id              TEXT NOT NULL,        -- FK → qr_ss_tree.id
  parent_node_id       TEXT,                 -- FK → qr_ss_tree_node.id
  node_label           TEXT NOT NULL,        -- syntactic label: S, NP, VP, PP, etc.
  scope_type           TEXT,                 -- 'sentence'|'clause'|'phrase'|'word'|'segment'
  scope_id             TEXT,                 -- ULID of the scope this node represents
  depth                INTEGER NOT NULL DEFAULT 0,
  node_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id)      REFERENCES qr_ss_tree(id),
  FOREIGN KEY (parent_node_id) REFERENCES qr_ss_tree_node(id)
);

CREATE INDEX IF NOT EXISTS idx_qrstn_tree   ON qr_ss_tree_node(tree_id);
CREATE INDEX IF NOT EXISTS idx_qrstn_parent ON qr_ss_tree_node(parent_node_id);

-- Edges between tree nodes
CREATE TABLE IF NOT EXISTS qr_ss_tree_edge (
  id                   TEXT PRIMARY KEY,     -- ULID
  tree_id              TEXT NOT NULL,
  parent_node_id       TEXT NOT NULL,
  child_node_id        TEXT NOT NULL,
  edge_label           TEXT,                 -- e.g. 'subj', 'obj', 'spec', 'mod'
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id)        REFERENCES qr_ss_tree(id),
  FOREIGN KEY (parent_node_id) REFERENCES qr_ss_tree_node(id),
  FOREIGN KEY (child_node_id)  REFERENCES qr_ss_tree_node(id)
);

CREATE INDEX IF NOT EXISTS idx_qrste_tree   ON qr_ss_tree_edge(tree_id);

-- Layout cache for D3 rendering (pure projection helper — not canonical)
CREATE TABLE IF NOT EXISTS qr_ss_tree_layout_cache (
  tree_id              TEXT PRIMARY KEY,
  layout_json          TEXT NOT NULL,        -- D3-ready node positions {id, x, y, width, height}
  renderer             TEXT NOT NULL DEFAULT 'd3_tidy_tree',
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id) REFERENCES qr_ss_tree(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § SURAH-LEVEL LINGUISTIC ROLLUPS  (fed from sentence analysis — mandatory)
-- ─────────────────────────────────────────────────────────────────────────────

-- Clause patterns aggregated at the surah level
CREATE TABLE IF NOT EXISTS qr_surah_clause_patterns (
  surah                INTEGER PRIMARY KEY,
  dominant_clause_type TEXT,                 -- 'nominal_heavy'|'verbal_heavy'|'mixed'
  nominal_clause_pct   REAL,                 -- % of sentences that are nominal
  verbal_clause_pct    REAL,
  conditional_count    INTEGER NOT NULL DEFAULT 0,
  oath_count           INTEGER NOT NULL DEFAULT 0,
  interrogative_count  INTEGER NOT NULL DEFAULT 0,
  dominant_mood        TEXT,                 -- 'indicative'|'imperative'|'mixed'
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- Register shifts aggregated at the surah level
CREATE TABLE IF NOT EXISTS qr_surah_register_shifts (
  id                   TEXT PRIMARY KEY,     -- ULID
  surah                INTEGER NOT NULL,
  ayah_shift           INTEGER NOT NULL,     -- the ayah where the shift begins
  shift_axis           TEXT NOT NULL,
    -- 'addressee'|'topic'|'register'|'time_frame'|'speaker'|'scene'|'mode'
  from_state           TEXT,
  to_state             TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsrs_surah ON qr_surah_register_shifts(surah);

-- Ellipsis patterns aggregated at the surah level
CREATE TABLE IF NOT EXISTS qr_surah_ellipsis_patterns (
  surah                INTEGER PRIMARY KEY,
  dominant_ellipsis_type TEXT,
  total_ellipsis_count INTEGER NOT NULL DEFAULT 0,
  typical_effect       TEXT,                 -- overall rhetorical effect of ellipsis in surah
  notable_instances    TEXT,                 -- JSON array of {ayah, description}
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § FTS5 — full-text search on scope nuance and scope readings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS qr_ss_scope_nuance_fts USING fts5(
  scope_type UNINDEXED,
  scope_id   UNINDEXED,
  nuance_type,
  nuance_text,
  nuance_text_ar
);

CREATE VIRTUAL TABLE IF NOT EXISTS qr_ss_scope_reading_fts USING fts5(
  scope_type   UNINDEXED,
  scope_id     UNINDEXED,
  reading_type,
  reading_text,
  reading_text_ar
);
