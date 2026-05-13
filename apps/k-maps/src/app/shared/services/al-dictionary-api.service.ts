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

// ─── Types — Lane grouped table (/al/lexicon/entries/lane/*) ─────────────────

export interface LaneGroupedRow {
  entry_id: string;
  display_heading_ar: string | null;
  lemma_text: string | null;
  heading_norm: string | null;
  page_no: number | null;
  source_entry_seq: number | null;
  definition_en: string | null;
  status: string | null;
  ui_json: string | null;
  cleaner_json: string | null;
  heading_block_ar: string | null;
  definition_block_en: string | null;
  arabic_forms_text: string | null;
  page_label: string | null;
  raw_label: string | null;
  block_count: number;
}

export interface LaneTableResult {
  root: string;
  total: number;
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

  // ─── /al/lex/v2/* — clean root-based reader API ────────────────────────────

  getV2Sources(): Observable<LexV2SourcesResult> {
    return this.api.getData<LexV2SourcesResult>('al', ['lex', 'v2', 'sources']);
  }

  getV2Roots(opts: { source?: string; prefix?: string; page?: number; limit?: number } = {}):
    Observable<LexV2RootsResult> {
    let p = new HttpParams();
    if (opts.source) p = p.set('source', opts.source);
    if (opts.prefix) p = p.set('prefix', opts.prefix);
    if (opts.page)   p = p.set('page', String(opts.page));
    if (opts.limit)  p = p.set('limit', String(opts.limit));
    return this.api.getData<LexV2RootsResult>('al', ['lex', 'v2', 'roots'], { params: p });
  }

  getV2RootCompare(root_norm: string): Observable<LexV2RootCompare> {
    return this.api.getData<LexV2RootCompare>('al', ['lex', 'v2', 'roots', root_norm]);
  }

  getV2Entry(source_slug: string, root_norm: string): Observable<LexV2EntryDetail> {
    return this.api.getData<LexV2EntryDetail>('al', ['lex', 'v2', 'entry', source_slug, root_norm]);
  }

  // ── Mufradat-specific reader endpoint ────────────────────────────────────
  // Mufradat (al-Raghib) has its own composer that fills inline Quran refs,
  // tokenizes footnote markers, and tags paragraph kinds. Other lexicons
  // will get their own /read/<slug> endpoints — this one is independent.

  getMufradatRead(root_norm: string): Observable<MufradatReadView> {
    return this.api.getData<MufradatReadView>(
      'al',
      ['lex', 'v2', 'read', 'ketabonline_al_raghib_mufradat', root_norm],
    );
  }

  // ── Lisan al-Arab (Ibn Manzur) reader endpoint ──────────────────────────
  // Composer extracts `[[…]]` inline footnotes, reads pre-populated
  // ar_ling_lexicon_quran_refs (878 rows resolved offline via 5-gram
  // matching), validates noisy poetry/hadith block typing, and tags
  // classical authority mentions.
  getLisanRead(root_norm: string): Observable<LisanReadView> {
    return this.getClassicalRead('ketabonline_ibn_manzur_lisan_al_arab', root_norm);
  }

  // ── Generic classical-lexicon reader ───────────────────────────────────
  // Serves any source that's registered in the backend's
  // SOURCE_CONFIGS table (Lisan, al-Sihah, al-Khalil, Maqayis, Ubab).
  // Response shape is identical for each, so one front-end shell can
  // render them all.
  getClassicalRead(source_slug: string, root_norm: string): Observable<LisanReadView> {
    return this.api.getData<LisanReadView>(
      'al',
      ['lex', 'v2', 'read', source_slug, root_norm],
    );
  }

  // ── Lane reader (bilingual XML scholar format) ──────────────────────
  // Lane's data is structurally different — verb-form-keyed sections,
  // English/Arabic interleaved prose, scholarly sigla, authority links.
  // The composer parses Lane's `definition` blocks into bilingual token
  // streams. Returns LaneReadView which has its own UI shell.
  getLaneRead(root_norm: string): Observable<LaneReadView> {
    return this.api.getData<LaneReadView>(
      'al', ['lex', 'v2', 'read', 'lane_lexicon', root_norm],
    );
  }

