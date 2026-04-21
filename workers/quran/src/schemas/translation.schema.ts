// ─── Translation schemas & types ──────────────────────────────────────────────

// ── qr_translation_sources ───────────────────────────────────────────────────

export interface QrTranslationSource {
  id: string;                         // QR:ULID
  source_code: string;                // e.g. 'haleem'|'sahih_intl'|'yusuf_ali'
  translator_name: string;
  language: string;                   // default 'en'
  edition: string | null;
  is_default: boolean;
  created_at: string;
}

export interface QrTranslationSourceCreate {
  source_code: string;
  translator_name: string;
  language?: string;
  edition?: string | null;
  is_default?: boolean;
}

export interface QrTranslationSourcePatch {
  translator_name?: string;
  language?: string;
  edition?: string | null;
  is_default?: boolean;
}

// ── qr_translations ───────────────────────────────────────────────────────────

export interface QrTranslation {
  id: string;                         // QR:ULID
  source_id: string;
  surah: number;
  ayah: number;
  translation_text: string;
  footnote_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface QrTranslationCreate {
  source_id: string;
  surah: number;
  ayah: number;
  translation_text: string;
  footnote_md?: string | null;
}

export interface QrTranslationPatch {
  translation_text?: string;
  footnote_md?: string | null;
}

// ── qr_translation_passages ───────────────────────────────────────────────────

export interface QrTranslationPassage {
  id: string;                         // QR:ULID
  source_id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_translation: string;
  note_md: string | null;
  created_at: string;
}

export interface QrTranslationPassageCreate {
  source_id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_translation: string;
  note_md?: string | null;
}

export interface QrTranslationPassagePatch {
  passage_translation?: string;
  note_md?: string | null;
}

// ── Validators ────────────────────────────────────────────────────────────────

export function validateQrTranslationSourceCreate(
  body: unknown,
): { data: QrTranslationSourceCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (!('source_code' in b) || typeof b.source_code !== 'string' || !b.source_code.trim())
    return { error: 'source_code is required and must be a non-empty string' };
  if (!('translator_name' in b) || typeof b.translator_name !== 'string' || !b.translator_name.trim())
    return { error: 'translator_name is required and must be a non-empty string' };

  const data: QrTranslationSourceCreate = {
    source_code: b.source_code as string,
    translator_name: b.translator_name as string,
  };

  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if ('edition' in b) {
    if (b.edition !== null && typeof b.edition !== 'string')
      return { error: 'edition must be a string or null' };
    data.edition = b.edition as string | null;
  }
  if ('is_default' in b) {
    if (typeof b.is_default !== 'boolean') return { error: 'is_default must be a boolean' };
    data.is_default = b.is_default;
  }

  return { data };
}

export function validateQrTranslationCreate(
  body: unknown,
): { data: QrTranslationCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (!('source_id' in b) || typeof b.source_id !== 'string' || !b.source_id.trim())
    return { error: 'source_id is required and must be a non-empty string' };
  if (!('surah' in b) || typeof b.surah !== 'number' || b.surah < 1 || b.surah > 114)
    return { error: 'surah is required and must be a number 1–114' };
  if (!('ayah' in b) || typeof b.ayah !== 'number' || b.ayah < 1)
    return { error: 'ayah is required and must be a positive number' };
  if (!('translation_text' in b) || typeof b.translation_text !== 'string' || !b.translation_text.trim())
    return { error: 'translation_text is required and must be a non-empty string' };

  const data: QrTranslationCreate = {
    source_id: b.source_id as string,
    surah: b.surah as number,
    ayah: b.ayah as number,
    translation_text: b.translation_text as string,
  };

  if ('footnote_md' in b) {
    if (b.footnote_md !== null && typeof b.footnote_md !== 'string')
      return { error: 'footnote_md must be a string or null' };
    data.footnote_md = b.footnote_md as string | null;
  }

  return { data };
}

export function validateQrTranslationPassageCreate(
  body: unknown,
): { data: QrTranslationPassageCreate } | { error: string } {
  if (typeof body !== 'object' || body === null)
    return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (!('source_id' in b) || typeof b.source_id !== 'string' || !b.source_id.trim())
    return { error: 'source_id is required and must be a non-empty string' };
  if (!('surah' in b) || typeof b.surah !== 'number' || b.surah < 1 || b.surah > 114)
    return { error: 'surah is required and must be a number 1–114' };
  if (!('ayah_from' in b) || typeof b.ayah_from !== 'number' || b.ayah_from < 1)
    return { error: 'ayah_from is required and must be a positive number' };
  if (!('ayah_to' in b) || typeof b.ayah_to !== 'number' || b.ayah_to < 1)
    return { error: 'ayah_to is required and must be a positive number' };
  if (!('passage_translation' in b) || typeof b.passage_translation !== 'string' || !b.passage_translation.trim())
    return { error: 'passage_translation is required and must be a non-empty string' };

  const data: QrTranslationPassageCreate = {
    source_id: b.source_id as string,
    surah: b.surah as number,
    ayah_from: b.ayah_from as number,
    ayah_to: b.ayah_to as number,
    passage_translation: b.passage_translation as string,
  };

  if ('note_md' in b) {
    if (b.note_md !== null && typeof b.note_md !== 'string')
      return { error: 'note_md must be a string or null' };
    data.note_md = b.note_md as string | null;
  }

  return { data };
}
