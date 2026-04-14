import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspace_id');
  const domain = url.searchParams.get('domain');
  const status = url.searchParams.get('status') ?? 'draft';
  const limit = parseInt(url.searchParams.get('limit') ?? '50');
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  let query = `SELECT id, title, doc_type, domain, status, word_count,
                      surah, ayah_from, ayah_to, canonical_ref,
                      source_id, container_id, tags_json,
                      created_at, updated_at
               FROM km_documents WHERE status != 'archived'`;
  const params: unknown[] = [];

  if (workspaceId) { query += ` AND workspace_id = ?`; params.push(workspaceId); }
  if (domain)      { query += ` AND domain = ?`;        params.push(domain); }
  if (status !== 'all') { query += ` AND status = ?`;   params.push(status); }

  query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ docs: results, limit, offset });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json() as Record<string, unknown>;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO km_documents
      (id, workspace_id, title, doc_type, domain, document_json,
       container_id, unit_id, source_id, source_unit_id,
       surah, ayah_from, ayah_to, canonical_ref,
       production_type, target_audience, tags_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id,
    body.workspace_id ?? null,
    body.title ?? 'Untitled',
    body.doc_type ?? 'note',
    body.domain ?? 'general',
    JSON.stringify({ type: 'doc', content: [] }),
    body.container_id ?? null,
    body.unit_id ?? null,
    body.source_id ?? null,
    body.source_unit_id ?? null,
    body.surah ?? null,
    body.ayah_from ?? null,
    body.ayah_to ?? null,
    body.canonical_ref ?? null,
    body.production_type ?? null,
    body.target_audience ?? null,
    JSON.stringify(body.tags ?? []),
    now, now
  ).run();

  return Response.json({ id }, { status: 201 });
};
