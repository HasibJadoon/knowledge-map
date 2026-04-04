import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import {
  computeWeekStartSydney,
  normalizeWeekPlanJson,
  normalizeTaskJson,
  addDays,
} from '../_utils/sprint';

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
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });
}

const DEFAULT_LANES = [
  { id: 'backlog',     lane_key: 'backlog',     title: 'Backlog',     order_index: 0, color: '#6B7280', is_done_lane: false },
  { id: 'in_progress', lane_key: 'in_progress', title: 'In Progress', order_index: 1, color: '#2563EB', is_done_lane: false },
  { id: 'review',      lane_key: 'review',      title: 'Review',      order_index: 2, color: '#D97706', is_done_lane: false },
  { id: 'done',        lane_key: 'done',        title: 'Done',        order_index: 3, color: '#059669', is_done_lane: true },
];

function parseTaskJson(raw: string | unknown): unknown {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw ?? {};
}

// GET /planner/week?week_start=YYYY-MM-DD&user_id=1
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const rawWeekStart = url.searchParams.get('week_start');
  const userId = Number(url.searchParams.get('user_id') ?? 1);

  const weekStart = rawWeekStart ? computeWeekStartSydney(rawWeekStart) : computeWeekStartSydney();
  const weekEnd = addDays(weekStart, 6);

  try {
    // --- Week plan ---
    const planRow = await env.DB
      .prepare('SELECT * FROM sp_weekly_plans WHERE week_start = ? AND user_id = ?')
      .bind(weekStart, userId)
      .first<{ week_start: string; user_id: number; week_json: string; created_at: string; updated_at: string | null }>();

    const weekPlan = planRow
      ? {
          week_start: planRow.week_start,
          user_id: planRow.user_id,
          item_json: normalizeWeekPlanJson(parseTaskJson(planRow.week_json), weekStart),
          created_at: planRow.created_at,
          updated_at: planRow.updated_at,
        }
      : null;

    // --- Tasks ---
    const tasksResult = await env.DB
      .prepare('SELECT * FROM sp_weekly_tasks WHERE week_start = ? AND user_id = ? ORDER BY order_index ASC')
      .bind(weekStart, userId)
      .all<{
        id: number; user_id: number; week_start: string; title: string; task_type: string;
        kanban_state: string; status: string; priority: number; points: number | null;
        due_date: string | null; order_index: number; task_json: string;
        source_task_id: string | null; created_at: string; updated_at: string | null;
      }>();

    const tasks = (tasksResult.results ?? []).map((row) => {
      const itemJson = normalizeTaskJson(parseTaskJson(row.task_json), row.title);
      return {
        id: String(row.id),
        week_start: row.week_start,
        title: row.title,
        task_type: row.task_type,
        kanban_state: row.kanban_state,
        priority: row.priority === 1 ? 'high' : row.priority === 2 ? 'medium' : 'low',
        points: row.points,
        due_date: row.due_date,
        order_index: row.order_index,
        source_task_id: row.source_task_id,
        related_node_id: null,
        related_node_title: null,
        item_json: itemJson,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    // --- Sprint review ---
    const reviewRow = await env.DB
      .prepare(
        'SELECT * FROM sp_sprint_reviews WHERE user_id = ? AND period_start = ? ORDER BY created_at DESC LIMIT 1'
      )
      .bind(userId, weekStart)
      .first<{ id: number; user_id: number; period_start: string; period_end: string; review_json: string; created_at: string; updated_at: string | null }>();

    const review = reviewRow
      ? {
          id: String(reviewRow.id),
          period_start: reviewRow.period_start,
          period_end: reviewRow.period_end,
          item_json: parseTaskJson(reviewRow.review_json),
          created_at: reviewRow.created_at,
          updated_at: reviewRow.updated_at,
        }
      : null;

    // --- Summary ---
    const tasksDone = tasks.filter((t) => t.kanban_state === 'done').length;
    const minutesSpent = tasks.reduce((sum, t) => {
      const actual = (t.item_json as { actual_min?: number | null }).actual_min;
      return sum + (typeof actual === 'number' ? actual : 0);
    }, 0);

    const captureCount = await env.DB
      .prepare("SELECT COUNT(*) as cnt FROM km_capture WHERE created_at >= ? AND created_at < ?")
      .bind(`${weekStart}T00:00:00`, `${weekEnd}T23:59:59`)
      .first<{ cnt: number }>();

    const summary = {
      tasks_done: tasksDone,
      tasks_total: tasks.length,
      minutes_spent: minutesSpent,
      inbox_count: 0,
      capture_notes: captureCount?.cnt ?? 0,
      promoted_notes: tasks.filter((t) => t.task_type === 'promoted_capture').length,
    };

    return new Response(
      JSON.stringify({
        ok: true,
        week_start: weekStart,
        weekPlan,
        tasks,
        review,
        summary,
        lanes: DEFAULT_LANES,
      }),
      { headers: JSON_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[planner/week] error:', message, stack);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
