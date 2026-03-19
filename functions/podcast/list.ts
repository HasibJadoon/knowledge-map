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
          SELECT id, canonical_input, user_id, title, content_type, status, related_type, related_id, refs_json, content_json, created_at, updated_at
          FROM wv_content_items
          WHERE user_id = ?1
            AND content_type = 'podcast_episode'
            AND title LIKE ?2
          ORDER BY COALESCE(updated_at, created_at) DESC
          LIMIT ?3
          `
        )
        .bind(user.id, like, limit)
        .all<Record<string, unknown>>();

      return json({ ok: true, items: result.results ?? [] });
    }

    const result = await ctx.env.DB
      .prepare(
        `
        SELECT id, canonical_input, user_id, title, content_type, status, related_type, related_id, refs_json, content_json, created_at, updated_at
        FROM wv_content_items
        WHERE user_id = ?1
          AND content_type = 'podcast_episode'
        ORDER BY COALESCE(updated_at, created_at) DESC
        LIMIT ?2
        `
      )
      .bind(user.id, limit)
      .all<Record<string, unknown>>();

    return json({ ok: true, items: result.results ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list podcast episodes.';
    return json({ ok: false, error: message }, 500);
  }
};
