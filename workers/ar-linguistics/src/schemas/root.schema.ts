// ─── Root schemas & types ─────────────────────────────────────────────────────

export interface Root {
  id: string;                  // AL:ULID
  root_text: string;           // trilateral/quadrilateral Arabic root
  root_normalized: string;     // stripped diacritics, consistent form
  letter_count: number;        // 3 | 4
  frequency: number | null;    // Quran occurrence count
  notes: string | null;
}

export interface RootCreate {
  root_text: string;
  letter_count?: number;
  notes?: string;
}

export function validateRootCreate(body: unknown): { data: RootCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.root_text !== 'string' || !b.root_text.trim())
    return { error: 'root_text is required' };
  return {
    data: {
      root_text: b.root_text.trim(),
      letter_count: typeof b.letter_count === 'number' ? b.letter_count : undefined,
      notes: typeof b.notes === 'string' ? b.notes : undefined,
    },
  };
}
