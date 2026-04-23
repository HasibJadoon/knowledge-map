-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_arabic_linguistics DB — Classical Arabic Linguistic Backbone
-- File   : database/migrations/km-arabic-linguistics/001_al_schema.sql
-- DB     : km_arabic_linguistics   (binding: DB_AL in Workers)
-- Prefix : al_*
-- Module : AL
-- Run    : wrangler d1 execute km_arabic_linguistics --file=... --remote
--
-- Module scope (BACKBONE of classical Arabic):
--   This is the shared linguistic foundation consumed by BOTH km_quran (QR)
--   and km_arabic (AR). It owns everything that is ANALYTICAL/GRAMMATICAL
--   about the Arabic language as a classical tradition:
--
--   • Nahw (Arabic syntax / grammar rules and concepts)
--   • Sarf (Arabic morphology — verb/noun paradigm tables, وزن patterns)
--   • Balagha (Arabic rhetoric — definitional terms: bayan, maani, badi)
--   • Particle registry (حروف — types, grammatical effects, governance)
--   • Analysis vocabulary registries (sentence kinds, clause types, phrase
--     types, syntax relation types, reading types, nuance types, etc.)
--     → These are the enum/lookup tables consumed by QR's qr_ss_* layer
--     → And by AR's grammar exercises and irab analysis
--   • Classical Arabic grammar corpus (sourced texts — Alfiyyah, Kafiyah,
--     Muqaddimah al-Ajurrumiyyah, Sibawayhi, Zamakhshari, etc.)
--   • Classical Arabic parsing corpus (irab examples, treebank)
--
-- Distinction from km_lexicon (LX):
--   km_lexicon (LX) = NARROW dictionary layer: roots, lemmas, lexicon
--     entries, morphological links, expressions, tokens
--   km_arabic_linguistics (AL) = BROAD analytical backbone: grammar rules,
--     morphology paradigms, rhetoric terms, analysis vocabulary registries
--
-- Cross-module typed refs:
--   qr_ss_occ_clause.lx_clause_type_ref   → 'AL:<al_clause_types.id>'
--   qr_ss_scope_grammar_link.lx_grammar_ref → 'AL:<al_nahw_concepts.id>'
--   qr_ss_scope_balagha_link.lx_balagha_ref → 'AL:<al_balagha_terms.id>'
--   ar_grammar.lx_nahw_ref                 → 'AL:<al_nahw_concepts.id>'
--   ar_balagha.lx_balagha_ref              → 'AL:<al_balagha_terms.id>'
--
-- NOTE ON PREFIX: Although tables here use al_* prefix, the qr_ss_* layer
--   was written with 'lx_*_ref' column names (historical). Those column names
--   remain as-is; only the module code in the VALUE changes: 'AL:<id>' not
--   'LX:<id>'. This is resolved at the Worker service layer.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  NAHW — Arabic Syntax (Grammar Concepts)
-- ─────────────────────────────────────────────────────────────────────────────

-- The canonical nahw concept tree — e.g. الاسم → المعرب → المرفوع → المبتدأ
CREATE TABLE IF NOT EXISTS al_nahw_concepts (
  id              TEXT PRIMARY KEY,               -- ULID
  concept_key     TEXT NOT NULL UNIQUE,           -- slug: 'mubtada', 'khabar', 'fa'il', etc.
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  parent_id       TEXT,                           -- self-ref for hierarchy
  category        TEXT NOT NULL DEFAULT 'general',
    -- 'noun_grammar'|'verb_grammar'|'particle_grammar'|'sentence_type'|
    -- 'irab_sign'|'case_marker'|'agreement'|'tawabi'|'pronoun'|
    -- 'adverb'|'conjunction'|'exception'|'other'
  definition_md   TEXT,
  classical_source TEXT,                          -- e.g. 'Alfiyyah Ibn Malik (v.50)'
  bayt_ar         TEXT,                           -- classical verse reference (شاهد)
  examples_json   TEXT,                           -- JSON [{ar, en, parse_note}]
  quran_refs_json TEXT,                           -- JSON [{surah, ayah, note}]
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES al_nahw_concepts(id)
);

CREATE INDEX IF NOT EXISTS idx_al_nc_parent   ON al_nahw_concepts(parent_id);
CREATE INDEX IF NOT EXISTS idx_al_nc_category ON al_nahw_concepts(category);
CREATE INDEX IF NOT EXISTS idx_al_nc_key      ON al_nahw_concepts(concept_key);

