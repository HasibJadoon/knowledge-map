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

const safeJsonParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
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

    const slug = ctx.params?.slug?.trim();
    if (!slug) {
      return new Response(JSON.stringify({ ok: false, error: 'Slug required' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const row = await ctx.env.DB
      .prepare(
        `
          SELECT slug, title, body_md, body_json, tags_json, status, created_at, updated_at
          FROM docs
          WHERE slug = ?
          LIMIT 1
        `
      )
      .bind(slug)
      .first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const doc = {
      slug: row.slug,
      title: row.title,
      body_md: row.body_md,
      body_json: safeJsonParse(row.body_json),
      tags: safeJsonParse<string[]>(row.tags_json) ?? [],
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return new Response(JSON.stringify({ ok: true, doc }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
