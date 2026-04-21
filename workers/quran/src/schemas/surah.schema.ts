// ─── Surah schemas & types ────────────────────────────────────────────────────

export interface Surah {
  id: number;                     // 1–114
  name_ar: string;
  name_en: string;
  name_transliteration: string;
  revelation_type: 'meccan' | 'medinan';
  ayah_count: number;
  juz_start: number;
  page_start: number;
}

export interface SurahPatch {
  name_en?: string;
  name_transliteration?: string;
  revelation_type?: 'meccan' | 'medinan';
  juz_start?: number;
  page_start?: number;
}

// Minimal Zod-free validator for patch body
export function validateSurahPatch(body: unknown): { data: SurahPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const patch: SurahPatch = {};
  if ('name_en' in b) {
    if (typeof b.name_en !== 'string') return { error: 'name_en must be a string' };
    patch.name_en = b.name_en;
  }
  if ('revelation_type' in b) {
    if (b.revelation_type !== 'meccan' && b.revelation_type !== 'medinan')
      return { error: "revelation_type must be 'meccan' or 'medinan'" };
    patch.revelation_type = b.revelation_type;
  }
  if ('juz_start' in b) {
    if (typeof b.juz_start !== 'number') return { error: 'juz_start must be a number' };
    patch.juz_start = b.juz_start;
  }
  return { data: patch };
}
