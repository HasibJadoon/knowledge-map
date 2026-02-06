export interface QuranSurah {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
  meta: Record<string, unknown>;
}

export interface QuranSurahListResponse {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  results: QuranSurah[];
}

export interface QuranAyah {
  surah: number;
  ayah: number;
  surah_ayah: number;
  text: string;
  text_simple?: string | null;
  text_normalized?: string | null;
  verse_mark?: string | null;
  verse_full?: string | null;
  word_count?: number | null;
  char_count?: number | null;
  surah_name_ar?: string | null;
  surah_name_en?: string | null;
}

export interface QuranAyahListResponse {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  results: QuranAyah[];
}

export interface QuranLemma {
  lemma_id: number;
  lemma_text: string;
  lemma_text_clean: string;
  words_count: number | null;
  uniq_words_count: number | null;
  primary_ar_u_token: string | null;
}

export interface QuranLemmaListResponse {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  results: QuranLemma[];
}

export interface QuranLemmaLocation {
  id: number;
  lemma_id: number;
  lemma_text?: string | null;
  lemma_text_clean?: string | null;
  word_location: string;
  surah: number;
  ayah: number;
  token_index: number;
  word_simple?: string | null;
  word_diacritic?: string | null;
  ar_u_token?: string | null;
  ar_token_occ_id?: string | null;
}

export interface QuranLemmaLocationListResponse {
  ok: boolean;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  results: QuranLemmaLocation[];
}
