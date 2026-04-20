import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const { results } = await env.DB.prepare(
    `SELECT * FROM km_block_arabic_links WHERE document_id = ? ORDER BY created_at`
  ).bind(params.docId).all();
  return Response.json({ links: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const b = await request.json() as Record<string, unknown>;
  const { meta } = await env.DB.prepare(
    `INSERT INTO km_block_arabic_links (document_id, block_id, entity_type, entity_id)
     VALUES (?,?,?,?)`
  ).bind(params.docId, b.block_id, b.entity_type, b.entity_id).run();
  return Response.json({ id: meta.last_row_id }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const b = await request.json() as { id: number };
  await env.DB.prepare(
    `DELETE FROM km_block_arabic_links WHERE id = ? AND document_id = ?`
  ).bind(b.id, params.docId).run();
  return Response.json({ ok: true });
};
