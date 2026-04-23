// ─── Page schemas & types ─────────────────────────────────────────────────────

export type QrPageLineKind = 'ayah' | 'surah_name' | 'basmallah';

export const QR_MIN_PAGE = 1;
export const QR_MAX_PAGE = 604;
export const QR_MIN_SURAH = 1;
export const QR_MAX_SURAH = 114;

export interface QrPageAyah {
  surah: number;
  ayah: number;
  verse_key: string;
  text_arabic: string;
  verse_mark: string | null;
  translation: string | null;
  words: QrPageWord[];
}

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

export interface QrPageSurah {
  id: number;
  name_ar: string;
  name_en: string;
  name_transliteration: string;
  revelation_type: string;
  ayah_count: number;
  juz_start: number | null;
  page_start: number | null;
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
  text_arabic: string;
  text_clean: string | null;
  ayahs: QrPageLayoutAyah[];
}

export interface QrPageMeta {
  number: number;
  prev_page: number | null;
  next_page: number | null;
  ayah_count: number;
  start_ref: string;
  end_ref: string;
}

export interface QrPage {
  page: QrPageMeta;
  ayahs: QrPageAyah[];
  surahs: QrPageSurah[];
  layout_lines: QrPageLayoutLine[];
}

export interface QrPageParams {
  page: number;
}

export interface QrSurahPagesParams {
  surah_id: number;
}

export interface QrSurahPages {
  surah_id: number;
  pages: number[];
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function validateQrPageParams(value: unknown): SchemaValidationResult<QrPageParams> {
  const page = parsePositiveInt(value);
  if (page === null || page < QR_MIN_PAGE || page > QR_MAX_PAGE) {
    return { error: `page must be an integer between ${QR_MIN_PAGE} and ${QR_MAX_PAGE}` };
  }
  return { data: { page } };
}

export function validateQrSurahPagesParams(
  value: unknown,
): SchemaValidationResult<QrSurahPagesParams> {
  const surahId = parsePositiveInt(value);
  if (surahId === null || surahId < QR_MIN_SURAH || surahId > QR_MAX_SURAH) {
    return { error: `surah id must be between ${QR_MIN_SURAH} and ${QR_MAX_SURAH}` };
  }
  return { data: { surah_id: surahId } };
}
