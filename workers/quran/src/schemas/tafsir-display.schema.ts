// tafsir-display.schema.ts
//
// TypeScript surface for the qr_tafsir_book_display_* projection (migration 012).
// Parallel to iraab-display.schema.ts. Two flavors per table:
//   - <Row>    : raw D1 row shape, JSON columns as `string | null`
//   - <Parsed> : UI-facing shape with JSON columns hydrated to typed arrays/objects
//
// ARCHITECTURE RULE — disjoint from iʿrāb display:
//   DARWISH and SAFI are excluded. This layer holds the 8 tafsir scholars only:
//   TABARI, ZAMAKHSHARI, IBN_ATIYYA, RAZI, ABU_HAYYAN, IBN_KATHIR, ALUSI, IBN_ASHUR.

// ─── Vocab unions (soft — DB columns are TEXT) ───────────────────────────────

export type TafsirBlockType =
  // Tafsir-specific
  | 'tafsir_card'
  | 'paragraph_section'
  | 'isnad'
  | 'voice_marker'
  | 'poetry_quote'
  | 'verse_anchor'
  | 'scholar_response'
  | 'reception_note'
  | 'paradigm_chip'
  | 'hadith_source_chip'
  // Shared with iraab vocab
  | 'heading' | 'subheading'
  | 'arabic_quote' | 'source_quote'
  | 'explanation' | 'callout' | 'warning' | 'key_insight'
  | 'author_note' | 'teaching_note' | 'study_summary'
  | 'source_badge'
  | 'quran_ref_chip' | 'ayah_link' | 'word_link'
  | 'root_chip' | 'lemma_chip'
  | 'backlink' | 'related_note'
  | 'same_ayah_link' | 'same_word_link' | 'same_grammar_link'
  | 'comparison' | 'disagreement'
  | 'raw_source' | 'footnote' | 'tag' | 'review_status_badge';

export type TafsirScopeType =
  | 'word' | 'phrase' | 'clause' | 'sentence'
  | 'ayah' | 'ayah_range' | 'ayah_group' | 'surah' | 'cross_ref';

export type TafsirReviewStatus =
  | 'ai_candidate' | 'needs_review' | 'approved' | 'rejected' | 'archived';

export type TafsirConfidence =
  | 'low' | 'medium' | 'high' | 'verified';

export type TafsirExtractionMethod =
  | 'entry_projection' | 'regex_parser'
  | 'ai_extracted' | 'manual' | 'imported' | 'hand_edited';

export type TafsirTagKind =
  | 'general' | 'narration' | 'theology' | 'paradigm' | 'madhab' | 'topic' | 'review';

export type TafsirRefKind =
  | 'ayah' | 'word' | 'lemma' | 'root' | 'concept'
  | 'scholar' | 'position' | 'hadith_source';

export type TafsirLinkKind =
  | 'backlink' | 'related'
  | 'same_ayah' | 'same_word' | 'same_grammar' | 'same_paradigm'
  | 'comparison' | 'disagreement'
  | 'scholar_response' | 'reception_note' | 'isnad_continues';

export type TafsirNoteKind =
  | 'author' | 'teaching' | 'footnote' | 'reviewer' | 'editorial'
  | 'source_citation' | 'mutazili_rebuttal';

export type TafsirMarkupTier = 'full' | 'minimal' | 'none';

export type TafsirMadhab =
  | 'sunni' | 'maliki' | 'shafii' | 'hanbali' | 'hanafi'
  | 'mutazili' | 'ashari' | 'athari';

export type TafsirEra = 'classical' | 'modern';

// ─── JSON column payloads (hydrated forms) ───────────────────────────────────

