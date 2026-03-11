export type NoteStatus = 'draft' | 'flag' | 'published';

export type NoteLinkTargetType = 'quran_ayah' | 'quran_word' | 'ar_u_lexicon' | 'wv_concept';

export interface Note {
  id: string;
  user_id: number;
  status: NoteStatus;
  body_md: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteLink {
  note_id: string;
  target_type: NoteLinkTargetType;
  target_id: string;
  ref: string | null;
  created_at: string;
}

export interface NoteDetail extends Note {
  links: NoteLink[];
}

export interface Comment {
  id: string;
  user_id: number;
  target_type: 'note' | 'quran_ayah' | 'ar_u_lexicon' | 'wv_concept';
  target_id: string;
  body_md: string;
  created_at: string;
}

export interface ParsedVerseRef {
  surah: number;
  ayah: number;
  target_id: string;
  ref: string;
}

export interface ParsedWordRef {
  surah: number;
  ayah: number;
  word: number;
  target_id: string;
  ref: string;
}

export function computeTitleFromMarkdown(body_md: string): string | null {
  const firstLine = body_md
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return null;
  }

  const cleaned = firstLine
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.length > 120 ? `${cleaned.slice(0, 117).replace(/\s+$/, '')}...` : cleaned;
}

export function computePreview(body_md: string, maxLen = 100): string {
  const compact = body_md.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }

  if (compact.length <= maxLen) {
    return compact;
  }

  return `${compact.slice(0, Math.max(1, maxLen - 1)).replace(/\s+$/, '')}...`;
}

export function parseVerseRef(value: string): ParsedVerseRef | null {
  const match = value.trim().match(/^(\d{1,3}):(\d{1,3})$/);
  if (!match) {
    return null;
  }

  const surah = Number(match[1]);
  const ayah = Number(match[2]);

  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) {
    return null;
  }

  if (surah < 1 || surah > 114 || ayah < 1 || ayah > 286) {
    return null;
  }

  const ref = `${surah}:${ayah}`;
  return {
    surah,
    ayah,
    target_id: `Q:${ref}`,
    ref,
  };
}

export function parseWordRef(value: string): ParsedWordRef | null {
  const match = value.trim().match(/^(\d{1,3}):(\d{1,3}):(\d{1,3})$/);
  if (!match) {
    return null;
  }

  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  const word = Number(match[3]);

  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || !Number.isInteger(word)) {
    return null;
  }

  if (surah < 1 || surah > 114 || ayah < 1 || ayah > 286 || word < 1 || word > 400) {
    return null;
  }

  const ref = `${surah}:${ayah}:${word}`;
  return {
    surah,
    ayah,
    word,
    target_id: `QW:${ref}`,
    ref,
  };
}
