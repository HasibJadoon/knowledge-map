// ─── Ayah schemas & types ─────────────────────────────────────────────────────

export interface AyahWord {
  word_index: number;
  text: string;           // word_text (with diacritics)
  text_bare: string;      // word_text_bare (no diacritics)
  root: string | null;
  lemma: string | null;
  pos: string | null;     // N, PN, V, ADJ, P, CONJ, …
  morphology_tag: string | null;
}

export interface Ayah {
  surah: number;
  ayah: number;
  text_display: string;           // COALESCE(text_uthmani_clean, text_uthmani, text_bare, text)
  text_uthmani_clean: string | null;
  text_uthmani: string | null;
  translation: string | null;
  verse_mark: string | null;      // Arabic-Indic digits only (no U+06DD)
  page_number: number | null;
  words?: AyahWord[];             // populated when ?words=1
}

export interface AyahPatch {
  translation?: string;
  verse_mark?: string;
}

export function validateAyahPatch(body: unknown): { data: AyahPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const patch: AyahPatch = {};
  if ('translation' in b) {
    if (typeof b.translation !== 'string') return { error: 'translation must be a string' };
    patch.translation = b.translation;
  }
  if ('verse_mark' in b) {
    if (typeof b.verse_mark !== 'string') return { error: 'verse_mark must be a string' };
    patch.verse_mark = b.verse_mark;
  }
  return { data: patch };
}
