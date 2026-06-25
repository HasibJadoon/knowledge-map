/**
 * View-model for the fused word lens (Membean × k-maps Five-Lens).
 * The component is purely presentational: it renders a FusedWordVM and writes
 * nothing. The facade assembles the VM from the domain services / workers —
 * every field below names the table it comes from.
 */

export interface SenseRow {
  ar: string;
  en: string;
  ref?: string;
} // ar_ling_senses / lexicon_root_entries.meaning

export interface SarfRow {
  form: string;
  wazn: string;
  past: string;
  present: string;
  masdar: string;
} // ar_ling_form_paradigms + conjugation_templates / five-lens morphology

/** Verb transitivity + preposition government — ar_ling_verb_government. */
export interface VgRow {
  verbAr: string;
  form?: string;
  transitivity: 'lazim' | 'mutaaddi';
  harf?: string | null;
  meaningEn?: string;
  meaningAr?: string;
  qrRef?: string;
}

/** Cross-root antonym/contrast — ar_ling_root_antonyms. */
export interface AntonymRow {
  ar: string;
  en?: string;
  kind: 'antonym' | 'contrast';
}

/** Mir verbal idiom — ar_ling_expressions. */
export interface IdiomRow {
  phraseAr: string;
  en: string;
  sourceLabel: string;
}

/** One mufassir's gloss — qr_tafsir_entries (content_ar/content_en). */
export interface TafsirRow {
  name: string;
  gloss: string;
}

/** One dictionary excerpt — ar_ling_lexicon_blocks. */
export interface LexRow {
  source: string;
  ar?: string;
  en?: string;
}

export interface ConstNode {
  ar: string;
  en?: string;
  isQuran: boolean;
} // ar_ling_lemmas (derivational family)

export interface ExampleRow {
  ar: string;
  en: string;
  sense?: string;
  ref: string;
} // ar_ling_quran_links + qr_translations

export interface VariantRow {
  ar: string;
  pos: string;
  gloss: string;
} // ar_ling_lemmas

export interface FusedWordVM {
  // header
  pos: string;
  level: string;
  // hero
  lemmaAr: string;
  translit: string;
  sense: string;
  rootSpaced: string;
  pattern?: string;
  ref: string; // "39:3"
  surahNameAr?: string;
  ayahAr?: string;
  ayahEn?: string;
  // core / range
  coreAr?: string;
  coreEn?: string;
  senses: SenseRow[];
  // ingredients (root + wazn)
  ingredients?: {
    rootAr: string;
    rootGloss: string;
    patternAr: string;
    patternGloss: string;
    synthesisAr: string;
  };
  // hook
  hook?: {
    line: string;
    anchors: { en: string; note: string }[];
    figureSvg?: string; // sanitized inline SVG (ar_ling_vocab_illustrations)
    figureCap?: string;
  };
  // grammar
  verbGovernment: VgRow[];
  sarf: SarfRow[];
  iraab?: { sourceLabel: string; ar?: string; en?: string };
  // scholarship
  tafsir: TafsirRow[];
  lexica: LexRow[];
  sinai?: { text: string; pending: boolean };
  // relations
  constellation?: { root: string; nodes: ConstNode[] };
  nearSynonyms: string[];
  antonyms: AntonymRow[];
  idioms: IdiomRow[];
  variants: VariantRow[];
  // corpus
  occurrences: string[];
  currentRef?: string;
  examples: ExampleRow[];
}
