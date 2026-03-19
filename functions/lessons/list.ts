import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import { json, readInteger } from '../_utils/sprint';

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
    const q = (url.searchParams.get('q') ?? '').trim();
    const limitInput = readInteger(url.searchParams.get('limit'));
    const limit = Math.max(1, Math.min(200, limitInput ?? 80));

    if (q) {
      const like = `%${q}%`;
      const result = await ctx.env.DB
        .prepare(
          `
          SELECT id, user_id, title, lesson_type, status, container_id, unit_id, updated_at, created_at
          FROM ar_lessons
          WHERE user_id = ?1
            AND title LIKE ?2
          ORDER BY COALESCE(updated_at, created_at) DESC
          LIMIT ?3
          `
        )
        .bind(user.id, like, limit)
        .all<Record<string, unknown>>();

      return json({ ok: true, lessons: result.results ?? [] });
    }

    const result = await ctx.env.DB
      .prepare(
        `
        SELECT id, user_id, title, lesson_type, status, container_id, unit_id, updated_at, created_at
        FROM ar_lessons
        WHERE user_id = ?1
        ORDER BY COALESCE(updated_at, created_at) DESC
        LIMIT ?2
        `
      )
      .bind(user.id, limit)
      .all<Record<string, unknown>>();

    return json({ ok: true, lessons: result.results ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list lessons.';
    return json({ ok: false, error: message }, 500);
  }
};
