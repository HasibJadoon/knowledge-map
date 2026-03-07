import { QuranBrowseSurah, QuranLayoutLineType } from '../../../shared/models/quran-reader.model';

export interface QuranReaderPageHeaderViewModel {
  title: string;
  arabicTitle: string | null;
  subtitle: string;
}

export interface QuranReaderPageMetaViewModel {
  pageNumber: number;
  totalPages: number;
  pageLabel: string;
  prevPage: number | null;
  nextPage: number | null;
  verseCount: number;
  startRef: string;
  endRef: string;
  referenceLabel: string;
  footerLabel: string | null;
}

export interface QuranReaderPageLineViewModel {
  id: string;
  slot: number;
  text: string;
  textDiacritics: string;
  lineType: QuranLayoutLineType | 'fallback';
  isCentered: boolean;
  ayahs: QuranReaderPageAyahSliceViewModel[];
}

export interface QuranReaderPageAyahSliceViewModel {
  verseKey: string;
  text: string;
  textDiacritics: string;
  marker: string | null;
  isComplete: boolean;
  words: QuranReaderWordViewModel[];
}

export interface QuranReaderLayoutSlotViewModel {
  slot: number;
  line: QuranReaderPageLineViewModel | null;
}

export interface QuranReaderFallbackVerseViewModel {
  id: number;
  verseKey: string;
  text: string;
  textDiacritics: string;
  marker: string | null;
  words: QuranReaderWordViewModel[];
}

export interface QuranReaderWordViewModel {
  id: string;
  tokenIndex: number;
  text: string;
  textDiacritics: string;
}

export interface QuranReaderPageLayoutViewModel {
  hasStructuredLines: boolean;
  slotCount: number;
  slots: QuranReaderLayoutSlotViewModel[];
}

export interface QuranReaderPageViewModel {
  header: QuranReaderPageHeaderViewModel;
  meta: QuranReaderPageMetaViewModel;
  surahs: QuranBrowseSurah[];
  primarySurah: QuranBrowseSurah | null;
  layout: QuranReaderPageLayoutViewModel;
  fallbackVerses: QuranReaderFallbackVerseViewModel[];
}
