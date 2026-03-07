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
