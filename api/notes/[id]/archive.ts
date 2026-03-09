import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import { NOTE_COLUMNS, json, mapNoteRow, readParam } from '../../_utils/notes';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const noteId = readParam(ctx.params, 'id');
    if (!noteId) {
      return json({ ok: false, error: 'Note id is required.' }, 400);
    }

    const updateResult = await ctx.env.DB
      .prepare(
        `
        UPDATE ar_capture_notes
        SET status = 'published', updated_at = datetime('now')
        WHERE id = ?1 AND user_id = ?2
        `
      )
      .bind(noteId, user.id)
      .run();

    const changed = Number(updateResult.meta?.changes ?? 0);
    if (changed < 1) {
      return json({ ok: false, error: 'Note not found.' }, 404);
    }

    const row = await ctx.env.DB
      .prepare(`SELECT ${NOTE_COLUMNS} FROM ar_capture_notes WHERE id = ?1 AND user_id = ?2 LIMIT 1`)
      .bind(noteId, user.id)
      .first<Record<string, unknown>>();

    if (!row) {
      return json({ ok: false, error: 'Note not found.' }, 404);
    }

    return json({ ok: true, note: mapNoteRow(row) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to archive note.';
    return json({ ok: false, error: message }, 500);
  }
};
