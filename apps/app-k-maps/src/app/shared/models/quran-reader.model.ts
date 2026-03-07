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

export interface QuranPageWord {
  word_id: number | null;
  surah: number;
  ayah: number;
  position: number;
  text: string | null;
  simple: string | null;
  translation: string | null;
  lemma: string | null;
  root: string | null;
  page: number | null;
  line: number | null;
}

export interface QuranPageAyahSlice {
  surah: number;
  ayah: number;
  verse_key: string;
  marker: string | null;
  is_complete: boolean;
  words: QuranPageWord[];
}

export interface QuranLayoutLine {
  line_number: number;
  line_type: 'ayah' | 'surah_name' | 'basmallah';
  is_centered: boolean;
  surah_number: number | null;
  text: string;
  text_simple: string | null;
  ayahs: QuranPageAyahSlice[];
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
  text_diacritics: string;
  text_no_diacritics: string | null;
  verse_mark: string | null;
  verse_full: string | null;
  word_count: number | null;
  char_count: number | null;
  translation: string | null;
  words: QuranPageWord[];
}

export interface QuranReaderPageData {
  page: {
    number: number;
    prev_page: number | null;
    next_page: number | null;
    verse_count: number;
    start_ref: string;
    end_ref: string;
    juzs: number[];
    hizbs: number[];
  };
  verses: QuranPageVerse[];
  layout_lines: QuranLayoutLine[];
}

export interface QuranReaderSurah extends QuranBrowseSurah {
  end_page: number | null;
}

export interface QuranSurahReaderResponse {
  ok: boolean;
  surah: QuranReaderSurah;
  stats: {
    total_pages: number;
    page_count: number;
  };
  pages: QuranReaderPageData[];
}
