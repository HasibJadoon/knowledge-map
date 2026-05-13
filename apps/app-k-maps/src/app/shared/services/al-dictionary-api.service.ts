import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from './backend-api.service';

// ─── Types — classical source chunks (/al/lexicon/dict/*) ────────────────────

export interface AlDictSource {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  period: string;
  total: number;
  roots: number;
}

export interface AlDictEntry {
  id: string;
  source_slug: string;
  heading_norm: string | null;
  text_ar: string;
  text_en: string | null;
  page_no: number | null;
  volume_no: number | null;
  is_bilingual?: boolean;
}

export interface AlRootSourceResult {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  entries: AlDictEntry[];
  entry_count: number;
}

export interface AlRootResult {
  root: {
    text_ar: string;
    letters: string | null;
    meaning_ar: string | null;
    meaning_en: string | null;
    frequency_quran: number | null;
  };
  sources: AlRootSourceResult[];
  source_count: number;
  lemma_count: number;
}

// ─── Types — structured lexicon entries (/al/lexicon/entries/*) ──────────────

export interface CitationChip {
  abbr:     string;
  label:    string;
  label_ar: string;
  author:   string;
}

export interface LexEntry {
  id:           string;
  heading_ar:   string | null;
  page_label:   string | null;
  page:         number | null;
  type:         string;
  definition:   string | null;
  has_gaps:     boolean;
  arabic_forms: string[];
  ref_sources:  CitationChip[];
}

export interface LexLexicon {
  slug:     string;
  title:    string;
  title_ar: string;
  author:   string;
  period:   string;
  count:    number;
  entries:  LexEntry[];
}

export interface LexRootResult {
  root:     string;
  source:   string | null;
  total:    number;
  lexicons: LexLexicon[];
}

// ─── Types — Lane grouped rows (/al/lexicon/entries/lane/*) ──────────────────

export interface LaneGroupedRow {
  entry_id:          string;
  root_text:         string;
  heading_block_ar:  string | null;
  display_heading_ar:string | null;
  lemma_text:        string | null;
  page_label:        string | null;
  page_no:           number | null;
  definition_block_en: string | null;
  definition_en:     string | null;
  arabic_forms_text: string | null;
  cleaner_json:      string | null;
  ui_json:           string | null;
  raw_label:         string | null;
  block_count:       number | null;
}

