export interface QuranLessonAyahUnit {
  unit_id: string;
  unit_type: 'ayah';
  arabic: string;
  translation: string | null;
  surah: number;
  ayah: number;
  notes: string | null;
}

export interface QuranLessonText {
  arabic_full: QuranLessonAyahUnit[];
  mode: 'original' | 'edited' | 'mixed';
}

export interface QuranLessonSentence {
  sentence_id: string;
  unit_id: string;
  arabic: string;
  translation: string | null;
  notes: string | null;
}

export interface QuranLessonComprehensionQuestion {
  question_id: string;
  question: string;
  question_ar?: string;
  quranic_ref?: string;
  answer_hint?: string;
  tags?: string[];
  linked_unit_ids?: string[];
  data?: Record<string, unknown>;
}

export interface QuranLessonMcqOption {
  option: string;
  is_correct: boolean;
}

export interface QuranLessonMcq {
  mcq_id: string;
  question: string;
  question_ar?: string;
  options: QuranLessonMcqOption[];
}

export interface QuranLessonComprehension {
  reflective?: QuranLessonComprehensionQuestion[];
  analytical?: QuranLessonComprehensionQuestion[];
  mcqs?: QuranLessonMcq[] | {
    text?: QuranLessonMcq[];
    vocabulary?: QuranLessonMcq[];
    grammar?: QuranLessonMcq[];
  };
}

export interface QuranLessonReference {
  surah?: number;
  ayah_from?: number;
  ayah_to?: number;
  ref_label?: string;
}

export interface QuranLesson {
  id: string;
  title: string;
  title_ar?: string;
  status?: string;
  difficulty?: number;
  lesson_type: 'quran';
  text: QuranLessonText;
  sentences: QuranLessonSentence[];
  comprehension?: QuranLessonComprehension;
  reference?: QuranLessonReference;
}