  searchV2(q: string, mode: 'root' | 'word' | 'fts' = 'root',
           opts: { sources?: string[]; limit?: number } = {}):
    Observable<LexV2SearchResult> {
    let p = new HttpParams().set('q', q).set('mode', mode);
    if (opts.sources?.length) p = p.set('sources', opts.sources.join(','));
    if (opts.limit) p = p.set('limit', String(opts.limit));
    return this.api.getData<LexV2SearchResult>('al', ['lex', 'v2', 'search'], { params: p });
  }

  // ── Academic scholarship (Al-Jallad, epigraphic, comparative-Semitic) ──
  // Lives in `ar_ling_root_scholarship` — distinct from the classical
  // lexicon corpus. Surfaced on the hub as an "Academic readings"
  // section, beside the classical lit-up cards.
  getScholarshipSources(): Observable<{ sources: ScholarshipSource[]; total: number }> {
    return this.api.getData('al', ['scholarship', 'sources']);
  }
  getRootScholarship(root_norm: string): Observable<RootScholarshipResult> {
    return this.api.getData<RootScholarshipResult>(
      'al', ['scholarship', 'root', root_norm],
    );
  }
}

// ─── v2 result types ─────────────────────────────────────────────────────────

export interface LexV2SourceMeta {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  period: string;
  origin: 'thahabi' | 'ketabonline' | 'saaid' | 'qomra' | 'lane';
  bilingual?: boolean;
  roots: number;
}

export interface LexV2SourcesResult { sources: LexV2SourceMeta[]; total: number; }

export interface LexV2RootRow {
  id: string;
  source_slug: string;
  root_text: string;
  root_norm: string;
  root_id: string | null;
  page_start: number | null;
  page_end: number | null;
  volume_no: number | null;
}

export interface LexV2RootsResult {
  rows: LexV2RootRow[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface LexV2RootCompare {
  root_norm: string;
  canonical: {
    id: string; root_text: string; root_letters: string;
    root_type: string; frequency_quran: number | null; meaning_core_en: string | null;
  } | null;
  sources: (LexV2RootRow & LexV2SourceMeta & {
    sections: number; blocks: number; quran_refs: number;
  })[];
}

export interface LexV2Block {
  id: string;
  section_id: string | null;
  book_page_id: string | null;
  parent_block_id: string | null;
  block_path: string;
  block_seq: number;
  depth: number;
  block_type: string;  // root_header | definition | quran_quote | hadith_quote | poetry_quote | chapter_header | footnote | …
  lang: string | null;
  title_ar: string | null;
  text_plain: string | null;
  text_html: string | null;
  data_json: string;   // JSON string
  origin: string;
  origin_ref: string | null;
  printed_page: number | null;
}

export interface LexV2SectionBody {
  text: string;
  paragraphs: string[];
  footnote_refs: number[];
}

export interface LexV2Section {
  id: string;
  section_seq: number;
  heading_ar: string | null;
  heading_norm: string | null;
  heading_bare: string | null;
  section_type: string;
  text_ar: string | null;
  page_no: number | null;
  source_native_section_id: string | null;
  body?: LexV2SectionBody;
}

export interface LexV2Footnote {
  num: number;
  text: string;
  block_id: string;
  section_id: string | null;
}

export interface LexV2Link {
  id: string;
  from_block_id: string;
  link_kind: string; // quran_ayah | footnote | cross_ref_reverse | …
  to_root_norm: string | null;
  to_surah: number | null;
  to_ayah: number | null;
  to_ayah_to: number | null;
  to_block_id: string | null;
  to_url: string | null;
  label: string | null;
  weight: number | null;
  position_offset: number | null;
}

export interface LexV2Tag { block_id: string; tag: string; source: string; weight: number; }

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
    root_type: string; weak_pattern: string | null;
    frequency_quran: number | null; frequency_hadith: number | null;
    meaning_core_en: string | null;
  } | null;
  sections: LexV2Section[];
  blocks: LexV2Block[];
  links: LexV2Link[];
  tags: LexV2Tag[];
  quran_refs: LexV2QuranRef[];
  footnotes?: LexV2Footnote[];
  sources_of_entry: {
    id: string; source_kind: string; source_native_id: string | null; source_url: string | null;
  }[];
  stats: {
    sections: number; blocks: number; links: number; tags: number; quran_refs: number;
    footnotes?: number;
  };
}

