import {
  AyahsResponse,
  PassagesResponse,
  QuranSurahListItemDto,
  TranslationPassage,
} from '../models/quran.models';
import {
  QrApiResponse,
  QrMenuSurah,
  QrPassage,
  QrReaderPayload,
} from '../models/qr.models';

export function qrMenuSurahToListItem(surah: QrMenuSurah): QuranSurahListItemDto {
  const transliteratedName = surah.name_transliteration ?? surah.name_en ?? `Surah ${surah.id}`;
  return {
    id: String(surah.id),
    surahNumber: surah.id,
    slug: slugify(transliteratedName),
    arabicName: surah.name_ar,
    transliteratedName,
    englishName: surah.name_en ?? transliteratedName,
    ayahCount: surah.ayah_count,
    revelationType: normalizeRevelationType(surah.revelation_type),
    juz: surah.juz_start,
  };
}

export function qrReaderToAyahsResponse(
  reader: QrApiResponse<QrReaderPayload>,
  passages: PassagesResponse,
): AyahsResponse {
  const data = reader.data;
  return {
    ok: reader.ok,
    surah: {
      surah: data.surah.id,
      name_ar: data.surah.name_ar,
      name_en: data.surah.name_en,
      ayah_count: data.surah.ayah_count,
    },
    translation_passages: passages.passages,
    total: data.meta.total,
    page: data.meta.page,
    pageSize: data.meta.per_page,
    results: data.ayahs.map((ayah) => ({
      surah: ayah.surah,
      ayah: ayah.ayah,
      text: ayah.text,
      text_uthmani: ayah.text_uthmani,
      text_uthmani_clean: ayah.text_uthmani_clean ?? ayah.text_uthmani,
      text_bare: ayah.text_bare,
      verse_mark: ayah.verse_mark,
      translation: ayah.translation,
      page_number: ayah.page_number,
      juz_number: ayah.juz,
    })),
  };
}

export function qrPassagesToResponse(
  qrPassages: QrPassage[],
  passageIndex?: number,
): PassagesResponse {
  const passages = qrPassages.map(qrPassageToTranslationPassage);
  const passage = passageIndex === undefined
    ? null
    : passages.find((p) => p.passage_index === passageIndex) ?? null;

  return {
    ok: true,
    passages,
    passage,
  };
}

function qrPassageToTranslationPassage(passage: QrPassage): TranslationPassage {
  return {
    id: Number(String(passage.id).replace(/\D/g, '').slice(-9)) || passage.passage_index,
    source_key: 'qr_surah_passages',
    surah: passage.surah,
    ayah_from: passage.ayah_from,
    ayah_to: passage.ayah_to,
    passage_index: passage.passage_index,
    page_pdf: null,
    page_book: null,
    text: passage.title ?? passage.theme ?? `Ayahs ${passage.ayah_from}-${passage.ayah_to}`,
  };
}

function normalizeRevelationType(value: string | null): 'makki' | 'madani' | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'makki' || normalized === 'meccan') return 'makki';
  if (normalized === 'madani' || normalized === 'medinan') return 'madani';
  return null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
