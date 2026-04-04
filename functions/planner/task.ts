import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import {
  computeWeekStartSydney,
  normalizeTaskJson,
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

function rowToTask(row: {
  id: number; user_id: number; week_start: string; title: string; task_type: string;
  kanban_state: string; status: string; priority: number; points: number | null;
  due_date: string | null; order_index: number; task_json: string;
  source_task_id: string | null; created_at: string; updated_at: string | null;
}) {
  const itemJson = normalizeTaskJson(parseJson(row.task_json), row.title);
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
}

// POST /planner/task — create a new sprint task
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = await request.json() as {
      user_id?: number;
      week_start?: string;
      item_json?: unknown;
      source_task_id?: string;
    };

    const userId = body.user_id ?? 1;
    const weekStart = body.week_start
      ? computeWeekStartSydney(body.week_start)
      : computeWeekStartSydney();

    const itemJson = normalizeTaskJson(body.item_json, 'New task');
    const title = itemJson.title;
    const lane = itemJson.lane;
    const priority = itemJson.priority === 'P1' ? 1 : itemJson.priority === 'P2' ? 2 : 3;
    const orderIndex = itemJson.order_index ?? Date.now();

    const result = await env.DB
      .prepare(
        `INSERT INTO sp_weekly_tasks
          (user_id, week_start, title, task_type, kanban_state, status, priority, order_index, task_json, source_task_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'backlog', 'planned', ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        userId,
        weekStart,
        title,
        lane ?? 'notes',
        priority,
        orderIndex,
        JSON.stringify(itemJson),
        body.source_task_id ?? null
      )
      .run();

    const newId = result.meta.last_row_id;
    const row = await env.DB
      .prepare('SELECT * FROM sp_weekly_tasks WHERE id = ?')
      .bind(newId)
      .first<{
        id: number; user_id: number; week_start: string; title: string; task_type: string;
        kanban_state: string; status: string; priority: number; points: number | null;
        due_date: string | null; order_index: number; task_json: string;
        source_task_id: string | null; created_at: string; updated_at: string | null;
      }>();

    return new Response(JSON.stringify({ ok: true, task: row ? rowToTask(row) : null }), {
      status: 201,
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
