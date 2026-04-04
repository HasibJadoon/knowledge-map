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
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });
}

// POST /planner/feed — promote a plan item to the review feed
// Creates a new km_capture entry in stage='review' that represents
// the promoted plan item, and returns { ok, item: { id, created_at } }.
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const body = await request.json() as {
      user_id?: number;
      source_capture_id?: string;
      title?: string;
      summary?: string;
      plan_state?: unknown;
    };

    const title = (body.title ?? '').trim() || 'Feed item';
    const summary = typeof body.summary === 'string' ? body.summary : '';
    const editorJson = {
      type: 'doc',
      content: summary
        ? [{ type: 'paragraph', content: [{ type: 'text', text: summary }] }]
        : [],
    };

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB
      .prepare(
        `INSERT INTO km_capture (id, area, stage, status, title, editor_json, plain_text, created_at, updated_at)
         VALUES (?, 'quran', 'review', 'active', ?, ?, ?, ?, ?)`
      )
      .bind(id, title, JSON.stringify(editorJson), summary.slice(0, 500), now, now)
      .run();

    return new Response(
      JSON.stringify({ ok: true, item: { id, created_at: now } }),
      { status: 201, headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const onRequestOptions: PagesFunction = async () => cors();
