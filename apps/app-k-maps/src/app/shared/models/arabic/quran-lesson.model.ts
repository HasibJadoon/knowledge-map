export interface QuranLessonAyahUnit {
  unit_id: string;
  unit_type: 'ayah';
  arabic: string;
  translation: string | null;
  surah: number;
  ayah: number;
  notes: string | null;
}

export interface QuranLessonText {
  arabic_full: QuranLessonAyahUnit[];
  mode: 'original' | 'edited' | 'mixed';
}

export interface QuranLessonSentenceText {
  arabic: string;
  translation: string | null;
}

export interface QuranLessonSentenceRef {
  source_type?: string;
  surah?: number;
  ayah_from?: number;
  ayah_to?: number;
  unit_id?: string;
  sentence_order_in_unit?: number;
}

export interface QuranLessonSentenceAnchors {
  from_token_id: string;
  to_token_id: string;
}

export interface QuranLessonToken {
  token_id: string;
  surface_ar: string;
  lemma_ar?: string;
  root?: string;
  root_id?: string | null;
  pos?: string;
  features?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface QuranLessonSentenceMarker {
  token_id: string;
  surface: string;
  kind?: string;
  function?: string;
  [key: string]: unknown;
}

export interface QuranLessonSentence {
  entity_type?: string;
  sentence_id: string;
  unit_id: string;
  text: QuranLessonSentenceText;
  notes?: string | null;
  ref?: QuranLessonSentenceRef;
  anchors?: QuranLessonSentenceAnchors;
  tokens?: QuranLessonToken[];
  roots?: string[];
  root_ids?: Array<string | null>;
  classification?: Record<string, unknown>;
  main_spine?: Record<string, unknown>;
  clause_tree?: Record<string, unknown>;
  markers?: QuranLessonSentenceMarker[];
  grammar_concept_refs?: string[];
  sentence_translation_progressive?: Record<string, unknown>;
  arabic?: string | null;
  translation?: string | null;
}

export interface QuranLessonVocabularyIndexEntry {
  word: string;
  root?: string | null;
  token_ids: string[];
}

export interface QuranLessonVocabularyCard {
  type: string;
  word: string;
  root?: string | null;
  surface_ar?: string;
  translation?: string;
  token_ids?: string[];
  [key: string]: unknown;
}

export interface QuranLessonVocabLayer {
  vocabulary_index?: Record<string, QuranLessonVocabularyIndexEntry[]>;
  cards?: Record<string, QuranLessonVocabularyCard[]>;
}

export interface QuranLessonReference {
  source_type?: string;
  source_ref_id?: string | null;
  surah?: number;
  ayah_from?: number;
  ayah_to?: number;
  ref_label?: string;
  citation?: string | null;
}

export interface QuranLessonNotes {
  schema_note?: string;
  [key: string]: string | null | undefined;
}

interface QuranLessonPassageLayerBase {
  entity_type: string;
  model_id: string;
  scope?: string;
}

export interface QuranLessonRingMove {
  move_id: string;
  label: string;
  label_ar?: string;
  maps_to_layer_id?: string;
  linked_unit_ids?: string[];
  ring_center?: boolean;
  [key: string]: unknown;
}

export interface QuranLessonRingSymmetrySide {
  label: string;
  move_id: string;
  layer_id: string;
  theme: string;
  [key: string]: unknown;
}

export interface QuranLessonRingSymmetryPair {
  pair_id: string;
  left: QuranLessonRingSymmetrySide;
  right: QuranLessonRingSymmetrySide;
  how_they_mirror: string[];
  ui_hint?: Record<string, unknown>;
}

export interface QuranLessonPassageRing extends QuranLessonPassageLayerBase {
  entity_type: 'passage_ring';
  ring_id: string;
  ref?: Record<string, unknown>;
  title?: string;
  title_ar?: string;
  boundaries?: {
    start?: { unit_id?: string; sentence_id?: string };
    end?: { unit_id?: string; sentence_id?: string };
    linked_unit_ids?: string[];
    linked_layer_ids?: string[];
  };
  purpose?: {
    ring_job?: string[];
    reader_posture?: string;
  };
  ring_moves?: QuranLessonRingMove[];
  symmetry?: {
    enabled?: boolean;
    pattern?: string;
    center_move_id?: string;
    pairs?: QuranLessonRingSymmetryPair[];
    notes?: string[];
  };
  ui_hints?: Record<string, unknown>;
}

export interface QuranLessonLayer {
  order?: number;
  layer_id: string;
  layer_type?: string;
  label: string;
  label_ar?: string;
  linked_unit_ids?: string[];
  linked_sentence_ids?: string[];
  notes?: string;
}

export interface QuranLessonPassageLayersLinear extends QuranLessonPassageLayerBase {
  entity_type: 'passage_layers_linear';
  layers?: QuranLessonLayer[];
}

export interface QuranLessonPassageBead {
  bead_id: string;
  layer_id: string;
  bead_type?: string;
  label?: string;
  label_ar?: string;
  linked_unit_ids?: string[];
  linked_sentence_ids?: string[];
  linked_token_ids?: string[];
  notes?: string;
  [key: string]: unknown;
}

export interface QuranLessonPassageBeads extends QuranLessonPassageLayerBase {
  entity_type: 'passage_beads';
  beads?: QuranLessonPassageBead[];
}

export type QuranLessonPassageLayer =
  | QuranLessonPassageRing
  | QuranLessonPassageLayersLinear
  | QuranLessonPassageBeads;

export interface QuranLessonComprehensionQuestion {
  question_id: string;
  question: string;
  question_ar?: string;
  quranic_ref?: string;
  answer_hint?: string;
  tags?: string[];
  linked_unit_ids?: string[];
  data?: Record<string, unknown>;
}

export interface QuranLessonMcqOption {
  option: string;
  is_correct: boolean;
}

export interface QuranLessonMcq {
  mcq_id: string;
  question: string;
  question_ar?: string;
  options: QuranLessonMcqOption[];
}

export interface QuranLessonComprehension {
  reflective?: QuranLessonComprehensionQuestion[];
  analytical?: QuranLessonComprehensionQuestion[];
  mcqs?: QuranLessonMcq[] | {
    text?: QuranLessonMcq[];
    vocabulary?: QuranLessonMcq[];
    grammar?: QuranLessonMcq[];
  };
}

export interface QuranLesson {
  entity_type?: string;
  lesson_type: 'quran';
  subtype?: string;
  id: string;
  title: string;
  title_ar?: string;
  status?: string;
  difficulty?: number;
  reference?: QuranLessonReference;
  text: QuranLessonText;
  sentences: QuranLessonSentence[];
  comprehension?: QuranLessonComprehension;
  vocab_layer?: QuranLessonVocabLayer;
  passage_layers?: QuranLessonPassageLayer[];
  _notes?: QuranLessonNotes;
  created_at?: string;
  updated_at?: string | null;
}

export function getQuranSentenceArabic(sentence: QuranLessonSentence): string | null {
  return sentence.text?.arabic ?? sentence.arabic ?? null;
}

export function getQuranSentenceTranslation(sentence: QuranLessonSentence): string | null {
  return sentence.text?.translation ?? sentence.translation ?? null;
}

export function normalizeQuranLessonSentences(
  sentences?: QuranLessonSentence[]
): QuranLessonSentence[] {
  if (!sentences?.length) return [];
  return sentences.map((sentence) => ({
    ...sentence,
    arabic: getQuranSentenceArabic(sentence),
    translation: getQuranSentenceTranslation(sentence),
  }));
}
