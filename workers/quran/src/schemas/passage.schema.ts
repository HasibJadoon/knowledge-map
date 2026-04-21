// ─── Passage schemas & types ──────────────────────────────────────────────────

export interface Passage {
  id: string;                 // QR:ULID
  surah: number;
  passage_index: number;
  ayah_from: number;
  ayah_to: number;
  theme: string | null;
  title: string | null;
}

export interface PassageCreate {
  surah: number;
  ayah_from: number;
  ayah_to: number;
  theme?: string;
  title?: string;
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
      theme: typeof b.theme === 'string' ? b.theme : undefined,
      title: typeof b.title === 'string' ? b.title : undefined,
    },
  };
}
