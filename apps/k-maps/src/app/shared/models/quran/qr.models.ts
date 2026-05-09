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
