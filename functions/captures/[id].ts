import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

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
      'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });
}

// GET /captures/:id
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params['id']);
  try {
    const row = await env.DB.prepare('SELECT * FROM km_capture WHERE id = ?').bind(id).first<CaptureRow>();
    if (!row) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: JSON_HEADERS });
    return new Response(JSON.stringify({ ok: true, capture: rowToNote(row) }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: JSON_HEADERS });
  }
};

// PUT /captures/:id
export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const id = String(params['id']);
  try {
    const body = await request.json() as CapturePayload;
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (body.area !== undefined)        { fields.push('area = ?');        values.push(body.area); }
    if (body.stage !== undefined)       { fields.push('stage = ?');       values.push(body.stage); }
    if (body.status !== undefined)      { fields.push('status = ?');      values.push(body.status); }
    if (body.title !== undefined)       { fields.push('title = ?');       values.push(body.title); }
    if (body.editor_json !== undefined) { fields.push('editor_json = ?'); values.push(JSON.stringify(body.editor_json)); }
    if (body.plain_text !== undefined)  { fields.push('plain_text = ?');  values.push(body.plain_text); }

    if (fields.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'No fields to update' }), { status: 400, headers: JSON_HEADERS });
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await env.DB.prepare(`UPDATE km_capture SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

    const row = await env.DB.prepare('SELECT * FROM km_capture WHERE id = ?').bind(id).first<CaptureRow>();
    if (!row) return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: JSON_HEADERS });

    return new Response(JSON.stringify({ ok: true, capture: rowToNote(row) }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: JSON_HEADERS });
  }
};

// DELETE /captures/:id
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params['id']);
  try {
    await env.DB.prepare('DELETE FROM km_capture WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: JSON_HEADERS });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();

// ── Types ────────────────────────────────────────────────────────────────────

interface CaptureRow {
  id: string;
  area: string;
  stage: string;
  status: string;
  title: string;
  editor_json: string;
  plain_text: string;
  created_at: string;
  updated_at: string;
}

interface CapturePayload {
  area?: string;
  stage?: string;
  status?: string;
  title?: string;
  editor_json?: unknown;
  plain_text?: string;
}

function rowToNote(row: CaptureRow) {
  let editor_json: unknown;
  try { editor_json = JSON.parse(row.editor_json); } catch { editor_json = { type: 'doc', content: [] }; }
  return {
    id: row.id,
    area: row.area,
    stage: row.stage,
    status: row.status,
    title: row.title,
    editor_json,
    plain_text: row.plain_text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
