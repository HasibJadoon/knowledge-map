// ─── Canonical Arabic surah-name → surah_num map ─────────────────────────────
//
// Built from a 1000-entry Mufradat audit that surfaced 118 distinct spellings
// of surah names in inline citation brackets. Covers all 114 surahs plus the
// alternate names and ingestion-time spelling quirks observed in the corpus.
//
// Lookup helper `normalizeSurahName(raw)` strips diacritics, collapses
// whitespace, and unifies hamza forms before checking the map — this lets us
// catch newlines inside names (e.g. "آل\nعمران") without bloating the table.

const SURAH_CANONICAL: Record<string, number> = {
  // 1
  'الفاتحة': 1, 'فاتحة الكتاب': 1, 'أم الكتاب': 1,
  // 2
  'البقرة': 2,
  // 3
  'آل عمران': 3,
  // 4
  'النساء': 4,
  // 5
  'المائدة': 5,
  // 6
  'الأنعام': 6,
  // 7
  'الأعراف': 7,
  // 8
  'الأنفال': 8,
  // 9
  'التوبة': 9, 'براءة': 9,
  // 10
  'يونس': 10,
  // 11
  'هود': 11,
  // 12
  'يوسف': 12,
  // 13
  'الرعد': 13,
  // 14
  'إبراهيم': 14, 'ابراهيم': 14,
  // 15
  'الحجر': 15,
  // 16
  'النحل': 16,
  // 17
  'الإسراء': 17, 'الاسراء': 17, 'بني إسرائيل': 17, 'بنى إسرائيل': 17,
  // 18
  'الكهف': 18,
  // 19
  'مريم': 19,
  // 20
  'طه': 20, 'طـه': 20,
  // 21
  'الأنبياء': 21,
  // 22
  'الحج': 22, 'الحجّ': 22,
  // 23
  'المؤمنون': 23,
  // 24
  'النور': 24,
  // 25
  'الفرقان': 25,
  // 26
  'الشعراء': 26,
  // 27
  'النمل': 27, 'سورة النمل': 27,
  // 28
  'القصص': 28,
  // 29
  'العنكبوت': 29,
  // 30
  'الروم': 30,
  // 31
  'لقمان': 31,
  // 32
  'السجدة': 32,
  // 33
  'الأحزاب': 33,
  // 34
  'سبأ': 34, 'سبا': 34,
  // 35
  'فاطر': 35, 'الملائكة': 35,
  // 36
  'يس': 36, 'يـس': 36, 'ياسين': 36,
  // 37
  'الصافات': 37,
  // 38
  'ص': 38,
  // 39
  'الزمر': 39,
  // 40
  'غافر': 40, 'المؤمن': 40,
  // 41
  'فصلت': 41, 'حم السجدة': 41,
  // 42
  'الشورى': 42,
  // 43
  'الزخرف': 43,
  // 44
  'الدخان': 44,
  // 45
  'الجاثية': 45,
  // 46
  'الأحقاف': 46,
  // 47
  'محمد': 47, 'محمّد': 47, 'القتال': 47,
  // 48
  'الفتح': 48,
  // 49
  'الحجرات': 49,
  // 50
  'ق': 50,
  // 51
  'الذاريات': 51,
  // 52
  'الطور': 52,
  // 53
  'النجم': 53,
  // 54
  'القمر': 54,
  // 55
  'الرحمن': 55, 'الرحمٰن': 55,
  // 56
  'الواقعة': 56,
  // 57
  'الحديد': 57,
  // 58
  'المجادلة': 58, 'المجادله': 58,
  // 59
  'الحشر': 59,
  // 60
  'الممتحنة': 60,
  // 61
  'الصف': 61, 'الصفّ': 61,
  // 62
  'الجمعة': 62,
  // 63
  'المنافقون': 63,
  // 64
  'التغابن': 64,
  // 65
  'الطلاق': 65,
  // 66
  'التحريم': 66,
  // 67
  'الملك': 67, 'تبارك': 67,
  // 68
  'القلم': 68, 'ن': 68,
  // 69
  'الحاقة': 69,
  // 70
  'المعارج': 70,
  // 71
  'نوح': 71,
  // 72
  'الجن': 72,
  // 73
  'المزمل': 73, 'المزّمل': 73,
  // 74
  'المدثر': 74, 'المدّثر': 74,
  // 75
  'القيامة': 75,
  // 76
  'الإنسان': 76, 'الدهر': 76, 'هل أتى': 76,
  // 77
  'المرسلات': 77,
  // 78
  'النبأ': 78, 'النبا': 78, 'عمّ': 78, 'عم': 78,
  // 79
  'النازعات': 79,
  // 80
  'عبس': 80,
  // 81
  'التكوير': 81,
  // 82
  'الانفطار': 82,
  // 83
  'المطففين': 83, 'المطفّفين': 83,
  // 84
  'الانشقاق': 84,
  // 85
  'البروج': 85,
  // 86
  'الطارق': 86,
  // 87
  'الأعلى': 87,
  // 88
  'الغاشية': 88,
  // 89
  'الفجر': 89,
  // 90
  'البلد': 90,
  // 91
  'الشمس': 91,
  // 92
  'الليل': 92,
  // 93
  'الضحى': 93,
  // 94
  'الشرح': 94, 'الانشراح': 94, 'ألم نشرح': 94,
  // 95
  'التين': 95,
  // 96
  'العلق': 96, 'اقرأ': 96,
  // 97
  'القدر': 97,
  // 98
  'البينة': 98,
  // 99
  'الزلزلة': 99, 'إذا زلزلت': 99,
  // 100
  'العاديات': 100,
  // 101
  'القارعة': 101,
  // 102
  'التكاثر': 102, 'ألهاكم': 102,
  // 103
  'العصر': 103,
  // 104
  'الهمزة': 104,
  // 105
  'الفيل': 105,
  // 106
  'قريش': 106,
  // 107
  'الماعون': 107,
  // 108
  'الكوثر': 108,
  // 109
  'الكافرون': 109,
  // 110
  'النصر': 110,
  // 111
  'المسد': 111, 'تبت': 111, 'اللهب': 111,
  // 112
  'الإخلاص': 112,
  // 113
  'الفلق': 113,
  // 114
  'الناس': 114,
};

