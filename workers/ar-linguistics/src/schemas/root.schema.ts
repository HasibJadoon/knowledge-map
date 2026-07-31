// ─── Root schemas & types ─────────────────────────────────────────────────────

export interface Root {
  id: string;                    // bare 26-char local key — NOT 'AL:...'; the
                                 // AL: prefix belongs on cross-domain refs only
  root_text: string;             // trilateral/quadrilateral Arabic root
  root_normalized: string;       // stripped diacritics, consistent form
  root_letters: string;          // JSON array, e.g. ["ك", "ت", "ب"]
  root_type: string;             // trilateral | quadrilateral | ...
  frequency_quran: number;       // Qurʾān occurrence count (0 = non-Qurʾānic)
  meaning_core_en: string | null;
  meaning_core_ar: string | null;
  note_md: string | null;
  canonical_id: string | null;   // cross-domain join key ↔ qr_root_registry.root_uid
}

export interface RootCreate {
  root_text: string;
  root_type?: string;
  note_md?: string;
}

export function validateRootCreate(body: unknown): { data: RootCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.root_text !== 'string' || !b.root_text.trim())
    return { error: 'root_text is required' };
  return {
    data: {
      root_text: b.root_text.trim(),
      root_type: typeof b.root_type === 'string' ? b.root_type : undefined,
      note_md: typeof b.note_md === 'string' ? b.note_md : undefined,
    },
  };
}
