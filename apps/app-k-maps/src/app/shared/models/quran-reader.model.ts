export interface QuranSurahMetaSummary {
  name_simple: string | null;
  revelation_place: string | null;
  revelation_order: number | null;
  bismillah_pre: boolean | null;
}

export interface QuranBrowseSurah {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
  start_page: number | null;
  start_juz: number | null;
  meta: QuranSurahMetaSummary;
}

export interface QuranBrowseJuz {
  juz: number;
  start_page: number | null;
  end_page: number | null;
  ayah_count: number;
  surahs: QuranBrowseSurah[];
}

export interface QuranMenuResponse {
  ok: boolean;
  stats: {
    total_pages: number;
    total_surahs: number;
    total_juzs: number;
  };
  surahs: QuranBrowseSurah[];
  juzs: QuranBrowseJuz[];
}

export interface QuranRecentPageEntry {
  page: number;
  surah: number | null;
  name_en: string | null;
  name_ar: string | null;
  juz: number | null;
  seen_at: string;
}

export interface QuranPageWord {
  position: number;
  text: string | null;
  simple: string | null;
  translation: string | null;
  lemma: string | null;
  root: string | null;
  page: number | null;
  line: number | null;
}

export interface QuranPageVerse {
  id: number;
  surah: number;
  ayah: number;
  surah_ayah: number;
  verse_key: string;
  page: number | null;
  juz: number | null;
  hizb: number | null;
  ruku: number | null;
  text: string;
  text_simple: string | null;
  verse_mark: string | null;
  verse_full: string | null;
  word_count: number | null;
  char_count: number | null;
  translation: string | null;
  words: QuranPageWord[];
}

export type QuranPageLayoutLineType = 'ayah' | 'surah_name' | 'basmallah';

export interface QuranPageLayoutLine {
  line_number: number;
  line_type: QuranPageLayoutLineType;
  is_centered: boolean;
  surah_number: number | null;
  text: string;
  text_simple: string | null;
}

export interface QuranPageMeta {
  number: number;
  prev_page: number | null;
  next_page: number | null;
  verse_count: number;
  start_ref: string;
  end_ref: string;
  juzs: number[];
  hizbs: number[];
}

export interface QuranPageResponse {
  ok: boolean;
  page: QuranPageMeta;
  surahs: QuranBrowseSurah[];
  verses: QuranPageVerse[];
  layout_lines: QuranPageLayoutLine[];
}
