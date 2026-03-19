import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import {
  CaptureNoteMeta,
  composeCaptureBody,
  computeWeekStartSydney,
  insertActivityLog,
  json,
  normalizeIsoDate,
  parseBody,
  parseCaptureBody,
  readInteger,
  readString,
  readTrimmed,
} from '../../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type CaptureStatus = 'inbox' | 'archived';

function parseStatus(value: unknown): CaptureStatus | null {
  const normalized = readTrimmed(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'inbox' || normalized === 'archived') {
    return normalized;
  }
  return null;
}

function normalizeMeta(input: unknown): CaptureNoteMeta {
  const record =
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const weekStart = normalizeIsoDate(readString(record['week_start'])) ?? computeWeekStartSydney();
  const sourceRaw = readTrimmed(record['source']);
  const source = sourceRaw === 'lesson' || sourceRaw === 'podcast' ? sourceRaw : 'weekly';

  return {
    schema_version: 1,
    kind: 'capture',
    week_start: weekStart,
    source,
    related_type: readTrimmed(record['related_type']) ?? undefined,
    related_id: readTrimmed(record['related_id']) ?? undefined,
    container_id: readTrimmed(record['container_id']) ?? undefined,
    unit_id: readTrimmed(record['unit_id']) ?? undefined,
    ref: readTrimmed(record['ref']) ?? undefined,
    task_type: readTrimmed(record['task_type']) ?? undefined,
  };
}

function mapCaptureRow(row: Record<string, unknown>) {
  const bodyMd = readString(row['body_md']) ?? '';
  const parsed = parseCaptureBody(bodyMd);
  return {
    id: readString(row['id']) ?? '',
    user_id: readInteger(row['user_id']) ?? 0,
    status: parseStatus(row['status']) ?? 'inbox',
    body_md: bodyMd,
    title: readString(row['title']),
    created_at: readString(row['created_at']) ?? '',
    updated_at: readString(row['updated_at']) ?? '',
    meta: parsed.meta,
    text: parsed.text,
  };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const url = new URL(ctx.request.url);
    const status = parseStatus(url.searchParams.get('status')) ?? 'inbox';
    const limitInput = readInteger(url.searchParams.get('limit'));
    const limit = Math.max(1, Math.min(200, limitInput ?? 50));

    const result = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, status, body_md, title, created_at, updated_at
        FROM ar_capture_notes
        WHERE user_id = ?1
          AND status = ?2
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ?3
        `
      )
      .bind(user.id, status, limit)
      .all<Record<string, unknown>>();

    return json({
      ok: true,
      notes: (result.results ?? []).map((row) => mapCaptureRow(row)),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list capture notes.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const requestedStatus = parseStatus(body['status']) ?? 'inbox';
    const providedBody = readString(body['body_md']) ?? '';
    const explicitText = readString(body['text']);
    const meta = normalizeMeta(body['meta']);

    const parsedProvided = parseCaptureBody(providedBody);
    const text = explicitText ?? parsedProvided.text ?? '';
    const finalMeta = parsedProvided.meta ?? meta;
    const finalBody = composeCaptureBody(finalMeta, text);
    const title = readTrimmed(body['title']) ?? null;

    if (!text.trim()) {
      return json({ ok: false, error: 'Capture text is required.' }, 400);
    }

    const noteId = crypto.randomUUID();

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO ar_capture_notes (id, user_id, status, body_md, title, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))
        `
      )
      .bind(noteId, user.id, requestedStatus, finalBody, title)
      .run();

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'capture_note_create',
      targetType: 'ar_capture_notes',
      targetId: noteId,
      ref: finalMeta.week_start,
      eventJson: {
        source: finalMeta.source,
        related_type: finalMeta.related_type ?? null,
        related_id: finalMeta.related_id ?? null,
      },
    });

    const row = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, status, body_md, title, created_at, updated_at
        FROM ar_capture_notes
        WHERE id = ?1
          AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(noteId, user.id)
      .first<Record<string, unknown>>();

    if (!row) {
      return json({ ok: false, error: 'Failed to create capture note.' }, 500);
    }

    return json({ ok: true, note: mapCaptureRow(row) }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create capture note.';
    return json({ ok: false, error: message }, 500);
  }
};