export interface QuranRef {
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

export interface ScholarRef {
  scholar_id: string;
  role: 'cited' | 'responded_to' | 'agreed_with' | 'disagreed_with' | 'quoted' | 'transmitted';
  label?: string | null;
  ayah_key?: string | null;
}

export interface BlockLink {
  block_id?: string | null;
  typed_ref?: string | null;       // e.g. 'QR:POSITION:01HX…'
  kind: TafsirLinkKind;
  label?: string | null;
  weight?: number;
}

/** Structured isnad chain when block_type='isnad'. */
export interface IsnadChain {
  /** Raw isnad text from the source */
  raw_ar: string;
  /** Detected chain segments (best-effort regex extraction; may need review) */
  links: Array<{
    narrator_text: string;     // verbatim
    relator_verb?: 'حدثنا' | 'أخبرنا' | 'حدثني' | 'سمعت' | 'عن' | 'قال' | string;
    position?: number;
  }>;
  separator?: '⁕' | 'paragraph_break' | 'inline' | string;
}

/** External resource pointer (reserved for future audio/scan refs). */
export interface ExternalResource {
  r2_key: string;
  kind: 'svg' | 'image' | 'pdf' | 'audio' | 'other';
  bytes?: number | null;
  mime?: string | null;
  source_db?: string | null;
}

export interface BlockMeta {
  /** Original full-entry paragraph offsets for re-assembly */
  paragraph_offsets?: number[];
  /** Highlighted spans pulled from <span class="hlt"> markup */
  highlights?: string[];
  /** Editorial asides extracted into separate notes */
  asides?: string[];
  /** SHA hash of source_quote for re-import dedup */
  source_quote_hash?: string;
  /** Isnad payload when block_type='isnad' (also mirrored at top level if useful) */
  isnad?: IsnadChain;
  /** Free-form */
  [k: string]: unknown;
}

// ─── 1. SOURCES ──────────────────────────────────────────────────────────────

export interface QrTafsirBookDisplaySourceRow {
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
  era: TafsirEra | null;
  madhab: TafsirMadhab | null;
  kalam_school: string | null;
  specialization: string | null;
  badge_color: string | null;
  badge_glyph: string | null;
  markup_tier: TafsirMarkupTier | null;
  short_description: string | null;
  long_description: string | null;
  cover_image_url: string | null;
  display_order: number;
  is_visible: 0 | 1;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

// ─── 2. BLOCKS ───────────────────────────────────────────────────────────────

export interface QrTafsirBookDisplayBlockRow {
  id: string;
  source_id: string | null;
  source_tafsir_entry_id: string | null;
  source_slug: string;
  book_title: string | null;
  author: string | null;

  // Scholar metadata (denormalized)
  scholar_id: string | null;
  work_id: string | null;
  scholar_name_ar: string | null;
  scholar_name_en: string | null;
  madhab: TafsirMadhab | null;
  era: TafsirEra | null;
  kalam_school: string | null;
  death_year_hijri: number | null;

  // Locator
  surah_no: number | null;
  ayah_no: number | null;
  ayah_to: number | null;
  ayah_key: string | null;
  ayah_group_key: string | null;
  ayah_keys_json: string | null;
  is_grouped: 0 | 1;
  word_index: number | null;
  word_text: string | null;
  phrase_text: string | null;
  scope_type: TafsirScopeType | null;

  // Block identity
  block_type: TafsirBlockType;
  block_subtype: string | null;
  display_order: number;
  paragraph_index: number | null;
  paragraph_count: number | null;
  is_long_form: 0 | 1;

  // Content
  title_ar: string | null;
  title_en: string | null;
  text_ar: string | null;
  text_en: string | null;
  raw_text: string | null;
  markup_tier: TafsirMarkupTier | null;
  source_page: string | null;

  // Denormalized arrays (stored as JSON TEXT)
  tags_json: string | null;
  grammar_tags_json: string | null;
  theology_tags_json: string | null;
  narration_tags_json: string | null;
  quran_refs_json: string | null;
  scholar_refs_json: string | null;
  backlinks_json: string | null;
  related_links_json: string | null;
  external_resource_json: string | null;

  // QA
  confidence: TafsirConfidence | null;
  review_status: TafsirReviewStatus;
  extraction_method: TafsirExtractionMethod | null;
  meta_json: string | null;

