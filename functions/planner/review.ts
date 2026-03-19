import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import {
  addDays,
  buildReviewCanonicalInput,
  computeWeekStartSydney,
  createDefaultSprintReviewJson,
  insertActivityLog,
  json,
  normalizeIsoDate,
  normalizeSprintReviewJson,
  parseBody,
  parseJsonObject,
  readInteger,
  readString,
} from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

async function computeWeekMetrics(db: D1Database, userId: number, weekStart: string) {
  const weekEnd = addDays(weekStart, 6);

  const taskRows = await db
    .prepare(
      `
      SELECT task_json, status, kanban_state
      FROM sp_weekly_tasks
      WHERE user_id = ?1
        AND week_start = ?2
      `
    )
    .bind(userId, weekStart)
    .all<Record<string, unknown>>();

  let tasksDone = 0;
  let minutesSpent = 0;
  const tasksTotal = (taskRows.results ?? []).length;
  for (const row of taskRows.results ?? []) {
    const item = parseJsonObject(row['task_json']) ?? {};
    const status = (readString(item['status']) ?? readString(row['status']) ?? '').trim();
    const kanban = (readString(row['kanban_state']) ?? '').trim();
    if (status === 'done' || kanban === 'done') {
      tasksDone += 1;
    }
    const actualMin = readInteger(item['actual_min']);
    if (actualMin !== null && actualMin > 0) {
      minutesSpent += actualMin;
    }
  }

  const captureCountRow = await db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM ar_capture_notes
      WHERE user_id = ?1
        AND date(created_at) >= ?2
        AND date(created_at) <= ?3
      `
    )
    .bind(userId, weekStart, weekEnd)
    .first<Record<string, unknown>>();
  const captureNotes = readInteger(captureCountRow?.['count']) ?? 0;

  const promotedCountRow = await db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM ar_notes
      WHERE user_id = ?1
        AND date(created_at) >= ?2
        AND date(created_at) <= ?3
      `
    )
    .bind(userId, weekStart, weekEnd)
    .first<Record<string, unknown>>();
  const promotedNotes = readInteger(promotedCountRow?.['count']) ?? 0;

  return {
    tasks_done: tasksDone,
    tasks_total: tasksTotal,
    minutes_spent: minutesSpent,
    capture_notes: captureNotes,
    promoted_notes: promotedNotes,
  };
}

async function upsertReview(
  db: D1Database,
  userId: number,
  weekStart: string,
  itemJson: Record<string, unknown>
) {
  const periodStart = weekStart;
  const periodEnd = addDays(weekStart, 6);

  const existing = await db
    .prepare(
      `
      SELECT id
      FROM sp_sprint_reviews
      WHERE user_id = ?1
        AND period_start = ?2
        AND period_end = ?3
      ORDER BY id DESC
      LIMIT 1
      `
    )
    .bind(userId, periodStart, periodEnd)
    .first<Record<string, unknown>>();

  const existingId = readInteger(existing?.['id']);
  if (existingId !== null) {
    await db
      .prepare(
        `
        UPDATE sp_sprint_reviews
        SET review_json = ?1,
            status = 'draft',
            updated_at = datetime('now')
        WHERE id = ?2
          AND user_id = ?3
        `
      )
      .bind(JSON.stringify(itemJson), existingId, userId)
      .run();
    return existingId;
  }

  const result = await db
    .prepare(
      `
      INSERT INTO sp_sprint_reviews
        (user_id, period_start, period_end, status, review_json, created_at, updated_at)
      VALUES
        (?1, ?2, ?3, 'draft', ?4, datetime('now'), datetime('now'))
      `
    )
    .bind(userId, periodStart, periodEnd, JSON.stringify(itemJson))
    .run();

  return readInteger(result.meta?.last_row_id) ?? null;
}

