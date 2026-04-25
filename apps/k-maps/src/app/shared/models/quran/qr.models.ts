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
