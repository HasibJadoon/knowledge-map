import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../_utils/auth';
import { json, mapNoteRow, parseLinkTargetType, readParam } from '../../../_utils/notes';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const targetType = parseLinkTargetType(readParam(ctx.params, 'target_type'));
    const targetId = readParam(ctx.params, 'target_id');

    if (!targetType || !targetId) {
      return json({ ok: false, error: 'target_type and target_id are required.' }, 400);
    }

    const { results = [] } = await ctx.env.DB
      .prepare(
        `
        SELECT
          n.id,
          n.user_id,
          n.status,
          n.body_md,
          n.title,
          n.created_at,
          n.updated_at
        FROM note_links l
        JOIN ar_capture_notes n ON n.id = l.note_id
        WHERE l.target_type = ?1
          AND l.target_id = ?2
          AND n.user_id = ?3
        ORDER BY n.updated_at DESC, l.created_at DESC
        LIMIT 400
        `
      )
      .bind(targetType, targetId, user.id)
      .all<Record<string, unknown>>();

    return json({ ok: true, notes: results.map(mapNoteRow) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load target notes.';
    return json({ ok: false, error: message }, 500);
  }
};