CREATE VIRTUAL TABLE IF NOT EXISTS al_nahw_concepts_fts USING fts5(
  concept_key,
  title_ar,
  title_en,
  definition_md
);

-- Raw extracted nahw concepts (from grammar source processing — pre-canonicalized)
CREATE TABLE IF NOT EXISTS al_nahw_concepts_raw (
  id              TEXT PRIMARY KEY,               -- ULID
  source_chunk_id TEXT,                           -- FK → al_source_chunks.id
  term_ar         TEXT NOT NULL,
  definition_raw  TEXT,
  canonical_id    TEXT,                           -- FK → al_nahw_concepts.id once canonicalized
  status          TEXT NOT NULL DEFAULT 'raw',
    -- 'raw'|'linked'|'rejected'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (canonical_id) REFERENCES al_nahw_concepts(id)
);

-- Nahw concept ↔ Concept relations (precedes, requires, contradicts)
CREATE TABLE IF NOT EXISTS al_nahw_relations (
  id              TEXT PRIMARY KEY,               -- ULID
  from_concept_id TEXT NOT NULL,
  to_concept_id   TEXT NOT NULL,
  relation_type   TEXT NOT NULL DEFAULT 'related',
    -- 'requires'|'precedes'|'instance_of'|'related'|'contrasts_with'|
    -- 'exception_of'|'elaborates'|'equivalent_to'
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_concept_id, to_concept_id, relation_type),
  FOREIGN KEY (from_concept_id) REFERENCES al_nahw_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES al_nahw_concepts(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 2  SARF — Arabic Morphology (Paradigm Tables)
-- ─────────────────────────────────────────────────────────────────────────────

-- Verb morphology paradigms (تصريف الأفعال)
-- Each row is a full paradigm table for a verb form/root type combination
CREATE TABLE IF NOT EXISTS al_sarf_verb_paradigms (
  id              TEXT PRIMARY KEY,               -- ULID
  paradigm_key    TEXT NOT NULL UNIQUE,           -- e.g. 'form_i_sound_past', 'form_ii_past'
  verb_form       TEXT NOT NULL,
    -- 'form_i'|'form_ii'|'form_iii'|'form_iv'|'form_v'|'form_vi'|
    -- 'form_vii'|'form_viii'|'form_ix'|'form_x'
  root_type       TEXT NOT NULL DEFAULT 'sound',
    -- 'sound'|'weak_initial_waw'|'weak_initial_ya'|'weak_medial_waw'|
    -- 'weak_medial_ya'|'weak_final'|'doubled'|'hamzated_initial'|
    -- 'hamzated_medial'|'hamzated_final'|'irregular'
  tense           TEXT NOT NULL,
    -- 'past'|'present'|'imperative'|'jussive'|'subjunctive'
  paradigm_json   TEXT NOT NULL,                  -- JSON {m_s, f_s, m_d, f_d, m_pl, f_pl, ...}
  example_root    TEXT,                           -- example root used (e.g. ف-ع-ل or ن-ص-ر)
  example_root_en TEXT,
  notes_md        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_al_svp_form  ON al_sarf_verb_paradigms(verb_form);
CREATE INDEX IF NOT EXISTS idx_al_svp_type  ON al_sarf_verb_paradigms(root_type);
CREATE INDEX IF NOT EXISTS idx_al_svp_tense ON al_sarf_verb_paradigms(tense);

-- Noun morphology paradigms (تصريف الأسماء)
CREATE TABLE IF NOT EXISTS al_sarf_noun_paradigms (
  id              TEXT PRIMARY KEY,               -- ULID
  paradigm_key    TEXT NOT NULL UNIQUE,           -- e.g. 'sound_masculine_plural', 'broken_plural_fi'al'
  noun_type       TEXT NOT NULL,
    -- 'sound_masculine'|'sound_feminine'|'broken_plural'|'dual'|
    -- 'five_nouns'|'diptote'|'quadriliteral'|'quinqueliteral'|'irregular'
  pattern_ar      TEXT,                           -- وزن e.g. فَاعِل, مَفَاعِيل
  pattern_en      TEXT,
  paradigm_json   TEXT NOT NULL,                  -- JSON {nom_indef, nom_def, acc_indef, acc_def, gen_indef, gen_def}
  examples_json   TEXT,                           -- JSON [string]
  notes_md        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_al_snp_type    ON al_sarf_noun_paradigms(noun_type);
CREATE INDEX IF NOT EXISTS idx_al_snp_pattern ON al_sarf_noun_paradigms(pattern_ar);

-- Morphological patterns (أوزان) — the canonical وزن registry
CREATE TABLE IF NOT EXISTS al_morphology_patterns (
  id              TEXT PRIMARY KEY,               -- ULID
  pattern_key     TEXT NOT NULL UNIQUE,           -- slug: 'fa_ala', 'maf_al', etc.
  pattern_ar      TEXT NOT NULL UNIQUE,           -- e.g. فَعَلَ, مَفْعَل
  pattern_en      TEXT,                           -- transliteration
  pattern_category TEXT NOT NULL DEFAULT 'verb',
    -- 'verb_past'|'verb_present'|'verb_imperative'|'masdar'|'ism_fa'il'|
    -- 'ism_maf'ul'|'ism_makan'|'ism_zaman'|'ism_alah'|'sifah_mushabbahah'|
    -- 'mubalaghah'|'ism_tafdil'|'broken_plural'|'noun_pattern'|'other'
  frequency_quran INTEGER NOT NULL DEFAULT 0,
  examples_json   TEXT,                           -- JSON [{ar, en}]
  notes_md        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_al_mp_category ON al_morphology_patterns(pattern_category);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  BALAGHA — Arabic Rhetoric (Definitional Registry)
-- ─────────────────────────────────────────────────────────────────────────────

-- Canonical balagha term definitions — the definitional source of truth
CREATE TABLE IF NOT EXISTS al_balagha_terms (
  id              TEXT PRIMARY KEY,               -- ULID
  term_key        TEXT NOT NULL UNIQUE,           -- slug: 'tashbih', 'isti'arah', 'tibaq', etc.
  title_ar        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  balagha_category TEXT NOT NULL,
    -- 'bayan'|'mani'|'badi'
  parent_id       TEXT,                           -- self-ref: sub-type of a broader device
  definition_md   TEXT NOT NULL,
  classical_source TEXT,                          -- e.g. 'Miftah al-Ulum, p.200'
  quran_refs_json TEXT,                           -- JSON [{surah, ayah, device_note}]
  examples_json   TEXT,                           -- JSON [{ar, en, source_note}]
  distinguishing_features TEXT,                   -- what distinguishes from parent/sibling
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES al_balagha_terms(id)
);

CREATE INDEX IF NOT EXISTS idx_al_bt_category ON al_balagha_terms(balagha_category);
CREATE INDEX IF NOT EXISTS idx_al_bt_parent   ON al_balagha_terms(parent_id);

CREATE VIRTUAL TABLE IF NOT EXISTS al_balagha_terms_fts USING fts5(
  term_key,
  title_ar,
  title_en,
  definition_md
);

-- Balagha term ↔ Term relations
CREATE TABLE IF NOT EXISTS al_balagha_relations (
  id              TEXT PRIMARY KEY,               -- ULID
  from_term_id    TEXT NOT NULL,
  to_term_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL DEFAULT 'related',
    -- 'sub_type_of'|'contrasts_with'|'requires'|'related'|'combined_with'
  note_md         TEXT,
  UNIQUE (from_term_id, to_term_id, relation_type),
  FOREIGN KEY (from_term_id) REFERENCES al_balagha_terms(id),
  FOREIGN KEY (to_term_id)   REFERENCES al_balagha_terms(id)
);

-- Balagha definitional examples (textbook/classical examples)
CREATE TABLE IF NOT EXISTS al_balagha_examples (
  id              TEXT PRIMARY KEY,               -- ULID
  term_id         TEXT NOT NULL,
  example_ar      TEXT NOT NULL,
  example_en      TEXT,
  source_text     TEXT,                           -- book reference for the example
  quran_ref       TEXT,                           -- 'surah:ayah' if Quranic
  analysis_md     TEXT,                           -- why this exemplifies the device
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (term_id) REFERENCES al_balagha_terms(id)
);

CREATE INDEX IF NOT EXISTS idx_al_be_term ON al_balagha_examples(term_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 4  PARTICLES (حروف) — Registry + Governance
-- ─────────────────────────────────────────────────────────────────────────────

-- Particle definitions — the complete حروف registry
CREATE TABLE IF NOT EXISTS al_particles (
  id              TEXT PRIMARY KEY,               -- ULID
  particle_text   TEXT NOT NULL,                  -- the particle itself: في، على، أن، etc.
  particle_type   TEXT NOT NULL DEFAULT 'preposition',
    -- 'preposition'|'conjunction'|'particle_of_emphasis'|'particle_of_negation'|
    -- 'particle_of_interrogation'|'particle_of_exception'|'particle_of_condition'|
    -- 'particle_of_vocative'|'particle_of_restriction'|'particle_of_hope'|
    -- 'particle_of_future'|'particle_of_softening'|'particle_of_response'|
    -- 'complementizer'|'other'
  transliteration TEXT,
  grammatical_effect TEXT NOT NULL,
    -- 'jarr'|'nasb'|'jazm'|'raf'|'accusative_subj'|'none'|'multi'
  meanings_json   TEXT,                           -- JSON [{meaning_en, usage_note}]
  nahw_notes_md   TEXT,                           -- grammatical behavior notes
  quran_refs_json TEXT,                           -- JSON [{surah, ayah, usage_note}]
  classical_source TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_al_par_type   ON al_particles(particle_type);
CREATE INDEX IF NOT EXISTS idx_al_par_effect ON al_particles(grammatical_effect);

CREATE VIRTUAL TABLE IF NOT EXISTS al_particles_fts USING fts5(
  particle_text,
  particle_type,
  nahw_notes_md
);

-- Governance patterns (ʿAmil → Maʿmūl rules — عامل و معمول)
CREATE TABLE IF NOT EXISTS al_governance_patterns (
  id              TEXT PRIMARY KEY,               -- ULID
  amil_type       TEXT NOT NULL,                  -- the governing element type
    -- 'verb'|'verbal_noun'|'active_participle'|'preposition'|'particle'|
    -- 'quasi_verb'|'other'
  amil_ref        TEXT,                           -- typed ref: 'AL:<al_particles.id>' or 'AL:<al_nahw_concepts.id>'
  mamul_case      TEXT NOT NULL,                  -- the case assigned to the governed element
    -- 'raf'|'nasb'|'jarr'|'jazm'
  mamul_type      TEXT,                           -- what kind of element is governed
  condition       TEXT,                           -- any conditions for the governance to apply
  example_ar      TEXT,
  example_en      TEXT,
  notes_md        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_al_gov_amil  ON al_governance_patterns(amil_type);
CREATE INDEX IF NOT EXISTS idx_al_gov_case  ON al_governance_patterns(mamul_case);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  ANALYSIS VOCABULARY REGISTRIES
--   These are the lookup/enum tables consumed by QR's qr_ss_* layer
--   and AR's grammar analysis. All typed refs from qr_ss_* that were
--   previously written as 'LX:<id>' should resolve as 'AL:<id>' at the
--   Worker service layer.
-- ─────────────────────────────────────────────────────────────────────────────

-- Sentence kinds (jumlah types)
CREATE TABLE IF NOT EXISTS al_sentence_kinds (
  id              TEXT PRIMARY KEY,               -- ULID
  kind_key        TEXT NOT NULL UNIQUE,           -- e.g. 'jumlah_ismiyyah', 'jumlah_fi'liyyah'
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  description_md  TEXT,
  nahw_concept_id TEXT,                           -- FK → al_nahw_concepts.id
  examples_json   TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (nahw_concept_id) REFERENCES al_nahw_concepts(id)
);

-- Clause types
CREATE TABLE IF NOT EXISTS al_clause_types (
  id              TEXT PRIMARY KEY,               -- ULID
  type_key        TEXT NOT NULL UNIQUE,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  description_md  TEXT,
  nahw_concept_id TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clause functions (what a clause does in its sentence)
CREATE TABLE IF NOT EXISTS al_clause_functions (
  id              TEXT PRIMARY KEY,               -- ULID
  func_key        TEXT NOT NULL UNIQUE,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phrase types
CREATE TABLE IF NOT EXISTS al_phrase_types (
  id              TEXT PRIMARY KEY,               -- ULID
  type_key        TEXT NOT NULL UNIQUE,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phrase functions
CREATE TABLE IF NOT EXISTS al_phrase_functions (
  id              TEXT PRIMARY KEY,               -- ULID
  func_key        TEXT NOT NULL UNIQUE,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Syntax relation types (UD-compatible dependency labels for Arabic)
CREATE TABLE IF NOT EXISTS al_syntax_relation_types (
  id              TEXT PRIMARY KEY,               -- ULID
  rel_key         TEXT NOT NULL UNIQUE,           -- e.g. 'mubtada', 'khabar', 'fa'il', 'maf'ul'
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  ud_equivalent   TEXT,                           -- UD label (nsubj, obj, iobj, etc.) if any
  description_md  TEXT,
  nahw_concept_id TEXT,                           -- FK → al_nahw_concepts.id
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (nahw_concept_id) REFERENCES al_nahw_concepts(id)
);

-- Reading types (for qr_ss_scope_reading)
CREATE TABLE IF NOT EXISTS al_reading_types (
  id              TEXT PRIMARY KEY,               -- ULID
  type_key        TEXT NOT NULL UNIQUE,
  title_en        TEXT NOT NULL,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Evidence types (for qr_ss_scope_reading_evidence_link)
CREATE TABLE IF NOT EXISTS al_evidence_types (
  id              TEXT PRIMARY KEY,               -- ULID
  type_key        TEXT NOT NULL UNIQUE,
  title_en        TEXT NOT NULL,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Nuance types (for qr_ss_scope_nuance)
CREATE TABLE IF NOT EXISTS al_nuance_types (
  id              TEXT PRIMARY KEY,               -- ULID
  type_key        TEXT NOT NULL UNIQUE,
  title_ar        TEXT,
  title_en        TEXT NOT NULL,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ellipsis types (for qr_ss_ellipsis_event)
CREATE TABLE IF NOT EXISTS al_ellipsis_types (
  id              TEXT PRIMARY KEY,               -- ULID
  type_key        TEXT NOT NULL UNIQUE,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  nahw_concept_id TEXT,
  description_md  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (nahw_concept_id) REFERENCES al_nahw_concepts(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5.1  SEED: Analysis Vocabulary Registries
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO al_sentence_kinds(id, kind_key, title_ar, title_en) VALUES
  ('01ALSK001', 'jumlah_ismiyyah',   'الجملة الاسمية',  'Nominal Sentence'),
  ('01ALSK002', 'jumlah_fi''liyyah', 'الجملة الفعلية',  'Verbal Sentence'),
  ('01ALSK003', 'jumlah_shart',      'جملة الشرط',      'Conditional Sentence'),
  ('01ALSK004', 'jumlah_nida',       'جملة النداء',      'Vocative Sentence'),
  ('01ALSK005', 'jumlah_istifham',   'جملة الاستفهام',  'Interrogative Sentence'),
  ('01ALSK006', 'jumlah_nafi',       'جملة النفي',       'Negative Sentence'),
  ('01ALSK007', 'jumlah_amr',        'جملة الأمر',       'Imperative Sentence'),
  ('01ALSK008', 'jumlah_nahi',       'جملة النهي',       'Prohibitive Sentence');

INSERT OR IGNORE INTO al_clause_types(id, type_key, title_ar, title_en) VALUES
  ('01ALCT001', 'main',         'الجملة الرئيسية',       'Main Clause'),
  ('01ALCT002', 'subordinate',  'الجملة الفرعية',         'Subordinate Clause'),
  ('01ALCT003', 'relative',     'الجملة الموصولية',       'Relative Clause'),
  ('01ALCT004', 'conditional',  'جملة الشرط',             'Conditional Clause'),
  ('01ALCT005', 'adverbial',    'الجملة الظرفية',         'Adverbial Clause'),
  ('01ALCT006', 'nominal',      'الجملة في محل اسم',     'Nominal Clause (in noun position)'),
  ('01ALCT007', 'verbal',       'الجملة الفعلية الفرعية', 'Verbal Subordinate'),
  ('01ALCT008', 'appositive',   'البدلية',                 'Appositive Clause'),
  ('01ALCT009', 'parenthetical','الجملة الاعتراضية',      'Parenthetical Clause'),
  ('01ALCT010', 'circumstantial','جملة الحال',             'Circumstantial Clause (ḥāl)'),
  ('01ALCT011', 'explanatory',  'الجملة التفسيرية',       'Explanatory Clause'),
  ('01ALCT012', 'oath',         'جملة القسم',              'Oath Clause');

INSERT OR IGNORE INTO al_phrase_types(id, type_key, title_ar, title_en) VALUES
  ('01ALPT001', 'noun_phrase',  'المركب الاسمي',     'Noun Phrase'),
  ('01ALPT002', 'verb_phrase',  'المركب الفعلي',     'Verb Phrase'),
  ('01ALPT003', 'prep_phrase',  'المركب الجاري',     'Prepositional Phrase'),
  ('01ALPT004', 'adj_phrase',   'المركب الوصفي',     'Adjectival Phrase'),
  ('01ALPT005', 'adv_phrase',   'المركب الظرفي',     'Adverbial Phrase'),
  ('01ALPT006', 'isnadi_phrase','المركب الإسنادي',   'Predicative (Isnadi) Phrase'),
  ('01ALPT007', 'idafi_phrase', 'المركب الإضافي',    'Genitive (Idafa) Phrase'),
  ('01ALPT008', 'nati_phrase',  'المركب النعتي',     'Attributive (Na''t) Phrase'),
  ('01ALPT009', 'conj_phrase',  'المركب العطفي',     'Conjunctive Phrase'),
  ('01ALPT010', 'num_phrase',   'المركب العددي',     'Numeral Phrase');

INSERT OR IGNORE INTO al_syntax_relation_types(id, rel_key, title_ar, title_en, ud_equivalent) VALUES
  ('01ALSRT01', 'mubtada',   'المبتدأ',         'Subject (nominal)',      'nsubj'),
  ('01ALSRT02', 'khabar',    'الخبر',           'Predicate',             'root'),
  ('01ALSRT03', 'fa''il',    'الفاعل',          'Agent (subject of verb)','nsubj'),
  ('01ALSRT04', 'naib_fa''il','نائب الفاعل',    'Passive Subject',       'nsubj:pass'),
  ('01ALSRT05', 'maf''ul_bih','المفعول به',     'Direct Object',         'obj'),
  ('01ALSRT06', 'maf''ul_lah','المفعول لأجله',  'Purpose Object',        'advcl'),
  ('01ALSRT07', 'maf''ul_fih','المفعول فيه',    'Adverbial Object',      'obl'),
  ('01ALSRT08', 'maf''ul_mah','المفعول معه',    'Comitative Object',     'obl:comp'),
  ('01ALSRT09', 'maf''ul_mutlaq','المفعول المطلق','Cognate/Absolute Object','obj:abs'),
  ('01ALSRT10', 'hal',       'الحال',           'Circumstantial (ḥāl)',  'advcl'),
  ('01ALSRT11', 'tamyiz',    'التمييز',         'Specification (tamyīz)','obl:tmod'),
  ('01ALSRT12', 'na''t',     'النعت',           'Adjective/Attribute',   'amod'),
  ('01ALSRT13', 'badal',     'البدل',           'Apposition/Substitute', 'appos'),
  ('01ALSRT14', 'tawkid',    'التوكيد',         'Emphasis (tawkīd)',     'reparandum'),
  ('01ALSRT15', 'atf',       'المعطوف',         'Conjunction-linked',    'conj'),
  ('01ALSRT16', 'mudaf',     'المضاف',          'Construct State Head',  'nmod:poss');

INSERT OR IGNORE INTO al_reading_types(id, type_key, title_en) VALUES
  ('01ALRT001', 'mainstream',        'Mainstream Scholarly Reading'),
  ('01ALRT002', 'minority',          'Minority / Non-mainstream Reading'),
  ('01ALRT003', 'contested',         'Actively Contested Reading'),
  ('01ALRT004', 'historical',        'Historical Variant Reading'),
  ('01ALRT005', 'paradigm_specific', 'Reading specific to a scholarly paradigm');

INSERT OR IGNORE INTO al_evidence_types(id, type_key, title_en) VALUES
  ('01ALET001', 'text_internal',    'Internal Textual Evidence'),
  ('01ALET002', 'lexical',          'Lexical Evidence'),
  ('01ALET003', 'structural',       'Structural / Compositional Evidence'),
  ('01ALET004', 'scholarly',        'Scholarly Citation / Tradition'),
  ('01ALET005', 'manuscript',       'Manuscript Evidence'),
  ('01ALET006', 'comparative',      'Comparative Linguistic Evidence'),
  ('01ALET007', 'phonetic',         'Phonetic / Phonological Evidence');

INSERT OR IGNORE INTO al_nuance_types(id, type_key, title_ar, title_en) VALUES
  ('01ALNT001', 'discourse_force',  'القوة الخطابية',  'Discourse Force'),
  ('01ALNT002', 'emphasis',         'التوكيد',          'Emphasis / Intensification'),
  ('01ALNT003', 'suspension',       'الإيهام والتعليق','Suspension / Withholding'),
  ('01ALNT004', 'contrast',         'المقابلة',         'Contrast'),
  ('01ALNT005', 'ellipsis_signal',  'إشارة الحذف',     'Ellipsis Signal'),
  ('01ALNT006', 'modulation',       'التخفيف',          'Modulation / Softening'),
  ('01ALNT007', 'irony',            'التهكم',           'Irony / Rhetorical Contrast');

INSERT OR IGNORE INTO al_ellipsis_types(id, type_key, title_ar, title_en) VALUES
  ('01ALET001', 'mubtada_mahdhuf',  'المبتدأ المحذوف',    'Omitted Subject (mubtada)'),
  ('01ALET002', 'khabar_mahdhuf',   'الخبر المحذوف',      'Omitted Predicate (khabar)'),
  ('01ALET003', 'maf''ul_mahdhuf',  'المفعول المحذوف',    'Omitted Object'),
  ('01ALET004', 'fi''l_mahdhuf',    'الفعل المحذوف',      'Omitted Verb'),
  ('01ALET005', 'mawsuf_mahdhuf',   'الموصوف المحذوف',    'Omitted Qualified Noun'),
  ('01ALET006', 'mudaf_mahdhuf',    'المضاف المحذوف',     'Omitted Construct State Head'),
  ('01ALET007', 'jar_majrur_mahdhuf','الجار والمجرور المحذوف','Omitted Prepositional Phrase'),
  ('01ALET008', 'fa''il_mahdhuf',   'الفاعل المحذوف',     'Omitted Agent');

-- ─────────────────────────────────────────────────────────────────────────────
-- § 6  CLASSICAL ARABIC GRAMMAR SOURCES (Grammar Corpus)
-- ─────────────────────────────────────────────────────────────────────────────

-- Source texts used by the pipeline (Alfiyyah, Kafiyah, Ajurrumiyyah, etc.)
CREATE TABLE IF NOT EXISTS al_sources (
  id              TEXT PRIMARY KEY,               -- ULID
  slug            TEXT UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  author_ar       TEXT,
  author_en       TEXT,
  century_hijri   INTEGER,                        -- e.g. 7 (for 7th century AH)
  source_type     TEXT NOT NULL DEFAULT 'grammar_book',
    -- 'grammar_book'|'morphology_book'|'rhetoric_book'|'lexicon_source'|
    -- 'sharh_commentary'|'manzumah'|'classical_prose'|'other'
  description_md  TEXT,
  page_count      INTEGER,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_al_src_type ON al_sources(source_type);

-- Text chunks for AI pipeline embedding
CREATE TABLE IF NOT EXISTS al_source_chunks (
  id              TEXT PRIMARY KEY,               -- ULID
  source_id       TEXT NOT NULL,
  chunk_index     INTEGER NOT NULL,
  page_no         INTEGER,
  heading_norm    TEXT,
  text_ar         TEXT NOT NULL,                  -- Arabic chunk text
  text_en         TEXT,                           -- translation (if available)
  chunk_type      TEXT NOT NULL DEFAULT 'rule',
    -- 'rule'|'example'|'sharh'|'manzumah_bayt'|'definition'|'other'
  is_embedded     INTEGER NOT NULL DEFAULT 0,
  qdrant_id       TEXT,                           -- Qdrant point UUID
  chunk_kind      TEXT,
    -- 'nahw'|'sarf'|'balagha'|'particle'|'irab_example'|'other'
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES al_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_al_sc_source   ON al_source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_al_sc_embedded ON al_source_chunks(is_embedded);
CREATE INDEX IF NOT EXISTS idx_al_sc_kind     ON al_source_chunks(source_id, chunk_kind);

CREATE VIRTUAL TABLE IF NOT EXISTS al_source_chunks_fts USING fts5(
  chunk_kind,
  heading_norm,
  text_ar,
  text_en
);

-- Source table of contents / navigation
CREATE TABLE IF NOT EXISTS al_source_toc (
  id              TEXT PRIMARY KEY,               -- ULID
  source_id       TEXT NOT NULL,
  parent_id       TEXT,                           -- self-ref
  section_index   INTEGER NOT NULL DEFAULT 0,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  page_from       INTEGER,
  page_to         INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES al_sources(id),
  FOREIGN KEY (parent_id) REFERENCES al_source_toc(id)
);

CREATE INDEX IF NOT EXISTS idx_al_stoc_source ON al_source_toc(source_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 7  ARABIC PARSING CORPUS (Irab Examples & Classical Treebank)
-- ─────────────────────────────────────────────────────────────────────────────

-- Parsed Arabic sentences (canonical irab examples from classical sources)
CREATE TABLE IF NOT EXISTS al_parsed_sentences (
  id              TEXT PRIMARY KEY,               -- ULID
  source_id       TEXT,                           -- FK → al_sources.id
  sentence_ar     TEXT NOT NULL,
  sentence_en     TEXT,
  sentence_type   TEXT NOT NULL DEFAULT 'classical',
    -- 'classical'|'quranic'|'hadith'|'poetic'|'modern'
  qr_scope_ref    TEXT,                           -- 'QR:surah:ayah' if Quranic
  irab_json       TEXT,                           -- JSON [{word, irab_position, case, role, note}]
  tree_json       TEXT,                           -- optional syntax tree
  analysis_md     TEXT,
  complexity      TEXT NOT NULL DEFAULT 'intermediate',
    -- 'beginner'|'intermediate'|'advanced'
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_al_ps_source ON al_parsed_sentences(source_id);
CREATE INDEX IF NOT EXISTS idx_al_ps_type   ON al_parsed_sentences(sentence_type);

CREATE VIRTUAL TABLE IF NOT EXISTS al_parsed_sentences_fts USING fts5(
  sentence_ar,
  sentence_en,
  analysis_md
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 8  SEED: Core Balagha Terms
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO al_balagha_terms(id, term_key, title_ar, title_en, balagha_category, definition_md) VALUES
  ('01ALBT001', 'tashbih',    'التَّشْبِيه',      'Simile (Tashbīh)',        'bayan', 'Comparing two things explicitly using a particle of comparison (كـ, مثل, كأن). A hallmark of Quranic imagery.'),
  ('01ALBT002', 'isti_arah',  'الِاسْتِعَارَة',   'Metaphor (Istiʿārah)',    'bayan', 'Implicit comparison where one thing is described as another without a comparative particle.'),
  ('01ALBT003', 'kinayah',    'الْكِنَايَة',      'Metonymy (Kināyah)',       'bayan', 'Expressing a meaning through an associated concept rather than stating it explicitly.'),
  ('01ALBT004', 'majaz',      'الْمَجَاز',        'Figurative Usage (Majāz)', 'bayan', 'Using a word in other than its primary meaning due to a relationship (علاقة) between the two meanings.'),
  ('01ALBT005', 'ijaz',       'الْإِيجَاز',       'Conciseness (Ījāz)',       'mani',  'Expressing maximum meaning with minimum words — a hallmark of Quranic style.'),
  ('01ALBT006', 'itnab',      'الْإِطْنَاب',      'Elaboration (Iṭnāb)',      'mani',  'Expanding expression beyond bare necessity for rhetorical effect (emphasis, clarity, persuasion).'),
  ('01ALBT007', 'musawah',    'الْمُسَاوَاة',     'Equivalence (Musāwāh)',    'mani',  'Where the length of expression exactly matches the meaning conveyed — neither concise nor elaborate.'),
  ('01ALBT008', 'tibaq',      'الطِّبَاق',        'Antithesis (Ṭibāq)',        'badi',  'Combining two opposing concepts in the same phrase for contrast and emphasis.'),
  ('01ALBT009', 'muqabalah',  'الْمُقَابَلَة',    'Parallel Contrast (Muqābala)', 'badi', 'Pairing multiple concepts and their opposites in a structured sequence.'),
  ('01ALBT010', 'jinas',      'الْجِنَاس',        'Paronomasia (Jinās)',       'badi',  'Using words of similar sound but different meaning — enhances musicality and depth.'),
  ('01ALBT011', 'fasilah',    'الْفَاصِلَة',      'Quranic Rhyme (Fāṣilah)',   'badi',  'The rhyming end-sound of Quranic verses creating rhythm, coherence, and memorability.'),
  ('01ALBT012', 'iltifat',    'الِالْتِفَات',     'Shift of Address (Iltifāt)','mani',  'Shifting the grammatical person (1st/2nd/3rd) mid-discourse for rhetorical effect.');
