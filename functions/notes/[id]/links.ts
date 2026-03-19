import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';
import {
  fetchOwnedNote,
  json,
  mapLinkRow,
  parseBody,
  parseLinkTargetType,
  readParam,
  readString,
  readTrimmedString,
} from '../../_utils/notes';

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

    const note = await fetchOwnedNote(ctx.env.DB, noteId, user.id);
    if (!note) {
      return json({ ok: false, error: 'Note not found.' }, 404);
    }

    const body = await parseBody(ctx.request);
    if (!body) {
      return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
    }

    const targetType = parseLinkTargetType(body['target_type']);
    const targetId = readTrimmedString(body['target_id']);
    const refValue = readString(body['ref']);
    const ref = typeof refValue === 'string' && refValue.trim().length > 0 ? refValue.trim() : null;

    if (!targetType || !targetId) {
      return json({ ok: false, error: 'target_type and target_id are required.' }, 400);
    }

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO note_links (note_id, target_type, target_id, ref, created_at)
        VALUES (?1, ?2, ?3, ?4, datetime('now'))
        ON CONFLICT(note_id, target_type, target_id)
        DO UPDATE SET ref = excluded.ref
        `
      )
      .bind(noteId, targetType, targetId, ref)
      .run();

    const row = await ctx.env.DB
      .prepare(
        `
        SELECT note_id, target_type, target_id, ref, created_at
        FROM note_links
        WHERE note_id = ?1
          AND target_type = ?2
          AND target_id = ?3
        LIMIT 1
        `
      )
      .bind(noteId, targetType, targetId)
      .first<Record<string, unknown>>();

    if (!row) {
      return json({ ok: false, error: 'Failed to attach link.' }, 500);
    }

    return json({ ok: true, link: mapLinkRow(row) }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to attach note link.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const noteId = readParam(ctx.params, 'id');
    if (!noteId) {
      return json({ ok: false, error: 'Note id is required.' }, 400);
    }

    const note = await fetchOwnedNote(ctx.env.DB, noteId, user.id);
    if (!note) {
      return json({ ok: false, error: 'Note not found.' }, 404);
    }

    const url = new URL(ctx.request.url);
    const targetType = parseLinkTargetType(url.searchParams.get('target_type'));
    const targetId = readTrimmedString(url.searchParams.get('target_id'));

    if (!targetType || !targetId) {
      return json({ ok: false, error: 'target_type and target_id are required.' }, 400);
    }

    await ctx.env.DB
      .prepare(
        `
        DELETE FROM note_links
        WHERE note_id = ?1
          AND target_type = ?2
          AND target_id = ?3
        `
      )
      .bind(noteId, targetType, targetId)
      .run();

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove note link.';
    return json({ ok: false, error: message }, 500);
  }
};
