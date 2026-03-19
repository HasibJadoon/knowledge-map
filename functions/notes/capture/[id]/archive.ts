import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../_utils/auth';
import { insertActivityLog, json, readString } from '../../../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

function readParam(params: Record<string, unknown> | undefined, key: string): string {
  const value = params?.[key];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0].trim();
  }
  return '';
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const captureId = readParam(ctx.params, 'id');
    if (!captureId) {
      return json({ ok: false, error: 'Capture note id is required.' }, 400);
    }

    const updateResult = await ctx.env.DB
      .prepare(
        `
        UPDATE ar_capture_notes
        SET status = 'archived',
            updated_at = datetime('now')
        WHERE id = ?1
          AND user_id = ?2
        `
      )
      .bind(captureId, user.id)
      .run();

    if ((updateResult.meta?.changes ?? 0) === 0) {
      return json({ ok: false, error: 'Capture note not found.' }, 404);
    }

    await insertActivityLog({
      db: ctx.env.DB,
      userId: user.id,
      eventType: 'capture_note_archive',
      targetType: 'ar_capture_notes',
      targetId: captureId,
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
      .bind(captureId, user.id)
      .first<Record<string, unknown>>();

    if (!row) {
      return json({ ok: false, error: 'Capture note not found.' }, 404);
    }

    return json({
      ok: true,
      note: {
        id: readString(row['id']) ?? '',
        user_id: Number(row['user_id'] ?? 0),
        status: readString(row['status']) ?? 'archived',
        body_md: readString(row['body_md']) ?? '',
        title: readString(row['title']),
        created_at: readString(row['created_at']) ?? '',
        updated_at: readString(row['updated_at']) ?? '',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive capture note.';
    return json({ ok: false, error: message }, 500);
  }
};
