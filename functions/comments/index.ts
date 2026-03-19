import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import {
  fetchOwnedNote,
  json,
  mapCommentRow,
  parseBody,
  parseCommentTargetType,
  readString,
  readTrimmedString,
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

    const url = new URL(ctx.request.url);
    const targetType = parseCommentTargetType(url.searchParams.get('target_type'));
    const targetId = readTrimmedString(url.searchParams.get('target_id'));

    if (!targetType || !targetId) {
      return json({ ok: false, error: 'target_type and target_id are required.' }, 400);
    }

    if (targetType === 'note') {
      const note = await fetchOwnedNote(ctx.env.DB, targetId, user.id);
      if (!note) {
        return json({ ok: false, error: 'Note not found.' }, 404);
      }

      const { results = [] } = await ctx.env.DB
        .prepare(
          `
          SELECT comments.id, comments.user_id, users.email AS author_email, comments.target_type, comments.target_id, comments.body_md, comments.created_at
          FROM comments
          LEFT JOIN users ON users.id = comments.user_id
          WHERE target_type = ?1
            AND target_id = ?2
          ORDER BY created_at ASC, id ASC
          LIMIT 400
          `
        )
        .bind(targetType, targetId)
        .all<Record<string, unknown>>();

      return json({ ok: true, comments: results.map(mapCommentRow) });
    }

    const { results = [] } = await ctx.env.DB
      .prepare(
        `
        SELECT comments.id, comments.user_id, users.email AS author_email, comments.target_type, comments.target_id, comments.body_md, comments.created_at
        FROM comments
        LEFT JOIN users ON users.id = comments.user_id
        WHERE user_id = ?1
          AND target_type = ?2
          AND target_id = ?3
        ORDER BY created_at ASC, id ASC
        LIMIT 400
        `
      )
      .bind(user.id, targetType, targetId)
      .all<Record<string, unknown>>();

    return json({ ok: true, comments: results.map(mapCommentRow) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load comments.';
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

    const targetType = parseCommentTargetType(body['target_type']);
    const targetId = readTrimmedString(body['target_id']);
    const bodyMarkdown = readString(body['body_md']);

    if (!targetType || !targetId || bodyMarkdown === null || bodyMarkdown.trim().length === 0) {
      return json({ ok: false, error: 'target_type, target_id, and body_md are required.' }, 400);
    }

    const commentId = crypto.randomUUID();

    await ctx.env.DB
      .prepare(
        `
        INSERT INTO comments (id, user_id, target_type, target_id, body_md, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
        `
      )
      .bind(commentId, user.id, targetType, targetId, bodyMarkdown)
      .run();

    const row = await ctx.env.DB
      .prepare(
        `
        SELECT comments.id, comments.user_id, users.email AS author_email, comments.target_type, comments.target_id, comments.body_md, comments.created_at
        FROM comments
        LEFT JOIN users ON users.id = comments.user_id
        WHERE id = ?1 AND user_id = ?2
        LIMIT 1
        `
      )
      .bind(commentId, user.id)
      .first<Record<string, unknown>>();

    if (!row) {
      return json({ ok: false, error: 'Failed to create comment.' }, 500);
    }

    return json({ ok: true, comment: mapCommentRow(row) }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create comment.';
    return json({ ok: false, error: message }, 500);
  }
};
