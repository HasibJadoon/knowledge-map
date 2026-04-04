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
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });
}

// GET /captures?limit=200
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const area = url.searchParams.get('area');
  const stage = url.searchParams.get('stage');

  try {
    let query = `SELECT * FROM km_capture`;
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (area) { conditions.push('area = ?'); params.push(area); }
    if (stage) { conditions.push('stage = ?'); params.push(stage); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const rows = await env.DB.prepare(query).bind(...params).all<CaptureRow>();

    return new Response(JSON.stringify({ ok: true, captures: (rows.results ?? []).map(rowToNote) }), {
      headers: JSON_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: JSON_HEADERS,
    });
  }
};

// POST /captures
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = await request.json() as CapturePayload;
    const { area = 'quran', stage = 'inbox', status = 'draft', title = '', editor_json, plain_text = '' } = body;

    if (!editor_json) {
      return new Response(JSON.stringify({ ok: false, error: 'editor_json is required' }), {
        status: 400, headers: JSON_HEADERS,
      });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO km_capture (id, area, stage, status, title, editor_json, plain_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, area, stage, status, title, JSON.stringify(editor_json), plain_text, now, now).run();

    const row = await env.DB.prepare('SELECT * FROM km_capture WHERE id = ?').bind(id).first<CaptureRow>();

    return new Response(JSON.stringify({ ok: true, capture: rowToNote(row!) }), {
      status: 201, headers: JSON_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: JSON_HEADERS,
    });
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
