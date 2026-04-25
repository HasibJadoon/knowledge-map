// ─── Passage schemas & types ──────────────────────────────────────────────────

export interface Passage {
  id: string;                 // QR:ULID
  surah: number;
  passage_index: number;
  ayah_from: number;
  ayah_to: number;
  theme: string | null;
  title_ar: string | null;
  title_en: string | null;
  discourse_role: string | null;
  note_md: string | null;
}

export interface PassageCreate {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  theme?: string;
  title_ar?: string;
  title_en?: string;
  discourse_role?: string;
  note_md?: string;
}

export function validatePassageCreate(
  body: unknown,
): { data: PassageCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.surah !== 'number' || b.surah < 1 || b.surah > 114)
    return { error: 'surah must be 1–114' };
  if (typeof b.ayah_from !== 'number' || b.ayah_from < 1)
    return { error: 'ayah_from must be a positive integer' };
  if (typeof b.ayah_to !== 'number' || b.ayah_to < b.ayah_from)
    return { error: 'ayah_to must be >= ayah_from' };

  return {
    data: {
      surah: b.surah,
      ayah_from: b.ayah_from,
      ayah_to: b.ayah_to,
      theme:          typeof b.theme          === 'string' ? b.theme          : undefined,
      title_ar:       typeof b.title_ar       === 'string' ? b.title_ar       : undefined,
      title_en:       typeof b.title_en       === 'string' ? b.title_en       : undefined,
      discourse_role: typeof b.discourse_role === 'string' ? b.discourse_role : undefined,
      note_md:        typeof b.note_md        === 'string' ? b.note_md        : undefined,
    },
  };
}
