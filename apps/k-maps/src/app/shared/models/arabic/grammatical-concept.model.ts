/**
 * CANONICAL GRAMMATICAL CONCEPT
 * Matches `ar_grammatical_concepts` table.
 * - Stable string id (e.g., GRAM_NAHW_001)
 * - Bilingual definitions
 * - JSON fields are shaped but flexible
 */

export interface GrammaticalConcept {
  entity_type: 'grammatical_concept';
  id: string;
  user_id: number | null;
  category: GrammaticalConceptCategory;
  title: string;
  title_ar: string | null;
  difficulty: Difficulty | null;
  status: GrammaticalConceptStatus;
  definition: string;
  definition_ar: string | null;
  signals: string[] | null;
  mistakes: string[] | null;
  examples: GrammaticalConceptExample[] | null;
  capture_refs: GrammaticalConceptCaptureRef[] | null;
  cards: GrammaticalConceptAnkiCard[] | null;
  created_at: string;
  updated_at: string | null;
}

export type GrammaticalConceptCategory =
  | 'syntax'
  | 'morphology'
  | 'particle'
  | 'rhetoric'
  | 'discourse'
  | 'semantics';

export type GrammaticalConceptStatus = 'active' | 'draft' | 'archived';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface GrammaticalConceptExample {
  example_ar: string;
  analysis_ar: string | null;
  translation: string | null;
  ref: GrammaticalConceptRef | null;
}

export interface GrammaticalConceptRef {
  source_type: GrammaticalConceptSourceType;
  source_ref_id: string | null;
  ref_label: string | null;
  citation: string | null;
  surah: number | null;
  ayah: number | null;
}

export type GrammaticalConceptSourceType =
  | 'quran'
  | 'ar_lesson'
  | 'classical_text'
  | 'hadith'
  | 'poetry'
  | 'grammar_book'
  | 'library_entry'
  | 'modern_arabic'
  | 'other';

export interface GrammaticalConceptCaptureRef {
  source_type: GrammaticalConceptSourceType;
  source_ref_id: string | null;
  locator: GrammaticalConceptLocator | null;
  note: string | null;
  tags: string[];
}

export interface GrammaticalConceptLocator {
  type:
    | 'surah_ayah'
    | 'page'
    | 'section'
    | 'paragraph'
    | 'sentence'
    | 'timestamp'
    | 'url'
    | 'other';
  value: string;
}

export interface GrammaticalConceptAnkiCard {
  card_id: string;
  card_type: GrammaticalConceptCardType;
  front: string;
  back: string;
  tags: string[];
}

export type GrammaticalConceptCardType =
  | 'definition'
  | 'signals'
  | 'mistakes'
  | 'example'
  | 'cloze';

export class GrammaticalConceptModel {
  constructor(public data: GrammaticalConcept) {}
}
