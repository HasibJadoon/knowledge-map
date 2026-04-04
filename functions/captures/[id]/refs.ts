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
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });
}

// GET /captures/:id/refs
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const captureId = String(params['id']);
  try {
    const row = await env.DB.prepare('SELECT capture_refs FROM km_capture WHERE id = ?')
      .bind(captureId).first<{ capture_refs: string | null }>();
    if (!row) return json({ ok: false, error: 'Capture not found' }, 404);
    return json({ ok: true, refs: parseJson(row.capture_refs, []) });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

// POST /captures/:id/refs  — add a reference
export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const captureId = String(params['id']);
  try {
    const body = await request.json() as RefPayload;
    const { ref_type, label, relation = 'related', url: refUrl = null, locator = null,
            target_id = null, context = null, meta = {} } = body;

    if (!ref_type || !label) return json({ ok: false, error: 'ref_type and label are required' }, 400);

    const row = await env.DB.prepare('SELECT capture_refs FROM km_capture WHERE id = ?')
      .bind(captureId).first<{ capture_refs: string | null }>();
    if (!row) return json({ ok: false, error: 'Capture not found' }, 404);

    const refId = `REF:${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 22)}`;
    const newRef = {
      ref_id: refId,
      ref_type,
      label,
      relation,
      locator,
      url: refUrl,
      target_id,
      context: context ?? { owner_type: 'capture', owner_id: captureId },
      meta,
    };

    const existing = parseJson(row.capture_refs, []);
    const updated = [...existing, newRef];

    await env.DB.prepare(
      `UPDATE km_capture SET capture_refs = ?, updated_at = ? WHERE id = ?`
    ).bind(JSON.stringify(updated), new Date().toISOString(), captureId).run();

    return json({ ok: true, ref: newRef }, 201);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

// DELETE /captures/:id/refs?refId=REF:...
export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  const captureId = String(params['id']);
  const url = new URL(request.url);
  const refId = url.searchParams.get('refId');
  if (!refId) return json({ ok: false, error: 'refId query param required' }, 400);

  try {
    const row = await env.DB.prepare('SELECT capture_refs FROM km_capture WHERE id = ?')
      .bind(captureId).first<{ capture_refs: string | null }>();
    if (!row) return json({ ok: false, error: 'Capture not found' }, 404);

    const refs = parseJson(row.capture_refs, []);
    const updated = refs.filter((r: { ref_id: string }) => r.ref_id !== refId);

    await env.DB.prepare(
      `UPDATE km_capture SET capture_refs = ?, updated_at = ? WHERE id = ?`
    ).bind(JSON.stringify(updated), new Date().toISOString(), captureId).run();

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => cors();

// ── Types / Helpers ───────────────────────────────────────────────────────────

interface RefPayload {
  ref_type: string;
  label: string;
  relation?: string;
  url?: string | null;
  locator?: unknown;
  target_id?: string | null;
  context?: unknown;
  meta?: unknown;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