async function readReviewRow(db: D1Database, userId: number, weekStart: string) {
  const periodEnd = addDays(weekStart, 6);
  const raw = await db
    .prepare(
      `
      SELECT *
      FROM sp_sprint_reviews
      WHERE user_id = ?1
        AND period_start = ?2
        AND period_end = ?3
      ORDER BY id DESC
      LIMIT 1
      `
    )
    .bind(userId, weekStart, periodEnd)
    .first<Record<string, unknown>>();

  if (!raw) {
    return null;
  }

  const reviewId = readInteger(raw['id']);
  if (reviewId === null) {
    return null;
  }

  return {
    id: String(reviewId),
    canonical_input: buildReviewCanonicalInput(userId, weekStart),
    user_id: userId,
    item_type: 'sprint_review',
    week_start: weekStart,
    period_start: readString(raw['period_start']) ?? weekStart,
    period_end: readString(raw['period_end']) ?? addDays(weekStart, 6),
    related_type: null,
    related_id: null,
    item_json: normalizeSprintReviewJson(parseJsonObject(raw['review_json']), weekStart),
    status: readString(raw['status']) ?? 'draft',
    created_at: readString(raw['created_at']) ?? '',
    updated_at: readString(raw['updated_at']),
  };
}

async function handleUpsert(ctx: Parameters<PagesFunction<Env>>[0]) {
  const user = await requireAuth(ctx);
  if (!user) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const body = await parseBody(ctx.request);
  if (!body) {
    return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
  }

  const weekRaw = readString(body['week_start']);
  const weekDate = normalizeIsoDate(weekRaw);
  if (weekRaw !== null && !weekDate) {
    return json({ ok: false, error: 'week_start must be YYYY-MM-DD.' }, 400);
  }

  const weekStart = computeWeekStartSydney(weekDate);
  const metrics = await computeWeekMetrics(ctx.env.DB, user.id, weekStart);
  const inputJson = parseJsonObject(body['item_json']);
  const normalized = normalizeSprintReviewJson(inputJson, weekStart);
  normalized.metrics = metrics;

  const reviewId = await upsertReview(ctx.env.DB, user.id, weekStart, normalized);
  if (reviewId === null) {
    return json({ ok: false, error: 'Failed to save sprint review.' }, 500);
  }

  await insertActivityLog({
    db: ctx.env.DB,
    userId: user.id,
    eventType: 'planner_review_upsert',
    targetType: 'sp_sprint_reviews',
    targetId: String(reviewId),
    ref: weekStart,
    eventJson: metrics,
  });

  const review = await readReviewRow(ctx.env.DB, user.id, weekStart);
  if (!review) {
    return json({ ok: false, error: 'Failed to save sprint review.' }, 500);
  }

  return json({
    ok: true,
    week_start: weekStart,
    review,
  });
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    return await handleUpsert(ctx);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save sprint review.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    return await handleUpsert(ctx);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save sprint review.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const url = new URL(ctx.request.url);
    const weekRaw = url.searchParams.get('week_start');
    const weekDate = normalizeIsoDate(weekRaw);
    if (weekRaw && !weekDate) {
      return json({ ok: false, error: 'week_start must be YYYY-MM-DD.' }, 400);
    }

    const weekStart = computeWeekStartSydney(weekDate);
    let review = await readReviewRow(ctx.env.DB, user.id, weekStart);

    if (!review) {
      const metrics = await computeWeekMetrics(ctx.env.DB, user.id, weekStart);
      const fallback = createDefaultSprintReviewJson(weekStart);
      fallback.metrics = metrics;
      review = {
        id: `draft:${weekStart}`,
        canonical_input: buildReviewCanonicalInput(user.id, weekStart),
        user_id: user.id,
        item_type: 'sprint_review',
        week_start: weekStart,
        period_start: weekStart,
        period_end: addDays(weekStart, 6),
        related_type: null,
        related_id: null,
        item_json: fallback,
        status: 'draft',
        created_at: '',
        updated_at: null,
      };
    }

    return json({
      ok: true,
      week_start: weekStart,
      review,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load sprint review.';
    return json({ ok: false, error: message }, 500);
  }
};
