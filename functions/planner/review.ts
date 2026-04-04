import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { computeWeekStartSydney, normalizeSprintReviewJson, addDays } from '../_utils/sprint';

interface Env {
  DB: D1Database;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function cors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });
}

function parseJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw ?? {};
}

// POST /planner/review — upsert sprint review
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = await request.json() as {
      user_id?: number;
      week_start?: string;
      item_json?: unknown;
    };

    const userId = body.user_id ?? 1;
    const weekStart = body.week_start
      ? computeWeekStartSydney(body.week_start)
      : computeWeekStartSydney();
    const periodEnd = addDays(weekStart, 6);

    const reviewJson = normalizeSprintReviewJson(body.item_json, weekStart);

    const existing = await env.DB
      .prepare('SELECT id FROM sp_sprint_reviews WHERE user_id = ? AND period_start = ? ORDER BY created_at DESC LIMIT 1')
      .bind(userId, weekStart)
      .first<{ id: number }>();

    let reviewId: number;

    if (existing) {
      await env.DB
        .prepare(
          `UPDATE sp_sprint_reviews
           SET review_json = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(JSON.stringify(reviewJson), existing.id)
        .run();
      reviewId = existing.id;
    } else {
      const result = await env.DB
        .prepare(
          `INSERT INTO sp_sprint_reviews (user_id, period_start, period_end, status, review_json, created_at, updated_at)
           VALUES (?, ?, ?, 'draft', ?, datetime('now'), datetime('now'))`
        )
        .bind(userId, weekStart, periodEnd, JSON.stringify(reviewJson))
        .run();
      reviewId = result.meta.last_row_id as number;
    }

    const row = await env.DB
      .prepare('SELECT * FROM sp_sprint_reviews WHERE id = ?')
      .bind(reviewId)
      .first<{ id: number; period_start: string; period_end: string; review_json: string; created_at: string; updated_at: string | null }>();

    const review = row
      ? {
          id: String(row.id),
          period_start: row.period_start,
          period_end: row.period_end,
          item_json: parseJson(row.review_json),
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      : null;

    return new Response(JSON.stringify({ ok: true, review }), {
      status: existing ? 200 : 201,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
