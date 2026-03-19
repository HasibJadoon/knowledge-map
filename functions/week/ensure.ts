import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../_utils/auth';
import {
  addDays,
  computeWeekStartSydney,
  ensureWeekAnchors,
  json,
  mapWeeklyTaskToPlannerTaskRow,
  normalizeIsoDate,
  normalizeSprintReviewJson,
  normalizeWeekPlanJson,
  parseJsonObject,
  readInteger,
  readString,
  readTrimmed,
} from '../_utils/sprint';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

async function tableExists(db: D1Database, tableName: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?1
      LIMIT 1
      `
    )
    .bind(tableName)
    .first<Record<string, unknown>>();

  return Boolean(row);
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
    created_at: readString(row['created_at']) ?? '',
    updated_at: readString(row['updated_at']),
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

  return {
    id: String(reviewId),
    canonical_input: `SP_SPRINT_REVIEW|user:${userId}|week:${weekStart}`,
    user_id: userId,
    item_type: 'sprint_review',
    week_start: weekStart,
    period_start: readString(row['period_start']) ?? weekStart,
    period_end: readString(row['period_end']) ?? addDays(weekStart, 6),
    related_type: null,
    related_id: null,
    item_json: normalizeSprintReviewJson(parseJsonObject(row['review_json']), weekStart),
    status: readTrimmed(row['status']) ?? 'draft',
    created_at: readString(row['created_at']) ?? '',
    updated_at: readString(row['updated_at']),
  };
}

export async function loadWeekData(db: D1Database, userId: number, weekStart: string): Promise<WeekPayload> {
  const hasWeeklyPlans = await tableExists(db, 'sp_weekly_plans');
  const hasWeeklyTasks = await tableExists(db, 'sp_weekly_tasks');
  const hasSprintReviews = await tableExists(db, 'sp_sprint_reviews');
  const hasCaptureNotes = await tableExists(db, 'ar_capture_notes');
  const hasNotes = await tableExists(db, 'ar_notes');

  if (!hasWeeklyPlans || !hasWeeklyTasks) {
    return {
      weekPlan: null,
      tasks: [],
      review: null,
      summary: {
        tasks_done: 0,
        tasks_total: 0,
        minutes_spent: 0,
        inbox_count: 0,
        capture_notes: 0,
        promoted_notes: 0,
      },
    };
  }

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
  const reviewRaw = hasSprintReviews
    ? await db
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
        .first<Record<string, unknown>>()
    : null;

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

  const inboxCountRow = hasCaptureNotes
    ? await db
        .prepare(
          `
          SELECT COUNT(*) AS count
          FROM ar_capture_notes
          WHERE user_id = ?1
            AND status = 'inbox'
          `
        )
        .bind(userId)
        .first<Record<string, unknown>>()
    : null;
  const inboxCount = readInteger(inboxCountRow?.['count']) ?? 0;

  const captureCountRow = hasCaptureNotes
    ? await db
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
        .first<Record<string, unknown>>()
    : null;
  const captureNotes = readInteger(captureCountRow?.['count']) ?? 0;

  const promotedCountRow = hasNotes
    ? await db
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
        .first<Record<string, unknown>>()
    : null;
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

async function handleEnsure(ctx: Parameters<PagesFunction<Env>>[0]): Promise<Response> {
  const user = await requireAuth(ctx);
  if (!user) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const url = new URL(ctx.request.url);
  const queryWeek = normalizeIsoDate(url.searchParams.get('week_start'));
  const body = ctx.request.method === 'POST' ? await ctx.request.json().catch(() => null) : null;
  const bodyWeek = normalizeIsoDate(
    body && typeof body === 'object' && body !== null ? readString((body as Record<string, unknown>)['week_start']) : null
  );

  const weekStart = computeWeekStartSydney(queryWeek ?? bodyWeek);
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
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    return await handleEnsure(ctx);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to ensure week.';
    return json({ ok: false, error: message }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    return await handleEnsure(ctx);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to ensure week.';
    return json({ ok: false, error: message }, 500);
  }
};
