export interface QrApiResponse<T> {
  ok: boolean;
  data: T;
}

export interface QrMenuSurah {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: string | null;
  ayah_count: number;
  juz_start: number | null;
  page_start: number | null;
}

export interface QrMenuPayload {
  stats: {
    total_surahs: number;
    total_juzs: number;
    total_pages: number;
    total_ayahs: number;
  };
  surahs: QrMenuSurah[];
  juzs: Array<{
    juz: number;
    surahs: QrMenuSurah[];
  }>;
}

export interface QrReaderPayload {
  surah: {
    id: number;
    name_ar: string;
    name_en: string | null;
    name_transliteration: string | null;
    revelation_type: string | null;
    ayah_count: number;
    juz_start: number | null;
    page_start: number | null;
  };
  meta: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  ayahs: Array<{
    surah: number;
    ayah: number;
    text: string;
    text_uthmani_clean: string | null;
    text_uthmani: string | null;
    text_bare: string | null;
    verse_mark: string | null;
    page_number: number | null;
    juz: number | null;
    hizb: number | null;
    ruku: number | null;
    translation: string | null;
  }>;
}

export type QrPageLineKind = 'ayah' | 'surah_name' | 'basmallah';

export interface QrPageWord {
  id: string;
  surah: number;
  ayah: number;
  word_position: number;
  text_uthmani: string;
  text_clean: string | null;
  lx_lemma_ref: string | null;
  root_text: string | null;
  pos_tag: string | null;
  morphology_tag: string | null;
  morphology_tag_json: string | null;
}

export interface QrPageLayoutAyah {
  surah: number;
  ayah: number;
  verse_key: string;
  marker: string | null;
  words: QrPageWord[];
}

export interface QrPageLayoutLine {
  line_number: number;
  line_type: QrPageLineKind;
  is_centered: boolean;
  surah_number: number | null;
  first_token_id?: number | null;
  last_token_id?: number | null;
  text_arabic: string;
  text_clean: string | null;
  ayahs: QrPageLayoutAyah[];
}

export interface QrPagePayload {
  page: {
    number: number;
    prev_page: number | null;
    next_page: number | null;
    ayah_count: number;
    start_ref: string;
    end_ref: string;
  };
  layout?: {
    key: string;
    source: string;
    lines_per_page: number;
  };
  surahs: QrReaderPayload['surah'][];
  ayahs: Array<{
    surah: number;
    ayah: number;
    verse_key: string;
    text_arabic: string;
    verse_mark: string | null;
    translation: string | null;
    words: QrPageWord[];
  }>;
  layout_lines: QrPageLayoutLine[];
}

/** Word token returned when ?words=1 is passed to /qr/ayahs */
export interface QrAyahWord {
  word_index: number;
  text: string;
  text_bare: string;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology_tag: string | null;
}

/** Shape returned by GET /qr/ayahs?surah=X[&words=1] */
export interface QrAyah {
  surah: number;
  ayah: number;
  text_display: string;
  text_uthmani_clean: string | null;
  text_uthmani: string | null;
  translation: string | null;
  verse_mark: string | null;
  page_number: number | null;
  words?: QrAyahWord[];  // present only when ?words=1
}

// ─── Research: Tafsir ─────────────────────────────────────────────────────────

export interface QrScholarWork {
  id: string;
  scholar_id: string;
  title_ar: string;
  title_en: string | null;
  work_type: string;
  composition_year_hijri: number | null;
  composition_year_ce: number | null;
  volumes: number | null;
  is_complete: number;
  print_edition: string | null;
  summary: string | null;
  scholar_name_ar: string;
  scholar_name_en: string | null;
  era: string | null;
  madhab: string | null;
  specialization: string | null;
  birth_year_hijri: number | null;
  death_year_hijri: number | null;
  birth_year_ce: number | null;
  death_year_ce: number | null;
  entry_count: number;
}

export interface QrScholar {
  id: string;
  name_ar: string;
  name_en: string | null;
  kunya: string | null;
  laqab: string | null;
  era: string | null;
  madhab: string | null;
  specialization: string | null;
  birth_year_hijri: number | null;
  death_year_hijri: number | null;
  birth_year_ce: number | null;
  death_year_ce: number | null;
  entry_count: number;
}