export interface LexV2SearchHit {
  id?: string; section_id?: string;
  source_slug: string;
  root_text: string;
  root_norm: string;
  section_seq?: number;
  heading_ar?: string | null;
  page_no?: number | null;
  page_start?: number | null;
  preview?: string;
  snippet?: string;
  meta: LexV2SourceMeta;
}

export interface LexV2SearchResult {
  results: LexV2SearchHit[];
  total: number;
  mode: 'root' | 'word' | 'fts';
  q: string;
}

// ─── Mufradat (al-Raghib) reader types ───────────────────────────────────────
// Independent shape — produced by the worker's per-source composer at
// /al/lex/v2/read/ketabonline_al_raghib_mufradat/:root_norm

export type MufradatProseToken =
  | { kind: 'text'; value: string }
  | {
      kind: 'quran';
      surah: string;
      surah_num: number | null;
      ayah: number;
      ayah_to: number | null;
      raw: string;
    }
  | {
      kind: 'footnote';
      num: number;
      has_text: boolean;
      text: string | null;
      printed_page: number | null;
    }
  | { kind: 'paren_quote'; value: string }
  | { kind: 'br' };

export type MufradatParagraph =
  | { kind: 'prose';        tokens: MufradatProseToken[] }
  | { kind: 'poetry';       cue: string | null; verses: string[]; attribution: string | null }
  | { kind: 'hadith';       cue: string | null; tokens: MufradatProseToken[] }
  | { kind: 'qira_variant'; reader: string | null; tokens: MufradatProseToken[] }
  | { kind: 'editorial';    tokens: MufradatProseToken[] };

export interface MufradatSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: MufradatParagraph[];
}

export interface MufradatReadView {
  kind: 'mufradat';
  meta: {
    slug: 'ketabonline_al_raghib_mufradat';
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: 'ketabonline';
  };
  entry: {
    id: string;
    root_text: string;
    root_norm: string;
    page_start: number | null;
    page_end: number | null;
    volume_no: number | null;
    source_url: string | null;
    source_native_id: string | null;
  };
  canonical: {
    id: string;
    root_text: string;
    root_letters: string;
    root_type: string;
    frequency_quran: number | null;
    meaning_core_en: string | null;
  } | null;
  sections: MufradatSection[];
  footnotes: { num: number; text: string | null; printed_page: number | null }[];
  quran_citations: {
    surah: string;
    surah_num: number | null;
    ayah: number;
    ayah_to: number | null;
    raw: string;
    count: number;
  }[];
  stats: {
    paragraphs: number;
    poetry: number;
    hadith: number;
    qira_variants: number;
    quran_citations: number;
    footnote_markers: number;
  };
}

// ─── Lisan al-Arab (Ibn Manzur) reader types ─────────────────────────────────
// Shape mirrors MufradatReadView for UI reuse, but:
//   ▸ Footnote tokens carry an optional `pivot` (the lemma the editor's
//     marginal note annotates).
//   ▸ Quran tokens are resolved (surah,ayah) — no surah-name string.
//   ▸ New `authority` token tags inline scholar mentions.
//   ▸ Three additional panel arrays: hadith_quotes, poetry_shawahid,
//     authorities.

export type LisanAuthorityKind =
  | 'lexicographer' | 'grammarian' | 'quran_reader'
  | 'hadith_scholar' | 'companion' | 'tabii' | 'poet' | 'prophet';

