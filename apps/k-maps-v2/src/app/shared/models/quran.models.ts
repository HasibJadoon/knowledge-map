export interface QuranSurahListItemDto {
  id: string;
  surahNumber: number;
  slug: string;
  arabicName: string;
  transliteratedName: string;
  englishName: string;
  ayahCount: number;
  revelationType: 'makki' | 'madani' | null;
  juz: number | null;
}

export interface SurahListResponse {
  ok: boolean;
  surahs: QuranSurahListItemDto[];
}