export interface QrTafsirEntry {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  entry_type: string;
  scholar_id: string | null;
  work_id: string | null;
  content_ar: string;
  content_en: string | null;
  source_page: string | null;
  scholar: { name_ar: string; name_en: string | null } | null;
  work: { title_ar: string; title_en: string | null; work_type: string } | null;
  ayah_text: string | null;
}

// ─── Research: Iraab ─────────────────────────────────────────────────────────

export interface QrIrabSource {
  id: string;
  source_slug: string;
  source_title_ar: string;
  source_title_en: string | null;
  source_kind: string;
  note_md: string | null;
  entry_count: number;
}

export interface QrIrabEntry {
  id: string;
  source_slug: string;
  source_title: string;
  ayah_key: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  irab_text_ar: string;
  source_quote_ar: string | null;
  target_text_ar: string | null;
  target_text_bare: string | null;
  grammar_role_ar: string | null;
  grammar_role_norm: string | null;
  grammar_case_ar: string | null;
  mahal_ar: string | null;
  grammar_concept_ref: string | null;
  entry_order: number;
  ayah_text: string | null;
}

// ─── Research: Lexicon ────────────────────────────────────────────────────────

export interface QrLemma {
  id: string;
  lemma_text: string;
  root: string;
  total_occurrences: number;
  lx_lemma_ref: string | null;
}

export interface QrLemmaOccurrence {
  id: string;
  surah: number;
  ayah: number;
  word_index: number;
  ayah_text: string | null;
}

export interface QrRoot {
  root: string;
  lemma_count: number;
  total_occurrences: number;
}

export interface QrPaginated<T> {
  rows: T[];
  total: number;
  page: number;
  per_page: number;
  has_more?: boolean;
}

export interface QrPassage {
  id: string;
  surah: number;
  passage_index: number;
  ayah_from: number;
  ayah_to: number;
  theme: string | null;
  title_ar: string | null;
  title_en: string | null;
  discourse_role: string | null;
  note_md: string | null;
}

// ─── Display-layer types (migrations 011 + 012) ──────────────────────────────
// Mirrored exactly in apps/app-k-maps so both clients consume the same worker.

export type QrDisplayReviewStatus = 'ai_candidate' | 'needs_review' | 'approved' | 'rejected' | 'archived';
export type QrDisplayConfidence   = 'low' | 'medium' | 'high' | 'verified';
export type QrDisplayScopeType    = 'word' | 'phrase' | 'clause' | 'sentence' | 'ayah' | 'ayah_range' | 'ayah_group' | 'surah' | 'cross_ref';
export type QrDisplayMarkupTier   = 'full' | 'minimal' | 'none';
export type QrDisplayMadhab       = 'sunni' | 'maliki' | 'shafii' | 'hanbali' | 'hanafi' | 'mutazili' | 'ashari' | 'athari';
export type QrDisplayEra          = 'classical' | 'modern';

export type QrIraabBlockType =
  | 'heading' | 'subheading' | 'arabic_quote' | 'source_quote'
  | 'explanation' | 'irab_card' | 'grammar_note' | 'sarf_note' | 'balagha_note' | 'language_note'
  | 'callout' | 'warning' | 'key_insight' | 'author_note' | 'teaching_note' | 'study_summary'
  | 'source_badge' | 'quran_ref_chip' | 'ayah_link' | 'word_link' | 'root_chip' | 'lemma_chip'
  | 'backlink' | 'related_note' | 'same_ayah_link' | 'same_word_link' | 'same_grammar_link'
  | 'comparison' | 'disagreement' | 'raw_source' | 'footnote' | 'tag' | 'review_status_badge'
  | 'dependency_graph';

export type QrTafsirBlockType =
  | 'tafsir_card' | 'paragraph_section' | 'isnad' | 'voice_marker' | 'poetry_quote'
  | 'verse_anchor' | 'scholar_response' | 'reception_note' | 'paradigm_chip' | 'hadith_source_chip'
  | QrIraabBlockType;

