// iraab-display.schema.ts
//
// TypeScript surface for the qr_iraab_book_display_* projection (migration 011).
// Two flavors per table:
//   - <Row>       : raw D1 row shape, JSON columns as `string | null`
//   - <Parsed>    : UI-facing shape with JSON columns hydrated to typed arrays
//
// Mirrors `irab.schema.ts` conventions (one interface per table, no enums; the
// vocab unions below are for editor help and can be widened without a migration).

// ─── Vocab unions (soft — DB columns are TEXT) ───────────────────────────────

export type IraabBlockType =
  | 'heading' | 'subheading'
  | 'arabic_quote' | 'source_quote'
  | 'explanation' | 'irab_card'
  | 'grammar_note' | 'sarf_note' | 'balagha_note' | 'language_note'
  | 'callout' | 'warning' | 'key_insight'
  | 'author_note' | 'teaching_note' | 'study_summary'
  | 'source_badge'
  | 'quran_ref_chip' | 'ayah_link' | 'word_link'
  | 'root_chip' | 'lemma_chip'
  | 'backlink' | 'related_note'
  | 'same_ayah_link' | 'same_word_link' | 'same_grammar_link'
  | 'comparison' | 'disagreement'
  | 'raw_source' | 'footnote' | 'tag' | 'review_status_badge'
  | 'dependency_graph';

export type IraabScopeType =
  | 'word' | 'phrase' | 'clause' | 'sentence'
  | 'ayah' | 'ayah_range' | 'ayah_group' | 'surah' | 'cross_ref';

export type IraabReviewStatus =
  | 'ai_candidate' | 'needs_review' | 'approved' | 'rejected' | 'archived';

export type IraabConfidence =
  | 'low' | 'medium' | 'high' | 'verified';

export type IraabExtractionMethod =
  | 'regex_parser' | 'entry_projection'
  | 'ai_extracted' | 'manual' | 'imported' | 'hand_edited';

export type IraabTagKind =
  | 'general' | 'grammar' | 'sarf' | 'balagha' | 'topic' | 'review';

export type IraabRefKind = 'ayah' | 'word' | 'lemma' | 'root' | 'concept';

export type IraabLinkKind =
  | 'backlink' | 'related'
  | 'same_ayah' | 'same_word' | 'same_grammar'
  | 'comparison' | 'disagreement';

export type IraabNoteKind = 'author' | 'teaching' | 'footnote' | 'reviewer';

// ─── JSON column payloads (hydrated forms) ───────────────────────────────────

export interface QuranRef {
  surah: number | null;
  ayah?: number | null;
  ayah_to?: number | null;
  ayah_key?: string | null;          // "2:3"
  ayah_group_key?: string | null;    // "2:1-5"
  ayah_keys?: string[] | null;       // ["2:1","2:2","2:3","2:4","2:5"]
  word_index?: number | null;
  word_text?: string | null;
  label?: string | null;
}

/** Payload of `external_resource_json` for dependency_graph blocks. */
export interface ExternalResource {
  r2_key: string;
  kind: 'svg' | 'image' | 'pdf' | 'audio' | 'other';
  bytes?: number | null;
  mime?: string | null;
  source_db?: string | null;
}

export interface BlockLink {
  block_id: string;
  kind: IraabLinkKind;
  label?: string | null;
  weight?: number;
}

export interface BlockMeta {
  highlights?: string[];                 // <span class="hlt">…</span> picked from raw HTML
  alternatives?: string[];               // [[…]] aside content
  [k: string]: unknown;
}

// ─── 1. SOURCES ──────────────────────────────────────────────────────────────

export interface QrIraabBookDisplaySourceRow {
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
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

// ─── 2. BLOCKS ───────────────────────────────────────────────────────────────

export interface QrIraabBookDisplayBlockRow {
  id: string;
  source_id: string | null;
  source_chunk_id: string | null;       // → qr_irab_source_chunks.id  (Phase B/C)
  source_entry_id: string | null;       // → qr_irab_book_entries.id   (Phase A)
  source_slug: string;
  book_title: string | null;
  author: string | null;

  surah_no: number | null;
  ayah_no: number | null;
  ayah_to: number | null;
  ayah_key: string | null;              // "2:3"
  ayah_group_key: string | null;        // "2:1-5"
  ayah_keys_json: string | null;        // JSON-encoded string[]
  is_grouped: 0 | 1;
  word_index: number | null;
  word_text: string | null;
  phrase_text: string | null;

  scope_type: IraabScopeType | null;
  block_type: IraabBlockType;
  block_subtype: string | null;
  display_order: number;

  title_ar: string | null;
  title_en: string | null;
  text_ar: string | null;
  text_en: string | null;
  raw_text: string | null;

  tags_json: string | null;
  grammar_tags_json: string | null;
  sarf_tags_json: string | null;
  balagha_tags_json: string | null;
  quran_refs_json: string | null;
  backlinks_json: string | null;
  related_links_json: string | null;
  external_resource_json: string | null;

