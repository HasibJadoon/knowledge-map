import type { Env } from '../_utils/env';

interface PushPayload {
  workspace_id: number;
  unit_id: string;
  container_id: string;
  origin_type: 'quran_unit' | 'arabic_book_unit' | 'arabic_multimedia_unit' | 'arabic_literature_unit';
  display_name: string;
  uri: string;
  task_scope: 'unit';
  target_bucket: string;
  subtasks: Array<{
    id: string;
    key: string;
    title: string;
    status: 'todo';
    order_index: number;
  }>;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as PushPayload;
    const { workspace_id, unit_id, container_id, origin_type,
            display_name, uri, task_scope, target_bucket, subtasks } = body;

    if (!workspace_id || !unit_id || !display_name) {
      return new Response(JSON.stringify({ error: 'workspace_id, unit_id, and display_name are required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = env.DB;

    // Duplicate check: workspace_id + unit_id only (no week_start)
    const existing = await db
      .prepare('SELECT id FROM sp_weekly_tasks WHERE workspace_id = ? AND unit_id = ? LIMIT 1')
      .bind(workspace_id, unit_id)
      .first<{ id: number }>();

    if (existing) {
      return new Response(JSON.stringify({ action: 'existing', task_id: existing.id }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const taskJson = JSON.stringify({
      origin_type,
      container_id,
      unit_id,
      display_name,
      uri,
      task_scope,
      target_bucket,
      subtasks,
    });

    const result = await db
      .prepare(`
        INSERT INTO sp_weekly_tasks
          (workspace_id, unit_id, container_id, title, task_type, status, kanban_state, priority, task_json)
        VALUES (?, ?, ?, ?, ?, 'planned', 'backlog', 'medium', ?)
      `)
      .bind(workspace_id, unit_id, container_id ?? null, display_name, origin_type, taskJson)
      .run();

    return new Response(JSON.stringify({ action: 'created', task_id: result.meta.last_row_id }), {
      status: 201, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('push-to-weekly-task error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
