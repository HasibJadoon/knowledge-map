export const QR_MUSHAF_DEFAULT_LAYOUT = 'qpc-v2-15-lines';
export const QR_MUSHAF_MIN_PAGE = 1;
export const QR_MUSHAF_MAX_PAGE = 604;

export type QrMushafLineKind = 'ayah' | 'surah_name' | 'basmallah';

export interface QrMushafToken {
  token_id: number;
  char_type: 'word' | 'end';
  surah: number;
  ayah: number;
  position: number;
  text_qpc_hafs: string;
}

export interface QrMushafLineAyah {
  surah: number;
  ayah: number;
  verse_key: string;
  marker: string | null;
  words: Array<{
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
  }>;
}

export interface QrMushafLayoutLine {
  line_number: number;
  line_type: QrMushafLineKind;
  is_centered: boolean;
  surah_number: number | null;
  first_token_id: number | null;
  last_token_id: number | null;
  text_arabic: string;
  text_clean: string | null;
  ayahs: QrMushafLineAyah[];
}

export interface QrMushafPage {
  page: {
    number: number;
    prev_page: number | null;
    next_page: number | null;
    ayah_count: number;
    start_ref: string;
    end_ref: string;
  };
  layout: {
    key: string;
    source: string;
    lines_per_page: number;
  };
  surahs: Array<{
    id: number;
    name_ar: string;
    name_en: string | null;
    name_transliteration: string | null;
    revelation_type: string | null;
    ayah_count: number;
    juz_start: number | null;
    page_start: number | null;
  }>;
  ayahs: Array<{
    surah: number;
    ayah: number;
    verse_key: string;
    text_arabic: string;
    verse_mark: string | null;
    translation: string | null;
    words: QrMushafLineAyah['words'];
  }>;
  layout_lines: QrMushafLayoutLine[];
}
