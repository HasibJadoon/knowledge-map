import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJson(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url    = new URL(ctx.request.url);
    const limit  = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')  ?? 50)));
    const offset = Math.max(0,               Number(url.searchParams.get('offset') ?? 0));
    const unitId = (url.searchParams.get('unit_id') ?? '').trim();
    const status = (url.searchParams.get('status') ?? '').trim();
    const type   = (url.searchParams.get('task_type') ?? '').trim();
    const q      = (url.searchParams.get('q') ?? '').trim();

    const where: string[] = [];
    const binds: unknown[] = [];

    if (unitId) { where.push(`t.unit_id = ?${binds.length + 1}`); binds.push(unitId); }
    if (status) { where.push(`t.status = ?${binds.length + 1}`);  binds.push(status); }
    if (type)   { where.push(`t.task_type = ?${binds.length + 1}`); binds.push(type); }
    if (q) {
      where.push(`(t.task_name LIKE ?${binds.length + 1} OR t.task_id LIKE ?${binds.length + 2})`);
      binds.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRow, dataRes] = await Promise.all([
      ctx.env.DB.prepare(`SELECT COUNT(*) AS n FROM ar_container_unit_task t ${whereClause}`)
        .bind(...binds).first<{ n: number }>(),
      ctx.env.DB.prepare(
        `SELECT t.task_id, t.unit_id, t.task_type, t.task_name, t.status,
                t.version_no, t.step_no, t.created_at, t.updated_at,
                SUBSTR(t.task_json, 1, 200) AS task_json_preview,
                u.container_id,
                c.title AS container_title
         FROM ar_container_unit_task t
         LEFT JOIN ar_container_units u ON u.id = t.unit_id
         LEFT JOIN ar_containers c ON c.id = u.container_id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
      ).bind(...binds, limit, offset).all(),
    ]);

    const total = Number(countRow?.n ?? 0);
    const results = (dataRes.results ?? []).map((r: any) => ({
      ...r,
      task_json: safeJson(r.task_json_preview),
      task_json_preview: undefined,
    }));

    return new Response(
      JSON.stringify({ ok: true, total, limit, offset, hasMore: offset + results.length < total, results }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const body: any = await ctx.request.json().catch(() => null);
    if (!body) return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders });

    const task_id   = (body.task_id ?? '').trim();
    const unit_id   = (body.unit_id ?? '').trim();
    const task_type = (body.task_type ?? '').trim();
    const task_name = (body.task_name ?? '').trim();
    if (!task_id || !unit_id || !task_type || !task_name) {
      return new Response(JSON.stringify({ ok: false, error: 'task_id, unit_id, task_type, task_name are required' }), { status: 400, headers: jsonHeaders });
    }

    const VALID_TYPES = new Set([
      'reading','sentence_structure','morphology','grammar_concepts','expressions',
      'comprehension','passage_structure','worldview','translation_semantics',
      'near_synonyms','surah_analysis','cross_corpus','children_lesson',
      'vocabulary','reaction',
    ]);
    if (!VALID_TYPES.has(task_type)) {
      return new Response(JSON.stringify({ ok: false, error: `Invalid task_type: ${task_type}` }), { status: 400, headers: jsonHeaders });
    }

    const task_json     = JSON.stringify(body.task_json ?? {});
    const status        = body.status ?? 'draft';
    const version_no    = Number(body.version_no ?? 1);
    const step_no       = body.step_no ?? null;
    const parent_task_id = body.parent_task_id ?? null;

    await ctx.env.DB.prepare(
      `INSERT INTO ar_container_unit_task
         (task_id, unit_id, parent_task_id, task_type, task_name, task_json, status, version_no, step_no)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       ON CONFLICT(task_id) DO UPDATE SET
         task_type    = excluded.task_type,
         task_name    = excluded.task_name,
         task_json    = excluded.task_json,
         status       = excluded.status,
         version_no   = excluded.version_no,
         step_no      = excluded.step_no,
         updated_at   = datetime('now')`
    ).bind(task_id, unit_id, parent_task_id, task_type, task_name, task_json, status, version_no, step_no).run();

    return new Response(JSON.stringify({ ok: true, task_id }), { status: 201, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  try {
    const body: any = await ctx.request.json().catch(() => null);
    if (!body?.task_id) return new Response(JSON.stringify({ ok: false, error: 'task_id required' }), { status: 400, headers: jsonHeaders });

    const VALID_STATUSES = new Set(['draft','ai_generated','review','approved','published','archived']);
    if (body.status && !VALID_STATUSES.has(body.status)) {
      return new Response(JSON.stringify({ ok: false, error: `Invalid status: ${body.status}` }), { status: 400, headers: jsonHeaders });
    }

    const setClauses: string[] = [`updated_at = datetime('now')`];
    const binds: unknown[]     = [];
    if (body.status)    { setClauses.push(`status = ?${binds.length + 1}`);    binds.push(body.status); }
    if (body.task_name) { setClauses.push(`task_name = ?${binds.length + 1}`); binds.push(body.task_name); }
    if (body.task_json) { setClauses.push(`task_json = ?${binds.length + 1}`); binds.push(JSON.stringify(body.task_json)); }

    binds.push(body.task_id);
    await ctx.env.DB.prepare(
      `UPDATE ar_container_unit_task SET ${setClauses.join(', ')} WHERE task_id = ?${binds.length}`
    ).bind(...binds).run();

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};
