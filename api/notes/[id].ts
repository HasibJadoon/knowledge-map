import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import {
  NOTE_COLUMNS,
  fetchOwnedNote,
  json,
  mapLinkRow,
  mapNoteRow,
  parseBody,
  parseStatus,
  readParam,
  readOptionalTitle,
  readString,
} from '../_utils/notes';

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

    const noteId = readParam(ctx.params, 'id');
    if (!noteId) {
      return json({ ok: false, error: 'Note id is required.' }, 400);
    }

    const row = await fetchOwnedNote(ctx.env.DB, noteId, user.id);
    if (!row) {
      return json({ ok: false, error: 'Note not found.' }, 404);
    }

    const { results = [] } = await ctx.env.DB
      .prepare(
        `
        SELECT note_id, target_type, target_id, ref, created_at
        FROM note_links
        WHERE note_id = ?1
        ORDER BY created_at DESC
        `
      )
      .bind(noteId)
      .all<Record<string, unknown>>();

    return json({
      ok: true,
      note: mapNoteRow(row),
      links: results.map(mapLinkRow),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch note.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const noteId = readParam(ctx.params, 'id');
    if (!noteId) {
      return json({ ok: false, error: 'Note id is required.' }, 400);
    }

    const existing = await fetchOwnedNote(ctx.env.DB, noteId, user.id);
    if (!existing) {
      return json({ ok: false, error: 'Note not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const setClauses: string[] = [];
    const binds: unknown[] = [];

    if (Object.prototype.hasOwnProperty.call(body, 'body_md')) {
      const bodyMarkdown = readString(body['body_md']);
      if (bodyMarkdown === null) {
        return json({ ok: false, error: 'body_md must be a string.' }, 400);
      }

      setClauses.push('body_md = ?');
      binds.push(bodyMarkdown);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = readOptionalTitle(body['title']);
      if (body['title'] !== null && body['title'] !== undefined && typeof body['title'] !== 'string') {
        return json({ ok: false, error: 'title must be a string or null.' }, 400);
      }

      setClauses.push('title = ?');
      binds.push(title);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = parseStatus(body['status']);
      if (!status) {
        return json({ ok: false, error: 'status must be draft, flag, or published.' }, 400);
      }

      setClauses.push('status = ?');
      binds.push(status);
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')");
      await ctx.env.DB
        .prepare(
          `
          UPDATE ar_capture_notes
          SET ${setClauses.join(', ')}
          WHERE id = ?${binds.length + 1}
            AND user_id = ?${binds.length + 2}
          `
        )
        .bind(...binds, noteId, user.id)
        .run();
    }

    const updated = await ctx.env.DB
      .prepare(`SELECT ${NOTE_COLUMNS} FROM ar_capture_notes WHERE id = ?1 AND user_id = ?2 LIMIT 1`)
      .bind(noteId, user.id)
      .first<Record<string, unknown>>();

    if (!updated) {
      return json({ ok: false, error: 'Note not found.' }, 404);
    }

    return json({ ok: true, note: mapNoteRow(updated) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update note.';
    return json({ ok: false, error: message }, 500);
  }
};
