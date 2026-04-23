/**
 * CANONICAL LEXICON (FULL)
 * - One LexiconEntry = one lexical meaning unit (lemma / expression / idiom)
 * - Occurrences/usages belong elsewhere (e.g., LexiconOccurrence)
 * - Derivation is bilingual: machine-safe code + Arabic label
 */

export interface LexiconEntry {
  entity_type: 'lexicon_entry';
  id: number;

  // Links
  root_id: number | null;

  // Core identity
  lemma: string; // dictionary/head form
  surface: string | null; // optional observed form

  // Classification
  unit_type: LexiconUnitType;
  pos: LexiconPOS;
  derivation: LexiconDerivationValue | null;
  preposition: string | null;

  // Meaning
  definition: string | null; // distilled meaning (short)
  gloss_primary: string | null; // short hint for UI
  gloss_secondary: string[]; // optional extra glosses
  nuance: string | null; // differentiator / nuance
  scope: string | null; // register/context scope (quranic/classical/legal/etc.)

  // Notes
  note: string | null;
  examples: LexiconExample[]; // short examples/snippets

  // Lifecycle
  status: LexiconStatus;
  difficulty: Difficulty;

  // SRS / Anki
  cards: LexiconAnkiCard[];

  // Metadata
  stats: LexiconStats | null;
  created_at: string;
  updated_at: string | null;
}

/* -------------------- TYPES -------------------- */

export type LexiconUnitType =
  | 'word'
  | 'phrase'
  | 'idiom'
  | 'expression'
  | 'construction'
  | 'metaphor';

export type LexiconPOS =
  | 'verb'
  | 'noun'
  | 'adjective'
  | 'particle'
  | 'pronoun'
  | 'adverb'
  | 'preposition'
  | 'proper_noun'
  | 'expression';

/**
 * Keep BOTH:
 * - code: machine-safe
 * - ar: UI-friendly Arabic label
 */
export interface LexiconDerivationValue {
  code: LexiconDerivationCode;
  ar: LexiconDerivationAr;
}

export type LexiconDerivationCode =
  // Verb forms
  | 'FORM_I'
  | 'FORM_II'
  | 'FORM_III'
  | 'FORM_IV'
  | 'FORM_V'
  | 'FORM_VI'
  | 'FORM_VII'
  | 'FORM_VIII'
  | 'FORM_IX'
  | 'FORM_X'

  // Verb categories
  | 'VERB_JAMID'
  | 'VERB_MUATAL'
  | 'VERB_MUDAAF'
  | 'VERB_MAHMOOZ'

  // Noun/derived forms
  | 'MASDAR'
  | 'ISM'
  | 'SIFAH'
  | 'ISM_FAEL'
  | 'ISM_MAFOOL'
  | 'ISM_ALAH'
  | 'ISM_ZAMAN'
  | 'ISM_MAKAN'
  | 'SIGHAH_MUBALAGHA'

  // Phrase/idiom/non-standard
  | 'TAABEER'
  | 'ISTILAH'
  | 'NON_QIYASI';

export type LexiconDerivationAr =
  // Verb forms
  | 'فعل-مجرد'
  | 'فعّل'
  | 'فاعل'
  | 'أفعل'
  | 'تفعّل'
  | 'تفاعل'
  | 'انفعل'
  | 'افتعل'
  | 'افعلّ'
  | 'استفعل'

  // Verb categories
  | 'جامد'
  | 'معتل'
  | 'مضعّف'
  | 'مهموز'

  // Noun/derived
  | 'مصدر'
  | 'اسم'
  | 'صفة'
  | 'اسم-فاعل'
  | 'اسم-مفعول'
  | 'اسم-آلة'
  | 'اسم-زمان'
  | 'اسم-مكان'
  | 'صيغة-مبالغة'

  // Phrase/idiom/non-standard
  | 'تعبير'
  | 'اصطلاح'
  | 'غير-قياسي';

export type LexiconStatus = 'draft' | 'reviewed' | 'active' | 'deprecated';
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/* -------------------- EXAMPLES -------------------- */

export interface LexiconExample {
  example_id: string;
  arabic: string;
  translation: string | null;
  source_ref: LexiconExampleSourceRef | null;
  note: string | null;
}

export interface LexiconExampleSourceRef {
  source_type: LexiconSourceType;
  source_ref_id: string | null;

  // Qur'an optional fields
  surah: number | null;
  ayah: number | null;

  // Generic reference label/citation
  ref_label: string | null;
  citation: string | null;
}

export type LexiconSourceType =
  | 'quran'
  | 'classical_text'
  | 'hadith'
  | 'poetry'
  | 'grammar_example'
  | 'modern_arabic'
  | 'user_notes';

/* -------------------- STATS -------------------- */

export interface LexiconStats {
  occurrence_count: number;
  distinct_sources: number;
  first_seen: string | null;
  last_seen: string | null;
}

/* -------------------- ANKI / SRS -------------------- */

export interface LexiconAnkiCard {
  card_id: string;
  card_type: LexiconCardType;
  front: string;
  back: string;
  tags: string[];
}

export type LexiconCardType =
  | 'vocab'
  | 'meaning'
  | 'sarf'
  | 'usage'
  | 'idiom'
  | 'cloze';

/* -------------------- MODEL -------------------- */

export class LexiconEntryModel {
  constructor(public data: LexiconEntry) {}
}