  confidence: IraabConfidence | null;
  review_status: IraabReviewStatus;
  extraction_method: IraabExtractionMethod | null;
  meta_json: string | null;

  created_at: string;
  updated_at: string;
}

/** UI-facing shape: JSON columns hydrated to typed arrays/objects. */
export interface QrIraabBookDisplayBlock
  extends Omit<QrIraabBookDisplayBlockRow,
    | 'ayah_keys_json'
    | 'tags_json' | 'grammar_tags_json' | 'sarf_tags_json' | 'balagha_tags_json'
    | 'quran_refs_json' | 'backlinks_json' | 'related_links_json'
    | 'external_resource_json' | 'meta_json'> {
  ayah_keys: string[];                  // hydrated from ayah_keys_json
  tags: string[];
  grammar_tags: string[];
  sarf_tags: string[];
  balagha_tags: string[];
  quran_refs: QuranRef[];
  backlinks: BlockLink[];
  related_links: BlockLink[];
  external_resource: ExternalResource | null;
  meta: BlockMeta;
}

// ─── 3. TAGS ─────────────────────────────────────────────────────────────────

export interface QrIraabBookDisplayTagRow {
  id: string;
  block_id: string;
  tag_kind: IraabTagKind;
  tag_value: string;
  tag_value_norm: string | null;
  display_order: number;
  created_at: string;
}

// ─── 4. REFS ─────────────────────────────────────────────────────────────────

export interface QrIraabBookDisplayRefRow {
  id: string;
  block_id: string;
  ref_kind: IraabRefKind;
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

export interface QrIraabBookDisplayLinkRow {
  id: string;
  from_block_id: string;
  to_block_id: string;
  link_kind: IraabLinkKind;
  label: string | null;
  weight: number;
  meta_json: string | null;
  created_at: string;
}

// ─── 6. NOTES ────────────────────────────────────────────────────────────────

export interface QrIraabBookDisplayNoteRow {
  id: string;
  block_id: string | null;
  note_kind: IraabNoteKind;
  note_text_ar: string | null;
  note_text_en: string | null;
  is_inline: 0 | 1;
  surah_no: number | null;
  ayah_no: number | null;
  ayah_key: string | null;
  ayah_group_key: string | null;
  source_slug: string | null;
  display_order: number;
  meta_json: string | null;
  review_status: IraabReviewStatus;
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

export function hydrateBlock(r: QrIraabBookDisplayBlockRow): QrIraabBookDisplayBlock {
  const {
    ayah_keys_json,
    tags_json, grammar_tags_json, sarf_tags_json, balagha_tags_json,
    quran_refs_json, backlinks_json, related_links_json,
    external_resource_json, meta_json,
    ...rest
  } = r;
  return {
    ...rest,
    ayah_keys: parseArr<string>(ayah_keys_json),
    tags: parseArr<string>(tags_json),
    grammar_tags: parseArr<string>(grammar_tags_json),
    sarf_tags: parseArr<string>(sarf_tags_json),
    balagha_tags: parseArr<string>(balagha_tags_json),
    quran_refs: parseArr<QuranRef>(quran_refs_json),
    backlinks: parseArr<BlockLink>(backlinks_json),
    related_links: parseArr<BlockLink>(related_links_json),
    external_resource: parseOrNull<ExternalResource>(external_resource_json),
    meta: parseObj<BlockMeta>(meta_json),
  };
}

// ─── Aggregate response shape for the UI ─────────────────────────────────────
//
// iʿrāb books group analysis across ayah ranges (e.g. Al-Jadwal's 3:131 entry
// covers 3:131-3:133 as a single unit). The natural payload shape is therefore
// a GROUP envelope. A request for surah=N&ayah=M resolves on the worker side
// to the enclosing group per source, and the response carries the group's
// canonical key + full ayah list so the UI can render the range header.

export interface QrIraabGroupDisplayPayload {
  /** Canonical group key, e.g. "2:1-5" or "2:3" for singletons. */
  ayah_group_key: string;
  /** Convenience: parsed group span. */
  surah_no: number;
  ayah_no: number;
  ayah_to: number;
  ayah_keys: string[];
  /** The requesting ayah the resolver was called with (may be inside the group). */
  requested_ayah_no?: number;
  sources: QrIraabBookDisplaySourceRow[];
  blocks: QrIraabBookDisplayBlock[];
  tags: QrIraabBookDisplayTagRow[];
  refs: QrIraabBookDisplayRefRow[];
  links: QrIraabBookDisplayLinkRow[];
  notes: QrIraabBookDisplayNoteRow[];
}

/** @deprecated Use `QrIraabGroupDisplayPayload`. Kept for transitional callers
 *  that addressed iʿrāb per-ayah. */
export type QrIraabAyahDisplayPayload = QrIraabGroupDisplayPayload;
