-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  Phase Q4 — Quran Deep Linguistic Analysis
-- File   : Database/migrations/2026-07-21_phase_q4_qr_linguistic_deep.sql
-- Run    : wrangler d1 execute knowledgemap \
--            --file=Database/migrations/2026-07-21_phase_q4_qr_linguistic_deep.sql --remote
--
-- What this does (NEW tables only — no renames, zero breakage):
--
--   Sentence / Clause / Phrase layer
--     qr_sentence_units         — verse-level sentence boundaries & types
--     qr_clause_units           — clause decomposition within sentences
--     qr_phrase_units           — phrase groups (idafa, sifa, jar-majrur, etc.)
--
--   Token-level deep analysis
--     qr_token_morphology       — per-token: pos, stem, pattern, gender, number
--     qr_token_irab             — per-token: case, mood, voice, definiteness
--     qr_token_syntax           — per-token: syntactic role in parent clause
--     qr_token_relations        — dependency/government arcs between tokens
--
--   Preposition / Particle analysis
--     qr_preposition_uses       — every حرف جر occurrence with semantic role
--     qr_particle_uses          — every حرف (non-preposition) with function tag
--
--   Discourse / Rhetorical layer
--     qr_surah_discourse_units  — macro discourse blocks within a surah
--     qr_surah_discourse_shifts — topic, addressee, or register shifts
--     qr_surah_iltifat_events   — التفات (person/number/gender shift) events
--
--   Sonic / Prosodic layer
--     qr_surah_rhyme_profiles   — per-surah rhyme scheme summary
--     qr_surah_fawasil_patterns — verse-ending (فاصلة) patterns
--     qr_surah_sonic_groups     — groups of verses sharing a sonic feature
--
--   Cross-reference helpers
--     qr_linguistic_notes       — freeform scholarly notes on any of the above
--
-- Dependencies (must exist before this migration):
--   qr_ayah            (from Phase 1 — qr_rename)
--   qr_surahs          (from Phase 1)
--   ar_ling_tokens     (from Phase 2 — ling_rename)
--   ar_ling_sources    (from Phase 2)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  SENTENCE UNITS
--      A "sentence" here is a grammatically complete unit that may span
--      one or more ayahs (or be a sub-ayah fragment).
--      Multiple sentences can share a single ayah.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_sentence_units (
  id                TEXT PRIMARY KEY,           -- ULID

  -- Location
  surah             INTEGER NOT NULL,
  ayah_from         INTEGER NOT NULL,           -- starting ayah
  ayah_to           INTEGER NOT NULL,           -- ending ayah (= ayah_from if single ayah)
  token_start       INTEGER,                    -- 1-based token index within ayah_from
  token_end         INTEGER,                    -- 1-based token index within ayah_to

  -- Sentence classification
  sentence_type     TEXT NOT NULL DEFAULT 'declarative',
    -- 'declarative'|'interrogative'|'imperative'|'conditional'|
    --  'exclamatory'|'oath'|'answer'|'nominal'|'verbal'|'fragment'
  sentence_subtype  TEXT,
    -- 'jussive_conditional'|'inverted_nominal'|'comment_clause'|etc.

  -- Irab (إعراب) top-level
  subject_token_ids TEXT,                       -- JSON array of ar_ling_tokens.id for المبتدأ/الفاعل
  predicate_token_ids TEXT,                     -- JSON array for الخبر/المفعول الأول
  verb_token_id     TEXT,                       -- FK → ar_ling_tokens.id (for verbal sentences)

  -- Discourse role within surah
  discourse_role    TEXT,
    -- 'topic_sentence'|'elaboration'|'contrast'|'digression'|
    --  'transition'|'conclusion'|'oath_opening'|'oath_answer'

  -- Annotations
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsu_surah_ayah ON qr_sentence_units(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_qrsu_type       ON qr_sentence_units(sentence_type);

CREATE TRIGGER trg_qr_sentence_units_updated_at
AFTER UPDATE ON qr_sentence_units
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_sentence_units SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 2  CLAUSE UNITS
--      Clauses are sub-sentence units: main clause, subordinate clause,
--      relative clause (صلة الموصول), adverbial clause, etc.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_clause_units (
  id                TEXT PRIMARY KEY,           -- ULID

  sentence_id       TEXT NOT NULL,              -- FK → qr_sentence_units.id
  parent_clause_id  TEXT,                       -- FK → qr_clause_units.id (null = top clause)
  clause_order      INTEGER NOT NULL DEFAULT 1, -- order within parent

  -- Location (can be narrower than parent sentence)
  surah             INTEGER NOT NULL,
  ayah_from         INTEGER NOT NULL,
  ayah_to           INTEGER NOT NULL,
  token_start       INTEGER,
  token_end         INTEGER,

  -- Clause type
  clause_type       TEXT NOT NULL DEFAULT 'main',
    -- 'main'|'relative'|'conditional_if'|'conditional_then'|
    --  'adverbial_time'|'adverbial_cause'|'adverbial_result'|
    --  'nominal_subject'|'nominal_predicate'|'vocative'|
    --  'oath'|'oath_answer'|'parenthetical'|'elliptical'

  -- Governing element
  governing_particle TEXT,    -- e.g. إِنَّ، لَمَّا، إِذَا، حَيْثُ
  governing_token_id TEXT,    -- FK → ar_ling_tokens.id of the governing particle/verb

  -- Structural notes
  is_elliptical     INTEGER NOT NULL DEFAULT 0, -- 1 = mubtada' or khabar understood
  elided_element    TEXT,                        -- description of what is elided
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (sentence_id) REFERENCES qr_sentence_units(id),
  FOREIGN KEY (parent_clause_id) REFERENCES qr_clause_units(id)
);

CREATE INDEX IF NOT EXISTS idx_qrcu_sentence   ON qr_clause_units(sentence_id);
CREATE INDEX IF NOT EXISTS idx_qrcu_parent     ON qr_clause_units(parent_clause_id);
CREATE INDEX IF NOT EXISTS idx_qrcu_surah_ayah ON qr_clause_units(surah, ayah_from);

CREATE TRIGGER trg_qr_clause_units_updated_at
AFTER UPDATE ON qr_clause_units
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_clause_units SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  PHRASE UNITS
--      Phrase groups within a clause: إضافة، صفة، جار ومجرور، مفعول به،
--      حال، تمييز، منادى, etc.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_phrase_units (
  id                TEXT PRIMARY KEY,           -- ULID

  clause_id         TEXT NOT NULL,              -- FK → qr_clause_units.id
  phrase_order      INTEGER NOT NULL DEFAULT 1,

  -- Location
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  token_start       INTEGER NOT NULL,
  token_end         INTEGER NOT NULL,

  -- Phrase type
  phrase_type       TEXT NOT NULL,
    -- 'idafa'         إضافة  (construct state chain)
    -- 'sifa_mawsuf'   صفة + موصوف
    -- 'jar_majrur'    جار ومجرور
    -- 'maf_ul_bih'    مفعول به
    -- 'maf_ul_mutlaq' مفعول مطلق
    -- 'maf_ul_lahu'   مفعول لأجله
    -- 'maf_ul_fih'    مفعول فيه (ظرف)
    -- 'hal'           حال
    -- 'tamyiz'        تمييز
    -- 'munada'        منادى
    -- 'badal'         بدل
    -- 'atf'           عطف
    -- 'tawkid'        توكيد
    -- 'istithna'      استثناء
    -- 'verbal_noun'   مصدر مؤول
    -- 'other'

  -- Head token
  head_token_id     TEXT,                       -- FK → ar_ling_tokens.id

  -- Semantics
  semantic_role     TEXT,                       -- 'agent'|'patient'|'beneficiary'|'location'|'time'|'manner'|'reason'|'instrument'|'source'|'goal'

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (clause_id) REFERENCES qr_clause_units(id)
);

CREATE INDEX IF NOT EXISTS idx_qrpu_clause     ON qr_phrase_units(clause_id);
CREATE INDEX IF NOT EXISTS idx_qrpu_surah_ayah ON qr_phrase_units(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qrpu_type       ON qr_phrase_units(phrase_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 4  TOKEN MORPHOLOGY
--      Fine-grained morphological breakdown per Quranic token.
--      ar_ling_tokens stores the raw token; this table stores the
--      analytical layer specific to Quran occurrence context.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_token_morphology (
  id                TEXT PRIMARY KEY,           -- ULID

  -- Quran location
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  token_index       INTEGER NOT NULL,           -- 1-based word position in ayah
  token_text        TEXT NOT NULL,              -- the actual Arabic text of this token

  -- Link to shared LING token registry (optional — may be null during bootstrapping)
  ling_token_id     TEXT,                       -- FK → ar_ling_tokens.id

  -- Part of speech (POS)
  pos               TEXT NOT NULL,
    -- 'noun'|'verb'|'adjective'|'adverb'|'pronoun'|
    --  'preposition'|'conjunction'|'particle'|'interjection'|
    --  'proper_noun'|'relative_pronoun'|'demonstrative'

  -- Morphological features
  stem              TEXT,                       -- uninflected stem
  root              TEXT,                       -- trilateral/quadrilateral root (unvowelled)
  pattern           TEXT,                       -- وزن / morphological pattern
  gender            TEXT,                       -- 'masc'|'fem'|'both'
  number            TEXT,                       -- 'singular'|'dual'|'plural'|'collective'|'singular_of_collective'
  person            TEXT,                       -- '1st'|'2nd'|'3rd' (verbs/pronouns)
  tense             TEXT,                       -- 'perfect'|'imperfect'|'imperative'|'masdar' (verbs)
  voice             TEXT,                       -- 'active'|'passive' (verbs)
  form_number       INTEGER,                    -- verb form (I–X / أبواب الثلاثي والرباعي)

  -- Definiteness
  definiteness      TEXT,                       -- 'definite'|'indefinite'|'construct'
  has_article       INTEGER NOT NULL DEFAULT 0, -- 1 = has ال التعريف

  -- Affix breakdown
  prefix_text       TEXT,                       -- e.g. وَ، فَ، بِ، لِ
  suffix_text       TEXT,                       -- e.g. ـكَ، ـهُمْ

  -- Source / provenance
  source_code       TEXT,                       -- e.g. 'quranic_corpus'|'manual'|'pipeline'
  confidence        REAL,                       -- 0.0–1.0 if from automated analysis

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, ayah, token_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrtm_surah_ayah  ON qr_token_morphology(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qrtm_root        ON qr_token_morphology(root);
CREATE INDEX IF NOT EXISTS idx_qrtm_pos         ON qr_token_morphology(pos);
CREATE INDEX IF NOT EXISTS idx_qrtm_ling_token  ON qr_token_morphology(ling_token_id);

CREATE TRIGGER trg_qr_token_morphology_updated_at
AFTER UPDATE ON qr_token_morphology
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_token_morphology SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  TOKEN IRAB (إعراب)
--      Syntactic case analysis for each token. Separated from morphology
--      because irab depends on context (same word form, different case).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_token_irab (
  id                TEXT PRIMARY KEY,           -- ULID

  token_morphology_id TEXT NOT NULL UNIQUE,     -- FK → qr_token_morphology.id (1:1)

  -- Syntactic position (إعراب)
  irab_position     TEXT NOT NULL,
    -- 'marfu'    مرفوع  (nominative — subject, predicate, doer)
    -- 'mansub'   منصوب  (accusative — object, hal, tamyiz, etc.)
    -- 'majrur'   مجرور  (genitive — after preposition or in construct state)
    -- 'majzum'   مجزوم  (jussive — conditional verb, imperative)
    -- 'mabniy'   مبني   (indeclinable — particles, pronouns, demonstratives)
    -- 'na'   — not applicable (foreign, uninflected, etc.)

  -- Case/mood sign (علامة الإعراب)
  irab_sign         TEXT,                       -- 'damma'|'fatha'|'kasra'|'sukun'|'nun_deletion'|'waw'|'alif'|'ya'|'tanwin_damm'|'tanwin_fath'|'tanwin_kasr'

  -- Sign type
  sign_type         TEXT,
    -- 'asl'          أصلي  (standard)
    -- 'niyabi'       نيابي (substitute sign — e.g. و for رفع in أسماء الخمسة)
    -- 'muqaddara'    مقدّرة (estimated — for defective nouns/verbs)
    -- 'mahalliya'    محلية  (positional — for indeclinable that has an understood position)

  -- Syntactic function (الوظيفة النحوية)
  syntactic_function TEXT,
    -- 'mubtada'    مبتدأ
    -- 'khabar'     خبر
    -- 'fail'       فاعل
    -- 'naib_fail'  نائب الفاعل
    -- 'mafuul_bih' مفعول به
    -- 'mafuul_mutlaq' مفعول مطلق
    -- 'mafuul_lahu'   مفعول لأجله
    -- 'mafuul_fih'    مفعول فيه
    -- 'hal'        حال
    -- 'tamyiz'     تمييز
    -- 'mubtada_mu'akkhar'  مبتدأ مؤخر
    -- 'khabar_muqaddam'    خبر مقدم
    -- 'ism_inna'   اسم إن
    -- 'khabar_inna' خبر إن
    -- 'ism_kaana'  اسم كان
    -- 'khabar_kaana' خبر كان
    -- 'sifa'       صفة / نعت
    -- 'atf'        معطوف
    -- 'badal'      بدل
    -- 'tawkid'     توكيد
    -- 'munada'     منادى
    -- 'mudaf_ilayh' مضاف إليه
    -- 'majrur_harfi' مجرور بحرف جر
    -- 'jawab_shart' جواب الشرط
    -- 'other'

  -- Controller (عامل الإعراب)
  controller_token_id TEXT,                     -- FK → qr_token_morphology.id (verb, particle, etc. that governs case)
  controller_note   TEXT,

  -- Disputable / scholarly note
  is_disputed       INTEGER NOT NULL DEFAULT 0,
  dispute_note      TEXT,

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (token_morphology_id) REFERENCES qr_token_morphology(id)
);

CREATE INDEX IF NOT EXISTS idx_qrti_morph_id   ON qr_token_irab(token_morphology_id);
CREATE INDEX IF NOT EXISTS idx_qrti_function   ON qr_token_irab(syntactic_function);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 6  TOKEN DEPENDENCY RELATIONS
--      Directed graph: head → dependent.  Each row is one arc.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_token_relations (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,

  head_token_morph_id  TEXT NOT NULL,           -- FK → qr_token_morphology.id
  dep_token_morph_id   TEXT NOT NULL,           -- FK → qr_token_morphology.id

  -- Dependency label (Universal Dependencies style adapted for Arabic)
  relation_label    TEXT NOT NULL,
    -- 'nsubj'   nominal subject
    -- 'obj'     direct object
    -- 'iobj'    indirect object
    -- 'csubj'   clausal subject
    -- 'ccomp'   clausal complement
    -- 'xcomp'   open clausal complement
    -- 'nmod'    nominal modifier (mudaf ilayh, jar majrur)
    -- 'amod'    adjectival modifier (sifa/na't)
    -- 'nummod'  numeric modifier
    -- 'advmod'  adverbial modifier
    -- 'discourse' discourse element (e.g. وَ، فَ opening)
    -- 'aux'     auxiliary
    -- 'cop'     copula
    -- 'mark'    subordination marker (إن، أن، لما)
    -- 'det'     determiner (ال)
    -- 'appos'   appositional (بدل، عطف بيان)
    -- 'conj'    conjunction (معطوف)
    -- 'cc'      coordinating conjunction (و، ف، أو، ثم)
    -- 'case'    case marker (حرف جر)
    -- 'vocative' منادى
    -- 'parataxis' parataxis
    -- 'punct'   punctuation equivalent (verse boundary)
    -- 'other'

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (head_token_morph_id) REFERENCES qr_token_morphology(id),
  FOREIGN KEY (dep_token_morph_id)  REFERENCES qr_token_morphology(id)
);

CREATE INDEX IF NOT EXISTS idx_qrtr_head ON qr_token_relations(head_token_morph_id);
CREATE INDEX IF NOT EXISTS idx_qrtr_dep  ON qr_token_relations(dep_token_morph_id);
CREATE INDEX IF NOT EXISTS idx_qrtr_surah_ayah ON qr_token_relations(surah, ayah);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 7  PREPOSITION USES (حروف الجر)
--      Every preposition occurrence: which preposition, its object, and
--      the precise semantic role being expressed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_preposition_uses (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  token_index       INTEGER NOT NULL,           -- position of the حرف جر itself
  token_morphology_id TEXT NOT NULL,            -- FK → qr_token_morphology.id

  -- The preposition
  preposition       TEXT NOT NULL,
    -- 'bi'   بِ   | 'fi'   فِي  | 'ala'  عَلَى | 'min'  مِن
    -- 'ila'  إِلَى | 'li'   لِ   | 'an'   عَن  | 'had'  حَتَّى
    -- 'mundhu' مُنْذُ | 'khilala' خِلَال | 'bayna' بَيْن
    -- 'waw_qasam' وَ (oath) | 'ba_qasam' بِ (oath)
    -- 'ta_qasam' تَ (oath) | 'rubba' رُبَّ | 'other'

  -- Object (المجرور)
  object_token_morph_id TEXT,                  -- FK → qr_token_morphology.id
  object_text        TEXT,                     -- denormalized text of the object phrase

  -- Semantic role expressed by this preposition use
  semantic_role      TEXT NOT NULL,
    -- 'accompaniment'  مصاحبة (بِ)
    -- 'instrumentality' استعانة (بِ)
    -- 'causation'      تعليل (لِ، بِ)
    -- 'possession'     ملكية (لِ)
    -- 'benefit'        انتفاع (لِ)
    -- 'destination'    انتهاء الغاية (إِلَى، حَتَّى)
    -- 'origin'         ابتداء الغاية (مِن)
    -- 'partitive'      تبعيضية (مِن)
    -- 'explicative'    بيانية (مِن)
    -- 'location'       ظرفية مكانية (فِي، عَلَى)
    -- 'time'           ظرفية زمانية (فِي)
    -- 'about_topic'    موضوعية (عَن)
    -- 'separation'     مجاوزة (عَن)
    -- 'elevation'      استعلاء (عَلَى)
    -- 'despite'        رغم (عَلَى)
    -- 'oath'           قسم
    -- 'comparison'     مقايسة (مِن in comparative)
    -- 'manner'         حالية
    -- 'other'

  -- Is the preposition part of a verbal collocation (متعدي بحرف)?
  is_verbal_collocation INTEGER NOT NULL DEFAULT 0,
  verbal_collocation_note TEXT,               -- e.g. "آمَنَ بِ" as a fixed verbal frame

  -- Rhetorical / balagha note
  balagha_note       TEXT,                    -- e.g. سر استخدام مِن بدل مِنْ

  note_md            TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (token_morphology_id) REFERENCES qr_token_morphology(id),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrpu_surah_ayah     ON qr_preposition_uses(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qrpu_preposition    ON qr_preposition_uses(preposition);
CREATE INDEX IF NOT EXISTS idx_qrpu_semantic_role  ON qr_preposition_uses(semantic_role);

CREATE TRIGGER trg_qr_preposition_uses_updated_at
AFTER UPDATE ON qr_preposition_uses
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_preposition_uses SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 8  PARTICLE USES (حروف — non-preposition)
--      Conjunctions, conditional particles, emphasis particles, prohibitive,
--      response, vocative particles, etc.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_particle_uses (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  token_index       INTEGER NOT NULL,
  token_morphology_id TEXT NOT NULL,            -- FK → qr_token_morphology.id

  particle_text     TEXT NOT NULL,              -- actual text: إِنَّ، أَنَّ، لَا، قَدْ، سَوْفَ…

  particle_category TEXT NOT NULL,
    -- 'conjunction'         حرف عطف (وَ، فَ، ثُمَّ، أَوْ، بَلْ)
    -- 'subordination'       حرف مصدري/توكيد (إِنَّ، أَنَّ، كَأَنَّ، لَكِنَّ)
    -- 'conditional'         حرف شرط (إِنْ، إِذَا، لَوْ، لَوْلَا)
    -- 'interrogative'       حرف استفهام (أَ، هَلْ)
    -- 'negation'            حرف نفي (لَا، لَمْ، لَنْ، مَا، لَيْسَ)
    -- 'prohibition'         حرف نهي (لَا الناهية)
    -- 'jussive_lam'         لام الأمر
    -- 'emphasis'            حرف توكيد (قَدْ، لَقَدْ، إِنَّ)
    -- 'future'              حرف استقبال (سَ، سَوْفَ)
    -- 'vocative'            حرف نداء (يَا، أَيُّهَا)
    -- 'exception'           حرف استثناء (إِلَّا، غَيْر)
    -- 'response'            حرف جواب (نَعَمْ، بَلَى، لَا)
    -- 'explanation'         حرف تفسير (أَيْ، أَعْنِي)
    -- 'surprise'            حرف مفاجأة (إِذَا الفجائية)
    -- 'correlation'         حرف ربط (كَمَا، حَيْثُ)
    -- 'other'

  -- Grammatical effect
  grammatical_effect TEXT,
    -- 'nasb_fi'l'           نصب الفعل (أنْ، لنْ, إذن)
    -- 'jazm_fi'l'           جزم الفعل (لمْ، لمّا، لا الناهية)
    -- 'nasb_ism'            نصب الاسم (إنّ وأخواتها)
    -- 'rafa_ism'            رفع الخبر (إنّ وأخواتها — khabar)
    -- 'jarr_ism'            جرّ الاسم (حروف الجر)
    -- 'none'

  -- Scope: what does this particle govern?
  scope_start_token INTEGER,                   -- index of first governed token
  scope_end_token   INTEGER,                   -- index of last governed token

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (token_morphology_id) REFERENCES qr_token_morphology(id)
);

CREATE INDEX IF NOT EXISTS idx_qrparticle_surah_ayah  ON qr_particle_uses(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qrparticle_category    ON qr_particle_uses(particle_category);
CREATE INDEX IF NOT EXISTS idx_qrparticle_text        ON qr_particle_uses(particle_text);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 9  SURAH DISCOURSE UNITS
--      Macro structural blocks inside a surah (not the same as passages,
--      which are based on theme; discourse units are based on rhetorical form).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_discourse_units (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  unit_index        INTEGER NOT NULL,           -- ordered sequence
  ayah_from         INTEGER NOT NULL,
  ayah_to           INTEGER NOT NULL,

  unit_type         TEXT NOT NULL,
    -- 'opening'      فاتحة
    -- 'closing'      خاتمة
    -- 'command_bloc' bloc of commands (أوامر ونواهي)
    -- 'narrative'    قصصي
    -- 'argumentative' حجاجي
    -- 'descriptive'  وصفي (جنة، نار، قيامة)
    -- 'legislative'  تشريعي
    -- 'doctrinal'    عقدي
    -- 'transitional' انتقالي
    -- 'oath_sequence' قسم وجوابه
    -- 'call_response' نداء وجواب

  title             TEXT,                       -- brief label for this block
  summary           TEXT,
  addressee         TEXT,
    -- 'believers'|'prophet'|'mankind'|'people_of_book'|
    --  'hypocrites'|'disbelievers'|'all'|'implied'

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, unit_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsdu_surah ON qr_surah_discourse_units(surah);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 10  SURAH DISCOURSE SHIFTS
--       Topic, addressee, register, or time-frame shifts between ayahs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_discourse_shifts (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  ayah_shift        INTEGER NOT NULL,           -- the ayah where the shift BEGINS

  shift_type        TEXT NOT NULL,
    -- 'addressee'     من المخاطَب
    -- 'topic'         موضوعي
    -- 'register'      أسلوبي (command → narrative)
    -- 'time_frame'    زمني (past → future)
    -- 'speaker'       من المتكلم (الله → الأنبياء)
    -- 'scene'         مشهد (دنيا → آخرة)
    -- 'mode'          نمطي (إثبات → نفي)

  from_description  TEXT,                       -- brief description of the prior state
  to_description    TEXT,                       -- brief description of the new state

  discourse_unit_id TEXT,                       -- FK → qr_surah_discourse_units.id (optional)

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (surah) REFERENCES qr_surahs(id),
  FOREIGN KEY (discourse_unit_id) REFERENCES qr_surah_discourse_units(id)
);

CREATE INDEX IF NOT EXISTS idx_qrsds_surah ON qr_surah_discourse_shifts(surah, ayah_shift);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 11  ILTIFAT EVENTS (التفات)
--       Person / number / gender shifts that constitute التفات —
--       a major rhetorical device of the Quran.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_iltifat_events (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  token_morphology_id TEXT,                     -- FK → qr_token_morphology.id (the shifted token)

  -- What shifted
  iltifat_axis      TEXT NOT NULL,
    -- 'person'    من الغيبة → الخطاب أو العكس
    -- 'number'    من الجمع → المفرد
    -- 'gender'    من المذكر → المؤنث
    -- 'tense'     من الماضي → المضارع

  from_form         TEXT NOT NULL,              -- e.g. '3rd_plural_masc'
  to_form           TEXT NOT NULL,              -- e.g. '2nd_singular_masc'

  -- Rhetorical effect
  rhetorical_effect TEXT,
    -- 'emphasis'      تأكيد
    -- 'intimacy'      تقريب وتكريم
    -- 'rebuke'        توبيخ
    -- 'surprise'      مفاجأة
    -- 'glorification' تعظيم
    -- 'universality'  عموم
    -- 'other'

  effect_explanation TEXT,                      -- scholarly explanation of the shift's purpose

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (surah) REFERENCES qr_surahs(id),
  FOREIGN KEY (token_morphology_id) REFERENCES qr_token_morphology(id)
);

CREATE INDEX IF NOT EXISTS idx_qriltifat_surah ON qr_surah_iltifat_events(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qriltifat_axis  ON qr_surah_iltifat_events(iltifat_axis);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 12  SURAH RHYME PROFILES
--        One row per surah summarising the overall rhyme scheme.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_rhyme_profiles (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL UNIQUE,

  -- Dominant rhyme pattern
  dominant_rhyme_letter TEXT,                  -- the dominant رويّ (rhyme consonant)
  dominant_vowel    TEXT,                      -- dominant harakat on the final letter
  rhyme_pattern_code TEXT,                     -- compact notation e.g. 'AABB'|'AAAA'|'mixed'

  -- Variability
  rhyme_sections    TEXT,                      -- JSON array of {ayah_from, ayah_to, rhyme_letter}
  total_sections    INTEGER NOT NULL DEFAULT 1,

  -- Phonetic texture notes
  phonetic_notes    TEXT,                      -- e.g. 'heavy on nasals', 'dominant bilabials'
  rhythm_pattern    TEXT,
    -- 'fast_short'   (early Makkan — short verses, rapid rhythm)
    -- 'medium'       (middle Makkan)
    -- 'slow_majestic'(late Makkan / Madinan)
    -- 'mixed'

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 13  SURAH FAWASIL PATTERNS (فواصل)
--       Per-ayah verse-ending (فاصلة) analysis.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_fawasil_patterns (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,

  -- The final word (the فاصلة)
  fasila_text       TEXT NOT NULL,              -- actual Arabic text of final word
  fasila_token_morph_id TEXT,                   -- FK → qr_token_morphology.id

  -- Phonetic properties
  ending_letter     TEXT NOT NULL,              -- consonant that the verse ends on
  ending_haraka     TEXT,                       -- 'a'|'i'|'u'|'sukun'|'madd'
  syllable_weight   TEXT,                       -- 'light'|'heavy'|'superheavy'

  -- Rhetorical / sonic feature
  fasila_type       TEXT,
    -- 'mutamaathila'  متماثلة  (identical endings)
    -- 'mutawaaziya'   متوازية  (same weight, different sound)
    -- 'mutaraffia'    مترافئة  (close but not identical)
    -- 'mursal'        مرسل     (free — prose-like ending)

  -- Semantic link between fasila and verse content
  semantic_link_note TEXT,                      -- e.g. "fasila reinforces the concept of divine power"

  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, ayah),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id),
  FOREIGN KEY (fasila_token_morph_id) REFERENCES qr_token_morphology(id)
);

CREATE INDEX IF NOT EXISTS idx_qrfp_surah         ON qr_surah_fawasil_patterns(surah);
CREATE INDEX IF NOT EXISTS idx_qrfp_ending_letter ON qr_surah_fawasil_patterns(ending_letter);
CREATE INDEX IF NOT EXISTS idx_qrfp_fasila_type   ON qr_surah_fawasil_patterns(fasila_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 14  SURAH SONIC GROUPS
--       Named groups of ayahs that share a phonetic or prosodic feature
--       (alliteration, anaphora, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_sonic_groups (
  id                TEXT PRIMARY KEY,           -- ULID

  surah             INTEGER NOT NULL,
  group_label       TEXT NOT NULL,              -- e.g. 'Opening trio', 'Refrain section'
  ayahs             TEXT NOT NULL,              -- JSON array of ayah numbers

  sonic_feature     TEXT NOT NULL,
    -- 'anaphora'        تصدير (repeated opening word/phrase)
    -- 'alliteration'    جناس صوتي (repeated consonants)
    -- 'parallelism'     ازدواج / تقابل
    -- 'refrain'         لازمة (recurring phrase — e.g. فبأيّ آلاء ربكما تكذّبان)
    -- 'assonance'       تجانس الحركات
    -- 'antithesis'      طباق صوتي
    -- 'crescendo'       تصاعد وتيرة
    -- 'other'

  feature_text      TEXT,                       -- the actual repeated/shared text
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrssg_surah ON qr_surah_sonic_groups(surah);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 15  LINGUISTIC NOTES (free-form anchored to any table above)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_linguistic_notes (
  id                TEXT PRIMARY KEY,           -- ULID

  -- Polymorphic anchor
  target_table      TEXT NOT NULL,
    -- 'qr_sentence_units'|'qr_clause_units'|'qr_phrase_units'|
    --  'qr_token_morphology'|'qr_token_irab'|'qr_token_relations'|
    --  'qr_preposition_uses'|'qr_particle_uses'|
    --  'qr_surah_discourse_units'|'qr_surah_discourse_shifts'|
    --  'qr_surah_iltifat_events'|'qr_surah_rhyme_profiles'|
    --  'qr_surah_fawasil_patterns'|'qr_surah_sonic_groups'
  target_id         TEXT NOT NULL,              -- ULID of the row in target_table

  note_type         TEXT NOT NULL DEFAULT 'general',
    -- 'general'|'scholarly_dispute'|'alternative_reading'|
    --  'pedagogical'|'balagha'|'source_citation'

  note_md           TEXT NOT NULL,
  source_ref        TEXT,                       -- FK-like: 'LING:ar_ling_sources.id'

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrln_target ON qr_linguistic_notes(target_table, target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 16  FTS5 INDEXES for searchability
-- ─────────────────────────────────────────────────────────────────────────────

-- Search token text + root
CREATE VIRTUAL TABLE IF NOT EXISTS qr_token_morphology_fts USING fts5(
  surah     UNINDEXED,
  ayah      UNINDEXED,
  token_index UNINDEXED,
  token_text,
  stem,
  root,
  pattern,
  note_md
);

-- Search linguistic notes
CREATE VIRTUAL TABLE IF NOT EXISTS qr_linguistic_notes_fts USING fts5(
  target_table UNINDEXED,
  target_id    UNINDEXED,
  note_type,
  note_md,
  source_ref
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- wrangler d1 execute knowledgemap \
--   --command="SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name LIKE 'qr_%' AND name NOT LIKE 'qr_surah%' ORDER BY name" \
--   --remote
-- ─────────────────────────────────────────────────────────────────────────────