export type LisanProseToken =
  | { kind: 'text';      value: string }
  | { kind: 'footnote';  num: number; has_text: boolean; text: string | null; pivot: string | null }
  | { kind: 'quran';     surah: number | null; ayah: number | null; raw: string }
  | { kind: 'authority'; name: string; label: string; authority_kind: LisanAuthorityKind }
  | { kind: 'br' };

export type LisanParagraph =
  | { kind: 'prose';  tokens: LisanProseToken[] }
  | { kind: 'quran';  verse_text: string; surah: number | null; ayah: number | null;
                      tokens: LisanProseToken[] }
  | { kind: 'hadith'; cue: string | null; tokens: LisanProseToken[] }
  | { kind: 'poetry'; cue: string | null; verses: string[]; attribution: string | null };

export interface LisanSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: LisanParagraph[];
}

export interface LisanReadView {
  kind: 'lisan';
  meta: {
    slug: 'ketabonline_ibn_manzur_lisan_al_arab';
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: 'ketabonline';
  };
  entry: {
    id: string;
    root_text: string;
    root_norm: string;
    page_start: number | null;
    page_end: number | null;
    volume_no: number | null;
    source_url: string | null;
    source_native_id: string | null;
  };
  canonical: {
    id: string;
    root_text: string;
    root_letters: string;
    root_type: string;
    frequency_quran: number | null;
    meaning_core_en: string | null;
  } | null;
  sections: LisanSection[];
  footnotes: { num: number; text: string; pivot: string | null }[];
  quran_citations: {
    surah: number;
    ayah: number;
    raw: string;
    context_snippet: string | null;
    count: number;
  }[];
  hadith_quotes:    { id: string; text: string; cue: string | null; page: number | null }[];
  poetry_shawahid:  { id: string; verses: string[]; attribution: string | null;
                      cue: string | null; page: number | null }[];
  authorities:      { name: string; name_label: string; kind: LisanAuthorityKind;
                      count: number; first_page: number | null }[];
  stats: {
    paragraphs: number;
    hadith: number;
    poetry: number;
    quran_citations: number;
    footnotes: number;
    authorities: number;
    authority_total: number;
  };
}

// ─── Lane (bilingual XML scholar format) reader types ────────────────────────
export type LaneToken =
  | { kind: 'text';       value: string }
  | { kind: 'arabic';     value: string }    // {...} brace form
  | { kind: 'headword';   value: string }    // text after ⇒
  | { kind: 'siglum';     code: string; name_en: string; name_ar: string; raw: string }
  | { kind: 'cross_ref';  target: string }
  | { kind: 'quran';      surah: number; ayah: number; raw: string }
  | { kind: 'figurative' }
  | { kind: 'br' };

export interface LaneSense {
  label: string | null;            // 'A', 'A1', 'B', etc.
  kind: 'signification' | 'dissociation' | 'plain' | null;
  tokens: LaneToken[];
}

export interface LaneVerbForm {
  section_id: string;
  form_num: number | null;
  form_label_ar: string | null;
  page_no: number | null;
  header_tokens: LaneToken[];
  senses: LaneSense[];
}

export interface LaneReadView {
  kind: 'lane';
  meta: {
    slug: 'lane_lexicon';
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: 'lane';
    bilingual: true;
  };
  entry: {
    id: string;
    root_text: string;
    root_norm: string;
    page_start: number | null;
    page_end: number | null;
    volume_no: number | null;
    source_url: string | null;
    source_native_id: string | null;
  };
  canonical: unknown | null;
  forms: LaneVerbForm[];
  authorities: {
    code: string; name_en: string; name_ar: string; count: number;
  }[];
  quran_citations: {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }[];
  cross_refs: { target: string; count: number }[];
  stats: {
    forms: number;
    senses: number;
    authorities: number;
    authority_total: number;
    quran_citations: number;
    cross_refs: number;
  };
}

// ─── Scholarship — academic notes on roots (Al-Jallad et al.) ────────────────

export interface ScholarshipSource {
  id:          string;
  title_ar:    string;
  title_en:    string;
  author:      string;
  year:        number | null;
  genre:       string;                         // qur_anic_hermeneutic | epigraphic | …
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
