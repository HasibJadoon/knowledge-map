import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { normalizeTaskJson } from '../../../_utils/sprint';

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

// POST /planner/task/:id/complete
export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const id = String(params['id']);
  try {
    const body = await request.json() as { actual_min?: number };

    const existing = await env.DB
      .prepare('SELECT * FROM sp_weekly_tasks WHERE id = ?')
      .bind(id)
      .first<{ id: number; task_json: string; title: string; week_start: string; task_type: string; kanban_state: string; status: string; priority: number; points: number | null; due_date: string | null; order_index: number; source_task_id: string | null; created_at: string; updated_at: string | null }>();

    if (!existing) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: JSON_HEADERS });
    }

    const currentJson = normalizeTaskJson(parseJson(existing.task_json), existing.title);
    const updatedJson = {
      ...currentJson,
      status: 'done' as const,
      actual_min: body.actual_min ?? currentJson.actual_min ?? currentJson.estimate_min,
    };

    await env.DB
      .prepare(
        `UPDATE sp_weekly_tasks
         SET kanban_state = 'done', status = 'done', task_json = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(JSON.stringify(updatedJson), id)
      .run();

    const row = await env.DB
      .prepare('SELECT * FROM sp_weekly_tasks WHERE id = ?')
      .bind(id)
      .first<{ id: number; user_id: number; week_start: string; title: string; task_type: string; kanban_state: string; status: string; priority: number; points: number | null; due_date: string | null; order_index: number; task_json: string; source_task_id: string | null; created_at: string; updated_at: string | null }>();

    const itemJson = normalizeTaskJson(parseJson(row!.task_json), row!.title);
    const task = {
      id: String(row!.id),
      week_start: row!.week_start,
      title: row!.title,
      task_type: row!.task_type,
      kanban_state: row!.kanban_state,
      priority: row!.priority === 1 ? 'high' : row!.priority === 2 ? 'medium' : 'low',
      points: row!.points,
      due_date: row!.due_date,
      order_index: row!.order_index,
      source_task_id: row!.source_task_id,
      related_node_id: null,
      related_node_title: null,
      item_json: itemJson,
      created_at: row!.created_at,
      updated_at: row!.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, task }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: JSON_HEADERS });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