export interface QrDisplayQuranRef {
  surah: number | null;
  ayah?: number | null;
  ayah_to?: number | null;
  ayah_key?: string | null;
  ayah_group_key?: string | null;
  ayah_keys?: string[] | null;
  word_index?: number | null;
  word_text?: string | null;
  label?: string | null;
}

export interface QrDisplayScholarRef {
  scholar_id: string;
  role: 'cited' | 'responded_to' | 'agreed_with' | 'disagreed_with' | 'quoted' | 'transmitted';
  label?: string | null;
}

export interface QrDisplayBlockLink {
  block_id?: string | null;
  typed_ref?: string | null;
  kind: string;
  label?: string | null;
  weight?: number;
}

export interface QrDisplayExternalResource {
  r2_key: string;
  kind: 'svg' | 'image' | 'pdf' | 'audio' | 'other';
  bytes?: number | null;
  mime?: string | null;
}

export interface QrTafsirDisplaySource {
  id: string;
  source_slug: string;
  scholar_id: string | null;
  work_id: string | null;
  book_title_ar: string | null;
  book_title_en: string | null;
  author_name_ar: string | null;
  author_name_en: string | null;
  author_kunya: string | null;
  author_laqab: string | null;
  death_year_hijri: number | null;
  death_year_ce: number | null;
  era: QrDisplayEra | null;
  madhab: QrDisplayMadhab | null;
  kalam_school: string | null;
  specialization: string | null;
  badge_color: string | null;
  badge_glyph: string | null;
  markup_tier: QrDisplayMarkupTier | null;
  short_description: string | null;
  long_description: string | null;
  cover_image_url: string | null;
  display_order: number;
  is_visible: 0 | 1;
  block_count?: number;
}

export interface QrIraabDisplaySource {
  id: string;
  source_slug: string;
  book_title_ar: string | null;
  book_title_en: string | null;
  author_name_ar: string | null;
  author_name_en: string | null;
  author_period: string | null;
  badge_color: string | null;
  badge_glyph: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_image_url: string | null;
  display_order: number;
  is_visible: 0 | 1;
  block_count?: number;
}

export interface QrTafsirDisplayBlock {
  id: string;
  source_id: string | null;
  source_tafsir_entry_id: string | null;
  source_slug: string;
  book_title: string | null;
  author: string | null;
  scholar_id: string | null;
  work_id: string | null;
  scholar_name_ar: string | null;
  scholar_name_en: string | null;
  madhab: QrDisplayMadhab | null;
  era: QrDisplayEra | null;
  kalam_school: string | null;
  death_year_hijri: number | null;
  surah_no: number | null;
  ayah_no: number | null;
  ayah_to: number | null;
  ayah_key: string | null;
  ayah_group_key: string | null;
  ayah_keys: string[];
  is_grouped: 0 | 1;
  word_index: number | null;
  word_text: string | null;
  phrase_text: string | null;
  scope_type: QrDisplayScopeType | null;
  block_type: QrTafsirBlockType;
  block_subtype: string | null;
  display_order: number;
  paragraph_index: number | null;
  paragraph_count: number | null;
  is_long_form: 0 | 1;
  title_ar: string | null;
  title_en: string | null;
  text_ar: string | null;
  text_en: string | null;
  raw_text: string | null;
  markup_tier: QrDisplayMarkupTier | null;
  source_page: string | null;
  tags: string[];
  grammar_tags: string[];
  theology_tags: string[];
  narration_tags: string[];
  quran_refs: QrDisplayQuranRef[];
  scholar_refs: QrDisplayScholarRef[];
  backlinks: QrDisplayBlockLink[];
  related_links: QrDisplayBlockLink[];
  external_resource: QrDisplayExternalResource | null;
  confidence: QrDisplayConfidence | null;
  review_status: QrDisplayReviewStatus;
  extraction_method: string | null;
  meta: Record<string, unknown>;
}

export interface QrIraabDisplayBlock extends Omit<QrTafsirDisplayBlock,
  'block_type' | 'scholar_id' | 'work_id' | 'scholar_name_ar' | 'scholar_name_en' |
  'madhab' | 'era' | 'kalam_school' | 'death_year_hijri' | 'source_tafsir_entry_id' |
  'theology_tags' | 'narration_tags' | 'scholar_refs'> {
  block_type: QrIraabBlockType;
  source_chunk_id: string | null;
  source_entry_id: string | null;
  sarf_tags: string[];
  balagha_tags: string[];
}

