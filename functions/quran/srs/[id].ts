import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { resolveSrsTable } from '../../_utils/srs';

interface Env {
  DB: D1Database;
}

type SrsRating = 'again' | 'hard' | 'good' | 'easy';

type SrsRow = {
  id: number | string;
  item_type: string;
  item_key: string;
  card_json?: string | null;
  status: string | null;
  due_at?: string | null;
  last_review_at?: string | null;
  interval_days?: number | null;
  ease?: number | null;
  reps?: number | null;
  lapses?: number | null;
  last_rating?: string | null;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'];
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    let body: { rating?: string } | null = null;
    try {
      body = await ctx.request.json<{ rating?: string }>();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const rating = normalizeRating(body?.rating);
    if (!rating) {
      return new Response(
        JSON.stringify({ ok: false, error: 'rating must be again, hard, good, or easy' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const srsTable = await resolveSrsTable(ctx.env.DB);

    const current = await ctx.env.DB.prepare(`
      SELECT
        id,
        item_type,
        item_key,
        card_json,
        status,
        due_at,
        last_review_at,
        interval_days,
        ease,
        reps,
        lapses,
        last_rating
      FROM ${srsTable}
      WHERE id = ?
    `)
      .bind(id)
      .first<SrsRow>();

    if (!current) {
      return new Response(
        JSON.stringify({ ok: false, error: 'SRS item not found' }),
        { status: 404, headers: jsonHeaders },
      );
    }

    const scheduled = scheduleNextReview(current, rating);

    await ctx.env.DB.prepare(`
      UPDATE ${srsTable}
      SET
        status = ?,
        due_at = ?,
        last_review_at = ?,
        interval_days = ?,
        ease = ?,
        reps = ?,
        lapses = ?,
        last_rating = ?
      WHERE id = ?
    `)
      .bind(
        scheduled.status,
        scheduled.due_at,
        scheduled.last_review_at,
        scheduled.interval_days,
        scheduled.ease,
        scheduled.reps,
        scheduled.lapses,
        scheduled.last_rating,
        id,
      )
      .run();

    return new Response(
      JSON.stringify({
        ok: true,
        item: {
          ...current,
          ...scheduled,
        },
      }),
      { headers: jsonHeaders },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders },
    );
  }
};

function normalizeRating(raw?: string | null): SrsRating | null {
  if (raw === 'again' || raw === 'hard' || raw === 'good' || raw === 'easy') {
    return raw;
  }
  return null;
}

function scheduleNextReview(item: SrsRow, rating: SrsRating): SrsRow {
  const ease = Number(item.ease ?? 2.5);
  const reps = Number(item.reps ?? 0);
  const lapses = Number(item.lapses ?? 0);
  const interval = Math.max(1, Number(item.interval_days ?? 1));

  let nextEase = ease;
  let nextReps = reps + 1;
  let nextLapses = lapses;
  let nextInterval = interval;

  if (rating === 'again') {
    nextEase = Math.max(1.3, ease - 0.2);
    nextReps = 0;
    nextLapses = lapses + 1;
    nextInterval = 1;
  } else if (rating === 'hard') {
    nextEase = Math.max(1.3, ease - 0.15);
    nextInterval = reps <= 1 ? 2 : Math.max(2, Math.round(interval * 1.2));
  } else if (rating === 'good') {
    nextInterval = reps <= 0 ? 1 : reps === 1 ? 3 : Math.max(2, Math.round(interval * ease));
  } else {
    nextEase = ease + 0.15;
    nextInterval = reps <= 0 ? 4 : reps === 1 ? 7 : Math.max(4, Math.round(interval * (ease + 0.15)));
  }

  const now = new Date();
  const dueAt = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000).toISOString();

  return {
    ...item,
    status: 'active',
    due_at: dueAt,
    last_review_at: now.toISOString(),
    interval_days: nextInterval,
    ease: Number(nextEase.toFixed(2)),
    reps: nextReps,
    lapses: nextLapses,
    last_rating: rating,
  };
}
