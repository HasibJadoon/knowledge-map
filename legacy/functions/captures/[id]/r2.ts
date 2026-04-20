import type { D1Database, PagesFunction, R2Bucket } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  KMAPS_ASSETS: R2Bucket;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const CDN_BASE = 'https://cdn.k-maps.com';
const BUCKET_NAME = 'kmaps-assets';

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

// GET /captures/:id/r2  — list resources for a capture
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const captureId = String(params['id']);
  try {
    const row = await env.DB.prepare('SELECT r2_resources FROM km_capture WHERE id = ?')
      .bind(captureId).first<{ r2_resources: string | null }>();
    if (!row) return json({ ok: false, error: 'Capture not found' }, 404);
    const resources = parseJson(row.r2_resources, []);
    return json({ ok: true, resources });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

// POST /captures/:id/r2  — upload a file
export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const captureId = String(params['id']);

  // Check capture exists
  const captureRow = await env.DB.prepare('SELECT id, r2_resources FROM km_capture WHERE id = ?')
    .bind(captureId).first<{ id: string; r2_resources: string | null }>();
  if (!captureRow) return json({ ok: false, error: 'Capture not found' }, 404);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return json({ ok: false, error: 'No file provided' }, 400);

    const resourceType = String(formData.get('resource_type') ?? 'image');
    const usage = String(formData.get('usage') ?? 'attachment');
    const ownerType = String(formData.get('owner_type') ?? 'capture');
    const ownerId = String(formData.get('owner_id') ?? captureId);
    const placement = String(formData.get('placement') ?? 'attachment_bar');
    const altText = String(formData.get('alt') ?? file.name);

    const resourceId = `R2R:${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 24)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `capture/${captureId}/${resourceType}s/${resourceId}-${safeName}`;
    const url = `${CDN_BASE}/${key}`;

    const arrayBuf = await file.arrayBuffer();
    await env.KMAPS_ASSETS.put(key, arrayBuf, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });

    const newResource = {
      resource_id: resourceId,
      resource_type: resourceType,
      bucket: BUCKET_NAME,
      key,
      url,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      title: file.name,
      alt: altText,
      usage,
      capture_id: captureId,
      owner_type: ownerType,
      owner_id: ownerId,
      placement,
      uploaded_at: new Date().toISOString(),
      meta: {},
    };

    const existing = parseJson(captureRow.r2_resources, []);
    const updated = [...existing, newResource];

    await env.DB.prepare(
      `UPDATE km_capture SET r2_resources = ?, updated_at = ? WHERE id = ?`
    ).bind(JSON.stringify(updated), new Date().toISOString(), captureId).run();

    return json({ ok: true, resource: newResource }, 201);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

// DELETE /captures/:id/r2?resourceId=R2R:...
export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  const captureId = String(params['id']);
  const url = new URL(request.url);
  const resourceId = url.searchParams.get('resourceId');
  if (!resourceId) return json({ ok: false, error: 'resourceId query param required' }, 400);

  try {
    const row = await env.DB.prepare('SELECT r2_resources FROM km_capture WHERE id = ?')
      .bind(captureId).first<{ r2_resources: string | null }>();
    if (!row) return json({ ok: false, error: 'Capture not found' }, 404);

    const resources = parseJson(row.r2_resources, []);
    const target = resources.find((r: { resource_id: string; key: string }) => r.resource_id === resourceId);
    if (!target) return json({ ok: false, error: 'Resource not found' }, 404);

    // Delete from R2
    await env.KMAPS_ASSETS.delete(target.key);

    const updated = resources.filter((r: { resource_id: string }) => r.resource_id !== resourceId);
    await env.DB.prepare(
      `UPDATE km_capture SET r2_resources = ?, updated_at = ? WHERE id = ?`
    ).bind(JSON.stringify(updated), new Date().toISOString(), captureId).run();

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => cors();

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
