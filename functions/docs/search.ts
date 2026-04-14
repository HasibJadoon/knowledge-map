import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (!q) return Response.json({ results: [] });

  const domain = url.searchParams.get('domain');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');

  let query = `
    SELECT d.id, d.title, d.doc_type, d.domain, d.status, d.updated_at,
           snippet(km_docs_fts, 2, '<mark>', '</mark>', '…', 24) AS excerpt
    FROM km_documents d
    JOIN km_docs_fts f ON f.id = d.id
    WHERE km_docs_fts MATCH ? AND d.status != 'archived'
  `;
  const params: unknown[] = [q + '*'];
  if (domain) { query += ` AND d.domain = ?`; params.push(domain); }
  query += ` ORDER BY bm25(km_docs_fts) LIMIT ?`;
  params.push(limit);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ results });
};
