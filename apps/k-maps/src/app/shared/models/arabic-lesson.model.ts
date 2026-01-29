// =======================================================
// AR LESSON — TS MODEL (based on your latest decisions)
// - text.arabic_full is Ayah-units array (NOT a single string)
// - sentences are separate array at lesson-level (NOT inside text)
// - tokens MUST split harf (و/ف/ب/ك/ل/س) from word (e.g., و + كذلك)
// - grammar wv_concepts live in separate table; lesson only references them
// - passage_layers captures discourse / rhetoric / reasoning / idiom layers
// - comprehension is populated
// =======================================================

export type LessonStatus = 'draft' | 'reviewed' | 'active' | 'archived';
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type ArabicLessonType =
  | 'quran'
  | 'classical_text'
  | 'hadith'
  | 'poetry'
  | 'grammar_example'
  | 'modern_arabic';

export type ArabicLessonSubtype =
  | 'discourse'
  | 'narrative'
  | 'legal'
  | 'theology'
  | 'rhetoric'
  | 'grammar'
  | 'vocabulary'
  | 'reflection';

export interface LessonReference {
  source_type: ArabicLessonType;
  source_ref_id: string | null;

  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;

  ref_label: string | null;
  citation: string | null;
}

export interface LessonText {
  arabic_full: LessonAyahUnit[];
  mode: 'original' | 'edited' | 'mixed';
}

export interface LessonAyahUnit {
  unit_id: string;
  unit_type: 'ayah';
  arabic: string; // keep exactly as stored (your non-diacritic with ayah marker)
  translation: string | null;

  surah: number;
  ayah: number;

  notes: string | null;
}

export type LessonPOS = 'verb' | 'noun' | 'adj' | 'particle' | 'phrase' | 'other';

export interface LessonToken {
  token_id: string;
  surface_ar: string;
  lemma_ar: string | null;

  root: string | null;     // e.g., "جبي"
  root_id: number | null;  // links to roots table

  pos: LessonPOS;

  // optional pointer to lexicon/meaning tables if you have them
  morph_ref?: {
    root_id: number | null;
    lexicon_entry_id: number | null;
  };

  // lightweight flexible morphology/features (no hard schema lock)
  features?: Record<string, any> | null;
}

export interface LessonSentence {
  sentence_id: string;
  unit_id: string; // points to Ayah unit in text.arabic_full

  arabic: string;
  translation: string | null;
  notes: string | null;

  // quick filters
  roots?: string[] | null;
  root_ids?: number[] | null;

  // tokenization is the main “word-map”
  tokens: LessonToken[];

  // grammar wv_concepts are stored elsewhere; lesson references them
  grammar_concept_refs?: string[] | null; // e.g., ["GRAM_NAHW_001"]
}

export type PassageLayerType =
  | 'discourse'
  | 'rhetoric'
  | 'reasoning'
  | 'idiom'
  | 'argument'
  | 'narrative_move'
  | 'conclusion'
  | 'other';

export interface PassageLayer {
  layer_id: string;
  layer_type: PassageLayerType;

  label: string;
  label_ar: string | null;

  linked_unit_ids: string[];
  linked_sentence_ids: string[];
  linked_token_ids: string[];

  notes: string | null;

  // optional: structured reasoning graph later
  data?: Record<string, any> | null;
}

export interface MCQOption {
  option: string;
  is_correct: boolean;
}

export interface LessonMCQ {
  mcq_id: string;
  linked_unit_ids: string[];
  question: string;
  question_ar: string | null;
  options: MCQOption[];
  explanation: string | null;
  tags: string[];
}

export interface LessonMCQGroups {
  text: LessonMCQ[];
  vocabulary: LessonMCQ[];
  grammar: LessonMCQ[];
}

export interface ReflectiveQuestion {
  question_id: string;
  linked_unit_ids: string[];
  question: string;
  question_ar: string | null;
  answer_hint: string | null;
  tags: string[];
  quranic_ref: string | null;
}

export interface AnalyticalQuestion {
  question_id: string;
  linked_unit_ids: string[];
  question: string;
  question_ar: string | null;
  answer_hint: string | null;
  tags: string[];
  quranic_ref: string | null;
}

export interface LessonComprehension {
  reflective: ReflectiveQuestion[];
  analytical: AnalyticalQuestion[];
  mcqs: LessonMCQGroups;
}

export interface ArabicLesson {
  entity_type: 'ar_lesson';
  id: string;

  lesson_type: ArabicLessonType;
  subtype: ArabicLessonSubtype | null;

  title: string;
  title_ar: string | null;

  status: LessonStatus;
  difficulty: Difficulty;

  reference: LessonReference;
  text: LessonText;

  // sentence structure separate from text
  sentences: LessonSentence[];

  // 3 domains: discourse/rhetoric/reasoning/idiom
  passage_layers: PassageLayer[];

  comprehension: LessonComprehension;

  created_at: string;
  updated_at: string | null;
}

export class ArabicLessonModel {
  constructor(public data: ArabicLesson) {}
}
