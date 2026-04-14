import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const doc = await env.DB.prepare(
    `SELECT * FROM km_documents WHERE id = ? AND status != 'archived'`
  ).bind(params.docId).first();
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(doc);
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  const allowed = ['title','document_json','status','word_count','tags_json',
                   'doc_type','domain','production_type','target_audience','is_template'];
  for (const key of allowed) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
  }
  if (!fields.length) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  fields.push('updated_at = ?'); values.push(now);
  values.push(params.docId);

  await env.DB.prepare(
    `UPDATE km_documents SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare(
    `UPDATE km_documents SET status = 'archived', updated_at = ? WHERE id = ?`
  ).bind(new Date().toISOString(), params.docId).run();
  return Response.json({ ok: true });
};
