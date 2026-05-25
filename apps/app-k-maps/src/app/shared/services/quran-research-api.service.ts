import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from './backend-api.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QrScholarWork {
  id: string;
  scholar_id: string;
  title_ar: string;
  title_en: string | null;
  work_type: string;
  composition_year_ce: number | null;
  volumes: number | null;
  scholar_name_ar: string;
  scholar_name_en: string | null;
  era: string | null;
  madhab: string | null;
  specialization: string | null;
  death_year_hijri: number | null;
  death_year_ce: number | null;
  entry_count: number;
}

export interface QrTafsirEntry {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  content_ar: string;
  content_en: string | null;
  source_page: string | null;
  scholar: { name_ar: string; name_en: string | null } | null;
  work: { title_ar: string; title_en: string | null } | null;
  ayah_text: string | null;
}

export interface QrIrabSource {
  id: string;
  source_slug: string;
  source_title_ar: string;
  source_title_en: string | null;
  entry_count: number;
}

export interface QrIrabEntry {
  id: string;
  ayah_key: string;
  surah: number;
  ayah_from: number;
  target_text_ar: string | null;
  irab_text_ar: string;
  grammar_role_ar: string | null;
  grammar_case_ar: string | null;
  mahal_ar: string | null;
  entry_order: number;
  ayah_text: string | null;
}

export interface QrLemma {
  id: string;
  lemma_text: string;
  root: string;
  total_occurrences: number;
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
}

// ─── Display-layer types (migration 011 + 012) ───────────────────────────────
// Mirrored exactly in apps/k-maps so both clients consume the same worker.

export type QrDisplayReviewStatus = 'ai_candidate' | 'needs_review' | 'approved' | 'rejected' | 'archived';
export type QrDisplayConfidence = 'low' | 'medium' | 'high' | 'verified';
export type QrDisplayScopeType = 'word' | 'phrase' | 'clause' | 'sentence' | 'ayah' | 'ayah_range' | 'ayah_group' | 'surah' | 'cross_ref';
export type QrDisplayMarkupTier = 'full' | 'minimal' | 'none';
export type QrDisplayMadhab = 'sunni' | 'maliki' | 'shafii' | 'hanbali' | 'hanafi' | 'mutazili' | 'ashari' | 'athari';
export type QrDisplayEra = 'classical' | 'modern';

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

/**
 * Side / chip / marker block types. They render as empty-looking cards in a
 * reader feed, so the tafsir reader filters them out of its column feed and
 * surfaces them in the references modal's "أخرى" tab instead. The iraab /
 * uloom reader does NOT filter its own feed (it shows every block as-is) —
 * but its modal still picks these up via hasOthers() if any are in the
 * payload, so the Others tab appears there too when there's anything to show.
 */
export const QR_SIDE_BLOCK_TYPES: ReadonlySet<string> = new Set([
  // tafsir-side chips
  'quran_ref_chip', 'paradigm_chip', 'hadith_source_chip',
  'isnad', 'voice_marker', 'poetry_quote', 'verse_anchor',
  'scholar_response', 'reception_note',
  // iraab-side chips — surfaced in the modal only; the iraab feed itself
  // is not filtered.
  'source_badge', 'ayah_link', 'word_link', 'root_chip', 'lemma_chip',
  'backlink', 'related_note',
  'same_ayah_link', 'same_word_link', 'same_grammar_link',
  'comparison', 'disagreement', 'footnote', 'tag', 'review_status_badge',
  'dependency_graph',
]);

/** Arabic labels for side block types — drives the modal's "Others" tab. */
export const QR_SIDE_BLOCK_LABELS: Record<string, string> = {
  quran_ref_chip:     'إحالة قرآنية',
  paradigm_chip:      'إشارة مذهبية',
  hadith_source_chip: 'مصدر حديثي',
  isnad:              'إسناد',
  voice_marker:       'صوت المؤلف',
  poetry_quote:       'شاهد شعري',
  verse_anchor:       'قَولُهُ تَعالى',
  scholar_response:   'ردّ عالم',
  reception_note:     'ملاحظة تلقّي',
  source_badge:       'شارة مصدر',
  ayah_link:          'إحالة آية',
  word_link:          'إحالة كلمة',
  root_chip:          'جذر',
  lemma_chip:         'لِمّة',
  comparison:         'مقارنة',
  disagreement:       'خلاف',
  footnote:           'حاشية',
};

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

