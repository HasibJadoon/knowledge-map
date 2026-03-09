import type { D1Database } from '@cloudflare/workers-types';

export type NoteStatus = 'draft' | 'flag' | 'published';

export type NoteLinkTargetType =
  | 'quran_ayah'
  | 'quran_word'
  | 'ar_u_lexicon'
  | 'wv_concept'
  | 'task'
  | 'task_item';

export type CommentTargetType = 'note' | 'quran_ayah' | 'ar_u_lexicon' | 'wv_concept';

export interface CaptureNoteDto {
  id: string;
  user_id: number;
  status: NoteStatus;
  body_md: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteLinkDto {
  note_id: string;
  target_type: NoteLinkTargetType;
  target_id: string;
  ref: string | null;
  created_at: string;
}

export interface CommentDto {
  id: string;
  user_id: number;
  author_email?: string | null;
  target_type: CommentTargetType;
  target_id: string;
  body_md: string;
  created_at: string;
}

const STATUS_ALIASES: Record<string, NoteStatus> = {
  inbox: 'draft',
  archived: 'published',
  draft: 'draft',
  flag: 'flag',
  published: 'published',
};

const LINK_TARGET_TYPES = new Set<NoteLinkTargetType>([
  'quran_ayah',
  'quran_word',
  'ar_u_lexicon',
  'wv_concept',
  'task',
  'task_item',
]);

const COMMENT_TARGET_TYPES = new Set<CommentTargetType>([
  'note',
  'quran_ayah',
  'ar_u_lexicon',
  'wv_concept',
]);

export const jsonHeaders: HeadersInit = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  const payload = (await request.json().catch(() => null)) as unknown;
  return asRecord(payload);
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readOptionalTitle(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseStatus(value: unknown): NoteStatus | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return STATUS_ALIASES[normalized] ?? null;
}

export function listStatus(value: string | null): NoteStatus {
  const parsed = parseStatus(value ?? '');
  return parsed ?? 'draft';
}

export function parseLinkTargetType(value: unknown): NoteLinkTargetType | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim() as NoteLinkTargetType;
  return LINK_TARGET_TYPES.has(normalized) ? normalized : null;
}

export function parseCommentTargetType(value: unknown): CommentTargetType | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim() as CommentTargetType;
  return COMMENT_TARGET_TYPES.has(normalized) ? normalized : null;
}

export function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readParam(
  params: Record<string, unknown> | undefined,
  key: string
): string {
  const raw = params?.[key];
  if (typeof raw === 'string') {
    return raw.trim();
  }

  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
    return raw[0].trim();
  }

  return '';
}

export const NOTE_COLUMNS = 'id, user_id, status, body_md, title, created_at, updated_at';

export async function fetchOwnedNote(
  db: D1Database,
  noteId: string,
  userId: number
): Promise<Record<string, unknown> | null> {
  return db
    .prepare(`SELECT ${NOTE_COLUMNS} FROM ar_capture_notes WHERE id = ?1 AND user_id = ?2 LIMIT 1`)
    .bind(noteId, userId)
    .first<Record<string, unknown>>();
}

export function mapNoteRow(row: unknown): CaptureNoteDto {
  const record = asRecord(row) ?? {};
  const title = readString(record['title']) ?? null;
  const body = readString(record['body_md']) ?? '';

  return {
    id: readString(record['id']) ?? '',
    user_id: parseNumber(record['user_id']),
    status: canonicalStatus(record['status'], title, body),
    body_md: body,
    title,
    created_at: readString(record['created_at']) ?? '',
    updated_at: readString(record['updated_at']) ?? '',
  };
}

export function mapLinkRow(row: unknown): NoteLinkDto {
  const record = asRecord(row) ?? {};
  const targetType = parseLinkTargetType(record['target_type']) ?? 'quran_word';

  return {
    note_id: readString(record['note_id']) ?? '',
    target_type: targetType,
    target_id: readString(record['target_id']) ?? '',
    ref: readString(record['ref']) ?? null,
    created_at: readString(record['created_at']) ?? '',
  };
}

export function mapCommentRow(row: unknown): CommentDto {
  const record = asRecord(row) ?? {};
  const targetType = parseCommentTargetType(record['target_type']) ?? 'note';

  return {
    id: readString(record['id']) ?? '',
    user_id: parseNumber(record['user_id']),
    author_email: readString(record['author_email']) ?? null,
    target_type: targetType,
    target_id: readString(record['target_id']) ?? '',
    body_md: readString(record['body_md']) ?? '',
    created_at: readString(record['created_at']) ?? '',
  };
}

export function canonicalStatus(rawStatus: unknown, title: string | null, body: string): NoteStatus {
  const parsed = parseStatus(rawStatus);
  if (parsed === 'flag' || parsed === 'published') {
    return parsed;
  }

  if (parsed === 'draft' && hasLegacyFlagMarker(title, body)) {
    return 'flag';
  }

  return parsed ?? (hasLegacyFlagMarker(title, body) ? 'flag' : 'draft');
}

function hasLegacyFlagMarker(title: string | null, body: string): boolean {
  const haystack = `${title ?? ''}\n${body}`.toLowerCase();
  return /\B#flag\b/.test(haystack) || /\[flag\]/.test(haystack);
}
