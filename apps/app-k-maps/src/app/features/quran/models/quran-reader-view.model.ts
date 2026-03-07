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
  lineType: QuranLayoutLineType | 'fallback';
  isCentered: boolean;
}

export interface QuranReaderLayoutSlotViewModel {
  slot: number;
  line: QuranReaderPageLineViewModel | null;
}

export interface QuranReaderFallbackVerseViewModel {
  id: number;
  verseKey: string;
  text: string;
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