/** Hydrated display block (JSON columns parsed to typed arrays). */
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

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class QuranResearchApiService {
  private readonly api = inject(BackendApiService);

  // ── Tafsir ──────────────────────────────────────────────────────────────

  getWorks(workType?: 'tafsir' | 'irab'): Observable<{ works: QrScholarWork[] }> {
    const params = workType ? new HttpParams().set('work_type', workType) : undefined;
    return this.api.getData('qr', ['works'], params ? { params } : undefined);
  }

  getTafsirEntries(surah: number, workId?: string, page = 1, limit = 300): Observable<QrPaginated<QrTafsirEntry>> {
    let params = new HttpParams().set('surah', String(surah)).set('page', String(page)).set('limit', String(limit));
    if (workId) params = params.set('work_id', workId);
    return this.api.getData('qr', ['tafsir'], { params });
  }

  // ── Iraab ────────────────────────────────────────────────────────────────

  getIrabSources(): Observable<{ sources: QrIrabSource[] }> {
    return this.api.getData('qr', ['irab', 'book-sources']);
  }

  getIrabEntries(surah: number, sourceSlug?: string, page = 1, limit = 500): Observable<QrPaginated<QrIrabEntry>> {
    let params = new HttpParams().set('surah', String(surah)).set('page', String(page)).set('limit', String(limit));
    if (sourceSlug) params = params.set('source_slug', sourceSlug);
    return this.api.getData('qr', ['irab', 'book-entries'], { params });
  }

  // ── Lexicon ──────────────────────────────────────────────────────────────

  searchRoots(q: string): Observable<{ roots: QrRoot[] }> {
    return this.api.getData('qr', ['lexicon', 'roots'], { params: new HttpParams().set('q', q) });
  }

  getLemmasByRoot(root: string): Observable<QrPaginated<QrLemma>> {
    return this.api.getData('qr', ['lexicon', 'lemmas'], { params: new HttpParams().set('root', root).set('limit', '200') });
  }

  searchLemmas(q: string): Observable<QrPaginated<QrLemma>> {
    return this.api.getData('qr', ['lexicon', 'lemmas'], { params: new HttpParams().set('q', q).set('limit', '50') });
  }

  getLemmaOccurrences(lemmaId: string): Observable<{ lemma: QrLemma; occurrences: QrLemmaOccurrence[]; total: number }> {
    return this.api.getData('qr', ['lexicon', 'lemmas', lemmaId, 'occurrences'], { params: new HttpParams().set('limit', '300') });
  }

  // ─── Tafsir display layer (migration 012) ──────────────────────────────────

  /** GET /qr/tafsir/display/sources — display-tier scholar registry */
  getTafsirDisplaySources(): Observable<{ sources: QrTafsirDisplaySource[] }> {
    return this.api.getData('qr', ['tafsir', 'display', 'sources']);
  }

  /**
   * GET /qr/tafsir/display?surah=N&ayah=M[&scholar_id=…][&work_id=…][&madhab=…]
   * Resolves the group containing the requested ayah per scholar and returns
   * all blocks for that group across selected scholars.
   */
  getTafsirDisplay(
    surah: number,
    ayah: number,
    opts: { scholar_id?: string; work_id?: string; madhab?: QrDisplayMadhab } = {},
  ): Observable<QrTafsirGroupDisplayPayload> {
    let params = new HttpParams().set('surah', String(surah)).set('ayah', String(ayah));
    if (opts.scholar_id) params = params.set('scholar_id', opts.scholar_id);
    if (opts.work_id)    params = params.set('work_id', opts.work_id);
    if (opts.madhab)     params = params.set('madhab', opts.madhab);
    return this.api.getData('qr', ['tafsir', 'display'], { params });
  }

  /** GET /qr/tafsir/display/search?q=…[&surah=…][&scholar_id=…][&madhab=…][&era=…][&block_type=…][&limit=…] */
  searchTafsirDisplay(
    q: string,
    opts: { surah?: number; scholar_id?: string; madhab?: QrDisplayMadhab; era?: QrDisplayEra; block_type?: string; limit?: number } = {},
  ): Observable<{ q: string; hits: QrDisplaySearchHit[] }> {
    let params = new HttpParams().set('q', q);
    if (opts.surah !== undefined)   params = params.set('surah', String(opts.surah));
    if (opts.scholar_id)            params = params.set('scholar_id', opts.scholar_id);
    if (opts.madhab)                params = params.set('madhab', opts.madhab);
    if (opts.era)                   params = params.set('era', opts.era);
    if (opts.block_type)            params = params.set('block_type', opts.block_type);
    if (opts.limit !== undefined)   params = params.set('limit', String(opts.limit));
    return this.api.getData('qr', ['tafsir', 'display', 'search'], { params });
  }

  /**
   * GET /qr/tafsir/display/compare?surah=…&ayah=…&scholar_ids=A,B,C
   * Side-by-side payload for up to 6 scholars on one ayah.
   */
  compareTafsirDisplay(
    surah: number,
    ayah: number,
    scholarIds: string[],
  ): Observable<{ surah_no: number; ayah_no: number; scholar_ids: string[]; columns: Array<{ scholar_id: string; blocks: QrTafsirDisplayBlock[] }>; total_blocks: number }> {
    const params = new HttpParams()
      .set('surah', String(surah))
      .set('ayah', String(ayah))
      .set('scholar_ids', scholarIds.join(','));
    return this.api.getData('qr', ['tafsir', 'display', 'compare'], { params });
  }

  // ─── Iʿrāb display layer (migration 011) ───────────────────────────────────

  /** GET /qr/iraab/display/sources */
  getIraabDisplaySources(): Observable<{ sources: QrIraabDisplaySource[] }> {
    return this.api.getData('qr', ['iraab', 'display', 'sources']);
  }

  /** GET /qr/iraab/display?surah=…&ayah=…[&source_slug=…] */
  getIraabDisplay(
    surah: number,
    ayah: number,
    opts: { source_slug?: string } = {},
  ): Observable<QrIraabGroupDisplayPayload> {
    let params = new HttpParams().set('surah', String(surah)).set('ayah', String(ayah));
    if (opts.source_slug) params = params.set('source_slug', opts.source_slug);
    return this.api.getData('qr', ['iraab', 'display'], { params });
  }

  /** GET /qr/iraab/display/search?q=…[&surah=…][&source_slug=…][&block_type=…][&limit=…] */
  searchIraabDisplay(
    q: string,
    opts: { surah?: number; source_slug?: string; block_type?: string; limit?: number } = {},
  ): Observable<{ q: string; hits: QrDisplaySearchHit[] }> {
    let params = new HttpParams().set('q', q);
    if (opts.surah !== undefined) params = params.set('surah', String(opts.surah));
    if (opts.source_slug)         params = params.set('source_slug', opts.source_slug);
    if (opts.block_type)          params = params.set('block_type', opts.block_type);
    if (opts.limit !== undefined) params = params.set('limit', String(opts.limit));
    return this.api.getData('qr', ['iraab', 'display', 'search'], { params });
  }
}
