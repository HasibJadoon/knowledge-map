import { QuranLesson, QuranLessonTokenV2 } from "../../../../shared/models/arabic/quran-lesson.model";
import { DRAFT_KEY_PREFIX, DRAFT_ID_KEY_PREFIX } from "./edit/state/builder-tabs.const";

export const composeContainerId = (_surah: number) => `C:QURAN`;
export const composePassageUnitId = (surah: number, ayahFrom: number, ayahTo: number) =>
  `U:C:QURAN:${surah}:${ayahFrom}-${ayahTo}`;
export const composeAyahUnitId = (surah: number, ayah: number) =>
  `U:C:QURAN:${surah}:${ayah}`;

export const hasMorphFeatures = (features: Record<string, unknown> | null | undefined) => {
  if (!features) return false;
  const keys = ['status', 'number', 'gender', 'type', 'tense', 'mood', 'voice', 'person'];
  return keys.some((k) => typeof (features as any)[k] === 'string' && String((features as any)[k]).trim());
};

export const saveDraftSnapshot = (lessonId: string, snapshot: unknown) => {
  localStorage.setItem(`${DRAFT_KEY_PREFIX}:${lessonId}`, JSON.stringify(snapshot));
  localStorage.setItem(`${DRAFT_ID_KEY_PREFIX}:${lessonId}`, String(Date.now()));
};

export const restoreDraftSnapshot = <T = any>(lessonId: string): T | null => {
  const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}:${lessonId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const clearDraftSnapshot = (lessonId: string) => {
  localStorage.removeItem(`${DRAFT_KEY_PREFIX}:${lessonId}`);
  localStorage.removeItem(`${DRAFT_ID_KEY_PREFIX}:${lessonId}`);
};

export const computeWorkflowHealth = (args: {
  title: string | null | undefined;
  versesCount: number;
  hasPassageUnit: boolean;
  verseUnitRowCount: number;
  verseUnitsAttachedCount: number;
  tokens: QuranLessonTokenV2[];
  spansCount: number;
  sentencesCount: number;
  grammarLinkCount: number;
  sentenceTreeCount: number;
  contentCount: number;
}) => {
  const morphTargets = args.tokens.filter((t) => t.pos === 'noun' || t.pos === 'verb');
  const morphologyOk = morphTargets.length === 0 ? true : morphTargets.some((t) => hasMorphFeatures(t.features));

  return {
    titleOk: !!args.title?.trim(),
    versesOk: args.versesCount > 0,
    passageOk: args.hasPassageUnit,
    unitsOk: args.verseUnitRowCount > 0 && args.verseUnitsAttachedCount === args.verseUnitRowCount,
    tokensOk: args.tokens.length > 0,
    morphologyOk,
    spansOk: args.spansCount > 0,
    sentencesOk: args.sentencesCount > 0,
    grammarOk: args.grammarLinkCount > 0,
    treeOk: args.sentenceTreeCount > 0,
    contentOk: args.contentCount > 0,
  };
};

export const clampNumber = (value: any, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
};

export const buildAyahRange = (from: number, to: number) => {
  const start = Math.max(1, Math.min(from, to));
  const end = Math.max(start, Math.max(from, to));
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

export const parseAyahRange = (value: string | null | undefined) => {
  if (!value) return null;
  const match = String(value).match(/(\d{1,3})\s*[:._-]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/);
  if (!match) return null;
  const surah = Number(match[1]);
  const ayahFrom = Number(match[2]);
  const ayahTo = match[3] ? Number(match[3]) : ayahFrom;
  if (!Number.isFinite(surah) || !Number.isFinite(ayahFrom)) return null;
  return { surah, ayahFrom, ayahTo };
};

export const parseWordLocationIndex = (value: string | null | undefined) => {
  if (!value) return null;
  const match = String(value).match(/(\d{1,3})\s*[:._-]\s*(\d{1,3})\s*[:._-]\s*(\d{1,3})/);
  if (!match) return null;
  const tokenIndex = Number(match[3]);
  return Number.isFinite(tokenIndex) ? tokenIndex : null;
};

export const parseRefPart = (ref: string | null, index: number): number | null => {
  if (!ref) return null;
  const parts = ref.split(':');
  if (parts.length <= index) return null;
  const value = Number.parseInt(parts[index], 10);
  return Number.isFinite(value) ? value : null;
};

export const buildDraftJson = (lesson: QuranLesson, extras: any) => {
  const lessonAny = lesson as any;
  const notesValue = lessonAny['notes'] ?? lessonAny._notes ?? [];

  return {
    schema_version: 1,
    meta: {
      title: lesson.title ?? '',
      title_ar: lesson.title_ar ?? null,
      lesson_type: lesson.lesson_type ?? 'quran',
      subtype: lesson.subtype ?? null,
      difficulty: lesson.difficulty ?? null,
      source: lesson.source ?? null,
    },
    reference: lesson.reference ?? {},
    units: lesson.units ?? [],
    sentences: lesson.sentences ?? [],
    comprehension: lessonAny.comprehension ?? {},
    notes: notesValue ?? [],
    text: lesson.text ?? null,
    analysis: lessonAny.analysis ?? null,
    builder_extras: extras ?? null,
  };
};
