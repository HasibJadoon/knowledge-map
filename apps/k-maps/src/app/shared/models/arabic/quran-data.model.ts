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
  id?: number;
  surah: number;
  ayah: number;
  surah_ayah: number;
  verse_key?: string;
  verse_number?: number;
  chapter_id?: number;
  page?: number | null;
  page_number?: number | null;
  juz?: number | null;
  juz_number?: number | null;
  hizb?: number | null;
  hizb_number?: number | null;
  ruku?: number | null;
  ruku_number?: number | null;
  text: string;
  text_uthmani?: string | null;
  text_simple?: string | null;
  text_imlaei_simple?: string | null;
  text_normalized?: string | null;
  verse_mark?: string | null;
  verse_full?: string | null;
  word_count?: number | null;
  char_count?: number | null;
  surah_name_ar?: string | null;
  surah_name_en?: string | null;
  translation?: string | null;
  translations?: QuranAyahTranslations | null;
  lemmas?: QuranLemmaLocation[];
  words?: QuranAyahWord[];
}

export interface QuranAyahListResponse {
  ok: boolean;
  surah?: QuranSurah;
  translation_source?: QuranTranslationSource | null;
  translation_passages?: QuranTranslationPassage[];
  total: number;
  page: number;
  pageSize: number;
  results?: QuranAyah[];
  verses?: QuranAyah[];
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
  words_count?: number | null;
  uniq_words_count?: number | null;
  word_location: string;
  surah: number;
  ayah: number;
  token_index: number;
  word_simple?: string | null;
  word_diacritic?: string | null;
  ar_u_token?: string | null;
  ar_token_occ_id?: string | null;
}

export interface QuranLemmaLocationUpsert {
  id?: number | null;
  lemma_id?: number | null;
  lemma_text?: string | null;
  lemma_text_clean?: string | null;
  words_count?: number | null;
  uniq_words_count?: number | null;
  primary_ar_u_token?: string | null;
  word_location?: string | null;
  surah: number;
  ayah: number;
  token_index: number;
  word_simple?: string | null;
  word_diacritic?: string | null;
  ar_u_token?: string | null;
  ar_token_occ_id?: string | null;
}

export interface QuranLemmaLocationUpsertResponse {
  ok: boolean;
  results?: QuranLemmaLocation[];
  error?: string;
}

export interface QuranAyahTranslations {
  haleem?: string | null;
  footnotes_haleem?: unknown;
  asad?: string | null;
  sahih?: string | null;
  usmani?: string | null;
  footnotes_sahih?: string | null;
  footnotes_usmani?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface QuranTranslationSource {
  source_key: string;
  title: string;
  translator?: string | null;
  language?: string | null;
  publisher?: string | null;
  year?: number | null;
  isbn?: string | null;
  edition?: string | null;
  rights?: string | null;
  source_path?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface QuranTranslationPassage {
  id: number;
  source_key: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_index: number;
  page_pdf?: number | null;
  page_book?: number | null;
  text?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface QuranAyahWord {
  id?: number;
  position?: number;
  location?: string | null;
  word_location?: string | null;
  token_index?: number;
  text_uthmani?: string | null;
  text_imlaei_simple?: string | null;
  lemma_id?: number;
  lemma_text?: string | null;
  lemma_text_clean?: string | null;
  words_count?: number | null;
  uniq_words_count?: number | null;
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