export interface QrTafsirGroupDisplayPayload {
  ayah_group_key: string;
  surah_no: number;
  ayah_no: number;
  ayah_to: number;
  ayah_keys: string[];
  requested_ayah_no?: number;
  source_groups: Array<{
    source_slug: string;
    scholar_id: string;
    ayah_group_key: string;
    group_start: number;
    group_end: number;
  }>;
  sources: QrTafsirDisplaySource[];
  blocks: QrTafsirDisplayBlock[];
  tags: unknown[];
  refs: unknown[];
  links: unknown[];
  notes: unknown[];
}

export interface QrIraabGroupDisplayPayload {
  ayah_group_key: string;
  surah_no: number;
  ayah_no: number;
  ayah_to: number;
  ayah_keys: string[];
  requested_ayah_no?: number;
  source_groups: unknown[];
  sources: QrIraabDisplaySource[];
  blocks: QrIraabDisplayBlock[];
  tags: unknown[];
  refs: unknown[];
  links: unknown[];
  notes: unknown[];
}

export interface QrDisplaySearchHit {
  block_id: string;
  source_slug: string;
  scholar_id?: string;
  madhab?: QrDisplayMadhab | null;
  era?: QrDisplayEra | null;
  surah_no: number;
  ayah_no: number;
  ayah_key: string | null;
  ayah_group_key: string | null;
  block_type: string;
  hit: string;
  rank_score: number;
}

// ── Surah Morphology grid ─────────────────────────────────────────────────────
// Fully shaped by the worker (GET /qr/surahs/:id/morphology). The component is a
// logic-free renderer: it paints `words[]` and never parses a linguistic token.

export type QrMorphPos = 'noun' | 'verb';

/** One authored Qurʾānic sense of the word (trilingual; ur may be absent). */
export interface QrMorphMeaning {
  ar: string;
  en: string;
}

/** Grammatical-feature chip. `cat` picks the card colour; `ar` is the label. */
export type QrMorphFeatCat = 'status' | 'state' | 'number' | 'gender' | 'type' | 'tense' | 'voice';
export interface QrMorphFeat {
  cat: QrMorphFeatCat;
  ar: string;
  en: string | null;
}

/**
 * One morphology card. Fully shaped by the worker: QAC essentials (lemma,
 * surface, root, derived type) for every word, enriched with the curated Memlet
 * layer (gloss, sense list, wazn, root meaning) where a word has been authored.
 */
export interface QrMorphWord {
  surah: number;
  ayah: number;
  word_index: number;
  ref: string;                          // "44:2"
  surface_ar: string;                   // occurrence form
  lemma_ar: string | null;              // dictionary form — the card headline
  root_ar: string | null;               // bare root, e.g. "كتب" (for navigation)
  root_display: string | null;          // spaced root, e.g. "ك ت ب"
  group: QrMorphPos;                    // filter bucket
  pos_en: string;                       // Noun | Proper Noun | Verb
  gloss_en: string | null;              // authored English meaning
  derived_type_en: string | null;       // e.g. "active participle"
  derived_type_ar: string | null;       // e.g. "اسم فاعل"
  wazn_ar: string | null;               // pattern, e.g. "مُفْعِل"
  form_ar: string | null;               // verb form (باب), e.g. "إفعال"
  form_roman: string | null;            // e.g. "IV"
  quran_meanings: QrMorphMeaning[] | null;  // short authored sense list
  root_meaning_en: string | null;       // authored root gloss, e.g. "clarity"
  is_anchor: boolean;                   // root anchor word
  feats: QrMorphFeat[];                 // grammatical-feature chips (case/number/gender/type · tense/voice)
  sense_arc_en: string | null;          // 360° semantic arc, e.g. "separation → clarity"
  sense_range_en: string | null;        // compact range of meanings (falls back to sense list)
}

export interface QrMorphologyPayload {
  surah_id: number;
  scope: { ayah_from: number; ayah_to: number };
  count: { all: number; noun: number; verb: number };
  words: QrMorphWord[];
}