  created_at: string;
  updated_at: string;
}

/** UI-facing shape: JSON columns hydrated to typed arrays/objects. */
export interface QrTafsirBookDisplayBlock
  extends Omit<QrTafsirBookDisplayBlockRow,
    | 'ayah_keys_json'
    | 'tags_json' | 'grammar_tags_json' | 'theology_tags_json' | 'narration_tags_json'
    | 'quran_refs_json' | 'scholar_refs_json'
    | 'backlinks_json' | 'related_links_json'
    | 'external_resource_json' | 'meta_json'> {
  ayah_keys: string[];
  tags: string[];
  grammar_tags: string[];
  theology_tags: string[];
  narration_tags: string[];
  quran_refs: QuranRef[];
  scholar_refs: ScholarRef[];
  backlinks: BlockLink[];
  related_links: BlockLink[];
  external_resource: ExternalResource | null;
  meta: BlockMeta;
}

// ─── 3. TAGS ─────────────────────────────────────────────────────────────────

export interface QrTafsirBookDisplayTagRow {
  id: string;
  block_id: string;
  tag_kind: TafsirTagKind;
  tag_value: string;
  tag_value_norm: string | null;
  display_order: number;
  created_at: string;
}

// ─── 4. REFS ─────────────────────────────────────────────────────────────────

export interface QrTafsirBookDisplayRefRow {
  id: string;
  block_id: string;
  ref_kind: TafsirRefKind;
  surah_no: number | null;
  ayah_no: number | null;
  ayah_to: number | null;
  ayah_key: string | null;
  ayah_group_key: string | null;
  word_index: number | null;
  typed_ref: string | null;
  label: string | null;
  meta_json: string | null;
  created_at: string;
}

// ─── 5. LINKS ────────────────────────────────────────────────────────────────

export interface QrTafsirBookDisplayLinkRow {
  id: string;
  from_block_id: string;
  to_block_id: string | null;
  to_typed_ref: string | null;
  link_kind: TafsirLinkKind;
  label: string | null;
  weight: number;
  meta_json: string | null;
  created_at: string;
}

// ─── 6. NOTES ────────────────────────────────────────────────────────────────

export interface QrTafsirBookDisplayNoteRow {
  id: string;
  block_id: string | null;
  note_kind: TafsirNoteKind;
  note_text_ar: string | null;
  note_text_en: string | null;
  is_inline: 0 | 1;
  surah_no: number | null;
  ayah_no: number | null;
  ayah_key: string | null;
  ayah_group_key: string | null;
  source_slug: string | null;
  scholar_id: string | null;
  display_order: number;
  meta_json: string | null;
  review_status: TafsirReviewStatus;
  created_at: string;
  updated_at: string;
}

// ─── Hydration helpers ───────────────────────────────────────────────────────

const parseArr = <T = unknown>(s: string | null): T[] => {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};
const parseObj = <T extends object>(s: string | null): T => {
  if (!s) return {} as T;
  try { const v = JSON.parse(s); return (v && typeof v === 'object') ? v as T : ({} as T); } catch { return {} as T; }
};
const parseOrNull = <T extends object>(s: string | null): T | null => {
  if (!s) return null;
  try { const v = JSON.parse(s); return (v && typeof v === 'object') ? v as T : null; } catch { return null; }
};

export function hydrateTafsirBlock(r: QrTafsirBookDisplayBlockRow): QrTafsirBookDisplayBlock {
  const {
    ayah_keys_json,
    tags_json, grammar_tags_json, theology_tags_json, narration_tags_json,
    quran_refs_json, scholar_refs_json,
    backlinks_json, related_links_json,
    external_resource_json, meta_json,
    ...rest
  } = r;
  return {
    ...rest,
    ayah_keys: parseArr<string>(ayah_keys_json),
    tags: parseArr<string>(tags_json),
    grammar_tags: parseArr<string>(grammar_tags_json),
    theology_tags: parseArr<string>(theology_tags_json),
    narration_tags: parseArr<string>(narration_tags_json),
    quran_refs: parseArr<QuranRef>(quran_refs_json),
    scholar_refs: parseArr<ScholarRef>(scholar_refs_json),
    backlinks: parseArr<BlockLink>(backlinks_json),
    related_links: parseArr<BlockLink>(related_links_json),
    external_resource: parseOrNull<ExternalResource>(external_resource_json),
    meta: parseObj<BlockMeta>(meta_json),
  };
}

// ─── Aggregate response shapes ───────────────────────────────────────────────

/**
 * Per-verse × per-scholar payload: the central tafsir read API shape.
 * Returned by GET /qr/tafsir/display?surah=N&ayah=M[&scholar_id=…].
 *
 * If the requested ayah is part of a multi-ayah group anchor, the response
 * carries the canonical group key + ayah list. Each block belongs to one
 * scholar; UI groups by scholar_id for side-by-side comparison.
 */
export interface QrTafsirGroupDisplayPayload {
  /** Canonical group key for this slice, e.g. "2:255" or "3:131-133". */
  ayah_group_key: string;
  surah_no: number;
  ayah_no: number;
  ayah_to: number;
  ayah_keys: string[];
  /** The requesting ayah the resolver was called with. */
  requested_ayah_no?: number;
  /** Per-scholar group spans, since different scholars may anchor differently. */
  source_groups: Array<{
    source_slug: string;
    scholar_id: string;
    ayah_group_key: string;
    group_start: number;
    group_end: number;
  }>;
  sources: QrTafsirBookDisplaySourceRow[];
  blocks: QrTafsirBookDisplayBlock[];
  tags: QrTafsirBookDisplayTagRow[];
  refs: QrTafsirBookDisplayRefRow[];
  links: QrTafsirBookDisplayLinkRow[];
  notes: QrTafsirBookDisplayNoteRow[];
}

/** Search hit shape from FTS5. */
export interface QrTafsirSearchHit {
  block_id: string;
  source_slug: string;
  scholar_id: string;
  madhab: TafsirMadhab | null;
  era: TafsirEra | null;
  surah_no: number;
  ayah_no: number;
  ayah_key: string | null;
  ayah_group_key: string | null;
  block_type: TafsirBlockType;
  hit: string;       // snippet() with «…» markers
  rank_score: number;
}
