import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import {
  addDays,
  computeWeekStartSydney,
  ensureWeekAnchors,
  ensureWeeklyPlanExists,
  insertActivityLog,
  json,
  mapWeeklyTaskToPlannerTaskRow,
  normalizeIsoDate,
  normalizeSprintReviewJson,
  normalizeWeekPlanJson,
  parseBody,
  parseJsonObject,
  readInteger,
  readString,
  readTrimmed,
} from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type WeekPayload = {
  weekPlan: Record<string, unknown> | null;
  tasks: Array<Record<string, unknown>>;
  review: Record<string, unknown> | null;
  summary: {
    tasks_done: number;
    tasks_total: number;
    minutes_spent: number;
    inbox_count: number;
    capture_notes: number;
    promoted_notes: number;
  };
};

function mapWeekPlanRow(
  row: Record<string, unknown> | null,
  userId: number,
  weekStart: string
): Record<string, unknown> | null {
  if (!row) {
    return null;
  }

  const itemJson = normalizeWeekPlanJson(parseJsonObject(row['week_json']), weekStart);
  const createdAt = readString(row['created_at']) ?? '';
  const updatedAt = readString(row['updated_at']);

  return {
    id: `SP_WEEKLY_PLAN|${userId}|${weekStart}`,
    canonical_input: `SP_WEEKLY_PLAN|user:${userId}|week:${weekStart}`,
    user_id: userId,
    item_type: 'week_plan',
    week_start: weekStart,
    period_start: null,
    period_end: null,
    related_type: null,
    related_id: null,
    item_json: itemJson,
    status: 'active',
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function mapReviewRow(
  row: Record<string, unknown> | null,
  userId: number,
  weekStart: string
): Record<string, unknown> | null {
  if (!row) {
    return null;
  }

  const reviewId = readInteger(row['id']);
  if (reviewId === null) {
    return null;
  }

  const periodStart = readString(row['period_start']) ?? weekStart;
  const periodEnd = readString(row['period_end']) ?? addDays(weekStart, 6);
  const itemJson = normalizeSprintReviewJson(parseJsonObject(row['review_json']), weekStart);

  return {
    id: String(reviewId),
    canonical_input: `SP_SPRINT_REVIEW|user:${userId}|week:${weekStart}`,
    user_id: userId,
    item_type: 'sprint_review',
    week_start: weekStart,
    period_start: periodStart,
    period_end: periodEnd,
    related_type: null,
    related_id: null,
    item_json: itemJson,
    status: readTrimmed(row['status']) ?? 'draft',
    created_at: readString(row['created_at']) ?? '',
    updated_at: readString(row['updated_at']),
  };
}

async function loadWeekData(db: D1Database, userId: number, weekStart: string): Promise<WeekPayload> {
  const weekPlanRaw = await db
    .prepare(
      `
      SELECT week_start, user_id, week_json, created_at, updated_at
      FROM sp_weekly_plans
      WHERE user_id = ?1
        AND week_start = ?2
      LIMIT 1
      `
    )
    .bind(userId, weekStart)
    .first<Record<string, unknown>>();

  const taskResult = await db
    .prepare(
      `
      SELECT *
      FROM sp_weekly_tasks
      WHERE user_id = ?1
        AND week_start = ?2
      ORDER BY order_index ASC, datetime(COALESCE(updated_at, created_at)) DESC
      `
    )
    .bind(userId, weekStart)
    .all<Record<string, unknown>>();

  const weekEnd = addDays(weekStart, 6);
  const reviewRaw = await db
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
    .bind(userId, weekStart, weekEnd)
    .first<Record<string, unknown>>();

  const tasks = (taskResult.results ?? [])
    .map((row) => mapWeeklyTaskToPlannerTaskRow(row))
    .filter((row): row is NonNullable<ReturnType<typeof mapWeeklyTaskToPlannerTaskRow>> => row !== null)
    .map((row) => row as unknown as Record<string, unknown>);

  let tasksDone = 0;
  let minutesSpent = 0;
  for (const row of tasks) {
    const item = parseJsonObject(row['item_json']) ?? {};
    if ((readTrimmed(item['status']) ?? '') === 'done') {
      tasksDone += 1;
    }
    const actualMin = readInteger(item['actual_min']);
    if (actualMin !== null && actualMin > 0) {
      minutesSpent += actualMin;
    }
  }

  const inboxCountRow = await db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM ar_capture_notes
      WHERE user_id = ?1
        AND status = 'inbox'
      `
    )
    .bind(userId)
    .first<Record<string, unknown>>();
  const inboxCount = readInteger(inboxCountRow?.['count']) ?? 0;

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
    weekPlan: mapWeekPlanRow(weekPlanRaw, userId, weekStart),
    tasks,
    review: mapReviewRow(reviewRaw, userId, weekStart),
    summary: {
      tasks_done: tasksDone,
      tasks_total: tasks.length,
      minutes_spent: minutesSpent,
      inbox_count: inboxCount,
      capture_notes: captureNotes,
      promoted_notes: promotedNotes,
    },
  };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    const url = new URL(ctx.request.url);
    const weekStartRaw = url.searchParams.get('week_start');
    const normalized = normalizeIsoDate(weekStartRaw);
    if (weekStartRaw && !normalized) {
      return json({ ok: false, error: 'week_start must be YYYY-MM-DD.' }, 400);
    }

    const weekStart = computeWeekStartSydney(normalized);
    await ensureWeekAnchors({
      db: ctx.env.DB,
      userId: user.id,
      weekStart,
    });
    const payload = await loadWeekData(ctx.env.DB, user.id, weekStart);

    return json({
      ok: true,
      week_start: weekStart,
      ...payload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load planner week.';
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

    const weekInput = readString(body['week_start']);
    const weekDate = normalizeIsoDate(weekInput);
    if (weekInput !== null && !weekDate) {
      return json({ ok: false, error: 'week_start must be YYYY-MM-DD.' }, 400);
    }

    const weekStart = computeWeekStartSydney(weekDate);
    const title = readTrimmed(body['title']) ?? null;
    const customJson = parseJsonObject(body['item_json']);
    const itemJson = normalizeWeekPlanJson(customJson, weekStart, title);

    const insertResult = await ctx.env.DB
      .prepare(
        `
        INSERT OR IGNORE INTO sp_weekly_plans
          (week_start, user_id, notes, planned_count, done_count, week_json, created_at, updated_at)
        VALUES
          (?1, ?2, NULL, 0, 0, ?3, datetime('now'), datetime('now'))
        `
      )
      .bind(weekStart, user.id, JSON.stringify(itemJson))
      .run();

    await ensureWeeklyPlanExists({
      db: ctx.env.DB,
      userId: user.id,
      weekStart,
      title,
    });
    await ensureWeekAnchors({
      db: ctx.env.DB,
      userId: user.id,
      weekStart,
    });

    if ((insertResult.meta?.changes ?? 0) > 0) {
      await insertActivityLog({
        db: ctx.env.DB,
        userId: user.id,
        eventType: 'planner_week_create',
        targetType: 'sp_weekly_plans',
        targetId: `${weekStart}:${user.id}`,
        ref: weekStart,
        eventJson: { week_start: weekStart },
      });
    }

    const payload = await loadWeekData(ctx.env.DB, user.id, weekStart);
    return json(
      {
        ok: true,
        week_start: weekStart,
        ...payload,
      },
      (insertResult.meta?.changes ?? 0) > 0 ? 201 : 200
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create week plan.';
    return json({ ok: false, error: message }, 500);
  }
};
