export type SplitMode = 'ayah' | 'sentence';

export interface AyahUnit {
  unit_id: string;
  unit_type: 'ayah';
  arabic: string;
  translation: null;
  surah: number;
  ayah: number;
  notes: null;
}

export type SplitStats = {
  cleaned_length: number;
  used_markers: boolean;
  marker_count: number;
  unit_count: number;
  warnings: string[];
};

export type SplitResult =
  | { ok: true; mode: 'ayah'; units: AyahUnit[]; stats: SplitStats }
  | { ok: false; error: string; cleaned: string; stats: SplitStats };

export type BuildSeedOptions = {
  surah?: number;
  mode?: SplitMode;
  lessonType?: string;
  subtype?: string;
  lessonId?: string;
  title?: string;
  status?: 'draft' | 'active' | 'reviewed' | 'archived';
  difficulty?: number;
  referenceLabel?: string;
  citation?: string;
  sourceType?: string;
  sourceRefId?: string;
};

export function splitArabicTextToUnits(params: {
  arabicText: string;
  surah?: number;
  mode?: SplitMode;
}): SplitResult {
  const cleaned = normalizeArabicWhitespace(params.arabicText);
  const warnings: string[] = [];
  const statsBase: SplitStats = {
    cleaned_length: cleaned.length,
    used_markers: false,
    marker_count: 0,
    unit_count: 0,
    warnings,
  };

  if (!cleaned) {
    return {
      ok: false,
      error: 'Empty Arabic text after normalization',
      cleaned,
      stats: statsBase,
    };
  }

  const surah = params.surah ?? 12;
  const mode: SplitMode = params.mode ?? 'ayah';

  if (mode === 'ayah') {
    const ayahResult = splitByAyahMarkers(cleaned, surah);
    if (ayahResult.used_markers && ayahResult.units.length) {
      return {
        ok: true,
        mode: 'ayah',
        units: ayahResult.units,
        stats: {
          ...statsBase,
          used_markers: true,
          marker_count: ayahResult.marker_count,
          unit_count: ayahResult.units.length,
        },
      };
    }
    warnings.push('Ayah markers not detected; falling back to sentence mode.');
  }

  const sentenceUnits = splitBySentences(cleaned);
  const converted: AyahUnit[] = sentenceUnits.map((unit, index) => ({
    unit_id: `${surah ?? 0}_SENT_${String(index + 1).padStart(3, '0')}`,
    unit_type: 'ayah',
    arabic: unit.arabic,
    translation: null,
    surah: unit.surah ?? surah,
    ayah: unit.ayah ?? index + 1,
    notes: null,
  }));

  return {
    ok: true,
    mode: 'ayah',
    units: converted,
    stats: {
      ...statsBase,
      used_markers: false,
      marker_count: 0,
      unit_count: converted.length,
    },
  };
}

export function buildSeedLessonFromText(arabicText: string, options: BuildSeedOptions = {}) {
  const mode = options.mode ?? 'ayah';
  const surah = options.surah ?? 12;
  const splitResult = splitArabicTextToUnits({ arabicText, surah, mode });
  const units = splitResult.ok ? splitResult.units : createFallbackUnit(arabicText, surah);

  const ayahNumbers = units.map((unit) => unit.ayah).filter((n) => n > 0);
  const ayahFrom = ayahNumbers.length ? Math.min(...ayahNumbers) : null;
  const ayahTo = ayahNumbers.length ? Math.max(...ayahNumbers) : null;

  const lessonId =
    options.lessonId ??
    `AR_LESSON_QURAN_${surah}_${String(ayahFrom ?? 0).padStart(3, '0')}_${String(ayahTo ?? 0).padStart(3, '0')}_${Date.now()}`;

  const title =
    options.title ??
    (ayahFrom && ayahTo ? `Surah Yusuf ${ayahFrom}-${ayahTo}` : `Surah Yusuf (${surah})`);

  const referenceSubId = ayahFrom && ayahTo ? `${surah}:${ayahFrom}-${ayahTo}` : `${surah}`;

  return {
    entity_type: 'ar_lesson',
    id: lessonId,

    lesson_type: options.lessonType ?? 'quran',
    subtype: options.subtype ?? 'narrative',

    title,
    title_ar: null,

    status: options.status ?? 'active',
    difficulty: options.difficulty ?? 3,

    reference: {
      source_type: options.sourceType ?? 'quran',
      source_ref_id: options.sourceRefId ?? referenceSubId,
      surah,
      ayah_from: ayahFrom,
      ayah_to: ayahTo,
      ref_label: options.referenceLabel ?? 'Surah Yusuf',
      citation: options.citation ?? `Surah Yusuf (${referenceSubId})`,
    },

    text: {
      mode: mode === 'sentence' ? 'mixed' : 'original',
      arabic_full: units,
    },

    sentences: [],
    passage_layers: [],
    comprehension: {
      reflective: [],
      analytical: [],
      mcqs: {
        text: [],
        vocabulary: [],
        grammar: [],
      },
    },

    created_at: new Date().toISOString(),
    updated_at: null,
  };
}

function splitByAyahMarkers(
  arabicText: string,
  surah: number
): { units: AyahUnit[]; used_markers: boolean; marker_count: number } {
  const regex = /(.+?)\s*﴿([٠-٩0-9]+)﴾/g;
  const units: AyahUnit[] = [];
  let match: RegExpExecArray | null;
  let marker_count = 0;

  while ((match = regex.exec(arabicText))) {
    marker_count++;
    const ayahText = match[1].trim();
    const digitsRaw = match[2];
    const ayahNum = digitsToNumber(digitsRaw);
    units.push({
      unit_id: `${surah}_${ayahNum}`,
      unit_type: 'ayah',
      arabic: `${ayahText} ﴿${digitsRaw}﴾`,
      translation: null,
      surah,
      ayah: ayahNum,
      notes: null,
    });
  }

  if (!marker_count) {
    return { units: [], used_markers: false, marker_count: 0 };
  }

  units.sort((a, b) => a.ayah - b.ayah);
  return { units, used_markers: true, marker_count };
}

function splitBySentences(arabicText: string) {
  const delimiters = /[\n\r]+|[۔\.؟!؛:]+/g;
  const rawParts = arabicText.split(delimiters).map((part) => part.trim()).filter(Boolean);

  if (rawParts.length <= 1 && arabicText.length > 140) {
    return arabicText.split('،').map((part) => part.trim()).filter(Boolean);
  }

  return rawParts;
}

function normalizeArabicWhitespace(input: string) {
  return (input ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200F/g, '')
    .replace(/\u200E/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function digitsToNumber(value: string) {
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };

  const normalized = value
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .replace(/[^\d]/g, '');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createFallbackUnit(arabicText: string, surah: number): AyahUnit[] {
  const cleaned = normalizeArabicWhitespace(arabicText);
  return [
    {
      unit_id: `${surah}_0`,
      unit_type: 'ayah',
      arabic: cleaned,
      translation: null,
      surah,
      ayah: 0,
      notes: null,
    },
  ];
}
