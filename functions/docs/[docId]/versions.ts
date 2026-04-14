import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, version_num, title, word_count, created_at
     FROM km_document_versions WHERE document_id = ?
     ORDER BY version_num DESC LIMIT 20`
  ).bind(params.docId).all();
  return Response.json({ versions: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await request.json() as Record<string, unknown>;
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(MAX(version_num), 0) + 1 AS next FROM km_document_versions WHERE document_id = ?`
  ).bind(params.docId).all();
  const versionNum = (results[0] as { next: number }).next;

  await env.DB.prepare(
    `INSERT INTO km_document_versions (document_id, version_num, title, snapshot_json, word_count)
     VALUES (?,?,?,?,?)`
  ).bind(params.docId, versionNum, body.title, body.snapshot_json, body.word_count ?? 0).run();

  return Response.json({ version_num: versionNum }, { status: 201 });
};
