import { requireAuth } from '../_utils/auth';
import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
};

const toInt = (value: string | null, def: number) => {
  const candidate = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(candidate) ? candidate : def;
};

const parseTags = (text: string | null) => {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const url = new URL(ctx.request.url);
    const search = (url.searchParams.get('q') ?? '').trim();
    const limit = Math.min(200, Math.max(1, toInt(url.searchParams.get('limit'), 50)));
    const offset = Math.max(0, toInt(url.searchParams.get('offset'), 0));
    const statusParam = (url.searchParams.get('status') ?? 'published').trim().toLowerCase();
    const statusFilter = statusParam === 'all' ? null : statusParam;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (statusFilter) {
      whereClauses.push('status = ?');
      params.push(statusFilter);
    }

    if (search) {
      whereClauses.push('(slug LIKE ? OR title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const docsStmt = ctx.env.DB
      .prepare(
        `
          SELECT slug, title, tags_json, status, created_at, updated_at
          FROM docs
          ${whereSql}
          ORDER BY datetime(updated_at) DESC, id DESC
          LIMIT ?
          OFFSET ?
        `
      )
      .bind(...params, limit, offset);

    const countStmt = ctx.env.DB
      .prepare(`SELECT COUNT(*) AS total FROM docs ${whereSql}`)
      .bind(...params);

    const docsRes = await docsStmt.all();
    const countRes = await countStmt.first<{ total?: number }>();

    const results = (docsRes.results ?? []).map((row) => ({
      slug: row.slug,
      title: row.title,
      status: row.status,
      tags: parseTags(row.tags_json),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        total: Number(countRes?.total ?? 0),
        limit,
        offset,
        results,
      }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
