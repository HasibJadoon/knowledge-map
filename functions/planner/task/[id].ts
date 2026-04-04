import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { normalizeTaskJson } from '../../_utils/sprint';

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
      'access-control-allow-methods': 'PUT, OPTIONS',
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

// PUT /planner/task/:id
export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const id = String(params['id']);
  try {
    const body = await request.json() as { user_id?: number; item_json?: unknown };
    const itemJson = normalizeTaskJson(body.item_json, 'Task');
    const title = itemJson.title;
    const kanbanState = (() => {
      const s = itemJson.status;
      if (s === 'done') return 'done';
      if (s === 'doing') return 'in_progress';
      if (s === 'blocked') return 'review';
      return 'backlog';
    })();

    await env.DB
      .prepare(
        `UPDATE sp_weekly_tasks
         SET title = ?, kanban_state = ?, task_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(title, kanbanState, JSON.stringify(itemJson), id)
      .run();

    const row = await env.DB
      .prepare('SELECT * FROM sp_weekly_tasks WHERE id = ?')
      .bind(id)
      .first<{
        id: number; user_id: number; week_start: string; title: string; task_type: string;
        kanban_state: string; status: string; priority: number; points: number | null;
        due_date: string | null; order_index: number; task_json: string;
        source_task_id: string | null; created_at: string; updated_at: string | null;
      }>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify({ ok: true, task: rowToTask(row) }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: JSON_HEADERS });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