// ── Normalization layer ──────────────────────────────────────────────────────
// Strip Arabic short-vowels/tashkeel, normalize hamza variants and ya/alif
// forms, collapse whitespace. Lets one canonical key cover most variants.

const TASHKEEL_RE = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

function stripDiacritics(s: string): string {
  return s.replace(TASHKEEL_RE, '');
}

function unifyForms(s: string): string {
  return s
    .replace(/[إأٱآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');
}

function squashSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// Precompute a normalized lookup table so each request is O(1).
const SURAH_LOOKUP: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const [name, num] of Object.entries(SURAH_CANONICAL)) {
    m.set(name, num);
    m.set(squashSpaces(name), num);
    const norm = unifyForms(stripDiacritics(squashSpaces(name)));
    m.set(norm, num);
  }
  return m;
})();

/**
 * Resolve an Arabic surah name (in any common spelling) to its canonical
 * surah_num 1–114. Returns null when the name can't be mapped — callers
 * should keep the raw text as a fallback display value.
 */
export function normalizeSurahName(raw: string): number | null {
  if (!raw) return null;
  const trimmed = squashSpaces(raw);
  if (SURAH_LOOKUP.has(trimmed)) return SURAH_LOOKUP.get(trimmed)!;

  // Try with the "سورة " prefix removed.
  const noPrefix = trimmed.replace(/^سورة\s+/, '');
  if (SURAH_LOOKUP.has(noPrefix)) return SURAH_LOOKUP.get(noPrefix)!;

  const normalized = unifyForms(stripDiacritics(noPrefix));
  if (SURAH_LOOKUP.has(normalized)) return SURAH_LOOKUP.get(normalized)!;

  return null;
}

/** Canonical Arabic surah name for a surah_num — useful for display. */
export function canonicalSurahName(num: number): string | null {
  for (const [name, n] of Object.entries(SURAH_CANONICAL)) {
    if (n === num) return name;
  }
  return null;
}
