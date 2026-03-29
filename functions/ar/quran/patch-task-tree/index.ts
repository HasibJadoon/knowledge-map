// ─────────────────────────────────────────────────────────────────────────────
//  PATCH /ar/quran/patch-task-tree
//  Lightweight endpoint: update only task_json.tree for a given task_id.
//  Used by the sentence-structure canvas after an inline node edit.
//
//  Body: { task_id: string; tree: object; term_colors?: object }
// ─────────────────────────────────────────────────────────────────────────────

interface Env { DB: D1Database; }

const HEADERS: HeadersInit = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function resp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

// ── PUT (idempotent patch) ────────────────────────────────────────────────────
export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown>;
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return resp({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const taskId = typeof body['task_id'] === 'string' ? body['task_id'].trim() : '';
  if (!taskId) return resp({ ok: false, error: 'task_id is required' }, 400);

  const tree = body['tree'];
  if (!tree || typeof tree !== 'object') return resp({ ok: false, error: 'tree (object) is required' }, 400);

  const termColors = body['term_colors'] && typeof body['term_colors'] === 'object'
    ? body['term_colors']
    : null;

  try {
    // Verify the task exists
    const existing = await ctx.env.DB
      .prepare(`SELECT task_id FROM ar_container_unit_task WHERE task_id = ?1 LIMIT 1`)
      .bind(taskId)
      .first<{ task_id: string }>();

    if (!existing) return resp({ ok: false, error: `Task not found: ${taskId}` }, 404);

    // Patch task_json.tree (and optionally term_colors) in-place
    if (termColors !== null) {
      await ctx.env.DB
        .prepare(`
          UPDATE ar_container_unit_task
          SET task_json = json_set(
            task_json,
            '$.tree',        json(?2),
            '$.term_colors', json(?3)
          )
          WHERE task_id = ?1
        `)
        .bind(taskId, JSON.stringify(tree), JSON.stringify(termColors))
        .run();
    } else {
      await ctx.env.DB
        .prepare(`
          UPDATE ar_container_unit_task
          SET task_json = json_set(task_json, '$.tree', json(?2))
          WHERE task_id = ?1
        `)
        .bind(taskId, JSON.stringify(tree))
        .run();
    }

    return resp({ ok: true, task_id: taskId });
  } catch (e: any) {
    return resp({ ok: false, error: e?.message ?? String(e) }, 500);
  }
};

// ── CORS preflight ────────────────────────────────────────────────────────────
export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin':  '*',
      'access-control-allow-methods': 'PUT, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
  });
