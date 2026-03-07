export type QuranSurahNotesMode = 'draft' | 'flag' | 'published';

export type QuranSurahNoteTargetType = 'quran_ayah' | 'quran_word';

export type QuranSurahNoteStatus = 'inbox' | 'archived';

export interface QuranSurahNotesSurah {
  surah: number;
  name_ar: string;
  name_en: string;
  name_simple: string;
}

export interface QuranSurahTargetNote {
  id: string;
  user_id: number;
  status: QuranSurahNoteStatus;
  body_md: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  target_type: QuranSurahNoteTargetType;
  target_id: string;
  ref: string | null;
  ayah: number;
  word_index: number | null;
}

export interface QuranSurahNotesVerse {
  ayah: number;
  verseKey: string;
  text: string;
  notes: QuranSurahTargetNote[];
}

export interface QuranSurahNotesResponse {
  ok: boolean;
  mode: QuranSurahNotesMode;
  surah: QuranSurahNotesSurah;
  verses: QuranSurahNotesVerse[];
}