export interface LaneTableResult {
  root:    string;
  total:   number;
  entries: LaneGroupedRow[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AlDictionaryApiService {
  private readonly api = inject(BackendApiService);

  getSources(): Observable<{ sources: AlDictSource[]; total: number }> {
    return this.api.getData('al', ['lexicon', 'dict', 'sources']);
  }

  getRootEntries(root: string, limit = 10): Observable<AlRootResult> {
    const params = new HttpParams().set('limit', String(limit));
    return this.api.getData('al', ['lexicon', 'dict', 'root', root], { params });
  }

  getStructuredRootEntries(root: string, limit = 50): Observable<LexRootResult> {
    const params = new HttpParams().set('limit', String(limit));
    return this.api.getData<LexRootResult>('al', ['lexicon', 'entries', 'root', root], { params });
  }

  getLaneTableEntries(root: string, limit = 100): Observable<LaneTableResult> {
    const params = new HttpParams().set('limit', String(limit));
    return this.api.getData<LaneTableResult>('al', ['lexicon', 'entries', 'lane', root], { params });
  }

  // ── v2 composer reads (mirror desktop) ────────────────────────────────
  /** Rich Lane read for one root (bilingual token stream). */
  getLaneRead(root_norm: string): Observable<LaneReadView> {
    return this.api.getData<LaneReadView>(
      'al', ['lex', 'v2', 'read', 'lane_lexicon', root_norm],
    );
  }
  /** Generic v2 entry for classical lexicons (Lisan, Taj, Sihah, …). */
  getV2Entry(source_slug: string, root_norm: string): Observable<LexV2EntryDetail> {
    return this.api.getData<LexV2EntryDetail>(
      'al', ['lex', 'v2', 'entry', source_slug, root_norm],
    );
  }
  /** Root index for one classical lexicon — drives the reader left rail. */
  getV2Roots(opts: { source: string; prefix?: string; page?: number; limit?: number } = { source: '' }):
    Observable<{ rows: LexV2RootRow[]; total: number; page: number; limit: number; has_more: boolean }> {
    let p = new HttpParams();
    if (opts.source) p = p.set('source', opts.source);
    if (opts.prefix) p = p.set('prefix', opts.prefix);
    if (opts.page)   p = p.set('page',   String(opts.page));
    if (opts.limit)  p = p.set('limit',  String(opts.limit));
    return this.api.getData('al', ['lex', 'v2', 'roots'], { params: p });
  }
  /** Mufradat reader view (al-Raghib). */
  getMufradatRead(root_norm: string): Observable<MufradatReadView> {
    return this.api.getData<MufradatReadView>(
      'al', ['lex', 'v2', 'read', 'ketabonline_al_raghib_mufradat', root_norm],
    );
  }

  // ── Academic scholarship on roots (Al-Jallad et al.) ──────────────────
  // Separate from the classical lexicon corpus; surfaced as a distinct
  // "Academic readings" section on the lexicon hub.
  getRootScholarship(root: string): Observable<RootScholarshipResult> {
    return this.api.getData<RootScholarshipResult>(
      'al', ['scholarship', 'root', root],
    );
  }
  /** Catalog of academic sources (for the mobile books-listing). */
  getScholarshipSources(): Observable<{ sources: ScholarshipSource[]; total: number }> {
    return this.api.getData('al', ['scholarship', 'sources']);
  }
  /** Root index for one academic source — drives the modal's Roots tab. */
  getScholarshipRoots(slug: string): Observable<{ slug: string; rows: ScholarshipRootRow[]; total: number }> {
    return this.api.getData('al', ['scholarship', 'roots', slug]);
  }
  /** All notes for a (source, root) pair — drives the modal's Content tab. */
  getScholarshipBySource(slug: string, root_norm: string): Observable<ScholarshipShellView> {
    return this.api.getData<ScholarshipShellView>(
      'al', ['scholarship', 'by-source', slug, root_norm],
    );
  }
}

// ─── Scholarship types ───────────────────────────────────────────────────────

export interface ScholarshipSource {
  id:          string;
  slug:        string | null;          // url-safe slug for routing
  title_ar:    string;
  title_en:    string;
  author:      string;
  year:        number | null;
  genre:       string;
  genre_label: { ar: string; en: string };
  url:         string | null;
  count:       number;
}

export interface ScholarshipNote {
  id:            string;
  source_id:     string;
  source:        ScholarshipSource;
  root_norm:     string;
  root_text:     string | null;
  reading_kind:  string;
  reading_label: { ar: string; en: string };
  title_en:      string | null;
  title_ar:      string | null;
  body_md:       string | null;
  body_plain:    string | null;
  page_no:       number | null;
  page_range:    string | null;
  section_label: string | null;
}

export interface RootScholarshipResult {
  root_norm: string;
  notes:     ScholarshipNote[];
  total:     number;
}

export interface ScholarshipRootRow {
  root_norm: string;
  root_text: string | null;
  page_no:   number | null;
  n:         number;
}

export interface ScholarshipShellView {
  slug:      string;
  root_norm: string;
  source:    ScholarshipSource | null;
  notes:     ScholarshipNote[];
  total:     number;
}

// ─── v2 composer types (mirror desktop verbatim) ─────────────────────────────

export interface LexV2SourceMeta {
  slug:      string;
  title_ar:  string;
  title_en:  string;
  author:    string;
  period:    string;
  origin:    'thahabi' | 'ketabonline' | 'saaid' | 'qomra' | 'lane';
  bilingual?: boolean;
  roots:     number;
}

export interface LexV2RootRow {
  id:           string;
  source_slug:  string;
  root_text:    string;
  root_norm:    string;
  root_id:      string | null;
  page_start:   number | null;
  page_end:     number | null;
  volume_no:    number | null;
}

export interface LexV2Block {
  id:               string;
  section_id:       string | null;
  book_page_id:     string | null;
  parent_block_id:  string | null;
  block_path:       string;
  block_seq:        number;
  depth:            number;
  block_type:       string;
  lang:             string | null;
  title_ar:         string | null;
  text_plain:       string | null;
  text_html:        string | null;
  data_json:        string;
  origin:           string;
  origin_ref:       string | null;
  printed_page:     number | null;
}

export interface LexV2SectionBody {
  text:           string;
  paragraphs:     string[];
  footnote_refs:  number[];
}

export interface LexV2Section {
  id:                       string;
  section_seq:              number;
  heading_ar:               string | null;
  heading_norm:             string | null;
  heading_bare:             string | null;
  section_type:             string;
  text_ar:                  string | null;
  page_no:                  number | null;
  source_native_section_id: string | null;
  body?:                    LexV2SectionBody;
}

export interface LexV2QuranRef {
  id: string; block_id: string | null; section_id: string | null;
  surah: number; ayah: number; raw_ref: string; context_snippet: string | null;
}

export interface LexV2EntryDetail {
  meta: LexV2SourceMeta;
  entry: {
    id: string; source_slug: string; root_text: string; root_norm: string;
    root_id: string | null; raw_text: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
    status: string;
  };
  canonical: {
    id: string; root_text: string; root_letters: string;
    root_type: string;
    frequency_quran: number | null;
    meaning_core_en: string | null;
  } | null;
  sections:   LexV2Section[];
  blocks:     LexV2Block[];
  quran_refs: LexV2QuranRef[];
  stats: {
    sections: number; blocks: number; quran_refs: number;
  };
}

// ─── Mufradat reader types ────────────────────────────────────────────────

export type MufradatProseToken =
  | { kind: 'text'; value: string }
  | { kind: 'quran'; surah: string; surah_num: number | null;
      ayah: number; ayah_to: number | null; raw: string }
  | { kind: 'footnote'; num: number; has_text: boolean; text: string | null; printed_page: number | null }
  | { kind: 'paren_quote'; value: string }
  | { kind: 'br' };

export type MufradatParagraph =
  | { kind: 'prose';        tokens: MufradatProseToken[] }
  | { kind: 'poetry';       cue: string | null; verses: string[]; attribution: string | null }
  | { kind: 'hadith';       cue: string | null; tokens: MufradatProseToken[] }
  | { kind: 'qira_variant'; reader: string | null; tokens: MufradatProseToken[] }
  | { kind: 'editorial';    tokens: MufradatProseToken[] };

export interface MufradatSection {
  id:          string;
  seq:         number;
  heading_ar:  string | null;
  page_no:     number | null;
  paragraphs:  MufradatParagraph[];
}

export interface MufradatReadView {
  kind: 'mufradat';
  meta: { slug: string; title_ar: string; title_en: string; author: string; period: string; origin: string };
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  sections: MufradatSection[];
  footnotes: { num: number; text: string | null; printed_page: number | null }[];
  quran_citations: {
    surah: string; surah_num: number | null;
    ayah: number; ayah_to: number | null;
    raw: string; count: number;
  }[];
  stats: {
    paragraphs: number; poetry: number; hadith: number;
    qira_variants: number; quran_citations: number; footnote_markers: number;
  };
}

// ─── Lane reader types ───────────────────────────────────────────────────

export type LaneToken =
  | { kind: 'text';       value: string }
  | { kind: 'arabic';     value: string }
  | { kind: 'headword';   value: string }
  | { kind: 'siglum';     code: string; name_en: string; name_ar: string; raw: string }
  | { kind: 'cross_ref';  target: string }
  | { kind: 'quran';      surah: number; ayah: number; raw: string }
  | { kind: 'figurative' }
  | { kind: 'br' };

export interface LaneSense {
  label: string | null;
  kind:  'signification' | 'dissociation' | 'plain' | null;
  tokens: LaneToken[];
}

export interface LaneVerbForm {
  section_id:    string;
  form_num:      number | null;
  form_label_ar: string | null;
  page_no:       number | null;
  header_tokens: LaneToken[];
  senses:        LaneSense[];
}

export interface LaneReadView {
  kind: 'lane';
  meta: { slug: 'lane_lexicon'; title_ar: string; title_en: string;
          author: string; period: string; origin: 'lane'; bilingual: true };
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  forms: LaneVerbForm[];
  authorities: { code: string; name_en: string; name_ar: string; count: number }[];
  quran_citations: { surah: number; ayah: number; raw: string;
                     context_snippet: string | null; count: number }[];
  cross_refs:    { target: string; count: number }[];
  stats: {
    forms: number; senses: number; authorities: number;
    authority_total: number; quran_citations: number; cross_refs: number;
  };
}
