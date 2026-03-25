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

export type QuranLessonTaskType =
  | 'reading'
  | 'sentence_structure'
  | 'morphology'
  | 'expressions'
  | 'comprehension'
  | 'passage_structure';

export type QuranLessonTaskCode = 'SS' | 'MOR' | 'EXP' | 'CMP' | 'PS';
export type QuranLessonTaskIdSegment = 'RDG' | QuranLessonTaskCode;

export const QURAN_CONTAINER_TYPE = 'quran';
export const QURAN_ID_NAMESPACE = 'QURAN';
export const QURAN_CONTAINER_ID = `C:${QURAN_ID_NAMESPACE}`;
export const QURAN_ID_NAMESPACE_BY_CONTAINER_TYPE: Readonly<Record<typeof QURAN_CONTAINER_TYPE, typeof QURAN_ID_NAMESPACE>> = {
  [QURAN_CONTAINER_TYPE]: QURAN_ID_NAMESPACE,
};

export const QURAN_LESSON_TASK_CODES: Readonly<Record<
  Exclude<QuranLessonTaskType, 'reading'>,
  QuranLessonTaskCode
>> = {
  sentence_structure: 'SS',
  morphology: 'MOR',
  expressions: 'EXP',
  comprehension: 'CMP',
  passage_structure: 'PS',
};

export const QURAN_LESSON_TASK_TYPES_BY_CODE: Readonly<Record<
  QuranLessonTaskCode,
  Exclude<QuranLessonTaskType, 'reading'>
>> = {
  SS: 'sentence_structure',
  MOR: 'morphology',
  EXP: 'expressions',
  CMP: 'comprehension',
  PS: 'passage_structure',
};

export const QURAN_LESSON_STEP_BASES: Readonly<Record<QuranLessonTaskType, number>> = {
  reading: 100,
  morphology: 200,
  sentence_structure: 300,
  expressions: 400,
  comprehension: 500,
  passage_structure: 600,
};

export function buildQuranTaskIdSegment(taskType: QuranLessonTaskType): QuranLessonTaskIdSegment {
  return taskType === 'reading' ? 'RDG' : QURAN_LESSON_TASK_CODES[taskType];
}

export function buildQuranSurahUnitId(surah: number): string {
  return `U:${QURAN_CONTAINER_ID}:${surah}`;
}

export function buildQuranPassageUnitId(surah: number, ayahFrom: number, ayahTo: number): string {
  const range = ayahFrom === ayahTo ? `${ayahFrom}` : `${ayahFrom}-${ayahTo}`;
  return `${buildQuranSurahUnitId(surah)}:${range}`;
}

export function resolveQuranIdNamespace(containerType: typeof QURAN_CONTAINER_TYPE = QURAN_CONTAINER_TYPE): string {
  return QURAN_ID_NAMESPACE_BY_CONTAINER_TYPE[containerType];
}

export function buildQuranTaskIdScope(
  surah: number,
  ayahFrom: number,
  ayahTo: number,
  containerType: typeof QURAN_CONTAINER_TYPE = QURAN_CONTAINER_TYPE,
): string {
  const range = ayahFrom === ayahTo ? `${ayahFrom}` : `${ayahFrom}-${ayahTo}`;
  return `C:${resolveQuranIdNamespace(containerType)}:${surah}:${range}`;
}

export function buildQuranRootTaskId(
  surah: number,
  ayahFrom: number,
  ayahTo: number,
  taskType: QuranLessonTaskType,
): string {
  return `UT:${buildQuranTaskIdScope(surah, ayahFrom, ayahTo)}:${buildQuranTaskIdSegment(taskType)}:${QURAN_LESSON_STEP_BASES[taskType]}`;
}

export function buildQuranChildTaskId(
  surah: number,
  ayahFrom: number,
  ayahTo: number,
  taskType: QuranLessonTaskType,
  childIndex: number,
): string {
  return `UT:${buildQuranTaskIdScope(surah, ayahFrom, ayahTo)}:${buildQuranTaskIdSegment(taskType)}:${QURAN_LESSON_STEP_BASES[taskType] + childIndex}`;
}
